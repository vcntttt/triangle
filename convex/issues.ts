import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';

const defaultProjectStatuses = [
   { id: 'backlog', name: 'Backlog', color: '#ec4899', position: 0 },
   { id: 'to-do', name: 'Todo', color: '#f97316', position: 1 },
   { id: 'in-progress', name: 'In Progress', color: '#facc15', position: 2 },
   { id: 'technical-review', name: 'Technical Review', color: '#22c55e', position: 3 },
   { id: 'paused', name: 'Paused', color: '#0ea5e9', position: 4 },
   { id: 'completed', name: 'Completed', color: '#8b5cf6', position: 5 },
];

const nowIso = (value: number) => new Date(value).toISOString();
const toNullable = <T>(value: T | undefined): T | null => value ?? null;

async function listStatusOptions(ctx: QueryCtx) {
   const rows = await ctx.db.query('projectStatuses').withIndex('by_position').collect();

   if (rows.length === 0) {
      return defaultProjectStatuses;
   }

   return rows
      .map((row) => ({
         id: row.id,
         name: row.name,
         color: row.color,
         position: row.position,
      }))
      .toSorted(
         (left, right) => left.position - right.position || left.name.localeCompare(right.name)
      );
}

function serializeProject(project: Doc<'projects'>) {
   return {
      id: project._id,
      name: project.name,
      slug: project.slug,
      key: project.key,
      iconType: project.iconType,
      iconValue: project.iconValue,
      status: project.status,
      description: toNullable(project.description),
      createdAt: nowIso(project.createdAt),
      updatedAt: nowIso(project.updatedAt),
   };
}

async function findProjectByName(ctx: QueryCtx | MutationCtx, name: string | null | undefined) {
   if (!name) return null;
   const projects = await ctx.db.query('projects').collect();
   return projects.find((project) => project.name === name) ?? null;
}

async function findProjectById(ctx: QueryCtx | MutationCtx, id: string | null | undefined) {
   if (!id) return null;
   return ctx.db.get(id as Id<'projects'>);
}

async function findLabelsByNames(ctx: QueryCtx | MutationCtx, names: string[]) {
   if (names.length === 0) return [];
   const wanted = new Set(names);
   const labels = await ctx.db.query('labels').collect();
   return labels.filter((label) => wanted.has(label.name));
}

async function findLabelsByIds(ctx: QueryCtx | MutationCtx, ids: string[]) {
   if (ids.length === 0) return [];
   const labels = await Promise.all(ids.map((id) => ctx.db.get(id as Id<'labels'>)));
   return labels.filter((label) => label !== null);
}

async function listIssues(ctx: QueryCtx | MutationCtx, projectId?: Id<'projects'>) {
   const [issues, projects, labels] = await Promise.all([
      projectId
         ? ctx.db
              .query('issues')
              .withIndex('by_project', (q) => q.eq('projectId', projectId))
              .collect()
         : ctx.db.query('issues').withIndex('by_rank').collect(),
      ctx.db.query('projects').collect(),
      ctx.db.query('labels').collect(),
   ]);

   const projectLookup = new Map(projects.map((project) => [project._id, project]));
   const labelLookup = new Map(labels.map((label) => [label._id, label]));
   const issuesMap = new Map<
      Id<'issues'>,
      ReturnType<typeof serializeIssueBase> & {
         parentIssue: { id: string; identifier: string; title: string } | null;
         subissues: Array<{
            id: string;
            identifier: string;
            title: string;
            status: string;
            priority: string;
            assigneeId: string | null;
            rank: string;
         }>;
      }
   >();

   for (const issue of issues.toSorted((left, right) => {
      const rankCompare = left.rank.localeCompare(right.rank);
      return rankCompare === 0 ? left.createdAt - right.createdAt : rankCompare;
   })) {
      issuesMap.set(issue._id, {
         ...serializeIssueBase(issue, projectLookup.get(issue.projectId!), labelLookup),
         parentIssue: null,
         subissues: [],
      });
   }

   for (const issue of issuesMap.values()) {
      if (!issue.parentIssueId) {
         continue;
      }

      const parentIssue = issuesMap.get(issue.parentIssueId as Id<'issues'>);
      if (!parentIssue) {
         issue.parentIssueId = null;
         continue;
      }

      issue.parentIssue = {
         id: parentIssue.id,
         identifier: parentIssue.identifier,
         title: parentIssue.title,
      };

      parentIssue.subissues.push({
         id: issue.id,
         identifier: issue.identifier,
         title: issue.title,
         status: issue.status,
         priority: issue.priority,
         assigneeId: issue.assigneeId,
         rank: issue.rank,
      });
   }

   for (const issue of issuesMap.values()) {
      issue.subissues.sort((left, right) => right.rank.localeCompare(left.rank));
   }

   return Array.from(issuesMap.values());
}

