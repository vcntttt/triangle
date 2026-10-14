import { v, type Infer } from 'convex/values';
import type { Doc } from '../_generated/dataModel';
import { internalMutation, type MutationCtx } from '../_generated/server';
import {
   DEV_STATE_CONTRACT_VERSIONS,
   parseDevStateBatch,
   type DevStateObservation,
   type DevStateResponse,
} from './contract';
import type { devStateEntityKind } from './tables';

// Applies one observer batch atomically. The HTTP action only hashes the token
// and maps the result to a status code, so auth, sequencing and writes share one transaction.

const CLOCK_SKEW_TOLERANCE_MS = 5 * 60_000;
const MAX_HISTORY_VALUE_LENGTH = 500;

export type IngestResult = { httpStatus: number; body: DevStateResponse | null };

type EntityKind = Infer<typeof devStateEntityKind>;
type HistoryField = Doc<'devStateHistory'>['fields'][number];

type Apply = {
   ctx: MutationCtx;
   environmentId: string;
   receivedAt: number;
   // Converts an observer timestamp to receiver time, correcting a skewed clock.
   time: (iso: string) => number;
};

function rejected(
   httpStatus: number,
   reason: 'invalid_batch' | 'unsupported_version' | 'environment_mismatch',
   issues: string[]
): IngestResult {
   return {
      httpStatus,
      body: {
         status: 'rejected',
         reason,
         supportedVersions: [...DEV_STATE_CONTRACT_VERSIONS],
         issues,
      },
   };
}

export const applyBatch = internalMutation({
   args: { tokenHash: v.string(), body: v.string() },
   handler: async (ctx, { tokenHash, body }): Promise<IngestResult> => {
      const credential = await ctx.db
         .query('devStateCredentials')
         .withIndex('by_tokenHash', (q) => q.eq('tokenHash', tokenHash))
         .unique();
      if (!credential || credential.revokedAt !== undefined) return { httpStatus: 401, body: null };

      let input: unknown;
      try {
         input = JSON.parse(body);
      } catch {
         return rejected(400, 'invalid_batch', ['Body is not JSON']);
      }
      const parsed = parseDevStateBatch(input);
      if (!parsed.ok) return rejected(400, parsed.reason, parsed.issues);
      const batch = parsed.batch;
      if (batch.environmentId !== credential.environmentId) {
         return rejected(403, 'environment_mismatch', []);
      }

      const receivedAt = Date.now();
      const { environmentId, streamId } = batch;
      const firstSequence = batch.observations[0].sequence;
      const lastSequence = batch.observations[batch.observations.length - 1].sequence;

      let stream = await ctx.db
         .query('devStateStreams')
         .withIndex('by_environment_stream', (q) =>
            q.eq('environmentId', environmentId).eq('streamId', streamId)
         )
         .unique();
      if (stream?.supersededAt !== undefined)
         return { httpStatus: 409, body: { status: 'stream_superseded' } };
      const expectedSequence = (stream?.lastSequence ?? 0) + 1;
      if (firstSequence > expectedSequence) {
         return { httpStatus: 409, body: { status: 'sequence_gap', expectedSequence } };
      }

      const skewMs = receivedAt - Date.parse(batch.sentAt);
      const correction = Math.abs(skewMs) > CLOCK_SKEW_TOLERANCE_MS ? skewMs : 0;
      const apply: Apply = {
         ctx,
         environmentId,
         receivedAt,
         time: (iso) => Date.parse(iso) + correction,
      };

      if (!stream) {
         await startStream(apply, streamId);
         stream = await ctx.db
            .query('devStateStreams')
            .withIndex('by_environment_stream', (q) =>
               q.eq('environmentId', environmentId).eq('streamId', streamId)
            )
            .unique();
         if (!stream) throw new Error('Stream was not created');
      }

      for (const observation of batch.observations) {
         if (observation.sequence > stream.lastSequence) await applyObservation(apply, observation);
      }

      const acknowledgedThrough = Math.max(stream.lastSequence, lastSequence);
      await ctx.db.patch(stream._id, { lastSequence: acknowledgedThrough });
      const environment = await getEnvironment(ctx, environmentId);
      if (environment) {
         await ctx.db.patch(environment._id, { lastReceivedAt: receivedAt, clockSkewMs: skewMs });
      }
      return { httpStatus: 200, body: { status: 'accepted', acknowledgedThrough } };
   },
});

