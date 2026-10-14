import { createServer } from 'node:http';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';

import { auth } from '@modelcontextprotocol/sdk/client/auth.js';
import { z } from 'zod';

import { DEV_STATE_OBSERVATIONS_PATH, HEARTBEAT_INTERVAL_MS } from '../convex/devState/contract';
import { readCheckoutInventory } from './git';
import { observeOnce } from './observe';
import { deliver, retryDelayMs } from './publisher';
import { openObserverStore } from './store';
import { connectT3, fileOAuthProvider, type T3Reader, T3UnauthorizedError } from './t3';

// Local observer CLI. State lives in $TRIANGLE_OBSERVER_STATE (default
// ~/.local/state/triangle-observer), with owner-only permissions:
//   bun observer/main.ts login <t3-mcp-url>     approve read-only access to T3
//   bun observer/main.ts connect <triangle-url> read the Triangle credential from stdin
//   bun observer/main.ts run                    observe and publish until stopped

const POLL_INTERVAL_MS = 30_000;
const DEFAULT_CALLBACK_PORT = 47_893;

const stateDir =
   process.env.TRIANGLE_OBSERVER_STATE ??
   path.join(
      process.env.XDG_STATE_HOME ?? path.join(os.homedir(), '.local/state'),
      'triangle-observer'
   );
const configFile = path.join(stateDir, 'config.json');
const oauthFile = path.join(stateDir, 't3-oauth.json');

const observerConfig = z.object({
   t3: z
      .object({
         mcpUrl: z.string(),
         redirectUrl: z.string(),
         environmentId: z.string(),
         environmentLabel: z.string(),
      })
      .optional(),
   triangle: z.object({ siteUrl: z.string(), token: z.string() }).optional(),
});
type ObserverConfig = z.infer<typeof observerConfig>;

async function readConfig(): Promise<ObserverConfig> {
   try {
      return observerConfig.parse(JSON.parse(await readFile(configFile, 'utf8')));
   } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return {};
      throw error;
   }
}

async function writeConfig(config: ObserverConfig) {
   await mkdir(stateDir, { recursive: true, mode: 0o700 });
   await writeFile(configFile, JSON.stringify(config, null, 3), { mode: 0o600 });
   await chmod(configFile, 0o600);
}

function log(event: string, details: Record<string, unknown> = {}) {
   console.error(JSON.stringify({ at: new Date().toISOString(), event, ...details }));
}

// The sign-in can finish on this machine's callback or, from a browser elsewhere,
// by pasting the final URL; whichever arrives first wins.
async function login(mcpUrl: string, port: number) {
   const redirectUrl = `http://127.0.0.1:${port}/callback`;
   let resolveCode: (code: string) => void = () => {};
   const code = new Promise<string>((resolve) => (resolveCode = resolve));
   const fromUrl = (raw: string) => new URL(raw, redirectUrl).searchParams.get('code');

   const server = createServer((request, response) => {
      const received = fromUrl(request.url ?? '');
      response.end(
         received ? 'Triangle observer approved. You can close this tab.' : 'Missing code'
      );
      if (received) resolveCode(received);
   }).listen(port, '127.0.0.1');
   const input = createInterface({ input: process.stdin });
   input.on('line', (line) => {
      const pasted = line.trim() ? fromUrl(line.trim()) : null;
      if (pasted) resolveCode(pasted);
   });

   try {
      const provider = fileOAuthProvider(oauthFile, {
         redirectUrl,
         onAuthorizationUrl: (url) => {
            console.log(`Open this URL and approve read-only access:\n\n${url}\n`);
            console.log('If the browser runs on another machine, paste the final URL here.');
         },
      });
      if ((await auth(provider, { serverUrl: mcpUrl })) === 'REDIRECT') {
         await auth(provider, { serverUrl: mcpUrl, authorizationCode: await code });
      }
      const t3 = await connectT3(mcpUrl, fileOAuthProvider(oauthFile, { redirectUrl }));
      const environment = await t3.environment();
      await t3.close();

      const config = await readConfig();
      await writeConfig({
         ...config,
         t3: {
            mcpUrl,
            redirectUrl,
            environmentId: environment.environmentId,
            environmentLabel: environment.label,
         },
      });
      console.log(
         `Signed in to T3 environment ${environment.label} (${environment.environmentId}).`
      );
      if (!config.triangle) {
         console.log(
            '\nCreate its Triangle credential with:\n' +
               `bunx convex run devState/credentials:create '${JSON.stringify({
                  environmentId: environment.environmentId,
                  label: environment.label,
               })}'\n` +
               'then: bun observer/main.ts connect <triangle-site-url> < token-file'
         );
      }
   } finally {
      server.close();
      input.close();
   }
}