function serializeIssueBase(
   issue: Doc<'issues'>,
   project: Doc<'projects'> | undefined,
   labelLookup: Map<Id<'labels'>, Doc<'labels'>>
) {
   return {
      id: issue._id,
      identifier: issue.identifier,
      title: issue.title,
      description: toNullable(issue.description),
      status: issue.status,
      priority: issue.priority,
      assigneeId: toNullable(issue.assigneeId),
      rank: issue.rank,
      estimatedHours: toNullable(issue.estimatedHours),
      dueDate: issue.dueDate ? nowIso(issue.dueDate) : null,
      createdAt: nowIso(issue.createdAt),
      updatedAt: nowIso(issue.updatedAt),
      parentIssueId: toNullable(issue.parentIssueId),
      project: project ? serializeProject(project) : null,
      labels: issue.labelIds.flatMap((labelId) => {
         const label = labelLookup.get(labelId);
         return label
            ? [
                 {
                    id: label._id,
                    name: label.name,
                    color: label.color,
                 },
              ]
            : [];
      }),
   };
}

async function createIssueIdentifier(ctx: MutationCtx, identifierKey: string) {
   const issues = await ctx.db.query('issues').collect();
   const projectIssueNumber =
      issues.reduce((max, issue) => {
         if (!issue.identifier.startsWith(`${identifierKey}-`)) return max;
         return Math.max(max, issue.projectIssueNumber ?? 0);
      }, 0) + 1;

   return {
      identifier: `${identifierKey}-${projectIssueNumber}`,
      projectIssueNumber,
   };
}

async function createIssueRank(ctx: QueryCtx | MutationCtx) {
   const issues = await ctx.db.query('issues').collect();
   const latestRank = issues.reduce((max, issue) => (issue.rank > max ? issue.rank : max), '');

   if (!latestRank) {
      return Date.now().toString(36);
   }

   return `${Date.now().toString(36)}-${issues.length + 1}`;
}

async function validateParentAssignment(
   ctx: MutationCtx,
   issueId: Id<'issues'>,
   parentIssueId: Id<'issues'> | null
) {
   if (parentIssueId === null) {
      return;
   }

   if (issueId === parentIssueId) {
      throw new Error('An issue cannot be its own parent.');
   }

   const [currentIssue, selectedParent, currentChildren] = await Promise.all([
      ctx.db.get(issueId),
      ctx.db.get(parentIssueId),
      ctx.db
         .query('issues')
         .withIndex('by_parent_issue', (q) => q.eq('parentIssueId', issueId))
         .collect(),
   ]);

   if (!currentIssue) {
      throw new Error('Issue not found.');
   }

   if (!selectedParent) {
      throw new Error('Parent issue not found.');
   }

   if (currentChildren.length > 0) {
      throw new Error('Issues with subissues cannot become subissues.');
   }

   if (selectedParent.parentIssueId) {
      throw new Error('Subissues cannot have subissues.');
   }

   if (currentChildren.some((child) => child._id === parentIssueId)) {
      throw new Error('An issue cannot be assigned under one of its subissues.');
   }
}

