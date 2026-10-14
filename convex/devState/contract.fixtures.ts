import type { DevStateBatch, DevStateObservation } from './contract';

// Shared fixtures for the observer and the receiver. The valid batch models
// PonderApp on Caburgua: main with loose changes and no thread, a worktree
// with a waiting agent, a detached worktree and a dev server left running.

const observedAt = '2026-10-13T23:10:00.000Z';

const observations: DevStateObservation[] = [
   {
      kind: 'emitter',
      sequence: 1,
      observedAt,
      environmentLabel: 'caburgua',
      observerStartedAt: '2026-10-13T23:09:30.000Z',
      t3: { status: 'available', serverVersion: '0.0.46-nightly.20261012.3021' },
   },
   {
      kind: 'project',
      sequence: 2,
      observedAt,
      projectId: 'cdb9a168-3e0a-4acb-b262-e0ac2c96234b',
      title: 'PonderApp',
      workspaceRoot: '/home/vrivera/dev/ponderapp',
      repository: {
         canonicalKey: 'github.com/vcntttt/ponderapp',
         displayName: 'vcntttt/ponderapp',
      },
   },
   {
      kind: 'location',
      sequence: 3,
      observedAt,
      locationId: 'loc-ponderapp-main',
      projectId: 'cdb9a168-3e0a-4acb-b262-e0ac2c96234b',
      path: '/home/vrivera/dev/ponderapp',
      isMainCheckout: true,
      git: {
         branch: 'main',
         headOid: '4b825dc642cb6eb9a060e54bf8d69288fbee4904',
         changes: { staged: 0, unstaged: 3, untracked: 1, conflicted: 0 },
         upstream: { ref: 'origin/main', ahead: 0, behind: 2 },
         remoteCheckedAt: '2026-10-12T18:00:00.000Z',
      },
   },
   {
      kind: 'location',
      sequence: 4,
      observedAt,
      locationId: 'loc-ponderapp-feed',
      projectId: 'cdb9a168-3e0a-4acb-b262-e0ac2c96234b',
      path: '/home/vrivera/.t3/worktrees/ponderapp/feed',
      isMainCheckout: false,
      git: {
         branch: 'feat/feed',
         headOid: 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391',
         changes: { staged: 0, unstaged: 0, untracked: 0, conflicted: 0 },
         upstream: null,
         remoteCheckedAt: null,
      },
   },
   {
      kind: 'location',
      sequence: 5,
      observedAt,
      locationId: 'loc-ponderapp-bisect',
      projectId: 'cdb9a168-3e0a-4acb-b262-e0ac2c96234b',
      path: '/home/vrivera/.t3/worktrees/ponderapp/bisect',
      isMainCheckout: false,
      git: {
         branch: null,
         headOid: '4b825dc642cb6eb9a060e54bf8d69288fbee4904',
         changes: { staged: 0, unstaged: 0, untracked: 0, conflicted: 0 },
         upstream: null,
         remoteCheckedAt: null,
      },
   },
   {
      kind: 'thread',
      sequence: 6,
      observedAt,
      threadId: 'thread-feed',
      projectId: 'cdb9a168-3e0a-4acb-b262-e0ac2c96234b',
      locationId: 'loc-ponderapp-feed',
      parentThreadId: null,
      title: 'Feed de publicaciones',
      activity: 'waiting_for_user',
      t3Status: 'waiting',
      pendingRequestCount: 1,
      archived: false,
      updatedAt: '2026-10-13T23:05:00.000Z',
   },
   {
      kind: 'run',
      sequence: 7,
      observedAt,
      runId: 'run:thread-feed:ordinal:1',
      threadId: 'thread-feed',
      outcome: 'completed',
      startedAt: '2026-10-13T22:20:00.000Z',
      completedAt: '2026-10-13T23:05:00.000Z',
   },
   {
      kind: 'interaction',
      sequence: 8,
      observedAt,
      interactionId: 'message-1',
      threadId: 'thread-feed',
      type: 'message',
      at: '2026-10-13T22:19:40.000Z',
   },
   {
      kind: 'server',
      sequence: 9,
      observedAt,
      processKey: '48211:91822734',
      pid: 48211,
      processStartedAt: '2026-10-11T15:02:00.000Z',
      executable: 'bun',
      ports: [5173],
      locationId: 'loc-ponderapp-main',
      branch: { name: 'main', evidence: 'detection' },
      httpConfirmed: true,
   },
];

export const validBatch: DevStateBatch = {
   version: 1,
   environmentId: 'af421be3-3307-441a-b4db-912550d83029',
   streamId: '0f8b7a3e-5c1d-4e2a-9b6f-3d2c1a0e9f87',
   sentAt: '2026-10-13T23:10:01.000Z',
   observations,
};

// Later batch on the same stream: the checkout is gone after a full enumeration
// and the server was verified stopped.
export const followUpBatch: DevStateBatch = {
   ...validBatch,
   sentAt: '2026-10-13T23:20:01.000Z',
   observations: [
      {
         kind: 'location_removed',
         sequence: 10,
         observedAt: '2026-10-13T23:20:00.000Z',
         locationId: 'loc-ponderapp-bisect',
      },
      {
         kind: 'server_stopped',
         sequence: 11,
         observedAt: '2026-10-13T23:20:00.000Z',
         processKey: '48211:91822734',
      },
      {
         kind: 'history_gap',
         sequence: 12,
         observedAt: '2026-10-13T23:20:00.000Z',
         from: '2026-10-13T23:11:00.000Z',
         until: '2026-10-13T23:15:00.000Z',
         droppedObservations: 40,
      },
   ],
};

function withObservation(patch: Record<string, unknown>, index = 0): unknown {
   return {
      ...validBatch,
      observations: validBatch.observations.map((observation, position) =>
         position === index ? { ...observation, ...patch } : observation
      ),
   };
}

// Each entry must be rejected as `invalid_batch`.
export const invalidBatches: Record<string, unknown> = {
   'sequence gap inside a batch': withObservation({ sequence: 7 }, 1),
   'detached HEAD with an upstream': withObservation(
      {
         git: {
            branch: null,
            headOid: '4b825dc642cb6eb9a060e54bf8d69288fbee4904',
            changes: { staged: 0, unstaged: 0, untracked: 0, conflicted: 0 },
            upstream: { ref: 'origin/main', ahead: 0, behind: 0 },
            remoteCheckedAt: null,
         },
      },
      4
   ),
   'running run with an end': withObservation({ outcome: 'running' }, 6),
   'finished run without an end': withObservation({ completedAt: null }, 6),
   'run that ends before it starts': withObservation(
      { completedAt: '2026-10-13T22:00:00.000Z' },
      6
   ),
   'unknown observation kind': withObservation({ kind: 'terminal_output' }),
   'unexpected field': withObservation({ diff: '+secret' }, 2),
   'relative checkout path': withObservation({ path: 'dev/ponderapp' }, 2),
   'reused pid without start time': withObservation({ processKey: '48211' }, 8),
   'empty batch': { ...validBatch, observations: [] },
};

export const unsupportedVersionBatch: unknown = { ...validBatch, version: 2 };
