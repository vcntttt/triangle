import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
   type OAuthClientProvider,
   UnauthorizedError,
} from '@modelcontextprotocol/sdk/client/auth.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type {
   OAuthClientInformationMixed,
   OAuthClientMetadata,
   OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import { z } from 'zod';

// Reads official T3 Code through its MCP server with a read-only OAuth grant
// (docs/user/outside-agents.md in pingdotgg/t3code). Only the fields the observer
// publishes are parsed; message text is never requested beyond one character.

const environmentResult = z.object({
   environmentId: z.string(),
   label: z.string(),
   serverVersion: z.string(),
});

const repositoryIdentity = z
   .object({
      canonicalKey: z.string(),
      displayName: z.string().optional(),
      // A fork's own remote; T3 groups by it so a fork stays apart from its upstream.
      origin: z.object({ canonicalKey: z.string(), displayName: z.string().optional() }).optional(),
   })
   .nullable();

const projectListResult = z.object({
   projects: z.array(
      z.object({
         id: z.string(),
         title: z.string(),
         workspaceRoot: z.string(),
         repositoryIdentity,
         deletedAt: z.string().nullable(),
      })
   ),
   nextCursor: z.number().nullable(),
});

const threadListResult = z.object({
   threads: z.array(
      z.object({ threadId: z.string(), itemCount: z.number(), updatedAt: z.string() })
   ),
   nextCursor: z.number().nullable(),
});

const runStatus = z.string();

const threadReadResult = z.object({
   thread: z.object({
      threadId: z.string(),
      projectId: z.string(),
      title: z.string(),
      status: z.string(),
      branch: z.string().nullable(),
      worktreePath: z.string().nullable(),
      parentThreadId: z.string().nullable(),
      itemCount: z.number(),
      pendingRequestCount: z.number(),
      archived: z.boolean(),
      updatedAt: z.string(),
   }),
   recentRuns: z.array(
      z.object({
         runId: z.string(),
         status: runStatus,
         startedAt: z.string().nullable(),
         completedAt: z.string().nullable(),
      })
   ),
   items: z.array(
      z.object({
         itemId: z.string(),
         type: z.string(),
         createdBy: z.string().optional(),
         updatedAt: z.string(),
      })
   ),
});

export type T3Environment = z.infer<typeof environmentResult>;
export type T3Project = z.infer<typeof projectListResult>['projects'][number];
export type T3ThreadSummary = z.infer<typeof threadListResult>['threads'][number];
export type T3Thread = z.infer<typeof threadReadResult>;

export type T3Reader = {
   environment(): Promise<T3Environment>;
   projects(): Promise<T3Project[]>;
   threads(projectId: string): Promise<T3ThreadSummary[]>;
   // Timeline items after `afterPosition` (exclusive); null when T3 no longer knows the thread.
   thread(threadId: string, afterPosition: number | null): Promise<T3Thread | null>;
   close(): Promise<void>;
};

type CallResult<T> = { ok: true; value: T } | { ok: false; payload: unknown };

// The T3 tool failures the observer tells apart from a broken connection.
export class T3UnauthorizedError extends Error {}

const PAGE_SIZE = 100;
export const MAX_TIMELINE_ITEMS = 100;