export const page = query({
   args: { projectId: v.optional(v.union(v.string(), v.null())) },
   handler: async (ctx, { projectId }) => {
      const [issues, statusOptions] = await Promise.all([
         listIssues(ctx, projectId ? (projectId as Id<'projects'>) : undefined),
         listStatusOptions(ctx),
      ]);

      return {
         issues,
         statusOptions,
         databaseError: null,
         isConnected: true,
      };
   },
});

export const byIdentifier = query({
   args: { issueIdentifier: v.string() },
   handler: async (ctx, { issueIdentifier }) => {
      const issues = await listIssues(ctx);
      return issues.find((issue) => issue.identifier === issueIdentifier) ?? null;
   },
});

export const detail = query({
   args: { issueIdentifier: v.string() },
   handler: async (ctx, { issueIdentifier }) => {
      const issues = await listIssues(ctx);
      return issues.find((issue) => issue.identifier === issueIdentifier) ?? null;
   },
});

export const create = mutation({
   args: {
      title: v.string(),
      description: v.optional(v.string()),
      status: v.string(),
      priority: v.string(),
      assigneeId: v.optional(v.union(v.string(), v.null())),
      rank: v.optional(v.string()),
      estimatedHours: v.optional(v.union(v.number(), v.null())),
      dueDate: v.optional(v.union(v.string(), v.null())),
      parentIssueId: v.optional(v.union(v.string(), v.null())),
      projectId: v.optional(v.union(v.string(), v.null())),
      labelIds: v.optional(v.array(v.string())),
      projectName: v.optional(v.union(v.string(), v.null())),
      labelNames: v.optional(v.array(v.string())),
   },
   handler: async (ctx, input) => {
      const project = input.projectId
         ? await findProjectById(ctx, input.projectId)
         : await findProjectByName(ctx, input.projectName);
      const matchedLabels =
         input.labelIds !== undefined
            ? await findLabelsByIds(ctx, input.labelIds)
            : await findLabelsByNames(ctx, input.labelNames ?? []);
      const { identifier, projectIssueNumber } = await createIssueIdentifier(
         ctx,
         project?.key ?? 'CIRC'
      );
      const now = Date.now();
      const issueId = await ctx.db.insert('issues', {
         identifier,
         projectIssueNumber,
         title: input.title,
         description: input.description || undefined,
         status: input.status,
         priority: input.priority,
         assigneeId: input.assigneeId ?? undefined,
         rank: input.rank ?? (await createIssueRank(ctx)),
         estimatedHours:
            input.estimatedHours === undefined || input.estimatedHours === null
               ? undefined
               : input.estimatedHours.toString(),
         dueDate: input.dueDate ? new Date(input.dueDate).getTime() : undefined,
         projectId: project?._id,
         parentIssueId: input.parentIssueId ? (input.parentIssueId as Id<'issues'>) : undefined,
         labelIds: matchedLabels.map((label) => label._id),
         createdAt: now,
         updatedAt: now,
      });

      if (input.parentIssueId) {
         await validateParentAssignment(ctx, issueId, input.parentIssueId as Id<'issues'>);
      }

      const createdIssue = (await listIssues(ctx)).find((issue) => issue.id === issueId);
      if (!createdIssue) {
         throw new Error('Created issue could not be reloaded.');
      }

      return createdIssue;
   },
});

