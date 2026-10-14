import { defineTable } from 'convex/server';
import { v, type Validator } from 'convex/values';

// Development state reported by the local observers (TRI-17). Every row is
// scoped by T3's `environmentId`: T3 ids are only unique inside their environment.
// Times are milliseconds, already corrected for a skewed observer clock.

const nullable = <T extends Validator<unknown, 'required', string>>(validator: T) =>
   v.union(validator, v.null());

const observed = {
   environmentId: v.string(),
   // The first observation is a baseline: "detected since", never "started at".
   firstObservedAt: v.number(),
   lastObservedAt: v.number(),
};

export const devStateGit = v.object({
   branch: nullable(v.string()),
   headOid: nullable(v.string()),
   changes: v.object({
      staged: v.number(),
      unstaged: v.number(),
      untracked: v.number(),
      conflicted: v.number(),
   }),
   upstream: nullable(v.object({ ref: v.string(), ahead: v.number(), behind: v.number() })),
   remoteCheckedAt: nullable(v.number()),
});

export const devStateT3Availability = v.union(
   v.object({ status: v.literal('available'), serverVersion: v.string() }),
   v.object({ status: v.literal('unauthorized') }),
   v.object({ status: v.literal('unreachable') })
);

export const devStateEntityKind = v.union(
   v.literal('environment'),
   v.literal('project'),
   v.literal('location'),
   v.literal('thread'),
   v.literal('run'),
   v.literal('server')
);

export const devStateTables = {
   // Only the hash is stored; the token is shown once when created.
   devStateCredentials: defineTable({
      environmentId: v.string(),
      tokenHash: v.string(),
      label: v.string(),
      createdAt: v.number(),
      revokedAt: v.optional(v.number()),
   })
      .index('by_tokenHash', ['tokenHash'])
      .index('by_environment', ['environmentId']),
   devStateEnvironments: defineTable({
      environmentId: v.string(),
      label: v.string(),
      currentStreamId: v.string(),
      lastReceivedAt: v.number(),
      observerStartedAt: v.optional(v.number()),
      t3: v.optional(devStateT3Availability),
      clockSkewMs: v.number(),
   }).index('by_environment', ['environmentId']),
   devStateStreams: defineTable({
      environmentId: v.string(),
      streamId: v.string(),
      lastSequence: v.number(),
      startedAt: v.number(),
      supersededAt: v.optional(v.number()),
   }).index('by_environment_stream', ['environmentId', 'streamId']),
   devStateProjects: defineTable({
      ...observed,
      projectId: v.string(),
      title: v.string(),
      workspaceRoot: v.string(),
      // Absent for repositories without a remote; they need an explicit association.
      repositoryKey: v.optional(v.string()),
      repositoryName: v.optional(v.string()),
      removedAt: v.optional(v.number()),
   })
      .index('by_environment_project', ['environmentId', 'projectId'])
      .index('by_repository', ['repositoryKey']),
   devStateLocations: defineTable({
      ...observed,
      locationId: v.string(),
      projectId: v.string(),
      path: v.string(),
      isMainCheckout: v.boolean(),
      git: devStateGit,
      removedAt: v.optional(v.number()),
   })
      .index('by_environment_location', ['environmentId', 'locationId'])
      .index('by_environment_project', ['environmentId', 'projectId']),
   devStateThreads: defineTable({
      ...observed,
      threadId: v.string(),
      projectId: v.string(),
      locationId: nullable(v.string()),
      parentThreadId: nullable(v.string()),
      title: v.string(),
      activity: v.union(
         v.literal('idle'),
         v.literal('running'),
         v.literal('waiting_for_user'),
         v.literal('failed')
      ),
      t3Status: v.string(),
      pendingRequestCount: v.number(),
      archived: v.boolean(),
      updatedAt: v.number(),
      removedAt: v.optional(v.number()),
   })
      .index('by_environment_thread', ['environmentId', 'threadId'])
      .index('by_environment_project', ['environmentId', 'projectId']),
   devStateRuns: defineTable({
      ...observed,
      runId: v.string(),
      threadId: v.string(),
      outcome: v.union(
         v.literal('queued'),
         v.literal('running'),
         v.literal('completed'),
         v.literal('failed'),
         v.literal('interrupted'),
         v.literal('cancelled')
      ),
      startedAt: nullable(v.number()),
      completedAt: nullable(v.number()),
   })
      .index('by_environment_run', ['environmentId', 'runId'])
      .index('by_environment_thread', ['environmentId', 'threadId']),
   devStateServers: defineTable({
      ...observed,
      processKey: v.string(),
      pid: v.number(),
      processStartedAt: v.number(),
      executable: v.string(),
      ports: v.array(v.number()),
      locationId: v.string(),
      // Fixed by the first observation: a later branch switch in the checkout never rewrites it.
      branch: v.object({
         name: nullable(v.string()),
         evidence: v.union(v.literal('launch'), v.literal('detection')),
      }),
      httpConfirmed: v.boolean(),
      stoppedAt: v.optional(v.number()),
   })
      .index('by_environment_process', ['environmentId', 'processKey'])
      .index('by_environment_location', ['environmentId', 'locationId']),
   devStateInteractions: defineTable({
      environmentId: v.string(),
      interactionId: v.string(),
      threadId: v.string(),
      type: v.union(v.literal('message'), v.literal('request_response')),
      at: v.number(),
   })
      .index('by_environment_interaction', ['environmentId', 'interactionId'])
      .index('by_at', ['at']),
   // Relevant transitions only; identical repeated observations add nothing.
   devStateHistory: defineTable({
      environmentId: v.string(),
      entityKind: devStateEntityKind,
      entityId: v.string(),
      change: v.union(
         v.literal('baseline'),
         v.literal('changed'),
         v.literal('removed'),
         v.literal('stopped'),
         v.literal('stream_reset'),
         v.literal('gap')
      ),
      // Changed fields as JSON values, so the history stays readable without a copy of each state.
      fields: v.array(
         v.object({ field: v.string(), from: v.optional(v.string()), to: v.optional(v.string()) })
      ),
      observedAt: v.number(),
      receivedAt: v.number(),
      // End of the unobserved span for `gap` and `stream_reset`.
      gapUntil: v.optional(v.number()),
   })
      .index('by_environment_entity', ['environmentId', 'entityKind', 'entityId', 'observedAt'])
      .index('by_environment_observedAt', ['environmentId', 'observedAt']),
};
