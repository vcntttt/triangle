import { createHash } from 'node:crypto';

import type { DevStateObservation, DevStateObservationDraft } from '../convex/devState/contract';
import type { Checkout, CheckoutInventory } from './git';
import { MAX_TIMELINE_ITEMS, type T3Project, type T3Reader, T3UnauthorizedError } from './t3';

// One observation cycle: reads T3 and Git, and queues only what changed since the
// last queued state. Removals are queued only after a complete, successful listing.

type Draft<K extends DevStateObservation['kind']> = Omit<
   Extract<DevStateObservation, { kind: K }>,
   'sequence'
>;
type ProjectDraft = Draft<'project'>;
type ThreadDraft = Draft<'thread'>;
type Activity = ThreadDraft['activity'];
type RunOutcome = Draft<'run'>['outcome'];

// The part of the store a cycle needs; observer/store.ts implements it.
export type ObservationQueue = {
   enqueueChanged(
      entries: { key: string; draft: DevStateObservationDraft }[],
      options?: { force?: boolean }
   ): number;
   enqueueRemoval(key: string, draft: DevStateObservationDraft): void;
   snapshotEntries(prefix: string): { key: string; draft: DevStateObservationDraft }[];
   snapshotKeys(prefix: string): string[];
};

export type CycleContext = {
   queue: ObservationQueue;
   environmentLabel: string;
   observerStartedAt: string;
   // null when no T3 connection could be opened in this cycle.
   t3: T3Reader | null;
   t3Failure: 'unauthorized' | 'unreachable' | null;
   readInventory: (projectRoot: string) => Promise<CheckoutInventory>;
   now: () => Date;
   // Resend every entity: first cycle after start or after the stream was reset.
   force: boolean;
   // Resend the emitter so the receiver sees the observer alive.
   heartbeat: boolean;
};

export async function observeOnce(
   context: CycleContext
): Promise<{ t3: 'ok' | 'unauthorized' | 'unreachable' }> {
   const { queue, force } = context;
   const observedAt = context.now().toISOString();

   let t3Status: 'ok' | 'unauthorized' | 'unreachable' = context.t3Failure ?? 'ok';
   let serverVersion: string | null = null;
   let projects: T3Project[] | null = null;
   if (context.t3) {
      try {
         serverVersion = (await context.t3.environment()).serverVersion;
         projects = await context.t3.projects();
      } catch (error) {
         t3Status = error instanceof T3UnauthorizedError ? 'unauthorized' : 'unreachable';
      }
   }

   queue.enqueueChanged(
      [
         {
            key: 'emitter',
            draft: {
               kind: 'emitter',
               observedAt,
               environmentLabel: context.environmentLabel,
               observerStartedAt: context.observerStartedAt,
               t3:
                  t3Status === 'ok' && serverVersion
                     ? { status: 'available', serverVersion }
                     : { status: t3Status === 'unauthorized' ? 'unauthorized' : 'unreachable' },
            },
         },
      ],
      { force: force || context.heartbeat }
   );

   // Without T3, Git keeps being observed on the last projects T3 reported.
   const projectDrafts =
      projects?.map((project) => projectDraft(project, observedAt)) ??
      queue
         .snapshotEntries('project:')
         .map((entry) => entry.draft)
         .filter((draft): draft is ProjectDraft => draft.kind === 'project');

   if (projects) {
      queue.enqueueChanged(
         projectDrafts.map((draft) => ({ key: `project:${draft.projectId}`, draft })),
         { force }
      );
      const current = new Set(projectDrafts.map((draft) => `project:${draft.projectId}`));
      for (const key of queue.snapshotKeys('project:')) {
         if (current.has(key)) continue;
         const projectId = key.slice('project:'.length);
         queue.enqueueRemoval(key, { kind: 'project_removed', observedAt, projectId });
      }
   }

   for (const project of projectDrafts) {
      const checkouts = await observeLocations(context, project, observedAt);
      if (context.t3 && projects && t3Status === 'ok') {
         try {
            await observeThreads(context, context.t3, project, checkouts, observedAt);
         } catch (error) {
            t3Status = error instanceof T3UnauthorizedError ? 'unauthorized' : 'unreachable';
         }
      }
   }
   return { t3: t3Status };
}

function projectDraft(project: T3Project, observedAt: string): ProjectDraft {
   const identity = project.repositoryIdentity;
   const grouping = identity?.origin ?? identity;
   return {
      kind: 'project',
      observedAt,
      projectId: project.id,
      title: project.title,
      workspaceRoot: project.workspaceRoot,
      repository: grouping
         ? {
              canonicalKey: grouping.canonicalKey,
              displayName: grouping.displayName ?? grouping.canonicalKey,
           }
         : null,
   };
}

// The id changes when a path is removed and recreated, never on a branch switch.
export function locationIdFor(checkout: Pick<Checkout, 'path' | 'fsIdentity'>) {
   const digest = createHash('sha256').update(`${checkout.path}\0${checkout.fsIdentity}`);
   return `loc_${digest.digest('hex').slice(0, 32)}`;
}

