import assert from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, describe, test } from 'node:test';

import { convexTest } from 'convex-test';

import * as api from '../convex/_generated/api';
import { internal } from '../convex/_generated/api';
import * as server from '../convex/_generated/server';
import * as http from '../convex/http';
import schema from '../convex/schema';
import {
   DEV_STATE_OBSERVATIONS_PATH,
   type DevStateObservation,
   type DevStateObservationDraft,
} from '../convex/devState/contract';
import { validBatch } from '../convex/devState/contract.fixtures';
import * as credentials from '../convex/devState/credentials';
import * as ingest from '../convex/devState/ingest';
import { deliver, retryDelayMs } from './publisher';
import { openObserverStore } from './store';

// convex-test resolves these keys from this folder, so they share the prefix before `_generated`.
const modules = {
   '../convex/_generated/api.ts': async () => api,
   '../convex/_generated/server.ts': async () => server,
   '../convex/http.ts': async () => http,
   '../convex/devState/credentials.ts': async () => credentials,
   '../convex/devState/ingest.ts': async () => ingest,
};

const { environmentId } = validBatch;
const drafts = validBatch.observations.map(draftOf);

// The queue assigns sequence on enqueue, so a fixture observation goes back to its draft without it.
function draftOf(observation: DevStateObservation): DevStateObservationDraft {
   const draft: Partial<DevStateObservation> = { ...observation };
   delete draft.sequence;
   return draft as DevStateObservationDraft;
}

// The fixture batch has every kind the observer sends, so tests pick a draft of a kind by name.
function draftOfKind<K extends DevStateObservationDraft['kind']>(kind: K) {
   const found = drafts.find(
      (draft): draft is Extract<DevStateObservationDraft, { kind: K }> => draft.kind === kind
   );
   if (!found) throw new Error(`Fixture has no ${kind} observation`);
   return found;
}

const directories: string[] = [];

after(async () => {
   await Promise.all(directories.map((dir) => rm(dir, { recursive: true, force: true })));
});

// A real receiver with one credential, and an observer store in a fresh temp directory.
async function setup(options: Parameters<typeof openObserverStore>[1] = {}) {
   const dir = await mkdtemp(path.join(os.tmpdir(), 'observer-publisher-'));
   directories.push(dir);
   const file = path.join(dir, 'queue.sqlite');
   const t = convexTest(schema, modules);
   const token = await createCredential(t);
   const store = openObserverStore(file, options);
   const send = (fetch = (url: string, init: RequestInit) => t.fetch(url, init)) =>
      deliver({ store, environmentId, url: DEV_STATE_OBSERVATIONS_PATH, token, fetch });
   const history = () => t.run((ctx) => ctx.db.query('devStateHistory').collect());
   return { t, file, store, send, history };
}

async function createCredential(t: ReturnType<typeof convexTest>): Promise<string> {
   return t.action(internal.devState.credentials.create, { environmentId, label: 'caburgua' });
}

// A fetch that answers with a fixed HTTP status and an optional JSON body.
const respondWith =
   (status: number, body: unknown = null) =>
   async () =>
      new Response(body === null ? '' : JSON.stringify(body), { status });

