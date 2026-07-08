import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
   projectStatuses: defineTable({
      id: v.string(),
      name: v.string(),
      color: v.string(),
      position: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
   })
      .index('by_option_id', ['id'])
      .index('by_name', ['name'])
      .index('by_position', ['position']),
   projectPriorities: defineTable({
      id: v.string(),
      name: v.string(),
      color: v.string(),
      position: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
   })
      .index('by_option_id', ['id'])
      .index('by_name', ['name'])
      .index('by_position', ['position']),
   projects: defineTable({
      name: v.string(),
      slug: v.string(),
      key: v.string(),
      description: v.optional(v.string()),
      iconType: v.string(),
      iconValue: v.string(),
      status: v.string(),
      priority: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
   })
      .index('by_slug', ['slug'])
      .index('by_key', ['key'])
      .index('by_updatedAt', ['updatedAt']),
   projectUpdates: defineTable({
      projectId: v.id('projects'),
      health: v.string(),
      body: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
   })
      .index('by_project_createdAt', ['projectId', 'createdAt'])
      .index('by_createdAt', ['createdAt']),
   projectAreas: defineTable({
      projectId: v.id('projects'),
      name: v.string(),
      color: v.string(),
      position: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
   })
      .index('by_project', ['projectId'])
      .index('by_project_position', ['projectId', 'position']),
   labels: defineTable({
      name: v.string(),
      color: v.string(),
      createdAt: v.number(),
   }).index('by_name', ['name']),
   viewerProfiles: defineTable({
      singletonKey: v.string(),
      name: v.string(),
      avatarUrl: v.string(),
      email: v.string(),
      status: v.union(v.literal('online'), v.literal('offline'), v.literal('away')),
      role: v.union(v.literal('Admin'), v.literal('Member'), v.literal('Guest')),
      joinedDate: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
   }).index('by_singletonKey', ['singletonKey']),
   viewerPreferences: defineTable({
      singletonKey: v.string(),
      issueView: v.object({
         viewType: v.union(v.literal('list'), v.literal('grid')),
         showEmptyStatuses: v.boolean(),
         hideCompletedIssues: v.boolean(),
         visibleProperties: v.object({
            identifier: v.boolean(),
            labels: v.boolean(),
            project: v.boolean(),
            area: v.optional(v.boolean()),
            assignee: v.boolean(),
            createdAt: v.boolean(),
         }),
      }),
      issueFilters: v.object({
         status: v.array(v.string()),
         assignee: v.array(v.string()),
         priority: v.array(v.string()),
         labels: v.array(v.string()),
         project: v.array(v.string()),
         area: v.optional(v.array(v.string())),
      }),
      projectView: v.object({
         viewType: v.union(v.literal('list'), v.literal('board')),
         groupBy: v.union(v.literal('status'), v.literal('priority'), v.literal('health')),
         showEmptyGroups: v.boolean(),
         visibleProperties: v.object({
            health: v.boolean(),
            priority: v.boolean(),
            lead: v.boolean(),
            targetDate: v.boolean(),
            status: v.boolean(),
         }),
      }),
      projectFilters: v.object({
         health: v.array(v.string()),
         priority: v.array(v.string()),
         sort: v.string(),
      }),
      pinnedProjectIds: v.array(v.id('projects')),
      sidebarOpen: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
   }).index('by_singletonKey', ['singletonKey']),
   issues: defineTable({
      identifier: v.string(),
      projectIssueNumber: v.optional(v.number()),
      projectId: v.optional(v.id('projects')),
      areaId: v.optional(v.id('projectAreas')),
      parentIssueId: v.optional(v.id('issues')),
      title: v.string(),
      description: v.optional(v.string()),
      status: v.string(),
      priority: v.string(),
      assigneeId: v.optional(v.string()),
      rank: v.string(),
      estimatedHours: v.optional(v.string()),
      dueDate: v.optional(v.number()),
      labelIds: v.array(v.id('labels')),
      createdAt: v.number(),
      updatedAt: v.number(),
   })
      .index('by_identifier', ['identifier'])
      .index('by_project', ['projectId'])
      .index('by_parent_issue', ['parentIssueId'])
      .index('by_rank', ['rank']),
});
