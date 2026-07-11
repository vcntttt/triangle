import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';

type ProjectHealth = 'no-update' | 'off-track' | 'on-track' | 'at-risk';
type ProjectOptionTable = 'projectStatuses' | 'projectPriorities';

const defaultProjectStatuses = [
   { id: 'backlog', name: 'Backlog', color: '#ec4899', position: 0 },
   { id: 'to-do', name: 'Todo', color: '#f97316', position: 1 },
   { id: 'in-progress', name: 'In Progress', color: '#facc15', position: 2 },
   { id: 'technical-review', name: 'Technical Review', color: '#22c55e', position: 3 },
   { id: 'paused', name: 'Paused', color: '#0ea5e9', position: 4 },
   { id: 'completed', name: 'Completed', color: '#8b5cf6', position: 5 },
];

const defaultProjectPriorities = [
   { id: 'no-priority', name: 'No priority', color: '#94a3b8', position: 0 },
   { id: 'urgent', name: 'Urgent', color: '#ef4444', position: 1 },
   { id: 'high', name: 'High', color: '#f97316', position: 2 },
   { id: 'medium', name: 'Medium', color: '#facc15', position: 3 },
   { id: 'low', name: 'Low', color: '#22c55e', position: 4 },
];

const projectHealthValues = ['no-update', 'off-track', 'on-track', 'at-risk'] as const;

const nowIso = (value: number) => new Date(value).toISOString();
const toNullable = <T>(value: T | undefined): T | null => value ?? null;

function toOptionId(value: string): string {
   return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
}

const projectKeyPattern = /^[A-Z][A-Z0-9]{1,2}$/;

function normalizeProjectKey(value: string): string {
   return value
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, '')
      .slice(0, 3);
}

function createProjectKeyFromName(name: string): string {
   const words = name
      .toUpperCase()
      .trim()
      .split(/[^A-Z0-9]+/)
      .filter(Boolean);
   const acronym = words.map((word) => word[0]).join('');
   const candidate = acronym.length >= 2 ? acronym : normalizeProjectKey(name);
   const normalizedCandidate = normalizeProjectKey(candidate);

   if (normalizedCandidate.length >= 3) {
      return normalizedCandidate;
   }

   return normalizeProjectKey(name);
}

function assertValidProjectKey(key: string): void {
   if (!projectKeyPattern.test(key)) {
      throw new Error(
         'Project key must be 2-3 uppercase letters or numbers and start with a letter.'
      );
   }
}

function toProjectHealth(value: string): ProjectHealth {
   return projectHealthValues.includes(value as ProjectHealth)
      ? (value as ProjectHealth)
      : 'no-update';
}

function serializeProject(project: Doc<'projects'>, latestUpdate: Doc<'projectUpdates'> | null) {
   return {
      id: project._id,
      name: project.name,
      slug: project.slug,
      key: project.key,
      description: toNullable(project.description),
      iconType: project.iconType,
      iconValue: project.iconValue,
      status: project.status,
      priority: project.priority,
      latestUpdate: latestUpdate ? serializeProjectUpdate(latestUpdate) : null,
      createdAt: nowIso(project.createdAt),
      updatedAt: nowIso(project.updatedAt),
   };
}

function serializeProjectUpdate(update: Doc<'projectUpdates'>) {
   return {
      id: update._id,
      projectId: update.projectId,
      health: toProjectHealth(update.health),
      body: update.body,
      createdAt: nowIso(update.createdAt),
      updatedAt: nowIso(update.updatedAt),
   };
}

function serializeProjectArea(area: Doc<'projectAreas'>) {
   return {
      id: area._id,
      projectId: area.projectId,
      name: area.name,
      color: area.color,
      position: area.position,
      createdAt: nowIso(area.createdAt),
      updatedAt: nowIso(area.updatedAt),
   };
}

