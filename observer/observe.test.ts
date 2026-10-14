import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

import type { DevStateObservation } from '../convex/devState/contract';
import type { Checkout, CheckoutInventory } from './git';
import { type CycleContext, locationIdFor, observeOnce } from './observe';
import { openObserverStore } from './store';
import { type T3Project, type T3Reader, type T3Thread, T3UnauthorizedError } from './t3';

let root: string;
before(async () => {
   root = await mkdtemp(path.join(os.tmpdir(), 'observer-cycle-'));
});
after(async () => {
   await rm(root, { recursive: true, force: true });
});

const ponderapp: T3Project = {
   id: 'project-ponderapp',
   title: 'PonderApp',
   workspaceRoot: '/home/vrivera/dev/ponderapp',
   // A fork: T3 groups it by its own remote, not by the upstream.
   repositoryIdentity: {
      canonicalKey: 'github.com/upstream/ponderapp',
      displayName: 'upstream/ponderapp',
      origin: { canonicalKey: 'github.com/vcntttt/ponderapp', displayName: 'vcntttt/ponderapp' },
   },
   deletedAt: null,
};

const git = {
   branch: 'main',
   headOid: 'a'.repeat(40),
   changes: { staged: 0, unstaged: 2, untracked: 0, conflicted: 0 },
   upstream: { ref: 'origin/main', ahead: 0, behind: 0 },
   remoteCheckedAt: null,
};
const main: Checkout = {
   path: ponderapp.workspaceRoot,
   isMainCheckout: true,
   fsIdentity: '11:1',
   state: { ok: true, git },
};
const feed: Checkout = {
   path: '/home/vrivera/dev/ponderapp-feed',
   isMainCheckout: false,
   fsIdentity: '12:1',
   state: { ok: true, git: { ...git, branch: 'feat/feed', upstream: null } },
};

function threadRead(overrides: Partial<T3Thread['thread']> = {}): T3Thread {
   return {
      thread: {
         threadId: 'thread-feed',
         projectId: ponderapp.id,
         title: 'Feed',
         status: 'running',
         branch: 'feat/feed',
         worktreePath: feed.path,
         parentThreadId: null,
         itemCount: 3,
         pendingRequestCount: 0,
         archived: false,
         updatedAt: '2026-10-13T23:00:00.000Z',
         ...overrides,
      },
      recentRuns: [
         {
            runId: 'run-1',
            status: 'running',
            startedAt: '2026-10-13T22:59:00.000Z',
            completedAt: null,
         },
      ],
      items: [
         {
            itemId: 'message-1',
            type: 'user_message',
            createdBy: 'user',
            updatedAt: '2026-10-13T22:58:00.000Z',
         },
         {
            itemId: 'message-2',
            type: 'assistant_message',
            createdBy: 'agent',
            updatedAt: '2026-10-13T22:59:30.000Z',
         },
      ],
   };
}

// T3 at the MCP edge: the cycle only sees what these reads return.
function fakeT3(state: { thread: T3Thread | null; listed: boolean; unauthorized?: boolean }) {
   const reads: string[] = [];
   const reader: T3Reader = {
      async environment() {
         if (state.unauthorized) throw new T3UnauthorizedError('expired');
         return { environmentId: 'env', label: 'caburgua', serverVersion: '0.0.46' };
      },
      projects: async () => [ponderapp],
      threads: async () =>
         state.listed && state.thread
            ? [
                 {
                    threadId: state.thread.thread.threadId,
                    itemCount: state.thread.thread.itemCount,
                    updatedAt: state.thread.thread.updatedAt,
                 },
              ]
            : [],
      async thread(threadId) {
         reads.push(threadId);
         return state.thread;
      },
      close: async () => {},
   };
   return { reader, reads };
}

async function setup() {
   const store = openObserverStore(path.join(root, `${crypto.randomUUID()}.sqlite`));
   let inventory: CheckoutInventory = { complete: true, checkouts: [main, feed] };
   const cycle = (t3: T3Reader | null, overrides: Partial<CycleContext> = {}) =>
      observeOnce({
         queue: store,
         environmentLabel: 'caburgua',
         observerStartedAt: '2026-10-13T22:00:00.000Z',
         t3,
         t3Failure: t3 ? null : 'unreachable',
         readInventory: async () => inventory,
         now: () => new Date('2026-10-13T23:01:00.000Z'),
         force: false,
         heartbeat: false,
         ...overrides,
      });
   // Takes everything queued since the last call, as if the receiver acknowledged it.
   const drain = (): DevStateObservation[] => {
      const observations: DevStateObservation[] = [];
      for (let batch = store.pending(); batch; batch = store.pending()) {
         observations.push(...batch.observations);
         store.acknowledge(batch.observations[batch.observations.length - 1].sequence);
      }
      return observations;
   };
   const setInventory = (next: CheckoutInventory) => {
      inventory = next;
   };
   return { store, cycle, drain, setInventory };
}

