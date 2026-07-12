import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { defaultIssueStatuses } from './issueStatuses';

const nowIso = (value: number) => new Date(value).toISOString();
const toNullable = <T>(value: T | undefined): T | null => value ?? null;

async function listStatusOptions(ctx: QueryCtx) {
   const rows = await ctx.db.query('issueStatuses').withIndex('by_position').collect();
   const values = new Map(
      defaultIssueStatuses.map((item, position) => [item.id, { ...item, position }])
   );
   rows.forEach((row) => values.set(row.id, row));
   return Array.from(values.values()).toSorted((left, right) => left.position - right.position);
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

function serializeProjectArea(area: Doc<'projectAreas'>) {
   return {
      id: area._id,
      projectId: area.projectId,
      name: area.name,
      color: area.color,
      position: area.position,
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

async function findProjectAreaById(
   ctx: QueryCtx | MutationCtx,
   id: string | null | undefined,
   projectId: Id<'projects'> | undefined
) {
   if (!id || !projectId) return null;
   const area = await ctx.db.get(id as Id<'projectAreas'>);
   if (!area) return null;
   if (area.projectId !== projectId) {
      throw new Error('Area does not belong to the selected project.');
   }
   return area;
}

async function listIssues(ctx: QueryCtx | MutationCtx, projectId?: Id<'projects'>) {
   const [issues, projects, labels, areas, relations] = await Promise.all([
      projectId
         ? ctx.db
              .query('issues')
              .withIndex('by_project', (q) => q.eq('projectId', projectId))
              .collect()
         : ctx.db.query('issues').withIndex('by_rank').collect(),
      ctx.db.query('projects').collect(),
      ctx.db.query('labels').collect(),
      ctx.db.query('projectAreas').collect(),
      ctx.db.query('issueRelations').collect(),
   ]);

   const projectLookup = new Map(projects.map((project) => [project._id, project]));
   const labelLookup = new Map(labels.map((label) => [label._id, label]));
   const areaLookup = new Map(areas.map((area) => [area._id, area]));
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
         blockedBy: Array<{ id: string; identifier: string; title: string; status: string }>;
         blocks: Array<{ id: string; identifier: string; title: string; status: string }>;
      }
   >();

   for (const issue of issues.toSorted((left, right) => {
      const rankCompare = left.rank.localeCompare(right.rank);
      return rankCompare === 0 ? left.createdAt - right.createdAt : rankCompare;
   })) {
      issuesMap.set(issue._id, {
         ...serializeIssueBase(issue, projectLookup.get(issue.projectId!), labelLookup, areaLookup),
         parentIssue: null,
         subissues: [],
         blockedBy: [],
         blocks: [],
      });
   }

   for (const relation of relations) {
      const blocker = issuesMap.get(relation.blockerIssueId);
      const blocked = issuesMap.get(relation.blockedIssueId);
      if (!blocker || !blocked) continue;
      blocked.blockedBy.push({
         id: blocker.id,
         identifier: blocker.identifier,
         title: blocker.title,
         status: blocker.status,
      });
      blocker.blocks.push({
         id: blocked.id,
         identifier: blocked.identifier,
         title: blocked.title,
         status: blocked.status,
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

async function assertCanEnterStatus(ctx: MutationCtx, issueId: Id<'issues'>, status: string) {
   const stored = await ctx.db
      .query('issueStatuses')
      .withIndex('by_option_id', (q) => q.eq('id', status))
      .unique();
   const option = stored ?? defaultIssueStatuses.find((item) => item.id === status);
   if (!option) throw new Error(`Unknown issue status: ${status}.`);
   if (option.type === 'completed') {
      const issue = await ctx.db.get(issueId);
      if (!issue?.resolution) {
         throw new Error('Use close with a resolution before completing this issue.');
      }
   }
   if (option.type === 'unstarted') return;
   const relations = await ctx.db
      .query('issueRelations')
      .withIndex('by_blocked', (q) => q.eq('blockedIssueId', issueId))
      .collect();
   const blockers = await Promise.all(
      relations.map((relation) => ctx.db.get(relation.blockerIssueId))
   );
   const pending = blockers.filter((issue) => issue && issue.status !== 'completed');
   if (pending.length > 0) {
      throw new Error(
         `Issue is blocked by: ${pending.map((issue) => issue!.identifier).join(', ')}. Complete every blocker before starting this issue.`
      );
   }
}

function serializeIssueBase(
   issue: Doc<'issues'>,
   project: Doc<'projects'> | undefined,
   labelLookup: Map<Id<'labels'>, Doc<'labels'>>,
   areaLookup: Map<Id<'projectAreas'>, Doc<'projectAreas'>>
) {
   const area = issue.areaId ? areaLookup.get(issue.areaId) : undefined;

   return {
      id: issue._id,
      identifier: issue.identifier,
      title: issue.title,
      description: toNullable(issue.description),
      status: issue.status,
      priority: issue.priority,
      assigneeId: toNullable(issue.assigneeId),
      resolution: toNullable(issue.resolution),
      resolvedAt: issue.resolvedAt ? nowIso(issue.resolvedAt) : null,
      rank: issue.rank,
      estimatedHours: toNullable(issue.estimatedHours),
      dueDate: issue.dueDate ? nowIso(issue.dueDate) : null,
      createdAt: nowIso(issue.createdAt),
      updatedAt: nowIso(issue.updatedAt),
      parentIssueId: toNullable(issue.parentIssueId),
      project: project ? serializeProject(project) : null,
      area: area ? serializeProjectArea(area) : null,
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
      const [issues, statusOptions, priorityOptions] = await Promise.all([
         listIssues(ctx, projectId ? (projectId as Id<'projects'>) : undefined),
         listStatusOptions(ctx),
         listOptions(ctx, 'projectPriorities'),
      ]);

      return {
         issues,
         statusOptions,
         priorityOptions,
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
      const issue = issues.find((item) => item.identifier === issueIdentifier) ?? null;
      if (!issue) return null;
      const issueId = issue.id as Id<'issues'>;
      const [comments, artifacts] = await Promise.all([
         ctx.db
            .query('issueComments')
            .withIndex('by_issue_createdAt', (q) => q.eq('issueId', issueId))
            .collect(),
         ctx.db
            .query('issueArtifacts')
            .withIndex('by_issue_createdAt', (q) => q.eq('issueId', issueId))
            .collect(),
      ]);
      return {
         ...issue,
         comments: comments.map((comment) => ({
            id: comment._id,
            body: comment.body,
            kind: comment.kind,
            authorId: comment.authorId,
            createdAt: nowIso(comment.createdAt),
            updatedAt: nowIso(comment.updatedAt),
         })),
         artifacts: artifacts.map((artifact) => ({
            id: artifact._id,
            title: artifact.title,
            url: artifact.url,
            kind: artifact.kind,
            description: toNullable(artifact.description),
            createdAt: nowIso(artifact.createdAt),
            updatedAt: nowIso(artifact.updatedAt),
         })),
      };
   },
});

export const search = query({
   args: {
      projectId: v.optional(v.string()),
      labelIds: v.optional(v.array(v.string())),
      statuses: v.optional(v.array(v.string())),
      createdBefore: v.optional(v.string()),
      createdAfter: v.optional(v.string()),
      updatedBefore: v.optional(v.string()),
      updatedAfter: v.optional(v.string()),
   },
   handler: async (ctx, input) => {
      const issues = await listIssues(
         ctx,
         input.projectId ? (input.projectId as Id<'projects'>) : undefined
      );
      const labelIds = new Set(input.labelIds ?? []);
      const statuses = new Set(input.statuses ?? []);
      const parseBoundary = (value: string | undefined) =>
         value === undefined ? undefined : new Date(value).getTime();
      const createdBefore = parseBoundary(input.createdBefore);
      const createdAfter = parseBoundary(input.createdAfter);
      const updatedBefore = parseBoundary(input.updatedBefore);
      const updatedAfter = parseBoundary(input.updatedAfter);
      for (const [name, value] of Object.entries({
         createdBefore,
         createdAfter,
         updatedBefore,
         updatedAfter,
      })) {
         if (value !== undefined && Number.isNaN(value))
            throw new Error(`${name} must be ISO 8601.`);
      }
      return issues.filter((issue) => {
         const createdAt = new Date(issue.createdAt).getTime();
         const updatedAt = new Date(issue.updatedAt).getTime();
         return (
            (statuses.size === 0 || statuses.has(issue.status)) &&
            (labelIds.size === 0 || issue.labels.some((label) => labelIds.has(label.id))) &&
            (createdBefore === undefined || createdAt < createdBefore) &&
            (createdAfter === undefined || createdAt > createdAfter) &&
            (updatedBefore === undefined || updatedAt < updatedBefore) &&
            (updatedAfter === undefined || updatedAt > updatedAfter)
         );
      });
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
      areaId: v.optional(v.union(v.string(), v.null())),
      labelIds: v.optional(v.array(v.string())),
      projectName: v.optional(v.union(v.string(), v.null())),
      labelNames: v.optional(v.array(v.string())),
   },
   handler: async (ctx, input) => {
      const project = input.projectId
         ? await findProjectById(ctx, input.projectId)
         : await findProjectByName(ctx, input.projectName);
      const area = await findProjectAreaById(ctx, input.areaId, project?._id);
      const matchedLabels =
         input.labelIds !== undefined
            ? await findLabelsByIds(ctx, input.labelIds)
            : await findLabelsByNames(ctx, input.labelNames ?? []);
      const { identifier, projectIssueNumber } = await createIssueIdentifier(
         ctx,
         project?.key ?? 'TRI'
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
         areaId: area?._id,
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
      areaId: v.optional(v.union(v.string(), v.null())),
      labelIds: v.optional(v.array(v.string())),
      subissues: v.array(v.object({ title: v.string() })),
   },
   handler: async (ctx, input) => {
      const [project, matchedLabels] = await Promise.all([
         findProjectById(ctx, input.projectId),
         findLabelsByIds(ctx, input.labelIds ?? []),
      ]);
      const [area, issueIdentifier, rank] = await Promise.all([
         findProjectAreaById(ctx, input.areaId, project?._id),
         createIssueIdentifier(ctx, project?.key ?? 'TRI'),
         createIssueRank(ctx),
      ]);
      const { identifier, projectIssueNumber } = issueIdentifier;
      const now = Date.now();
      const issueId = await ctx.db.insert('issues', {
         identifier,
         projectIssueNumber,
         title: input.title,
         description: input.description || undefined,
         status: input.status,
         priority: input.priority,
         assigneeId: input.assigneeId ?? undefined,
         rank,
         estimatedHours:
            input.estimatedHours === undefined || input.estimatedHours === null
               ? undefined
               : input.estimatedHours.toString(),
         dueDate: input.dueDate ? new Date(input.dueDate).getTime() : undefined,
         projectId: project?._id,
         areaId: area?._id,
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

         const childIdentifier = await createIssueIdentifier(ctx, project?.key ?? 'TRI');
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
            areaId: area?._id,
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
      areaId: v.optional(v.union(v.string(), v.null())),
      labelIds: v.optional(v.array(v.string())),
      projectName: v.optional(v.union(v.string(), v.null())),
      labelNames: v.optional(v.array(v.string())),
   },
   handler: async (ctx, { issueId, ...input }) => {
      const id = issueId as Id<'issues'>;
      const issue = await ctx.db.get(id);
      if (!issue) return null;
      if (input.status !== undefined) await assertCanEnterStatus(ctx, id, input.status);

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
      const nextProjectId =
         input.projectId !== undefined || input.projectName !== undefined
            ? project?._id
            : issue.projectId;
      const area =
         input.areaId !== undefined
            ? await findProjectAreaById(ctx, input.areaId, nextProjectId)
            : undefined;
      const shouldClearAreaForProjectChange =
         (input.projectId !== undefined || input.projectName !== undefined) &&
         issue.projectId !== nextProjectId;

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
         ...(input.areaId !== undefined
            ? { areaId: area?._id }
            : shouldClearAreaForProjectChange
              ? { areaId: undefined }
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
      await assertCanEnterStatus(ctx, id, status);

      const now = Date.now();
      await ctx.db.patch(id, { status, updatedAt: now });

      if (cascadeChildren) {
         const children = await ctx.db
            .query('issues')
            .withIndex('by_parent_issue', (q) => q.eq('parentIssueId', id))
            .collect();

         await Promise.all(
            children.map(async (child) => {
               if (child.status === 'completed' || child.status === 'archived') return;
               await assertCanEnterStatus(ctx, child._id, status);
               await ctx.db.patch(child._id, { status, updatedAt: now });
            })
         );
      }

      if (
         advanceParent &&
         issue.parentIssueId &&
         (status === 'in-progress' || status === 'completed')
      ) {
         const parent = await ctx.db.get(issue.parentIssueId);
         if (parent?.status === 'to-do') {
            await assertCanEnterStatus(ctx, parent._id, 'in-progress');
            await ctx.db.patch(parent._id, { status: 'in-progress', updatedAt: now });
         }
      }

      return (await listIssues(ctx)).find((item) => item.id === id) ?? null;
   },
});

export const close = mutation({
   args: { issueId: v.string(), resolution: v.string() },
   handler: async (ctx, { issueId, resolution }) => {
      const id = issueId as Id<'issues'>;
      const issue = await ctx.db.get(id);
      if (!issue) throw new Error('Issue not found.');
      const normalizedResolution = resolution.trim();
      if (!normalizedResolution) throw new Error('Resolution is required.');
      const now = Date.now();
      await ctx.db.patch(id, { resolution: normalizedResolution });
      await assertCanEnterStatus(ctx, id, 'completed');
      await ctx.db.patch(id, {
         status: 'completed',
         resolution: normalizedResolution,
         resolvedAt: now,
         updatedAt: now,
      });
      return (await listIssues(ctx)).find((item) => item.id === id) ?? null;
   },
});

export const assign = mutation({
   args: { issueId: v.string(), assigneeId: v.union(v.string(), v.null()) },
   handler: async (ctx, { issueId, assigneeId }) => {
      const id = issueId as Id<'issues'>;
      if (!(await ctx.db.get(id))) throw new Error('Issue not found.');
      if (assigneeId !== null && assigneeId !== 'me') {
         throw new Error('Triangle is personal; the only assignable user ID is me.');
      }
      await ctx.db.patch(id, { assigneeId: assigneeId ?? undefined, updatedAt: Date.now() });
      return (await listIssues(ctx)).find((item) => item.id === id) ?? null;
   },
});

export const claim = mutation({
   args: { issueId: v.string() },
   handler: async (ctx, { issueId }) => {
      const id = issueId as Id<'issues'>;
      if (!(await ctx.db.get(id))) throw new Error('Issue not found.');
      const profile = await ctx.db
         .query('viewerProfiles')
         .withIndex('by_singletonKey', (q) => q.eq('singletonKey', 'me'))
         .unique();
      const assigneeId = profile?.singletonKey ?? 'me';
      await ctx.db.patch(id, { assigneeId, updatedAt: Date.now() });
      return (await listIssues(ctx)).find((item) => item.id === id) ?? null;
   },
});

export const addComment = mutation({
   args: {
      issueId: v.string(),
      body: v.string(),
      kind: v.optional(v.union(v.literal('comment'), v.literal('triage-note'))),
      authorId: v.optional(v.string()),
   },
   handler: async (ctx, { issueId, body, kind, authorId }) => {
      const id = issueId as Id<'issues'>;
      if (!(await ctx.db.get(id))) throw new Error('Issue not found.');
      const normalizedBody = body.trim();
      if (!normalizedBody) throw new Error('Comment body is required.');
      const now = Date.now();
      const commentId = await ctx.db.insert('issueComments', {
         issueId: id,
         body: normalizedBody,
         kind: kind ?? 'comment',
         authorId: authorId ?? 'me',
         createdAt: now,
         updatedAt: now,
      });
      await ctx.db.patch(id, { updatedAt: now });
      return commentId;
   },
});

export const activityAfterTriage = query({
   args: { issueId: v.string(), triageNoteId: v.string() },
   handler: async (ctx, { issueId, triageNoteId }) => {
      const id = issueId as Id<'issues'>;
      const note = await ctx.db.get(triageNoteId as Id<'issueComments'>);
      if (!note || note.issueId !== id || note.kind !== 'triage-note') {
         throw new Error('Triage note not found for this issue.');
      }
      const [comments, artifacts, issue] = await Promise.all([
         ctx.db
            .query('issueComments')
            .withIndex('by_issue_createdAt', (q) =>
               q.eq('issueId', id).gte('createdAt', note.createdAt)
            )
            .collect(),
         ctx.db
            .query('issueArtifacts')
            .withIndex('by_issue_createdAt', (q) =>
               q.eq('issueId', id).gte('createdAt', note.createdAt)
            )
            .collect(),
         ctx.db.get(id),
      ]);
      if (!issue) throw new Error('Issue not found.');
      const laterComments = comments.filter(
         (comment) => comment._creationTime > note._creationTime
      );
      const laterArtifacts = artifacts.filter(
         (artifact) => artifact._creationTime > note._creationTime
      );
      const issueChanged = issue.updatedAt > note.createdAt;
      return {
         hasActivity: issueChanged || laterComments.length > 0 || laterArtifacts.length > 0,
         triageNoteId: note._id,
         since: nowIso(note.createdAt),
         issueUpdatedAt: nowIso(issue.updatedAt),
         comments: laterComments.map((comment) => ({
            id: comment._id,
            kind: comment.kind,
            body: comment.body,
            createdAt: nowIso(comment.createdAt),
         })),
         artifacts: laterArtifacts.map((artifact) => ({
            id: artifact._id,
            kind: artifact.kind,
            title: artifact.title,
            url: artifact.url,
            createdAt: nowIso(artifact.createdAt),
         })),
      };
   },
});

export const addArtifact = mutation({
   args: {
      issueId: v.string(),
      title: v.string(),
      url: v.string(),
      kind: v.union(
         v.literal('research'),
         v.literal('prototype'),
         v.literal('document'),
         v.literal('other')
      ),
      description: v.optional(v.string()),
   },
   handler: async (ctx, input) => {
      const issueId = input.issueId as Id<'issues'>;
      if (!(await ctx.db.get(issueId))) throw new Error('Issue not found.');
      const title = input.title.trim();
      if (!title) throw new Error('Artifact title is required.');
      let url: URL;
      try {
         url = new URL(input.url);
      } catch {
         throw new Error('Artifact URL must be absolute.');
      }
      if (!['http:', 'https:'].includes(url.protocol)) {
         throw new Error('Artifact URL must use http or https.');
      }
      const now = Date.now();
      const artifactId = await ctx.db.insert('issueArtifacts', {
         issueId,
         title,
         url: url.toString(),
         kind: input.kind,
         description: input.description?.trim() || undefined,
         createdAt: now,
         updatedAt: now,
      });
      await ctx.db.patch(issueId, { updatedAt: now });
      return artifactId;
   },
});

export const addBlocker = mutation({
   args: { blockedIssueId: v.string(), blockerIssueId: v.string() },
   handler: async (ctx, input) => {
      const blockedIssueId = input.blockedIssueId as Id<'issues'>;
      const blockerIssueId = input.blockerIssueId as Id<'issues'>;
      if (blockedIssueId === blockerIssueId) throw new Error('An issue cannot block itself.');
      const [blocked, blocker, existing] = await Promise.all([
         ctx.db.get(blockedIssueId),
         ctx.db.get(blockerIssueId),
         ctx.db
            .query('issueRelations')
            .withIndex('by_pair', (q) =>
               q.eq('blockerIssueId', blockerIssueId).eq('blockedIssueId', blockedIssueId)
            )
            .unique(),
      ]);
      if (!blocked || !blocker) throw new Error('Issue not found.');
      if (
         blocker.status !== 'completed' &&
         ['in-progress', 'technical-review', 'completed'].includes(blocked.status)
      )
         throw new Error('Cannot add an incomplete blocker to an issue that has already started.');
      if (existing) return existing._id;
      const visited = new Set<string>();
      const stack = [blockedIssueId];
      while (stack.length) {
         const current = stack.pop()!;
         if (current === blockerIssueId)
            throw new Error('This blocking relation would create a cycle.');
         if (visited.has(current)) continue;
         visited.add(current);
         const outgoing = await ctx.db
            .query('issueRelations')
            .withIndex('by_blocker', (q) => q.eq('blockerIssueId', current))
            .collect();
         stack.push(...outgoing.map((relation) => relation.blockedIssueId));
      }
      return ctx.db.insert('issueRelations', {
         blockerIssueId,
         blockedIssueId,
         createdAt: Date.now(),
      });
   },
});

export const removeBlocker = mutation({
   args: { blockedIssueId: v.string(), blockerIssueId: v.string() },
   handler: async (ctx, input) => {
      const relation = await ctx.db
         .query('issueRelations')
         .withIndex('by_pair', (q) =>
            q
               .eq('blockerIssueId', input.blockerIssueId as Id<'issues'>)
               .eq('blockedIssueId', input.blockedIssueId as Id<'issues'>)
         )
         .unique();
      if (relation) await ctx.db.delete(relation._id);
      return relation !== null;
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
      const [outgoingRelations, incomingRelations] = await Promise.all([
         ctx.db
            .query('issueRelations')
            .withIndex('by_blocker', (q) => q.eq('blockerIssueId', id))
            .collect(),
         ctx.db
            .query('issueRelations')
            .withIndex('by_blocked', (q) => q.eq('blockedIssueId', id))
            .collect(),
      ]);
      await Promise.all(
         [...outgoingRelations, ...incomingRelations].map((relation) => ctx.db.delete(relation._id))
      );
      const [comments, artifacts] = await Promise.all([
         ctx.db
            .query('issueComments')
            .withIndex('by_issue_createdAt', (q) => q.eq('issueId', id))
            .collect(),
         ctx.db
            .query('issueArtifacts')
            .withIndex('by_issue_createdAt', (q) => q.eq('issueId', id))
            .collect(),
      ]);
      await Promise.all([
         ...comments.map((comment) => ctx.db.delete(comment._id)),
         ...artifacts.map((artifact) => ctx.db.delete(artifact._id)),
      ]);
      await ctx.db.delete(id);

      return true;
   },
});