describe('observer publisher against the real receiver', () => {
   test('delivers queued batches and keeps the store file owner-only', async () => {
      const { file, store, send } = await setup();
      store.enqueue(drafts);
      assert.equal((await stat(file)).mode & 0o777, 0o600);

      assert.deepEqual(await send(), { status: 'delivered', acknowledgedThrough: drafts.length });
      assert.equal(store.queuedCount(), 0);
      assert.deepEqual(await send(), { status: 'idle' });
   });

   test('sends at most 200 observations per batch and acknowledges each batch', async () => {
      const { store, send } = await setup();
      store.enqueue(Array.from({ length: 250 }, () => drafts[0]));

      assert.deepEqual(await send(), { status: 'delivered', acknowledgedThrough: 200 });
      assert.equal(store.queuedCount(), 50);
      assert.deepEqual(await send(), { status: 'delivered', acknowledgedThrough: 250 });
   });

   test('a lost response redelivers after restart without duplicate history', async () => {
      const { t, file, store, send, history } = await setup();
      store.enqueue(drafts);

      // The receiver stores the batch, but the observer never sees the response.
      const lostResponse = async (url: string, init: RequestInit) => {
         await t.fetch(url, init);
         throw new TypeError('connection reset');
      };
      assert.deepEqual(await send(lostResponse), { status: 'retry', reason: 'network' });
      const streamId = store.streamId;
      store.close();

      const reopened = openObserverStore(file);
      assert.equal(reopened.streamId, streamId);
      assert.equal(reopened.queuedCount(), drafts.length);
      const rowsBefore = (await history()).length;
      assert.ok(rowsBefore > 0);

      const resend = deliver({
         store: reopened,
         environmentId,
         url: DEV_STATE_OBSERVATIONS_PATH,
         token: await createCredential(t),
         fetch: (url, init) => t.fetch(url, init),
      });
      assert.deepEqual(await resend, { status: 'delivered', acknowledgedThrough: drafts.length });
      assert.equal((await history()).length, rowsBefore);
      reopened.close();
   });

   test('a revoked credential stops delivery and keeps the queue', async () => {
      const { t, store, send } = await setup();
      store.enqueue(drafts);
      await t.mutation(internal.devState.credentials.revoke, { environmentId });

      assert.deepEqual(await send(), { status: 'stopped', reason: 'unauthorized' });
      assert.equal(store.queuedCount(), drafts.length);
   });

   test('server errors and network failures retry and keep the queue until recovery', async () => {
      const { store, send } = await setup();
      store.enqueue(drafts);

      assert.deepEqual(await send(respondWith(503, { error: 'busy' })), {
         status: 'retry',
         reason: 'server',
      });
      assert.deepEqual(await send(respondWith(429)), { status: 'retry', reason: 'server' });
      assert.deepEqual(await send(() => Promise.reject(new TypeError('fetch failed'))), {
         status: 'retry',
         reason: 'network',
      });
      assert.equal(store.queuedCount(), drafts.length);

      assert.deepEqual(await send(), { status: 'delivered', acknowledgedThrough: drafts.length });
   });

   test('a receiver that lost its state gets a new stream from the observer', async () => {
      const { store, send } = await setup();
      store.enqueue(drafts);
      assert.deepEqual(await send(), { status: 'delivered', acknowledgedThrough: drafts.length });
      const streamBefore = store.streamId;
      store.enqueue(drafts.slice(0, 2));

      // A fresh receiver knows no stream: it expects sequence 1 while the queue starts at 10.
      const replaced = convexTest(schema, modules);
      const token = await createCredential(replaced);
      const sendToReplaced = () =>
         deliver({
            store,
            environmentId,
            url: DEV_STATE_OBSERVATIONS_PATH,
            token,
            fetch: (url, init) => replaced.fetch(url, init),
         });
      assert.deepEqual(await sendToReplaced(), { status: 'retry', reason: 'sequence_gap' });
      assert.notEqual(store.streamId, streamBefore);
      assert.equal(store.needsFullResend, true);
      assert.equal(store.queuedCount(), 2);
      assert.deepEqual(await sendToReplaced(), { status: 'delivered', acknowledgedThrough: 2 });
   });

   test('overflow starts a new stream with one history_gap the receiver records', async () => {
      const { store, send, history } = await setup({ maxQueued: 3 });
      const streamBefore = store.streamId;
      store.enqueue(drafts.slice(0, 4));

      assert.notEqual(store.streamId, streamBefore);
      assert.equal(store.needsFullResend, true);
      const [gap] = store.pending()?.observations ?? [];
      if (gap?.kind !== 'history_gap')
         throw new Error('Expected a history_gap at the head of the queue');
      assert.equal(gap.sequence, 1);
      assert.equal(gap.droppedObservations, 4);
      assert.equal(store.queuedCount(), 1);

      assert.deepEqual(await send(), { status: 'delivered', acknowledgedThrough: 1 });
      assert.ok((await history()).some((row) => row.change === 'gap'));
   });

   test('enqueueChanged ignores observedAt, force queues all, and snapshots track removals', async () => {
      const { store } = await setup();
      const project = draftOfKind('project');
      const location = draftOfKind('location');
      const projectKey = `project:${project.projectId}`;
      const locationKey = `location:${location.locationId}`;

      assert.equal(
         store.enqueueChanged([
            { key: projectKey, draft: { ...project, observedAt: '2026-10-13T10:00:00.000Z' } },
         ]),
         1
      );
      assert.equal(
         store.enqueueChanged([
            { key: projectKey, draft: { ...project, observedAt: '2026-10-13T11:00:00.000Z' } },
         ]),
         0,
         'the same state observed later is not a change'
      );
      assert.equal(
         store.enqueueChanged([
            {
               key: projectKey,
               draft: { ...project, title: 'Renamed', observedAt: project.observedAt },
            },
         ]),
         1
      );
      assert.equal(
         store.enqueueChanged([{ key: projectKey, draft: project }], { force: true }),
         1,
         'force enqueues unchanged state too'
      );

      store.enqueueChanged([{ key: locationKey, draft: location }]);
      assert.deepEqual(store.snapshotKeys('project:'), [projectKey]);
      assert.deepEqual(store.snapshotEntries('project:'), [{ key: projectKey, draft: project }]);

      const removal = {
         kind: 'project_removed',
         observedAt: project.observedAt,
         projectId: project.projectId,
      } as const;
      store.enqueueRemoval(projectKey, removal);
      assert.deepEqual(store.snapshotKeys('project:'), []);

      const queued = store.queuedCount();
      store.enqueueRemoval('project:unknown', removal);
      assert.equal(store.queuedCount(), queued, 'removing an untracked key queues nothing');
   });
});

describe('retryDelayMs', () => {
   test('starts near one second, caps at five minutes, and stays under the ceiling', () => {
      assert.equal(
         retryDelayMs(0, () => 0),
         500
      );
      assert.equal(
         retryDelayMs(0, () => 0.999),
         1000
      );
      assert.equal(
         retryDelayMs(3, () => 0),
         4000
      );
      assert.equal(
         retryDelayMs(1000, () => 0),
         150_000
      );
      assert.equal(
         retryDelayMs(1000, () => 0.999),
         299_850
      );
   });
});