function getEnvironment(ctx: MutationCtx, environmentId: string) {
   return ctx.db
      .query('devStateEnvironments')
      .withIndex('by_environment', (q) => q.eq('environmentId', environmentId))
      .unique();
}

// A new stream means the observer lost its state: the previous stream is retired
// and the span since its last batch is recorded as unobserved.
async function startStream({ ctx, environmentId, receivedAt }: Apply, streamId: string) {
   await ctx.db.insert('devStateStreams', {
      environmentId,
      streamId,
      lastSequence: 0,
      startedAt: receivedAt,
   });
   const environment = await getEnvironment(ctx, environmentId);
   if (!environment) {
      await ctx.db.insert('devStateEnvironments', {
         environmentId,
         label: environmentId,
         currentStreamId: streamId,
         lastReceivedAt: receivedAt,
         clockSkewMs: 0,
      });
      return;
   }
   const previous = await ctx.db
      .query('devStateStreams')
      .withIndex('by_environment_stream', (q) =>
         q.eq('environmentId', environmentId).eq('streamId', environment.currentStreamId)
      )
      .unique();
   if (previous) await ctx.db.patch(previous._id, { supersededAt: receivedAt });
   await ctx.db.patch(environment._id, { currentStreamId: streamId });
   await ctx.db.insert('devStateHistory', {
      environmentId,
      entityKind: 'environment',
      entityId: environmentId,
      change: 'stream_reset',
      fields: [],
      observedAt: environment.lastReceivedAt,
      receivedAt,
      gapUntil: receivedAt,
   });
}