// Returns the readable checkouts by path, used to bind threads to their location.
async function observeLocations(context: CycleContext, project: ProjectDraft, observedAt: string) {
   const { queue, force } = context;
   const inventory = await context.readInventory(project.workspaceRoot);
   const byPath = new Map<string, string>();
   if (!inventory.complete) return byPath;

   const prefix = `location:${project.projectId}:`;
   const listed = new Set<string>();
   const entries = [];
   for (const checkout of inventory.checkouts) {
      const locationId = locationIdFor(checkout);
      listed.add(`${prefix}${locationId}`);
      byPath.set(checkout.path, locationId);
      // A checkout that could not be read keeps its last state; it is still listed.
      if (!checkout.state.ok) continue;
      entries.push({
         key: `${prefix}${locationId}`,
         draft: {
            kind: 'location' as const,
            observedAt,
            locationId,
            projectId: project.projectId,
            path: checkout.path,
            isMainCheckout: checkout.isMainCheckout,
            git: checkout.state.git,
         },
      });
   }
   queue.enqueueChanged(entries, { force });
   for (const key of queue.snapshotKeys(prefix)) {
      if (listed.has(key)) continue;
      const locationId = key.slice(prefix.length);
      queue.enqueueRemoval(key, { kind: 'location_removed', observedAt, locationId });
   }
   return byPath;
}

async function observeThreads(
   context: CycleContext,
   t3: T3Reader,
   project: ProjectDraft,
   locationsByPath: Map<string, string>,
   observedAt: string
) {
   const { queue, force } = context;
   const prefix = `thread:${project.projectId}:`;
   const known = new Map(
      queue
         .snapshotEntries(prefix)
         .map((entry) => entry.draft)
         .filter((draft): draft is ThreadDraft => draft.kind === 'thread')
         .map((draft) => [draft.threadId, draft])
   );
   const summaries = await t3.threads(project.projectId);
   const listed = new Set(summaries.map((summary) => summary.threadId));

   const toRead = summaries.filter(
      (summary) => force || known.get(summary.threadId)?.updatedAt !== summary.updatedAt
   );
   // A thread missing from the list may be archived; only T3 saying it is gone removes it.
   // Threads already known as archived are not read again on every cycle.
   const missing = [...known.values()]
      .filter((draft) => !listed.has(draft.threadId) && !draft.archived)
      .map((draft) => draft.threadId);

   for (const { threadId, itemCount } of [
      ...toRead,
      ...missing.map((threadId) => ({ threadId, itemCount: 0 })),
   ]) {
      // Only the newest positions are read: older interactions are not history to rebuild.
      const after = itemCount - MAX_TIMELINE_ITEMS - 1;
      const read = await t3.thread(threadId, after >= 0 ? after : null);
      if (!read) {
         queue.enqueueRemoval(`${prefix}${threadId}`, {
            kind: 'thread_removed',
            observedAt,
            threadId,
         });
         continue;
      }
      const { thread } = read;
      const checkoutPath = thread.worktreePath ?? project.workspaceRoot;
      queue.enqueueChanged(
         [
            {
               key: `${prefix}${threadId}`,
               draft: {
                  kind: 'thread',
                  observedAt,
                  threadId,
                  projectId: project.projectId,
                  locationId: locationsByPath.get(checkoutPath) ?? null,
                  parentThreadId: thread.parentThreadId,
                  title: thread.title,
                  activity: threadActivity(thread.status, thread.pendingRequestCount),
                  t3Status: thread.status,
                  pendingRequestCount: thread.pendingRequestCount,
                  archived: thread.archived,
                  updatedAt: thread.updatedAt,
               },
            },
            ...read.recentRuns.flatMap((run) => {
               const draft = runDraft(run, threadId, observedAt);
               return draft ? [{ key: `run:${run.runId}`, draft }] : [];
            }),
            ...read.items
               .filter((item) => item.type === 'user_message' && item.createdBy === 'user')
               .map((item) => ({
                  key: `interaction:${item.itemId}`,
                  draft: {
                     kind: 'interaction' as const,
                     observedAt,
                     interactionId: item.itemId,
                     threadId,
                     type: 'message' as const,
                     at: item.updatedAt,
                  },
               })),
         ],
         { force }
      );
   }
}

const WORKING_STATUSES = new Set(['preparing', 'queued', 'starting', 'running']);

// New T3 statuses fall back to idle instead of breaking the contract.
export function threadActivity(status: string, pendingRequestCount: number): Activity {
   if (pendingRequestCount > 0 || status === 'waiting') return 'waiting_for_user';
   if (WORKING_STATUSES.has(status)) return 'running';
   if (status === 'failed') return 'failed';
   return 'idle';
}

const FINISHED_OUTCOMES: Record<string, RunOutcome> = {
   completed: 'completed',
   failed: 'failed',
   interrupted: 'interrupted',
   cancelled: 'cancelled',
   rolled_back: 'cancelled',
};

// A run T3 reports inconsistently (finished without an end) is skipped rather than invented.
export function runDraft(
   run: { runId: string; status: string; startedAt: string | null; completedAt: string | null },
   threadId: string,
   observedAt: string
): Draft<'run'> | null {
   const base = { kind: 'run' as const, observedAt, runId: run.runId, threadId };
   const finished = FINISHED_OUTCOMES[run.status];
   if (finished) {
      if (!run.completedAt) return null;
      return { ...base, outcome: finished, startedAt: run.startedAt, completedAt: run.completedAt };
   }
   if (run.startedAt === null) {
      return { ...base, outcome: 'queued', startedAt: null, completedAt: null };
   }
   return { ...base, outcome: 'running', startedAt: run.startedAt, completedAt: null };
}
