import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';

const singletonKey = 'me';

const defaultProfile = {
   id: singletonKey,
   name: 'vcntttt',
   avatarUrl: 'https://i.pinimg.com/736x/bd/1f/b6/bd1fb6cf9d218514d9ed9a8022153dd2.jpg',
   email: 'local@triangle.dev',
   status: 'online' as const,
   role: 'Admin' as const,
   joinedDate: '2026-01-01',
};

const defaultPreferences = {
   issueView: {
      viewType: 'list' as const,
      showEmptyStatuses: true,
      hideCompletedIssues: false,
      visibleProperties: {
         identifier: true,
         labels: true,
         project: true,
         area: true,
         assignee: true,
         createdAt: true,
      },
   },
   issueFilters: {
      status: [],
      assignee: [],
      priority: [],
      labels: [],
      project: [],
      area: [],
   },
   projectView: {
      viewType: 'list' as const,
      groupBy: 'status' as const,
      showEmptyGroups: false,
      visibleProperties: {
         health: true,
         priority: true,
         lead: true,
         targetDate: true,
         status: true,
      },
   },
   projectFilters: {
      health: [],
      priority: [],
      sort: 'title-asc',
   },
   pinnedProjectIds: [] as Id<'projects'>[],
   sidebarOpen: true,
};

const issueViewPatchValidator = v.object({
   viewType: v.optional(v.union(v.literal('list'), v.literal('grid'))),
   showEmptyStatuses: v.optional(v.boolean()),
   hideCompletedIssues: v.optional(v.boolean()),
   visibleProperties: v.optional(
      v.object({
         identifier: v.optional(v.boolean()),
         labels: v.optional(v.boolean()),
         project: v.optional(v.boolean()),
         area: v.optional(v.boolean()),
         assignee: v.optional(v.boolean()),
         createdAt: v.optional(v.boolean()),
      })
   ),
});

const issueFiltersPatchValidator = v.object({
   status: v.optional(v.array(v.string())),
   assignee: v.optional(v.array(v.string())),
   priority: v.optional(v.array(v.string())),
   labels: v.optional(v.array(v.string())),
   project: v.optional(v.array(v.string())),
   area: v.optional(v.array(v.string())),
});

const projectViewPatchValidator = v.object({
   viewType: v.optional(v.union(v.literal('list'), v.literal('board'))),
   groupBy: v.optional(v.union(v.literal('status'), v.literal('priority'), v.literal('health'))),
   showEmptyGroups: v.optional(v.boolean()),
   visibleProperties: v.optional(
      v.object({
         health: v.optional(v.boolean()),
         priority: v.optional(v.boolean()),
         lead: v.optional(v.boolean()),
         targetDate: v.optional(v.boolean()),
         status: v.optional(v.boolean()),
      })
   ),
});

const projectFiltersPatchValidator = v.object({
   health: v.optional(v.array(v.string())),
   priority: v.optional(v.array(v.string())),
   sort: v.optional(v.string()),
});

function serializeProfile(profile: Doc<'viewerProfiles'> | null) {
   if (!profile) {
      return defaultProfile;
   }

   return {
      id: singletonKey,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      email: profile.email,
      status: profile.status,
      role: profile.role,
      joinedDate: profile.joinedDate,
   };
}

function serializePreferences(preferences: Doc<'viewerPreferences'> | null) {
   if (!preferences) {
      return defaultPreferences;
   }

   return {
      issueView: {
         ...defaultPreferences.issueView,
         ...preferences.issueView,
         visibleProperties: {
            ...defaultPreferences.issueView.visibleProperties,
            ...preferences.issueView.visibleProperties,
         },
      },
      issueFilters: {
         ...defaultPreferences.issueFilters,
         ...preferences.issueFilters,
      },
      projectView: preferences.projectView,
      projectFilters: preferences.projectFilters,
      pinnedProjectIds: preferences.pinnedProjectIds,
      sidebarOpen: preferences.sidebarOpen,
   };
}

async function getProfile(ctx: QueryCtx | MutationCtx) {
   return ctx.db
      .query('viewerProfiles')
      .withIndex('by_singletonKey', (q) => q.eq('singletonKey', singletonKey))
      .unique();
}

async function getPreferences(ctx: QueryCtx | MutationCtx) {
   return ctx.db
      .query('viewerPreferences')
      .withIndex('by_singletonKey', (q) => q.eq('singletonKey', singletonKey))
      .unique();
}

