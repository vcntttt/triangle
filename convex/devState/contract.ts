import { z } from 'zod';

// Contract v1 between the local observer that runs next to T3 Code on each machine
// and Triangle's receiver. Both sides import these schemas; docs/integrations/t3-observations-v1.md
// explains the delivery rules they implement.

export const DEV_STATE_OBSERVATIONS_PATH = '/dev-state/observations';
export const DEV_STATE_CONTRACT_VERSIONS = [1] as const;
export const MAX_OBSERVATIONS_PER_BATCH = 200;
export const MAX_BATCH_BYTES = 256 * 1024;
// The observer sends an `emitter` observation at least this often; the receiver
// treats an environment as stale (last known state, not finished) after STALE_AFTER_MS.
export const HEARTBEAT_INTERVAL_MS = 60_000;
export const STALE_AFTER_MS = 3 * HEARTBEAT_INTERVAL_MS;

const isoDate = z.iso.datetime();
// T3 subagent thread ids embed their provider path and exceed 200 characters.
const id = z.string().min(1).max(1000);
const label = z.string().min(1).max(500);
const absolutePath = z.string().startsWith('/').max(4096);
const count = z.number().int().nonnegative();
const sequence = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const gitOid = z.string().regex(/^[0-9a-f]{40}([0-9a-f]{24})?$/);

const repository = z.strictObject({
   // T3's repository identity, e.g. `github.com/vcntttt/ponderapp`; forks have their own key.
   canonicalKey: z.string().min(1).max(300),
   displayName: label,
});

const git = z
   .strictObject({
      // null means detached HEAD.
      branch: z.string().min(1).max(500).nullable(),
      // null means an unborn branch with no commits.
      headOid: gitOid.nullable(),
      changes: z.strictObject({
         staged: count,
         unstaged: count,
         untracked: count,
         conflicted: count,
      }),
      // Counts against the local remote-tracking ref; null means the remote state is unknown.
      upstream: z
         .strictObject({ ref: z.string().min(1).max(500), ahead: count, behind: count })
         .nullable(),
      // Last real fetch the observer can prove (FETCH_HEAD); reading local refs never updates it.
      remoteCheckedAt: isoDate.nullable(),
   })
   .refine((value) => value.branch !== null || value.upstream === null, {
      message: 'A detached HEAD has no upstream',
      path: ['upstream'],
   });

const t3Availability = z.discriminatedUnion('status', [
   z.strictObject({ status: z.literal('available'), serverVersion: z.string().min(1).max(100) }),
   // The read-only MCP grant expired or was revoked; Vicente must approve the observer again.
   z.strictObject({ status: z.literal('unauthorized') }),
   z.strictObject({ status: z.literal('unreachable') }),
]);

const emitterObservation = z.strictObject({
   kind: z.literal('emitter'),
   sequence,
   observedAt: isoDate,
   environmentLabel: label,
   observerStartedAt: isoDate,
   t3: t3Availability,
});

const projectObservation = z.strictObject({
   kind: z.literal('project'),
   sequence,
   observedAt: isoDate,
   projectId: id,
   title: label,
   workspaceRoot: absolutePath,
   // null for repositories without a remote; those need an explicit association.
   repository: repository.nullable(),
});

const projectRemovedObservation = z.strictObject({
   kind: z.literal('project_removed'),
   sequence,
   observedAt: isoDate,
   projectId: id,
});

// A checkout on this machine. The observer mints `locationId`; a path that is
// removed and later reused gets a new id, a branch switch keeps it.
const locationObservation = z.strictObject({
   kind: z.literal('location'),
   sequence,
   observedAt: isoDate,
   locationId: id,
   projectId: id,
   path: absolutePath,
   isMainCheckout: z.boolean(),
   git,
});

// Only sent after a complete, successful enumeration no longer lists the checkout.
const locationRemovedObservation = z.strictObject({
   kind: z.literal('location_removed'),
   sequence,
   observedAt: isoDate,
   locationId: id,
});

const threadObservation = z.strictObject({
   kind: z.literal('thread'),
   sequence,
   observedAt: isoDate,
   threadId: id,
   projectId: id,
   // null when the thread's checkout is not in this machine's inventory.
   locationId: id.nullable(),
   parentThreadId: id.nullable(),
   title: label,
   // The observer maps T3 statuses here so new T3 statuses never break the contract.
   activity: z.enum(['idle', 'running', 'waiting_for_user', 'failed']),
   t3Status: z.string().min(1).max(100),
   pendingRequestCount: count,
   archived: z.boolean(),
   updatedAt: isoDate,
});

const threadRemovedObservation = z.strictObject({
   kind: z.literal('thread_removed'),
   sequence,
   observedAt: isoDate,
   threadId: id,
});

const runObservation = z
   .strictObject({
      kind: z.literal('run'),
      sequence,
      observedAt: isoDate,
      runId: id,
      threadId: id,
      outcome: z.enum(['queued', 'running', 'completed', 'failed', 'interrupted', 'cancelled']),
      startedAt: isoDate.nullable(),
      completedAt: isoDate.nullable(),
   })
   .superRefine((run, ctx) => {
      const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
      if (run.outcome === 'queued' && (run.startedAt !== null || run.completedAt !== null)) {
         issue('A queued run has not started');
      }
      if (run.outcome === 'running' && (run.startedAt === null || run.completedAt !== null)) {
         issue('A running run has a start and no end');
      }
      const finished = run.outcome !== 'queued' && run.outcome !== 'running';
      if (finished && run.completedAt === null) {
         issue('A finished run needs completedAt');
      }
      if (
         run.startedAt &&
         run.completedAt &&
         Date.parse(run.completedAt) < Date.parse(run.startedAt)
      ) {
         issue('completedAt is before startedAt');
      }
   });