export async function connectT3(
   mcpUrl: string,
   authProvider: OAuthClientProvider
): Promise<T3Reader> {
   const client = new Client({ name: 'triangle-observer', version: '1.0.0' });
   const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), { authProvider });
   try {
      await client.connect(transport);
   } catch (error) {
      if (error instanceof UnauthorizedError) throw new T3UnauthorizedError(error.message);
      throw error;
   }

   async function call<T>(
      name: string,
      args: Record<string, unknown>,
      schema: z.ZodType<T>
   ): Promise<CallResult<T>> {
      let result;
      try {
         result = await client.callTool({ name, arguments: args });
      } catch (error) {
         if (error instanceof UnauthorizedError) throw new T3UnauthorizedError(error.message);
         throw error;
      }
      const content = Array.isArray(result.content) ? result.content : [];
      const text = content.find((part) => part?.type === 'text')?.text;
      const payload: unknown =
         result.structuredContent ?? (typeof text === 'string' ? JSON.parse(text) : undefined);
      if (result.isError) return { ok: false, payload };
      return { ok: true, value: schema.parse(payload) };
   }

   async function paginate<P extends { nextCursor: number | null }, T>(
      name: string,
      args: Record<string, unknown>,
      schema: z.ZodType<P>,
      pick: (page: P) => T[]
   ): Promise<T[]> {
      const items: T[] = [];
      for (let cursor: number | null = 0; cursor !== null;) {
         const page: CallResult<P> = await call(
            name,
            { ...args, cursor, limit: PAGE_SIZE },
            schema
         );
         if (!page.ok) throw new Error(`${name} failed: ${JSON.stringify(page.payload)}`);
         items.push(...pick(page.value));
         cursor = page.value.nextCursor;
      }
      return items;
   }

   return {
      async environment() {
         const result = await call('t3_environment_read', {}, environmentResult);
         if (!result.ok) throw new Error('t3_environment_read failed');
         return result.value;
      },
      async projects() {
         const projects = await paginate(
            't3_project_list',
            {},
            projectListResult,
            (page) => page.projects
         );
         return projects.filter((project) => project.deletedAt === null);
      },
      threads(projectId) {
         return paginate(
            't3_thread_list',
            { projectId, includeSubagents: true },
            threadListResult,
            (page) => page.threads
         );
      },
      async thread(threadId, afterPosition) {
         const result = await call(
            't3_thread_read',
            {
               threadId,
               view: 'messages',
               afterPosition,
               limit: MAX_TIMELINE_ITEMS,
               maxCharsPerItem: 1,
               runLimit: 5,
            },
            threadReadResult
         );
         if (!result.ok) return null;
         return result.value;
      },
      close: () => client.close(),
   };
}

type StoredOAuth = {
   redirectUrl: string;
   clientInformation?: OAuthClientInformationMixed;
   tokens?: OAuthTokens;
   codeVerifier?: string;
};

// Persists the T3 grant in the observer's state directory with owner-only permissions.
// Without `onAuthorizationUrl` the provider never starts a sign-in: the running
// observer reports `unauthorized` and waits for `observer login`.
export function fileOAuthProvider(
   file: string,
   options: { redirectUrl: string; onAuthorizationUrl?: (url: URL) => void }
): OAuthClientProvider {
   let state: StoredOAuth | undefined;

   async function load(): Promise<StoredOAuth> {
      if (state) return state;
      try {
         const stored = JSON.parse(await readFile(file, 'utf8')) as StoredOAuth;
         // A client registered for another redirect URL cannot finish a new sign-in.
         state =
            stored.redirectUrl === options.redirectUrl
               ? stored
               : { redirectUrl: options.redirectUrl, tokens: stored.tokens };
      } catch {
         state = { redirectUrl: options.redirectUrl };
      }
      return state;
   }

   async function save(patch: Partial<StoredOAuth>) {
      state = { ...(await load()), ...patch };
      await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
      await writeFile(file, JSON.stringify(state), { mode: 0o600 });
      await chmod(file, 0o600);
   }

   const clientMetadata: OAuthClientMetadata = {
      client_name: 'Triangle observer',
      redirect_uris: [options.redirectUrl],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
   };

   return {
      get redirectUrl() {
         return options.redirectUrl;
      },
      get clientMetadata() {
         return clientMetadata;
      },
      clientInformation: async () => (await load()).clientInformation,
      saveClientInformation: (clientInformation) => save({ clientInformation }),
      tokens: async () => (await load()).tokens,
      saveTokens: (tokens) => save({ tokens }),
      saveCodeVerifier: (codeVerifier) => save({ codeVerifier }),
      async codeVerifier() {
         const verifier = (await load()).codeVerifier;
         if (!verifier) throw new Error('No sign-in in progress');
         return verifier;
      },
      redirectToAuthorization(url) {
         if (!options.onAuthorizationUrl) {
            throw new T3UnauthorizedError('T3 authorization expired; run `observer login`');
         }
         options.onAuthorizationUrl(url);
      },
      async invalidateCredentials(scope) {
         const current = await load();
         if (scope === 'all') await save({ clientInformation: undefined, tokens: undefined });
         else if (scope === 'client') await save({ clientInformation: undefined });
         else if (scope === 'tokens') await save({ tokens: undefined });
         else if (scope === 'verifier') await save({ codeVerifier: undefined });
         else state = current;
      },
   };
}