function serializeProjectForIssue(project: Doc<'projects'>) {
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
      rank: issue.rank,
      estimatedHours: toNullable(issue.estimatedHours),
      dueDate: issue.dueDate ? nowIso(issue.dueDate) : null,
      createdAt: nowIso(issue.createdAt),
      updatedAt: nowIso(issue.updatedAt),
      parentIssueId: toNullable(issue.parentIssueId),
      project: project ? serializeProjectForIssue(project) : null,
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

async function listProjectIssues(ctx: QueryCtx, projectId: Id<'projects'>) {
   const [issues, projects, labels, areas] = await Promise.all([
      ctx.db
         .query('issues')
         .withIndex('by_project', (q) => q.eq('projectId', projectId))
         .collect(),
      ctx.db.query('projects').collect(),
      ctx.db.query('labels').collect(),
      ctx.db
         .query('projectAreas')
         .withIndex('by_project_position', (q) => q.eq('projectId', projectId))
         .collect(),
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

function serializeOption(option: Doc<'projectStatuses'> | Doc<'projectPriorities'>) {
   return {
      id: option.id,
      name: option.name,
      color: option.color,
      position: option.position,
   };
}

export async function listOptions(ctx: QueryCtx, table: ProjectOptionTable) {
   const rows = await ctx.db.query(table).withIndex('by_position').collect();
   const defaults = table === 'projectStatuses' ? defaultProjectStatuses : defaultProjectPriorities;

   const values = new Map(defaults.map((item) => [item.id, { ...item }]));
   for (const row of rows) {
      values.set(row.id, serializeOption(row));
   }

   return Array.from(values.values()).toSorted(
      (left, right) => left.position - right.position || left.name.localeCompare(right.name)
   );
}

async function getLatestProjectUpdate(ctx: QueryCtx | MutationCtx, projectId: Id<'projects'>) {
   const updates = await ctx.db
      .query('projectUpdates')
      .withIndex('by_project_createdAt', (q) => q.eq('projectId', projectId))
      .order('desc')
      .take(1);

   return updates[0] ?? null;
}

async function listProjects(ctx: QueryCtx | MutationCtx) {
   const projects = await ctx.db
      .query('projects')
      .withIndex('by_updatedAt')
      .order('desc')
      .collect();

   return Promise.all(
      projects.map(async (project) =>
         serializeProject(project, await getLatestProjectUpdate(ctx, project._id))
      )
   );
}

async function listProjectAreas(ctx: QueryCtx | MutationCtx, projectId: Id<'projects'>) {
   const areas = await ctx.db
      .query('projectAreas')
      .withIndex('by_project_position', (q) => q.eq('projectId', projectId))
      .collect();

   return areas
      .map(serializeProjectArea)
      .toSorted(
         (left, right) => left.position - right.position || left.name.localeCompare(right.name)
      );
}

async function getProjectById(ctx: QueryCtx | MutationCtx, projectId: Id<'projects'>) {
   const project = await ctx.db.get(projectId);
   if (!project) return null;
   return serializeProject(project, await getLatestProjectUpdate(ctx, projectId));
}

async function findProjectBySlugOrId(ctx: QueryCtx, slugOrId: string) {
   const bySlug = await ctx.db
      .query('projects')
      .withIndex('by_slug', (q) => q.eq('slug', slugOrId))
      .unique();

   if (bySlug) {
      return bySlug;
   }

   return ctx.db.get(slugOrId as Id<'projects'>);
}

async function findOptionById(ctx: QueryCtx | MutationCtx, table: ProjectOptionTable, id: string) {
   return ctx.db
      .query(table)
      .withIndex('by_option_id', (q) => q.eq('id', id))
      .unique();
}

async function findOptionByName(
   ctx: QueryCtx | MutationCtx,
   table: ProjectOptionTable,
   name: string
) {
   return ctx.db
      .query(table)
      .withIndex('by_name', (q) => q.eq('name', name))
      .unique();
}

async function saveOption(
   ctx: MutationCtx,
   table: ProjectOptionTable,
   input: { name: string; color: string }
) {
   const id = toOptionId(input.name);

   if (!id) {
      throw new Error('Option name must contain letters or numbers.');
   }

   const existing = await findOptionById(ctx, table, id);
   if (existing) {
      throw new Error('An option with that name already exists.');
   }

   const rows = await ctx.db.query(table).collect();
   const now = Date.now();
   const optionId = await ctx.db.insert(table, {
      id,
      name: input.name,
      color: input.color,
      position: rows.reduce((max, row) => Math.max(max, row.position), -1) + 1,
      createdAt: now,
      updatedAt: now,
   });

   return serializeOption((await ctx.db.get(optionId))!);
}

async function updateOption(
   ctx: MutationCtx,
   table: ProjectOptionTable,
   input: { id: string; name: string; color: string }
) {
   const [existing, conflictingName] = await Promise.all([
      findOptionById(ctx, table, input.id),
      findOptionByName(ctx, table, input.name),
   ]);

   if (conflictingName && conflictingName.id !== input.id) {
      throw new Error('An option with that name already exists.');
   }

   const now = Date.now();

   if (!existing) {
      const defaultOption = (
         table === 'projectStatuses' ? defaultProjectStatuses : defaultProjectPriorities
      ).find((option) => option.id === input.id);
      const optionId = await ctx.db.insert(table, {
         id: input.id,
         name: input.name,
         color: input.color,
         position: defaultOption?.position ?? 0,
         createdAt: now,
         updatedAt: now,
      });
      return serializeOption((await ctx.db.get(optionId))!);
   }

   await ctx.db.patch(existing._id, {
      name: input.name,
      color: input.color,
      updatedAt: now,
   });

   return serializeOption((await ctx.db.get(existing._id))!);
}

async function deleteOption(ctx: MutationCtx, table: ProjectOptionTable, id: string) {
   const existing = await findOptionById(ctx, table, id);
   if (existing) {
      await ctx.db.delete(existing._id);
   }
}

export const options = query({
   args: {},
   handler: async (ctx) => listProjects(ctx),
});

export const statusList = query({
   args: {},
   handler: async (ctx) => listOptions(ctx, 'projectStatuses'),
});

export const priorityList = query({
   args: {},
   handler: async (ctx) => listOptions(ctx, 'projectPriorities'),
});

export const page = query({
   args: {},
   handler: async (ctx) => {
      const [projects, statusOptions, priorityOptions] = await Promise.all([
         listProjects(ctx),
         listOptions(ctx, 'projectStatuses'),
         listOptions(ctx, 'projectPriorities'),
      ]);

      return {
         projects,
         statusOptions,
         priorityOptions,
         databaseError: null,
         isConnected: true,
      };
   },
});

export const bySlug = query({
   args: { projectSlug: v.string() },
   handler: async (ctx, { projectSlug }) => {
      const [statusOptions, priorityOptions, project] = await Promise.all([
         listOptions(ctx, 'projectStatuses'),
         listOptions(ctx, 'projectPriorities'),
         findProjectBySlugOrId(ctx, projectSlug),
      ]);
      const latestUpdate = project ? await getLatestProjectUpdate(ctx, project._id) : null;

      return {
         project: project ? serializeProject(project, latestUpdate) : null,
         statusOptions,
         priorityOptions,
         databaseError: null,
         isConnected: true,
      };
   },
});

export const detail = query({
   args: { projectSlug: v.string() },
   handler: async (ctx, { projectSlug }) => {
      const [statusOptions, priorityOptions, project] = await Promise.all([
         listOptions(ctx, 'projectStatuses'),
         listOptions(ctx, 'projectPriorities'),
         findProjectBySlugOrId(ctx, projectSlug),
      ]);
      const [latestUpdate, areas, issues] = project
         ? await Promise.all([
              getLatestProjectUpdate(ctx, project._id),
              listProjectAreas(ctx, project._id),
              listProjectIssues(ctx, project._id),
           ])
         : [null, [], []];

      return {
         project: project ? serializeProject(project, latestUpdate) : null,
         statusOptions,
         priorityOptions,
         areas,
         issues,
         databaseError: null,
         isConnected: true,
      };
   },
});

export const areas = query({
   args: { projectId: v.string() },
   handler: async (ctx, { projectId }) => {
      return listProjectAreas(ctx, projectId as Id<'projects'>);
   },
});

export const updatesPage = query({
   args: {},
   handler: async (ctx) => {
      const updates = await ctx.db
         .query('projectUpdates')
         .withIndex('by_createdAt')
         .order('desc')
         .collect();

      return {
         updates: (
            await Promise.all(
               updates.map(async (update) => {
                  const project = await ctx.db.get(update.projectId);
                  if (!project) return null;

                  return {
                     ...serializeProjectUpdate(update),
                     project: {
                        id: project._id,
                        name: project.name,
                        slug: project.slug,
                     },
                  };
               })
            )
         ).filter((update) => update !== null),
         databaseError: null,
         isConnected: true,
      };
   },
});

export const create = mutation({
   args: {
      name: v.string(),
      key: v.optional(v.string()),
      description: v.optional(v.string()),
      iconType: v.optional(v.string()),
      iconValue: v.optional(v.string()),
      status: v.string(),
      priority: v.optional(v.string()),
   },
   handler: async (ctx, input) => {
      const slug = toOptionId(input.name);
      const key = normalizeProjectKey(input.key || createProjectKeyFromName(input.name));

      if (!slug) {
         throw new Error(
            'Project name must contain letters or numbers so a slug can be generated.'
         );
      }

      assertValidProjectKey(key);

      const [existingSlug, existingKey] = await Promise.all([
         ctx.db
            .query('projects')
            .withIndex('by_slug', (q) => q.eq('slug', slug))
            .unique(),
         ctx.db
            .query('projects')
            .withIndex('by_key', (q) => q.eq('key', key))
            .unique(),
      ]);

      if (existingSlug) {
         throw new Error(
            `A project with the slug "${slug}" already exists. Choose a different name.`
         );
      }

      if (existingKey) {
         throw new Error(`A project with the key "${key}" already exists. Choose a different key.`);
      }

      const now = Date.now();
      const projectId = await ctx.db.insert('projects', {
         name: input.name,
         slug,
         key,
         description: input.description || undefined,
         iconType: input.iconType ?? 'lucide',
         iconValue: input.iconValue ?? 'box',
         status: input.status,
         priority: input.priority ?? 'no-priority',
         createdAt: now,
         updatedAt: now,
      });

      return getProjectById(ctx, projectId);
   },
});

export const update = mutation({
   args: {
      projectId: v.string(),
      status: v.optional(v.string()),
      priority: v.optional(v.string()),
   },
   handler: async (ctx, { projectId, ...input }) => {
      const id = projectId as Id<'projects'>;
      const project = await ctx.db.get(id);
      if (!project) return null;

      await ctx.db.patch(id, {
         ...(input.status !== undefined ? { status: input.status } : {}),
         ...(input.priority !== undefined ? { priority: input.priority } : {}),
         updatedAt: Date.now(),
      });

      return getProjectById(ctx, id);
   },
});

export const updateDetails = mutation({
   args: {
      projectId: v.string(),
      name: v.optional(v.string()),
      key: v.optional(v.string()),
      description: v.optional(v.union(v.string(), v.null())),
      iconType: v.optional(v.string()),
      iconValue: v.optional(v.string()),
   },
   handler: async (ctx, { projectId, ...input }) => {
      const id = projectId as Id<'projects'>;
      const project = await ctx.db.get(id);
      if (!project) return null;

      const key = input.key === undefined ? undefined : normalizeProjectKey(input.key);
      if (key !== undefined) {
         assertValidProjectKey(key);
         const existingKey = await ctx.db
            .query('projects')
            .withIndex('by_key', (q) => q.eq('key', key))
            .unique();
         if (existingKey && existingKey._id !== id) {
            throw new Error(
               `A project with the key "${key}" already exists. Choose a different key.`
            );
         }
      }

      await ctx.db.patch(id, {
         ...(input.name !== undefined ? { name: input.name } : {}),
         ...(key !== undefined ? { key } : {}),
         ...(input.description !== undefined
            ? { description: input.description ?? undefined }
            : {}),
         ...(input.iconType !== undefined ? { iconType: input.iconType } : {}),
         ...(input.iconValue !== undefined ? { iconValue: input.iconValue } : {}),
         updatedAt: Date.now(),
      });

      return getProjectById(ctx, id);
   },
});

export const updateFields = mutation({
   args: {
      projectId: v.string(),
      name: v.optional(v.string()),
      key: v.optional(v.string()),
      description: v.optional(v.union(v.string(), v.null())),
      iconType: v.optional(v.string()),
      iconValue: v.optional(v.string()),
   },
   handler: async (ctx, { projectId, ...input }) => {
      const id = projectId as Id<'projects'>;
      const project = await ctx.db.get(id);
      if (!project) return null;

      const key = input.key === undefined ? undefined : normalizeProjectKey(input.key);
      if (key !== undefined) {
         assertValidProjectKey(key);
         const existingKey = await ctx.db
            .query('projects')
            .withIndex('by_key', (q) => q.eq('key', key))
            .unique();
         if (existingKey && existingKey._id !== id) {
            throw new Error(
               `A project with the key "${key}" already exists. Choose a different key.`
            );
         }
      }

      await ctx.db.patch(id, {
         ...(input.name !== undefined ? { name: input.name } : {}),
         ...(key !== undefined ? { key } : {}),
         ...(input.description !== undefined
            ? { description: input.description ?? undefined }
            : {}),
         ...(input.iconType !== undefined ? { iconType: input.iconType } : {}),
         ...(input.iconValue !== undefined ? { iconValue: input.iconValue } : {}),
         updatedAt: Date.now(),
      });

      return getProjectById(ctx, id);
   },
});

export const createUpdate = mutation({
   args: {
      projectId: v.string(),
      health: v.string(),
      body: v.string(),
   },
   handler: async (ctx, input) => {
      const projectId = input.projectId as Id<'projects'>;
      const project = await ctx.db.get(projectId);
      if (!project) {
         throw new Error('Project does not exist.');
      }

      const now = Date.now();
      const updateId = await ctx.db.insert('projectUpdates', {
         projectId,
         health: input.health,
         body: input.body,
         createdAt: now,
         updatedAt: now,
      });
      await ctx.db.patch(projectId, { updatedAt: now });

      return serializeProjectUpdate((await ctx.db.get(updateId))!);
   },
});

export const createArea = mutation({
   args: { projectId: v.string(), name: v.string(), color: v.string() },
   handler: async (ctx, input) => {
      const projectId = input.projectId as Id<'projects'>;
      const project = await ctx.db.get(projectId);
      if (!project) {
         throw new Error('Project does not exist.');
      }

      const name = input.name.trim();
      if (!name) {
         throw new Error('Area name is required.');
      }

      const existingAreas = await ctx.db
         .query('projectAreas')
         .withIndex('by_project_position', (q) => q.eq('projectId', projectId))
         .collect();
      const now = Date.now();
      const areaId = await ctx.db.insert('projectAreas', {
         projectId,
         name,
         color: input.color,
         position: existingAreas.length,
         createdAt: now,
         updatedAt: now,
      });

      await ctx.db.patch(projectId, { updatedAt: now });
      return serializeProjectArea((await ctx.db.get(areaId))!);
   },
});

export const updateArea = mutation({
   args: { areaId: v.string(), name: v.string(), color: v.string() },
   handler: async (ctx, input) => {
      const areaId = input.areaId as Id<'projectAreas'>;
      const area = await ctx.db.get(areaId);
      if (!area) {
         throw new Error('Area not found.');
      }

      const name = input.name.trim();
      if (!name) {
         throw new Error('Area name is required.');
      }

      const now = Date.now();
      await Promise.all([
         ctx.db.patch(areaId, { name, color: input.color, updatedAt: now }),
         ctx.db.patch(area.projectId, { updatedAt: now }),
      ]);
      return serializeProjectArea((await ctx.db.get(areaId))!);
   },
});

export const deleteArea = mutation({
   args: { areaId: v.string() },
   handler: async (ctx, { areaId }) => {
      const id = areaId as Id<'projectAreas'>;
      const area = await ctx.db.get(id);
      if (!area) {
         return { ok: true };
      }

      const issues = await ctx.db
         .query('issues')
         .withIndex('by_project', (q) => q.eq('projectId', area.projectId))
         .collect();
      const now = Date.now();

      const issueUpdates = [];
      for (const issue of issues) {
         if (issue.areaId === id) {
            issueUpdates.push(ctx.db.patch(issue._id, { areaId: undefined, updatedAt: now }));
         }
      }
      await Promise.all(issueUpdates);
      await Promise.all([ctx.db.delete(id), ctx.db.patch(area.projectId, { updatedAt: now })]);

      return { ok: true };
   },
});

export const reorderAreas = mutation({
   args: { projectId: v.string(), areaIds: v.array(v.string()) },
   handler: async (ctx, { projectId, areaIds }) => {
      const id = projectId as Id<'projects'>;
      const project = await ctx.db.get(id);
      if (!project) {
         throw new Error('Project not found.');
      }

      const now = Date.now();
      await Promise.all(
         areaIds.map(async (areaId, position) => {
            const area = await ctx.db.get(areaId as Id<'projectAreas'>);
            if (area?.projectId === id) {
               await ctx.db.patch(area._id, { position, updatedAt: now });
            }
         })
      );
      await ctx.db.patch(id, { updatedAt: now });

      return { ok: true };
   },
});

export const createStatus = mutation({
   args: { name: v.string(), color: v.string() },
   handler: async (ctx, input) => saveOption(ctx, 'projectStatuses', input),
});

export const updateStatus = mutation({
   args: { id: v.string(), name: v.string(), color: v.string() },
   handler: async (ctx, input) => updateOption(ctx, 'projectStatuses', input),
});

export const deleteStatus = mutation({
   args: { id: v.string() },
   handler: async (ctx, { id }) => {
      await deleteOption(ctx, 'projectStatuses', id);
      return { ok: true };
   },
});

export const reorderStatuses = mutation({
   args: { ids: v.array(v.string()) },
   handler: async (ctx, { ids }) => {
      const now = Date.now();
      const defaults = new Map(defaultProjectStatuses.map((option) => [option.id, option]));
      await Promise.all(
         ids.map(async (id, position) => {
            const existing = await findOptionById(ctx, 'projectStatuses', id);
            if (existing) {
               await ctx.db.patch(existing._id, { position, updatedAt: now });
               return;
            }

            const defaultOption = defaults.get(id);
            if (defaultOption) {
               await ctx.db.insert('projectStatuses', {
                  ...defaultOption,
                  position,
                  createdAt: now,
                  updatedAt: now,
               });
            }
         })
      );
      return { ok: true };
   },
});

export const createPriority = mutation({
   args: { name: v.string(), color: v.string() },
   handler: async (ctx, input) => saveOption(ctx, 'projectPriorities', input),
});

export const updatePriority = mutation({
   args: { id: v.string(), name: v.string(), color: v.string() },
   handler: async (ctx, input) => updateOption(ctx, 'projectPriorities', input),
});

export const deletePriority = mutation({
   args: { id: v.string() },
   handler: async (ctx, { id }) => {
      await deleteOption(ctx, 'projectPriorities', id);
      return { ok: true };
   },
});

export const reorderPriorities = mutation({
   args: { ids: v.array(v.string()) },
   handler: async (ctx, { ids }) => {
      const now = Date.now();
      const defaults = new Map(defaultProjectPriorities.map((option) => [option.id, option]));
      await Promise.all(
         ids.map(async (id, position) => {
            const existing = await findOptionById(ctx, 'projectPriorities', id);
            if (existing) {
               await ctx.db.patch(existing._id, { position, updatedAt: now });
               return;
            }

            const defaultOption = defaults.get(id);
            if (defaultOption) {
               await ctx.db.insert('projectPriorities', {
                  ...defaultOption,
                  position,
                  createdAt: now,
                  updatedAt: now,
               });
            }
         })
      );
      return { ok: true };
   },
});

export const deleteProject = mutation({
   args: {
      projectId: v.string(),
      mode: v.union(v.literal('unlink'), v.literal('withIssues')),
   },
   handler: async (ctx, { projectId, mode }) => {
      const id = projectId as Id<'projects'>;
      const project = await ctx.db.get(id);
      if (!project) {
         throw new Error('Project not found.');
      }

      const [issues, updates, areas] = await Promise.all([
         ctx.db
            .query('issues')
            .withIndex('by_project', (q) => q.eq('projectId', id))
            .collect(),
         ctx.db
            .query('projectUpdates')
            .withIndex('by_project_createdAt', (q) => q.eq('projectId', id))
            .collect(),
         ctx.db
            .query('projectAreas')
            .withIndex('by_project', (q) => q.eq('projectId', id))
            .collect(),
      ]);

      if (mode === 'unlink') {
         await Promise.all(
            issues.map((issue) =>
               ctx.db.patch(issue._id, { projectId: undefined, areaId: undefined })
            )
         );
      } else {
         await Promise.all(issues.map((issue) => ctx.db.delete(issue._id)));
      }

      await Promise.all(updates.map((update) => ctx.db.delete(update._id)));
      await Promise.all(areas.map((area) => ctx.db.delete(area._id)));
      await ctx.db.delete(id);

      return { ok: true };
   },
});