export const createWithSubissues = mutation({
   args: {
      title: v.string(),
      description: v.optional(v.string()),
      status: v.string(),
      priority: v.string(),
      assigneeId: v.optional(v.union(v.string(), v.null())),
      estimatedHours: v.optional(v.union(v.number(), v.null())),
      dueDate: v.optional(v.union(v.string(), v.null())),
      parentIssueId: v.optional(v.union(v.string(), v.null())),
      projectId: v.optional(v.union(v.string(), v.null())),
      labelIds: v.optional(v.array(v.string())),
      subissues: v.array(v.object({ title: v.string() })),
   },
   handler: async (ctx, input) => {
      const project = await findProjectById(ctx, input.projectId);
      const matchedLabels = await findLabelsByIds(ctx, input.labelIds ?? []);
      const { identifier, projectIssueNumber } = await createIssueIdentifier(
         ctx,
         project?.key ?? 'CIRC'
      );
      const now = Date.now();
      const issueId = await ctx.db.insert('issues', {
         identifier,
         projectIssueNumber,
         title: input.title,
         description: input.description || undefined,
         status: input.status,
         priority: input.priority,
         assigneeId: input.assigneeId ?? undefined,
         rank: await createIssueRank(ctx),
         estimatedHours:
            input.estimatedHours === undefined || input.estimatedHours === null
               ? undefined
               : input.estimatedHours.toString(),
         dueDate: input.dueDate ? new Date(input.dueDate).getTime() : undefined,
         projectId: project?._id,
         parentIssueId: input.parentIssueId ? (input.parentIssueId as Id<'issues'>) : undefined,
         labelIds: matchedLabels.map((label) => label._id),
         createdAt: now,
         updatedAt: now,
      });

      if (input.parentIssueId) {
         await validateParentAssignment(ctx, issueId, input.parentIssueId as Id<'issues'>);
      }

      for (const subissue of input.subissues) {
         const title = subissue.title.trim();
         if (!title) {
            continue;
         }

         const childIdentifier = await createIssueIdentifier(ctx, project?.key ?? 'CIRC');
         await ctx.db.insert('issues', {
            identifier: childIdentifier.identifier,
            projectIssueNumber: childIdentifier.projectIssueNumber,
            title,
            description: undefined,
            status: input.status,
            priority: input.priority,
            assigneeId: input.assigneeId ?? undefined,
            rank: await createIssueRank(ctx),
            estimatedHours: undefined,
            dueDate: undefined,
            projectId: project?._id,
            parentIssueId: issueId,
            labelIds: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
         });
      }

      const createdIssue = (await listIssues(ctx)).find((issue) => issue.id === issueId);
      if (!createdIssue) {
         throw new Error('Created issue could not be reloaded.');
      }

      return createdIssue;
   },
});

export const update = mutation({
   args: {
      issueId: v.string(),
      title: v.optional(v.string()),
      description: v.optional(v.union(v.string(), v.null())),
      status: v.optional(v.string()),
      priority: v.optional(v.string()),
      assigneeId: v.optional(v.union(v.string(), v.null())),
      estimatedHours: v.optional(v.union(v.number(), v.null())),
      dueDate: v.optional(v.union(v.string(), v.null())),
      parentIssueId: v.optional(v.union(v.string(), v.null())),
      projectId: v.optional(v.union(v.string(), v.null())),
      labelIds: v.optional(v.array(v.string())),
      projectName: v.optional(v.union(v.string(), v.null())),
      labelNames: v.optional(v.array(v.string())),
   },
   handler: async (ctx, { issueId, ...input }) => {
      const id = issueId as Id<'issues'>;
      const issue = await ctx.db.get(id);
      if (!issue) return null;

      const project =
         input.projectId !== undefined
            ? await findProjectById(ctx, input.projectId)
            : input.projectName !== undefined
              ? await findProjectByName(ctx, input.projectName)
              : undefined;
      const labels =
         input.labelIds !== undefined
            ? await findLabelsByIds(ctx, input.labelIds)
            : input.labelNames !== undefined
              ? await findLabelsByNames(ctx, input.labelNames)
              : undefined;

      if (input.parentIssueId !== undefined) {
         await validateParentAssignment(
            ctx,
            id,
            input.parentIssueId === null ? null : (input.parentIssueId as Id<'issues'>)
         );
      }

      await ctx.db.patch(id, {
         ...(input.title !== undefined ? { title: input.title } : {}),
         ...(input.description !== undefined
            ? { description: input.description ?? undefined }
            : {}),
         ...(input.status !== undefined ? { status: input.status } : {}),
         ...(input.priority !== undefined ? { priority: input.priority } : {}),
         ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId ?? undefined } : {}),
         ...(input.estimatedHours !== undefined
            ? { estimatedHours: input.estimatedHours?.toString() ?? undefined }
            : {}),
         ...(input.dueDate !== undefined
            ? { dueDate: input.dueDate ? new Date(input.dueDate).getTime() : undefined }
            : {}),
         ...(input.parentIssueId !== undefined
            ? {
                 parentIssueId:
                    input.parentIssueId === null
                       ? undefined
                       : (input.parentIssueId as Id<'issues'>),
              }
            : {}),
         ...(input.projectId !== undefined || input.projectName !== undefined
            ? { projectId: project?._id }
            : {}),
         ...(labels !== undefined ? { labelIds: labels.map((label) => label._id) } : {}),
         updatedAt: Date.now(),
      });

      return (await listIssues(ctx)).find((item) => item.id === id) ?? null;
   },
});