async function connect(siteUrl: string) {
   const chunks: Buffer[] = [];
   for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
   const token = Buffer.concat(chunks).toString('utf8').trim();
   if (!token.startsWith('t3obs_')) throw new Error('Expected a t3obs_ token on stdin');
   await writeConfig({ ...(await readConfig()), triangle: { siteUrl, token } });
   console.log('Triangle credential saved.');
}

async function run() {
   const config = await readConfig();
   if (!config.t3) throw new Error('Run `bun observer/main.ts login <t3-mcp-url>` first');
   if (!config.triangle) throw new Error('Run `bun observer/main.ts connect <triangle-url>` first');
   const { t3: t3Config, triangle } = config;

   const store = openObserverStore(path.join(stateDir, 'queue.sqlite'));
   const observerStartedAt = new Date().toISOString();
   const url = new URL(DEV_STATE_OBSERVATIONS_PATH, triangle.siteUrl).toString();
   let t3: T3Reader | null = null;
   let firstCycle = true;
   let lastDeliveredAt = 0;
   let deliveryAttempt = 0;
   let retryAt = 0;
   let stopped: string | null = null;

   async function drain() {
      if (stopped || Date.now() < retryAt) return;
      for (let gaps = 0; gaps < 3;) {
         const outcome = await deliver({
            store,
            environmentId: t3Config.environmentId,
            url,
            token: triangle.token,
         });
         if (outcome.status === 'idle') return;
         if (outcome.status === 'delivered') {
            lastDeliveredAt = Date.now();
            deliveryAttempt = 0;
            continue;
         }
         if (outcome.status === 'retry' && outcome.reason === 'sequence_gap') {
            gaps++;
            continue;
         }
         if (outcome.status === 'retry') {
            deliveryAttempt++;
            retryAt = Date.now() + retryDelayMs(deliveryAttempt);
            log('delivery_retry', { reason: outcome.reason, attempt: deliveryAttempt });
            return;
         }
         // The queue is kept; delivery resumes after the configuration is fixed and the observer restarts.
         stopped = outcome.reason;
         log('delivery_stopped', { reason: outcome.reason, detail: outcome.detail });
         return;
      }
   }

   for (;;) {
      let t3Failure: 'unauthorized' | 'unreachable' | null = null;
      if (!t3) {
         try {
            t3 = await connectT3(
               t3Config.mcpUrl,
               fileOAuthProvider(oauthFile, { redirectUrl: t3Config.redirectUrl })
            );
         } catch (error) {
            t3Failure = error instanceof T3UnauthorizedError ? 'unauthorized' : 'unreachable';
         }
      }
      const force = firstCycle || store.needsFullResend;
      try {
         const result = await observeOnce({
            queue: store,
            environmentLabel: t3Config.environmentLabel,
            observerStartedAt,
            t3,
            t3Failure,
            readInventory: readCheckoutInventory,
            now: () => new Date(),
            force,
            // While delivery is failing the queued batch already proves liveness; extra heartbeats would only fill the queue.
            heartbeat:
               store.queuedCount() === 0 && Date.now() - lastDeliveredAt >= HEARTBEAT_INTERVAL_MS,
         });
         if (force) store.markFullResendDone();
         firstCycle = false;
         if (result.t3 !== 'ok' && t3) {
            log('t3_unavailable', { status: result.t3 });
            await t3.close().catch(() => {});
            t3 = null;
         }
      } catch (error) {
         log('observe_failed', { error: error instanceof Error ? error.message : String(error) });
      }
      await drain();
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
   }
}

const [command, argument, ...rest] = process.argv.slice(2);
const portFlag = rest.indexOf('--port');
const port = portFlag >= 0 ? Number(rest[portFlag + 1]) : DEFAULT_CALLBACK_PORT;

if (command === 'login' && argument) await login(argument, port);
else if (command === 'connect' && argument) await connect(argument);
else if (command === 'run') await run();
else {
   console.error(
      'Usage: bun observer/main.ts login <t3-mcp-url> [--port n] | connect <triangle-url> | run'
   );
   process.exit(2);
}
