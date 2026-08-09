import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';

const filtersValidator = v.object({
   status: v.array(v.string()),
   assignee: v.array(v.string()),
   priority: v.array(v.string()),
   labels: v.array(v.string()),
   project: v.array(v.string()),
   area: v.array(v.string()),
});

const displayValidator = v.object({
   viewType: v.union(v.literal('list'), v.literal('grid'), v.literal('graph')),
   listMode: v.union(v.literal('hierarchy'), v.literal('flat')),
   groupBy: v.union(
      v.literal('status'),
      v.literal('priority'),
      v.literal('project'),
      v.literal('assignee'),
      v.literal('none')
   ),
   orderBy: v.union(v.literal('priority'), v.literal('created'), v.literal('title')),
   orderDirection: v.union(v.literal('ascending'), v.literal('descending')),
   showEmptyGroups: v.boolean(),
   hideCompletedIssues: v.boolean(),
   showSubissues: v.boolean(),
   visibleProperties: v.object({
      identifier: v.boolean(),
      labels: v.boolean(),
      project: v.boolean(),
      area: v.boolean(),
      dependencies: v.boolean(),
      assignee: v.boolean(),
      createdAt: v.boolean(),
   }),
});

const targetValidator = v.union(v.literal('global'), v.literal('project'));
const scopeValidator = v.union(v.literal('active'), v.literal('backlog'), v.literal('all'));

function serializeSavedView(view: Doc<'savedViews'>) {
   return {
      id: view._id,
      name: view.name,
      icon: view.icon ?? null,
      target: view.target,
      projectId: view.projectId ?? null,
      scope: view.scope,
      filters: view.filters,
      display: view.display,
      position: view.position,
      createdAt: new Date(view.createdAt).toISOString(),
      updatedAt: new Date(view.updatedAt).toISOString(),
   };
}

async function getProject(ctx: QueryCtx | MutationCtx, projectId: Id<'projects'> | undefined) {
   return projectId ? ctx.db.get(projectId) : null;
}

async function nextPosition(
   ctx: QueryCtx | MutationCtx,
   target: 'global' | 'project',
   projectId?: Id<'projects'>
) {
   const views =
      target === 'project' && projectId
         ? await ctx.db
              .query('savedViews')
              .withIndex('by_project_position', (q) => q.eq('projectId', projectId))
              .collect()
         : await ctx.db
              .query('savedViews')
              .withIndex('by_target_position', (q) => q.eq('target', target))
              .collect();

   return views.reduce((max, view) => Math.max(max, view.position), -1) + 1;
}

async function validateTarget(
   ctx: QueryCtx | MutationCtx,
   target: 'global' | 'project',
   projectId: Id<'projects'> | undefined
) {
   if (target === 'project') {
      if (!projectId) throw new Error('Project views require a project.');
      if (!(await getProject(ctx, projectId))) throw new Error('Project not found.');
      return;
   }

   if (projectId) throw new Error('Global views cannot reference a project.');
}

export const list = query({
   args: {
      target: v.optional(targetValidator),
      projectId: v.optional(v.id('projects')),
   },
   handler: async (ctx, { target, projectId }) => {
      const views =
         target === 'project' && projectId
            ? await ctx.db
                 .query('savedViews')
                 .withIndex('by_project_position', (q) => q.eq('projectId', projectId))
                 .collect()
            : target
              ? await ctx.db
                   .query('savedViews')
                   .withIndex('by_target_position', (q) => q.eq('target', target))
                   .collect()
              : await ctx.db.query('savedViews').collect();

      return views
         .filter((view) => !projectId || view.projectId === projectId)
         .toSorted((left, right) => left.position - right.position)
         .map(serializeSavedView);
   },
});

export const get = query({
   args: { viewId: v.optional(v.id('savedViews')) },
   handler: async (ctx, { viewId }) => {
      if (!viewId) return null;
      const view = await ctx.db.get(viewId);
      return view ? serializeSavedView(view) : null;
   },
});

export const create = mutation({
   args: {
      name: v.string(),
      icon: v.optional(v.string()),
      target: targetValidator,
      projectId: v.optional(v.id('projects')),
      scope: scopeValidator,
      filters: filtersValidator,
      display: displayValidator,
      position: v.optional(v.number()),
   },
   handler: async (ctx, input) => {
      const name = input.name.trim();
      if (!name) throw new Error('Saved view name is required.');
      await validateTarget(ctx, input.target, input.projectId);
      const now = Date.now();
      const id = await ctx.db.insert('savedViews', {
         name,
         icon: input.icon?.trim() || undefined,
         target: input.target,
         projectId: input.projectId,
         scope: input.scope,
         filters: input.filters,
         display: input.display,
         position: input.position ?? (await nextPosition(ctx, input.target, input.projectId)),
         createdAt: now,
         updatedAt: now,
      });
      return serializeSavedView((await ctx.db.get(id))!);
   },
});

export const update = mutation({
   args: {
      viewId: v.id('savedViews'),
      name: v.optional(v.string()),
      icon: v.optional(v.union(v.string(), v.null())),
      target: v.optional(targetValidator),
      projectId: v.optional(v.union(v.id('projects'), v.null())),
      scope: v.optional(scopeValidator),
      filters: v.optional(filtersValidator),
      display: v.optional(displayValidator),
      position: v.optional(v.number()),
   },
   handler: async (ctx, input) => {
      const existing = await ctx.db.get(input.viewId);
      if (!existing) throw new Error('Saved view not found.');

      const target = input.target ?? existing.target;
      const projectId =
         target === 'global'
            ? undefined
            : input.projectId === undefined
              ? existing.projectId
              : (input.projectId ?? undefined);
      await validateTarget(ctx, target, projectId);

      const name = input.name === undefined ? existing.name : input.name.trim();
      if (!name) throw new Error('Saved view name is required.');
      await ctx.db.patch(input.viewId, {
         name,
         icon: input.icon === undefined ? existing.icon : input.icon?.trim() || undefined,
         target,
         projectId,
         ...(input.scope === undefined ? {} : { scope: input.scope }),
         ...(input.filters === undefined ? {} : { filters: input.filters }),
         ...(input.display === undefined ? {} : { display: input.display }),
         ...(input.position === undefined ? {} : { position: input.position }),
         updatedAt: Date.now(),
      });
      return serializeSavedView((await ctx.db.get(input.viewId))!);
   },
});

export const remove = mutation({
   args: { viewId: v.id('savedViews') },
   handler: async (ctx, { viewId }) => {
      const existing = await ctx.db.get(viewId);
      if (!existing) return null;
      await ctx.db.delete(viewId);
      return { id: viewId };
   },
});