export const setStatus = mutation({
   args: {
      issueId: v.string(),
      status: v.string(),
      cascadeChildren: v.optional(v.boolean()),
      advanceParent: v.optional(v.boolean()),
   },
   handler: async (ctx, { issueId, status, cascadeChildren, advanceParent }) => {
      const id = issueId as Id<'issues'>;
      const issue = await ctx.db.get(id);
      if (!issue) return null;

      const now = Date.now();
      await ctx.db.patch(id, { status, updatedAt: now });

      if (cascadeChildren) {
         const children = await ctx.db
            .query('issues')
            .withIndex('by_parent_issue', (q) => q.eq('parentIssueId', id))
            .collect();

         await Promise.all(
            children.map((child) =>
               child.status === 'completed' || child.status === 'archived'
                  ? Promise.resolve()
                  : ctx.db.patch(child._id, { status, updatedAt: now })
            )
         );
      }

      if (
         advanceParent &&
         issue.parentIssueId &&
         (status === 'in-progress' || status === 'completed')
      ) {
         const parent = await ctx.db.get(issue.parentIssueId);
         if (parent?.status === 'to-do') {
            await ctx.db.patch(parent._id, { status: 'in-progress', updatedAt: now });
         }
      }

      return (await listIssues(ctx)).find((item) => item.id === id) ?? null;
   },
});

export const archive = mutation({
   args: { issueId: v.string() },
   handler: async (ctx, { issueId }) => {
      const id = issueId as Id<'issues'>;
      const issue = await ctx.db.get(id);
      if (!issue) return null;

      await ctx.db.patch(id, {
         status: 'archived',
         updatedAt: Date.now(),
      });

      return (await listIssues(ctx)).find((item) => item.id === id) ?? null;
   },
});

export const setParent = mutation({
   args: {
      issueId: v.string(),
      parentIssueId: v.union(v.string(), v.null()),
   },
   handler: async (ctx, { issueId, parentIssueId }) => {
      const id = issueId as Id<'issues'>;
      await validateParentAssignment(
         ctx,
         id,
         parentIssueId === null ? null : (parentIssueId as Id<'issues'>)
      );

      await ctx.db.patch(id, {
         parentIssueId: parentIssueId === null ? undefined : (parentIssueId as Id<'issues'>),
         updatedAt: Date.now(),
      });

      return (await listIssues(ctx)).find((item) => item.id === id) ?? null;
   },
});

export const remove = mutation({
   args: { issueId: v.string() },
   handler: async (ctx, { issueId }) => {
      const id = issueId as Id<'issues'>;
      const issue = await ctx.db.get(id);
      if (!issue) return false;

      const children = await ctx.db
         .query('issues')
         .withIndex('by_parent_issue', (q) => q.eq('parentIssueId', id))
         .collect();

      await Promise.all(
         children.map((child) =>
            ctx.db.patch(child._id, { parentIssueId: undefined, updatedAt: Date.now() })
         )
      );
      await ctx.db.delete(id);

      return true;
   },
});