// A listening process whose working directory is inside a T3 checkout.
// `processKey` is `${pid}:${startTime}` so a reused PID never inherits history.
const serverObservation = z.strictObject({
   kind: z.literal('server'),
   sequence,
   observedAt: isoDate,
   processKey: z.string().regex(/^\d+:\d+$/),
   pid: z.number().int().positive(),
   processStartedAt: isoDate,
   executable: z.string().min(1).max(200),
   ports: z.array(z.number().int().min(1).max(65_535)).min(1).max(50),
   locationId: id,
   // `launch` only when the location's history proves the branch at process start.
   branch: z.strictObject({
      name: z.string().min(1).max(500).nullable(),
      evidence: z.enum(['launch', 'detection']),
   }),
   httpConfirmed: z.boolean(),
});

// Sent only when the observer verified the process is gone; missing observations never imply it.
const serverStoppedObservation = z.strictObject({
   kind: z.literal('server_stopped'),
   sequence,
   observedAt: isoDate,
   processKey: z.string().regex(/^\d+:\d+$/),
});

// A user-authored event in T3, the only personal-attention signal official T3 exposes.
const interactionObservation = z.strictObject({
   kind: z.literal('interaction'),
   sequence,
   observedAt: isoDate,
   interactionId: id,
   threadId: id,
   type: z.enum(['message', 'request_response']),
   at: isoDate,
});

// The observer dropped observations (queue limit); the receiver must not treat that span as quiet.
const historyGapObservation = z
   .strictObject({
      kind: z.literal('history_gap'),
      sequence,
      observedAt: isoDate,
      from: isoDate,
      until: isoDate,
      droppedObservations: z.number().int().positive(),
   })
   .refine((gap) => Date.parse(gap.until) >= Date.parse(gap.from), {
      message: 'until is before from',
   });

export const devStateObservation = z.discriminatedUnion('kind', [
   emitterObservation,
   projectObservation,
   projectRemovedObservation,
   locationObservation,
   locationRemovedObservation,
   threadObservation,
   threadRemovedObservation,
   runObservation,
   serverObservation,
   serverStoppedObservation,
   interactionObservation,
   historyGapObservation,
]);

export const devStateBatch = z
   .strictObject({
      version: z.literal(1),
      environmentId: id,
      // One stream per observer state; a reset observer starts a new stream at sequence 1.
      streamId: z.uuid(),
      sentAt: isoDate,
      observations: z.array(devStateObservation).min(1).max(MAX_OBSERVATIONS_PER_BATCH),
   })
   .refine(
      (batch) =>
         batch.observations.every(
            (observation, index) => observation.sequence === batch.observations[0].sequence + index
         ),
      { message: 'Sequences must be contiguous and ascending', path: ['observations'] }
   );

export type DevStateObservation = z.infer<typeof devStateObservation>;
export type DevStateBatch = z.infer<typeof devStateBatch>;
// What the observer queues; the queue assigns `sequence` when it persists the observation.
type WithoutSequence<T> = T extends unknown ? Omit<T, 'sequence'> : never;
export type DevStateObservationDraft = WithoutSequence<DevStateObservation>;

export const devStateResponse = z.discriminatedUnion('status', [
   // HTTP 200. Everything up to this sequence is persisted; the observer may drop it.
   z.strictObject({ status: z.literal('accepted'), acknowledgedThrough: sequence }),
   // HTTP 409. The observer sends again from `expectedSequence`, or reports a history_gap if it no longer has it.
   z.strictObject({ status: z.literal('sequence_gap'), expectedSequence: sequence }),
   // HTTP 409. A newer stream replaced this one; the observer stops sending on it.
   z.strictObject({ status: z.literal('stream_superseded') }),
   // HTTP 400 or 403. Retrying the same batch cannot succeed.
   z.strictObject({
      status: z.literal('rejected'),
      reason: z.enum(['invalid_batch', 'unsupported_version', 'environment_mismatch']),
      supportedVersions: z.array(z.number().int()),
      issues: z.array(z.string()).max(20),
   }),
]);

export type DevStateResponse = z.infer<typeof devStateResponse>;

export type DevStateBatchParseResult =
   | { ok: true; batch: DevStateBatch }
   | { ok: false; reason: 'unsupported_version' | 'invalid_batch'; issues: string[] };

// Separates an unknown version from a malformed batch so the receiver can answer each precisely.
export function parseDevStateBatch(input: unknown): DevStateBatchParseResult {
   const version = z.object({ version: z.number() }).safeParse(input);
   if (
      version.success &&
      !DEV_STATE_CONTRACT_VERSIONS.some((supported) => supported === version.data.version)
   ) {
      return {
         ok: false,
         reason: 'unsupported_version',
         issues: [`Unsupported version ${version.data.version}`],
      };
   }
   const parsed = devStateBatch.safeParse(input);
   if (parsed.success) return { ok: true, batch: parsed.data };
   return {
      ok: false,
      reason: 'invalid_batch',
      issues: parsed.error.issues
         .slice(0, 20)
         .map((issue) => `${issue.path.join('.') || '(batch)'}: ${issue.message}`),
   };
}