async function ensurePreferences(ctx: MutationCtx) {
   const existing = await getPreferences(ctx);
   if (existing) {
      return existing;
   }

   const now = Date.now();
   const id = await ctx.db.insert('viewerPreferences', {
      singletonKey,
      ...defaultPreferences,
      createdAt: now,
      updatedAt: now,
   });

   return (await ctx.db.get(id))!;
}

export const profile = query({
   args: {},
   handler: async (ctx) => serializeProfile(await getProfile(ctx)),
});

export const updateProfile = mutation({
   args: {
      name: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
      email: v.optional(v.string()),
      status: v.optional(v.union(v.literal('online'), v.literal('offline'), v.literal('away'))),
      role: v.optional(v.union(v.literal('Admin'), v.literal('Member'), v.literal('Guest'))),
      joinedDate: v.optional(v.string()),
   },
   handler: async (ctx, input) => {
      const existing = await getProfile(ctx);
      const now = Date.now();

      if (!existing) {
         const id = await ctx.db.insert('viewerProfiles', {
            singletonKey,
            name: input.name ?? defaultProfile.name,
            avatarUrl: input.avatarUrl ?? defaultProfile.avatarUrl,
            email: input.email ?? defaultProfile.email,
            status: input.status ?? defaultProfile.status,
            role: input.role ?? defaultProfile.role,
            joinedDate: input.joinedDate ?? defaultProfile.joinedDate,
            createdAt: now,
            updatedAt: now,
         });

         return serializeProfile((await ctx.db.get(id))!);
      }

      await ctx.db.patch(existing._id, {
         ...input,
         updatedAt: now,
      });

      return serializeProfile((await ctx.db.get(existing._id))!);
   },
});

export const preferences = query({
   args: {},
   handler: async (ctx) => serializePreferences(await getPreferences(ctx)),
});

export const updatePreferences = mutation({
   args: {
      issueView: v.optional(issueViewPatchValidator),
      issueFilters: v.optional(issueFiltersPatchValidator),
      projectView: v.optional(projectViewPatchValidator),
      projectFilters: v.optional(projectFiltersPatchValidator),
      pinnedProjectIds: v.optional(v.array(v.id('projects'))),
      sidebarOpen: v.optional(v.boolean()),
   },
   handler: async (ctx, input) => {
      const existing = await ensurePreferences(ctx);

      await ctx.db.patch(existing._id, {
         ...(input.issueView
            ? {
                 issueView: {
                    ...existing.issueView,
                    ...input.issueView,
                    visibleProperties: {
                       ...existing.issueView.visibleProperties,
                       ...input.issueView.visibleProperties,
                    },
                 },
              }
            : {}),
         ...(input.issueFilters
            ? { issueFilters: { ...existing.issueFilters, ...input.issueFilters } }
            : {}),
         ...(input.projectView
            ? {
                 projectView: {
                    ...existing.projectView,
                    ...input.projectView,
                    visibleProperties: {
                       ...existing.projectView.visibleProperties,
                       ...input.projectView.visibleProperties,
                    },
                 },
              }
            : {}),
         ...(input.projectFilters
            ? { projectFilters: { ...existing.projectFilters, ...input.projectFilters } }
            : {}),
         ...(input.pinnedProjectIds !== undefined
            ? { pinnedProjectIds: input.pinnedProjectIds }
            : {}),
         ...(input.sidebarOpen !== undefined ? { sidebarOpen: input.sidebarOpen } : {}),
         updatedAt: Date.now(),
      });

      return serializePreferences((await ctx.db.get(existing._id))!);
   },
});

export const togglePinnedProject = mutation({
   args: { projectId: v.id('projects') },
   handler: async (ctx, { projectId }) => {
      const existing = await ensurePreferences(ctx);
      const pinnedProjectIds = existing.pinnedProjectIds.some((id) => id === projectId)
         ? existing.pinnedProjectIds.filter((id) => id !== projectId)
         : [...existing.pinnedProjectIds, projectId];

      await ctx.db.patch(existing._id, {
         pinnedProjectIds,
         updatedAt: Date.now(),
      });

      return serializePreferences((await ctx.db.get(existing._id))!);
   },
});

export const setSidebarOpen = mutation({
   args: { open: v.boolean() },
   handler: async (ctx, { open }) => {
      const existing = await ensurePreferences(ctx);

      await ctx.db.patch(existing._id, {
         sidebarOpen: open,
         updatedAt: Date.now(),
      });

      return serializePreferences((await ctx.db.get(existing._id))!);
   },
});