test('publishes the inventory and agent activity, and only changes afterwards', async () => {
   const { cycle, drain } = await setup();
   const t3 = fakeT3({ thread: threadRead(), listed: true });

   assert.deepEqual(await cycle(t3.reader), { t3: 'ok' });
   const first = drain();
   assert.deepEqual(first.map((observation) => observation.kind).sort(), [
      'emitter',
      'interaction',
      'location',
      'location',
      'project',
      'run',
      'thread',
   ]);
   const project = first.find((observation) => observation.kind === 'project');
   assert.deepEqual(project?.kind === 'project' && project.repository, {
      canonicalKey: 'github.com/vcntttt/ponderapp',
      displayName: 'vcntttt/ponderapp',
   });
   const thread = first.find((observation) => observation.kind === 'thread');
   assert.equal(thread?.kind === 'thread' && thread.locationId, locationIdFor(feed));
   assert.equal(thread?.kind === 'thread' && thread.activity, 'running');
   // Only metadata travels: no conversation text in any observation.
   assert.ok(!JSON.stringify(first).includes('"text"'));

   await cycle(t3.reader);
   assert.deepEqual(drain(), []);
   assert.equal(t3.reads.length, 1, 'an unchanged updatedAt is not read again');
});

test('keeps observing Git and reports the expired T3 grant', async () => {
   const { cycle, drain, setInventory } = await setup();
   await cycle(fakeT3({ thread: threadRead(), listed: true }).reader);
   drain();

   const changed: Checkout = {
      ...main,
      state: { ok: true, git: { ...git, changes: { ...git.changes, staged: 1 } } },
   };
   setInventory({ complete: true, checkouts: [changed, feed] });
   assert.deepEqual(
      await cycle(fakeT3({ thread: null, listed: false, unauthorized: true }).reader),
      {
         t3: 'unauthorized',
      }
   );

   const observations = drain();
   const emitter = observations.find((observation) => observation.kind === 'emitter');
   assert.deepEqual(emitter?.kind === 'emitter' && emitter.t3, { status: 'unauthorized' });
   assert.deepEqual(
      observations.map((observation) => observation.kind).sort(),
      ['emitter', 'location'],
      'no project or thread is removed while T3 cannot be read'
   );
});

test('removes a checkout only after a complete listing', async () => {
   const { cycle, drain, setInventory } = await setup();
   const t3 = fakeT3({ thread: threadRead(), listed: true }).reader;
   await cycle(t3);
   drain();

   setInventory({ complete: false, error: 'git worktree list failed' });
   await cycle(t3);
   assert.deepEqual(drain(), []);

   setInventory({ complete: true, checkouts: [main] });
   await cycle(t3);
   const removed = drain().flatMap((observation) =>
      observation.kind === 'location_removed' ? [observation.locationId] : []
   );
   assert.deepEqual(removed, [locationIdFor(feed)]);
});

test('an archived thread stays known and only a deleted one is removed', async () => {
   const { cycle, drain } = await setup();
   const state = { thread: threadRead() as T3Thread | null, listed: true };
   const t3 = fakeT3(state).reader;
   await cycle(t3);
   drain();

   state.listed = false;
   state.thread = threadRead({ archived: true, status: 'idle' });
   await cycle(t3);
   const archived = drain().find((observation) => observation.kind === 'thread');
   assert.equal(archived?.kind === 'thread' && archived.archived, true);

   const deleted = await setup();
   const deletedState = { thread: threadRead() as T3Thread | null, listed: true };
   const deletedT3 = fakeT3(deletedState).reader;
   await deleted.cycle(deletedT3);
   deleted.drain();
   deletedState.listed = false;
   deletedState.thread = null;
   await deleted.cycle(deletedT3);
   assert.deepEqual(
      deleted.drain().map((observation) => observation.kind),
      ['thread_removed']
   );
});

test('a forced cycle sends every entity again', async () => {
   const { cycle, drain } = await setup();
   const t3 = fakeT3({ thread: threadRead(), listed: true }).reader;
   await cycle(t3);
   const first = drain().length;

   await cycle(t3, { force: true });
   assert.equal(drain().length, first);
});