async function applyObservation(apply: Apply, observation: DevStateObservation) {
   const { ctx, environmentId } = apply;
   const observedAt = apply.time(observation.observedAt);
   const firstSeen = { environmentId, firstObservedAt: observedAt, lastObservedAt: observedAt };
   const seen = { lastObservedAt: observedAt };

   switch (observation.kind) {
      case 'emitter': {
         const environment = await getEnvironment(ctx, environmentId);
         if (!environment) return;
         const next = {
            label: observation.environmentLabel,
            observerStartedAt: apply.time(observation.observerStartedAt),
            t3: observation.t3,
         };
         const fields = changedFields(environment, next);
         if (fields.length === 0) return;
         await ctx.db.patch(environment._id, next);
         await recordHistory(apply, 'environment', environmentId, 'changed', fields, observedAt);
         return;
      }
      case 'project': {
         const existing = await ctx.db
            .query('devStateProjects')
            .withIndex('by_environment_project', (q) =>
               q.eq('environmentId', environmentId).eq('projectId', observation.projectId)
            )
            .unique();
         const next = {
            projectId: observation.projectId,
            title: observation.title,
            workspaceRoot: observation.workspaceRoot,
            repositoryKey: observation.repository?.canonicalKey,
            repositoryName: observation.repository?.displayName,
         };
         if (existing) await ctx.db.patch(existing._id, { ...next, ...seen, removedAt: undefined });
         else await ctx.db.insert('devStateProjects', { ...next, ...firstSeen });
         await recordChange(apply, 'project', observation.projectId, existing, next, observedAt);
         return;
      }
      case 'location': {
         const existing = await ctx.db
            .query('devStateLocations')
            .withIndex('by_environment_location', (q) =>
               q.eq('environmentId', environmentId).eq('locationId', observation.locationId)
            )
            .unique();
         const { remoteCheckedAt, ...git } = observation.git;
         const next = {
            locationId: observation.locationId,
            projectId: observation.projectId,
            path: observation.path,
            isMainCheckout: observation.isMainCheckout,
            git: {
               ...git,
               remoteCheckedAt: remoteCheckedAt === null ? null : apply.time(remoteCheckedAt),
            },
         };
         if (existing) await ctx.db.patch(existing._id, { ...next, ...seen, removedAt: undefined });
         else await ctx.db.insert('devStateLocations', { ...next, ...firstSeen });
         await recordChange(apply, 'location', observation.locationId, existing, next, observedAt);
         return;
      }
      case 'thread': {
         const existing = await ctx.db
            .query('devStateThreads')
            .withIndex('by_environment_thread', (q) =>
               q.eq('environmentId', environmentId).eq('threadId', observation.threadId)
            )
            .unique();
         const next = {
            threadId: observation.threadId,
            projectId: observation.projectId,
            locationId: observation.locationId,
            parentThreadId: observation.parentThreadId,
            title: observation.title,
            activity: observation.activity,
            t3Status: observation.t3Status,
            pendingRequestCount: observation.pendingRequestCount,
            archived: observation.archived,
         };
         // Every message moves updatedAt, so it is stored but kept out of the history.
         const updatedAt = apply.time(observation.updatedAt);
         if (existing)
            await ctx.db.patch(existing._id, { ...next, ...seen, updatedAt, removedAt: undefined });
         else await ctx.db.insert('devStateThreads', { ...next, ...firstSeen, updatedAt });
         await recordChange(apply, 'thread', observation.threadId, existing, next, observedAt);
         return;
      }
      case 'run': {
         const existing = await ctx.db
            .query('devStateRuns')
            .withIndex('by_environment_run', (q) =>
               q.eq('environmentId', environmentId).eq('runId', observation.runId)
            )
            .unique();
         const next = {
            runId: observation.runId,
            threadId: observation.threadId,
            outcome: observation.outcome,
            startedAt: observation.startedAt === null ? null : apply.time(observation.startedAt),
            completedAt:
               observation.completedAt === null ? null : apply.time(observation.completedAt),
         };
         if (existing) await ctx.db.patch(existing._id, { ...next, ...seen });
         else await ctx.db.insert('devStateRuns', { ...next, ...firstSeen });
         await recordChange(apply, 'run', observation.runId, existing, next, observedAt);
         return;
      }
      case 'server': {
         const existing = await ctx.db
            .query('devStateServers')
            .withIndex('by_environment_process', (q) =>
               q.eq('environmentId', environmentId).eq('processKey', observation.processKey)
            )
            .unique();
         const next = {
            processKey: observation.processKey,
            pid: observation.pid,
            processStartedAt: apply.time(observation.processStartedAt),
            executable: observation.executable,
            ports: observation.ports,
            locationId: observation.locationId,
            branch: existing?.branch ?? observation.branch,
            httpConfirmed: observation.httpConfirmed,
         };
         if (existing) await ctx.db.patch(existing._id, { ...next, ...seen, stoppedAt: undefined });
         else await ctx.db.insert('devStateServers', { ...next, ...firstSeen });
         await recordChange(apply, 'server', observation.processKey, existing, next, observedAt);
         return;
      }
      case 'interaction': {
         const existing = await ctx.db
            .query('devStateInteractions')
            .withIndex('by_environment_interaction', (q) =>
               q.eq('environmentId', environmentId).eq('interactionId', observation.interactionId)
            )
            .unique();
         if (existing) return;
         await ctx.db.insert('devStateInteractions', {
            environmentId,
            interactionId: observation.interactionId,
            threadId: observation.threadId,
            type: observation.type,
            at: apply.time(observation.at),
         });
         return;
      }
      case 'project_removed': {
         const existing = await ctx.db
            .query('devStateProjects')
            .withIndex('by_environment_project', (q) =>
               q.eq('environmentId', environmentId).eq('projectId', observation.projectId)
            )
            .unique();
         if (!existing || existing.removedAt !== undefined) return;
         await ctx.db.patch(existing._id, { ...seen, removedAt: observedAt });
         await recordHistory(apply, 'project', observation.projectId, 'removed', [], observedAt);
         return;
      }
      case 'location_removed': {
         const existing = await ctx.db
            .query('devStateLocations')
            .withIndex('by_environment_location', (q) =>
               q.eq('environmentId', environmentId).eq('locationId', observation.locationId)
            )
            .unique();
         if (!existing || existing.removedAt !== undefined) return;
         await ctx.db.patch(existing._id, { ...seen, removedAt: observedAt });
         await recordHistory(apply, 'location', observation.locationId, 'removed', [], observedAt);
         return;
      }
      case 'thread_removed': {
         const existing = await ctx.db
            .query('devStateThreads')
            .withIndex('by_environment_thread', (q) =>
               q.eq('environmentId', environmentId).eq('threadId', observation.threadId)
            )
            .unique();
         if (!existing || existing.removedAt !== undefined) return;
         await ctx.db.patch(existing._id, { ...seen, removedAt: observedAt });
         await recordHistory(apply, 'thread', observation.threadId, 'removed', [], observedAt);
         return;
      }
      case 'server_stopped': {
         const existing = await ctx.db
            .query('devStateServers')
            .withIndex('by_environment_process', (q) =>
               q.eq('environmentId', environmentId).eq('processKey', observation.processKey)
            )
            .unique();
         if (!existing || existing.stoppedAt !== undefined) return;
         await ctx.db.patch(existing._id, { ...seen, stoppedAt: observedAt });
         await recordHistory(apply, 'server', observation.processKey, 'stopped', [], observedAt);
         return;
      }
      case 'history_gap': {
         await ctx.db.insert('devStateHistory', {
            environmentId,
            entityKind: 'environment',
            entityId: environmentId,
            change: 'gap',
            fields: [{ field: 'droppedObservations', to: String(observation.droppedObservations) }],
            observedAt: apply.time(observation.from),
            receivedAt: apply.receivedAt,
            gapUntil: apply.time(observation.until),
         });
         return;
      }
   }
}

