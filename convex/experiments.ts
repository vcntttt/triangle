import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { createIssueRecord } from './issues';
import { listIssueStatusOptions } from './issueStatusOptions';
import { experimentStatus } from './schema';

// Bounds the list read; experiments are a personal backlog, so the newest slice is enough.
const MAX_EXPERIMENTS = 200;

const experimentView = v.object({
   id: v.id('experiments'),
   title: v.string(),
   description: v.union(v.string(), v.null()),
   status: experimentStatus,
   projectId: v.union(v.id('projects'), v.null()),
   projectName: v.union(v.string(), v.null()),
   issueId: v.union(v.id('issues'), v.null()),
   issueIdentifier: v.union(v.string(), v.null()),
   updatedAt: v.number(),
});

async function serializeExperiment(ctx: QueryCtx | MutationCtx, experiment: Doc<'experiments'>) {
   const [project, issue] = await Promise.all([
      experiment.projectId ? ctx.db.get(experiment.projectId) : null,
      experiment.issueId ? ctx.db.get(experiment.issueId) : null,
   ]);

   return {
      id: experiment._id,
      title: experiment.title,
      description: experiment.description ?? null,
      status: experiment.status,
      projectId: experiment.projectId ?? null,
      projectName: project?.name ?? null,
      issueId: experiment.issueId ?? null,
      issueIdentifier: issue?.identifier ?? null,
      updatedAt: experiment.updatedAt,
   };
}

async function loadExperiment(ctx: MutationCtx, experimentId: Id<'experiments'>) {
   const experiment = await ctx.db.get(experimentId);
   if (!experiment) {
      throw new Error('Experiment not found.');
   }
   return experiment;
}

function normalizeTitle(title: string) {
   const trimmed = title.trim();
   if (!trimmed) {
      throw new Error('Experiment title cannot be empty.');
   }
   return trimmed;
}

export const page = query({
   args: {},
   returns: v.array(experimentView),
   handler: async (ctx) => {
      const experiments = await ctx.db
         .query('experiments')
         .withIndex('by_updatedAt')
         .order('desc')
         .take(MAX_EXPERIMENTS);

      return Promise.all(experiments.map((experiment) => serializeExperiment(ctx, experiment)));
   },
});

export const create = mutation({
   args: {
      title: v.string(),
      description: v.optional(v.union(v.string(), v.null())),
      projectId: v.optional(v.union(v.id('projects'), v.null())),
   },
   returns: experimentView,
   handler: async (ctx, input) => {
      const now = Date.now();
      const experimentId = await ctx.db.insert('experiments', {
         title: normalizeTitle(input.title),
         description: input.description?.trim() || undefined,
         status: 'idea',
         projectId: input.projectId ?? undefined,
         createdAt: now,
         updatedAt: now,
      });

      return serializeExperiment(ctx, await loadExperiment(ctx, experimentId));
   },
});

// Omitted fields keep their stored value; null clears description or project.
export const update = mutation({
   args: {
      experimentId: v.id('experiments'),
      title: v.optional(v.string()),
      description: v.optional(v.union(v.string(), v.null())),
      projectId: v.optional(v.union(v.id('projects'), v.null())),
   },
   returns: experimentView,
   handler: async (ctx, input) => {
      const experiment = await loadExperiment(ctx, input.experimentId);

      await ctx.db.patch(experiment._id, {
         ...(input.title !== undefined ? { title: normalizeTitle(input.title) } : {}),
         ...(input.description !== undefined
            ? { description: input.description?.trim() || undefined }
            : {}),
         ...(input.projectId !== undefined ? { projectId: input.projectId ?? undefined } : {}),
         updatedAt: Date.now(),
      });

      return serializeExperiment(ctx, await loadExperiment(ctx, input.experimentId));
   },
});

export const setStatus = mutation({
   args: {
      experimentId: v.id('experiments'),
      status: experimentStatus,
   },
   returns: experimentView,
   handler: async (ctx, input) => {
      const experiment = await loadExperiment(ctx, input.experimentId);

      await ctx.db.patch(experiment._id, { status: input.status, updatedAt: Date.now() });

      return serializeExperiment(ctx, await loadExperiment(ctx, input.experimentId));
   },
});

export const promoteToIssue = mutation({
   args: {
      experimentId: v.id('experiments'),
      title: v.string(),
      description: v.union(v.string(), v.null()),
      projectId: v.union(v.id('projects'), v.null()),
   },
   returns: experimentView,
   handler: async (ctx, input) => {
      const experiment = await loadExperiment(ctx, input.experimentId);
      if (experiment.issueId) {
         return serializeExperiment(ctx, experiment);
      }
      if (experiment.status === 'discarded') {
         throw new Error('Discarded experiments cannot be promoted.');
      }

      const statuses = await listIssueStatusOptions(ctx);
      const defaultStatus =
         statuses.find((status) => status.id === 'backlog') ??
         statuses.find((status) => status.type === 'unstarted');
      if (!defaultStatus) {
         throw new Error('Add an unstarted issue status before promoting this experiment.');
      }

      const title = normalizeTitle(input.title);
      const issue = await createIssueRecord(ctx, {
         title,
         description: input.description?.trim() || undefined,
         status: defaultStatus.id,
         priority: 'no-priority',
         projectId: input.projectId ?? null,
      });
      await ctx.db.patch(experiment._id, {
         title,
         description: input.description?.trim() || undefined,
         projectId: input.projectId ?? undefined,
         issueId: issue.id,
         status: 'completed',
         updatedAt: Date.now(),
      });

      return serializeExperiment(ctx, await loadExperiment(ctx, experiment._id));
   },
});
