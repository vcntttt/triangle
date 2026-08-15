import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
   projectStatuses: defineTable({
      id: v.string(),
      name: v.string(),
      color: v.string(),
      listPosition: v.optional(v.number()),
      boardPosition: v.optional(v.number()),
      position: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
   })
      .index('by_option_id', ['id'])
      .index('by_name', ['name'])
      .index('by_list_position', ['listPosition'])
      .index('by_board_position', ['boardPosition']),
   issueStatuses: defineTable({
      id: v.string(),
      name: v.string(),
      color: v.string(),
      position: v.number(),
      type: v.union(v.literal('unstarted'), v.literal('started'), v.literal('completed')),
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
      listPosition: v.optional(v.number()),
      boardPosition: v.optional(v.number()),
      position: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
   })
      .index('by_option_id', ['id'])
      .index('by_name', ['name'])
      .index('by_list_position', ['listPosition'])
      .index('by_board_position', ['boardPosition']),
   projectAttentions: defineTable({
      id: v.string(),
      name: v.string(),
      color: v.string(),
      listPosition: v.optional(v.number()),
      boardPosition: v.optional(v.number()),
      position: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
   })
      .index('by_option_id', ['id'])
      .index('by_name', ['name'])
      .index('by_list_position', ['listPosition'])
      .index('by_board_position', ['boardPosition']),
   projects: defineTable({
      name: v.string(),
      slug: v.string(),
      key: v.string(),
      source: v.optional(v.union(v.literal('internal'), v.literal('external'))),
      externalUrl: v.optional(v.string()),
      subtitle: v.optional(v.string()),
      description: v.optional(v.string()),
      iconType: v.string(),
      iconValue: v.string(),
      status: v.string(),
      priority: v.string(),
      health: v.optional(v.string()),
      attention: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
   })
      .index('by_slug', ['slug'])
      .index('by_key', ['key'])
      .index('by_updatedAt', ['updatedAt']),
   projectUpdates: defineTable({
      projectId: v.id('projects'),
      health: v.string(),
      attention: v.optional(v.string()),
      body: v.string(),
      areaMentions: v.optional(
         v.array(
            v.object({
               areaId: v.id('projectAreas'),
               start: v.number(),
               end: v.number(),
               name: v.string(),
               color: v.string(),
            })
         )
      ),
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
   issueAutomations: defineTable({
      name: v.string(),
      enabled: v.boolean(),
      fromStatus: v.optional(v.string()),
      toStatus: v.string(),
      actions: v.array(
         v.object({
            type: v.literal('removeLabel'),
            labelId: v.id('labels'),
         })
      ),
      templateKey: v.optional(v.string()),
      deletedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
   })
      .index('by_enabled', ['enabled'])
      .index('by_template_key', ['templateKey']),
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
         viewType: v.union(v.literal('list'), v.literal('grid'), v.literal('graph')),
         listMode: v.optional(v.union(v.literal('hierarchy'), v.literal('flat'))),
         objectiveIssueIds: v.optional(v.array(v.string())),
         showEmptyStatuses: v.boolean(),
         hideCompletedIssues: v.boolean(),
         groupBy: v.optional(
            v.union(
               v.literal('status'),
               v.literal('priority'),
               v.literal('project'),
               v.literal('assignee'),
               v.literal('none')
            )
         ),
         orderBy: v.optional(
            v.union(v.literal('priority'), v.literal('created'), v.literal('title'))
         ),
         orderDirection: v.optional(v.union(v.literal('ascending'), v.literal('descending'))),
         showSubissues: v.optional(v.boolean()),
         showEmptyGroups: v.optional(v.boolean()),
         visibleProperties: v.object({
            identifier: v.boolean(),
            labels: v.boolean(),
            project: v.boolean(),
            area: v.optional(v.boolean()),
            dependencies: v.optional(v.boolean()),
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
         groupBy: v.union(
            v.literal('status'),
            v.literal('priority'),
            v.literal('attention'),
            v.literal('health')
         ),
         showEmptyGroups: v.boolean(),
         visibleProperties: v.object({
            health: v.boolean(),
            priority: v.boolean(),
            lead: v.boolean(),
            targetDate: v.boolean(),
            status: v.boolean(),
            attention: v.optional(v.boolean()),
         }),
      }),
      projectFilters: v.object({
         health: v.array(v.string()),
         priority: v.array(v.string()),
         sort: v.string(),
      }),
      pinnedProjectIds: v.array(v.id('projects')),
      savedViewsEnabled: v.optional(v.boolean()),
      sidebar: v.optional(
         v.object({
            itemOrder: v.array(v.string()),
            hiddenItems: v.array(v.string()),
            collapsedSections: v.array(v.string()),
            showBadges: v.boolean(),
            projectOrder: v.array(v.id('projects')),
         })
      ),
      sidebarOpen: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
   }).index('by_singletonKey', ['singletonKey']),
   savedViews: defineTable({
      name: v.string(),
      icon: v.optional(v.string()),
      target: v.union(v.literal('global'), v.literal('project')),
      projectId: v.optional(v.id('projects')),
      scope: v.union(v.literal('active'), v.literal('backlog'), v.literal('all')),
      filters: v.object({
         status: v.array(v.string()),
         assignee: v.array(v.string()),
         priority: v.array(v.string()),
         labels: v.array(v.string()),
         project: v.array(v.string()),
         area: v.array(v.string()),
      }),
      display: v.object({
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
      }),
      position: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
   })
      .index('by_target_position', ['target', 'position'])
      .index('by_project_position', ['projectId', 'position']),
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
      environment: v.optional(v.union(v.literal('development'), v.literal('production'))),
      assigneeId: v.optional(v.string()),
      resolution: v.optional(v.string()),
      resolvedAt: v.optional(v.number()),
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
   issueComments: defineTable({
      issueId: v.id('issues'),
      body: v.string(),
      kind: v.union(v.literal('comment'), v.literal('triage-note')),
      authorId: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
   })
      .index('by_issue_createdAt', ['issueId', 'createdAt'])
      .index('by_issue_kind_createdAt', ['issueId', 'kind', 'createdAt']),
   issueActivity: defineTable({
      issueId: v.id('issues'),
      actorId: v.string(),
      type: v.string(),
      message: v.string(),
      fromValue: v.optional(v.string()),
      toValue: v.optional(v.string()),
      createdAt: v.number(),
   })
      .index('by_issue_createdAt', ['issueId', 'createdAt'])
      .index('by_createdAt', ['createdAt']),
   issueArtifacts: defineTable({
      issueId: v.id('issues'),
      title: v.string(),
      url: v.string(),
      kind: v.union(
         v.literal('research'),
         v.literal('prototype'),
         v.literal('document'),
         v.literal('other')
      ),
      description: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
   }).index('by_issue_createdAt', ['issueId', 'createdAt']),
   issueRelations: defineTable({
      blockerIssueId: v.id('issues'),
      blockedIssueId: v.id('issues'),
      createdAt: v.number(),
   })
      .index('by_blocker', ['blockerIssueId'])
      .index('by_blocked', ['blockedIssueId'])
      .index('by_pair', ['blockerIssueId', 'blockedIssueId']),
});