// The first observation of an entity is its baseline; later ones record only fields that changed.
async function recordChange(
   apply: Apply,
   kind: EntityKind,
   entityId: string,
   previous: Record<string, unknown> | null,
   next: Record<string, unknown>,
   observedAt: number
) {
   if (!previous) {
      await recordHistory(apply, kind, entityId, 'baseline', [], observedAt);
      return;
   }
   const fields = changedFields(previous, next);
   // A removed entity that shows up again is a change even when its fields are identical.
   const reappeared = previous.removedAt !== undefined || previous.stoppedAt !== undefined;
   if (fields.length > 0 || reappeared) {
      await recordHistory(apply, kind, entityId, 'changed', fields, observedAt);
   }
}

function changedFields(
   previous: Record<string, unknown>,
   next: Record<string, unknown>
): HistoryField[] {
   const fields: HistoryField[] = [];
   for (const [field, value] of Object.entries(next)) {
      const from = serialize(previous[field]);
      const to = serialize(value);
      if (from !== to) fields.push({ field, from, to });
   }
   return fields;
}

function serialize(value: unknown): string | undefined {
   if (value === undefined) return undefined;
   const json = JSON.stringify(value);
   return json.length > MAX_HISTORY_VALUE_LENGTH
      ? `${json.slice(0, MAX_HISTORY_VALUE_LENGTH)}…`
      : json;
}

async function recordHistory(
   { ctx, environmentId, receivedAt }: Apply,
   entityKind: EntityKind,
   entityId: string,
   change: Doc<'devStateHistory'>['change'],
   fields: HistoryField[],
   observedAt: number
) {
   await ctx.db.insert('devStateHistory', {
      environmentId,
      entityKind,
      entityId,
      change,
      fields,
      observedAt,
      receivedAt,
   });
}
