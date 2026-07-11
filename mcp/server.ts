import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ConvexHttpClient } from 'convex/browser';
import { z } from 'zod';

import { api } from '../convex/_generated/api';

function result(value: unknown) {
   return {
      content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
   };
}

function toolError(error: unknown) {
   const message = error instanceof Error ? error.message : 'Unexpected Triangle MCP error.';
   return {
      content: [{ type: 'text' as const, text: message }],
      isError: true,
   };
}

async function run<T>(operation: () => Promise<T>) {
   try {
      return result(await operation());
   } catch (error) {
      return toolError(error);
   }
}

export function createTriangleMcpServer(
   convexUrl = process.env.CONVEX_SELF_HOSTED_URL ?? process.env.VITE_CONVEX_URL
) {
   if (!convexUrl) {
      throw new Error('CONVEX_SELF_HOSTED_URL or VITE_CONVEX_URL is required.');
   }

   const convex = new ConvexHttpClient(convexUrl, {
      logger: false,
      skipConvexDeploymentUrlCheck: true,
   });
   const server = new McpServer({ name: 'triangle', version: '0.2.0' });

   server.registerTool(
      'triangle_workspace',
      {
         title: 'Triangle workspace',
         description:
            'Return issue statuses, project statuses and priorities, projects, labels, and recent project updates. Use this before creating or changing records when you need valid option IDs.',
         annotations: { readOnlyHint: true },
      },
      () =>
         run(async () => {
            const [projects, labels, updates, issueStatuses, viewer] = await Promise.all([
               convex.query(api.projects.page, {}),
               convex.query(api.labels.options, {}),
               convex.query(api.projects.updatesPage, {}),
               convex.query(api.issueStatuses.list, {}),
               convex.query(api.viewer.profile, {}),
            ]);
            const areas = (
               await Promise.all(
                  projects.projects.map((project) =>
                     convex.query(api.projects.areas, { projectId: project.id })
                  )
               )
            ).flat();

            return {
               issueStatuses,
               projectStatuses: projects.statusOptions,
               projectPriorities: projects.priorityOptions,
               projects: projects.projects,
               labels,
               areas,
               recentProjectUpdates: updates.updates,
               assignableUsers: [viewer],
            };
         })
   );

   server.registerTool(
      'triangle_list_issues',
      {
         title: 'List Triangle issues',
         description:
            'Search issues with combinable project, label, status, age, and activity filters. Date boundaries are ISO 8601 timestamps.',
         inputSchema: {
            projectId: z.string().optional(),
            labelIds: z.array(z.string()).optional(),
            statuses: z.array(z.string()).optional(),
            createdBefore: z.string().datetime().optional(),
            createdAfter: z.string().datetime().optional(),
            updatedBefore: z.string().datetime().optional(),
            updatedAfter: z.string().datetime().optional(),
         },
         annotations: { readOnlyHint: true },
      },
      (input) => run(() => convex.query(api.issues.search, input))
   );

   server.registerTool(
      'triangle_get_issue',
      {
         title: 'Get a Triangle issue',
         description: 'Get an issue by its human-readable identifier, such as CIRC-12 or APP-3.',
         inputSchema: { identifier: z.string().min(1) },
         annotations: { readOnlyHint: true },
      },
      ({ identifier }) =>
         run(() => convex.query(api.issues.detail, { issueIdentifier: identifier }))
   );

   server.registerTool(
      'triangle_create_issue',
      {
         title: 'Create a Triangle issue',
         description:
            'Create an issue. Use projectName and labelNames when possible; use workspace data first to choose valid status and priority IDs.',
         inputSchema: {
            title: z.string().min(1),
            description: z.string().optional(),
            status: z.string().min(1),
            priority: z.string().min(1),
            projectId: z.string().optional(),
            projectName: z.string().optional(),
            areaId: z.string().optional(),
            labelIds: z.array(z.string()).optional(),
            labelNames: z.array(z.string()).optional(),
            assigneeId: z.string().optional(),
            estimatedHours: z.number().nonnegative().optional(),
            dueDate: z.string().datetime().optional(),
            parentIssueId: z.string().optional(),
         },
      },
      (input) => run(() => convex.mutation(api.issues.create, input))
   );

   server.registerTool(
      'triangle_update_issue',
      {
         title: 'Update a Triangle issue',
         description:
            'Update an issue by its internal ID. Omit fields that should remain unchanged. Passing null clears description, due date, parent, project, or assignee.',
         inputSchema: {
            issueId: z.string().min(1),
            title: z.string().min(1).optional(),
            description: z.string().nullable().optional(),
            status: z.string().min(1).optional(),
            priority: z.string().min(1).optional(),
            projectId: z.string().nullable().optional(),
            projectName: z.string().nullable().optional(),
            areaId: z.string().nullable().optional(),
            labelIds: z.array(z.string()).optional(),
            labelNames: z.array(z.string()).optional(),
            assigneeId: z.string().nullable().optional(),
            estimatedHours: z.number().nonnegative().nullable().optional(),
            dueDate: z.string().datetime().nullable().optional(),
            parentIssueId: z.string().nullable().optional(),
         },
      },
      (input) => run(() => convex.mutation(api.issues.update, input))
   );

   server.registerTool(
      'triangle_set_issue_status',
      {
         title: 'Set Triangle issue status',
         description:
            'Change an issue status, with optional child cascading and parent advancement.',
         inputSchema: {
            issueId: z.string().min(1),
            status: z.string().min(1),
            cascadeChildren: z.boolean().optional(),
            advanceParent: z.boolean().optional(),
         },
      },
      (input) => run(() => convex.mutation(api.issues.setStatus, input))
   );

   server.registerTool(
      'triangle_archive_issue',
      {
         title: 'Archive a Triangle issue',
         description:
            'Archive an issue. This changes its status to archived and is reversible through triangle_set_issue_status.',
         inputSchema: { issueId: z.string().min(1) },
         annotations: { destructiveHint: true },
      },
      ({ issueId }) => run(() => convex.mutation(api.issues.archive, { issueId }))
   );

   server.registerTool(
      'triangle_close_issue',
      {
         title: 'Close Triangle issue with resolution',
         description:
            'Mark an issue completed and persist its resolution. Reopening the issue later does not erase the resolution.',
         inputSchema: { issueId: z.string().min(1), resolution: z.string().min(1) },
      },
      (input) => run(() => convex.mutation(api.issues.close, input))
   );

   server.registerTool(
      'triangle_assign_issue',
      {
         title: 'Assign Triangle issue',
         description: 'Assign an issue to an assignee ID, or pass null to unassign it.',
         inputSchema: { issueId: z.string().min(1), assigneeId: z.string().nullable() },
      },
      (input) => run(() => convex.mutation(api.issues.assign, input))
   );

   server.registerTool(
      'triangle_claim_issue',
      {
         title: 'Claim Triangle issue',
         description: 'Assign an issue to the current local Triangle user.',
         inputSchema: { issueId: z.string().min(1) },
      },
      (input) => run(() => convex.mutation(api.issues.claim, input))
   );

   server.registerTool(
      'triangle_add_issue_comment',
      {
         title: 'Add issue comment',
         description:
            'Add a normal comment or a durable triage note. Keep the returned comment ID to detect later activity.',
         inputSchema: {
            issueId: z.string().min(1),
            body: z.string().min(1),
            kind: z.enum(['comment', 'triage-note']).optional(),
         },
      },
      (input) => run(() => convex.mutation(api.issues.addComment, input))
   );

   server.registerTool(
      'triangle_activity_after_triage',
      {
         title: 'Detect activity after triage',
         description:
            'Report issue changes, comments, and artifacts created after a specific triage note.',
         inputSchema: {
            issueId: z.string().min(1),
            triageNoteId: z.string().min(1),
         },
         annotations: { readOnlyHint: true },
      },
      (input) => run(() => convex.query(api.issues.activityAfterTriage, input))
   );

   server.registerTool(
      'triangle_attach_issue_artifact',
      {
         title: 'Attach issue artifact',
         description:
            'Link a research result, prototype, document, or other HTTP(S) artifact to an issue.',
         inputSchema: {
            issueId: z.string().min(1),
            title: z.string().min(1),
            url: z.string().url(),
            kind: z.enum(['research', 'prototype', 'document', 'other']),
            description: z.string().optional(),
         },
      },
      (input) => run(() => convex.mutation(api.issues.addArtifact, input))
   );

   server.registerTool(
      'triangle_list_projects',
      {
         title: 'List Triangle projects',
         description:
            'List projects with their latest update and valid project status and priority options.',
         annotations: { readOnlyHint: true },
      },
      () => run(() => convex.query(api.projects.page, {}))
   );

   server.registerTool(
      'triangle_get_project',
      {
         title: 'Get a Triangle project',
         description:
            'Get a project, its areas, issues, updates context, and valid options by project slug or internal ID.',
         inputSchema: { projectSlug: z.string().min(1) },
         annotations: { readOnlyHint: true },
      },
      ({ projectSlug }) => run(() => convex.query(api.projects.detail, { projectSlug }))
   );

   server.registerTool(
      'triangle_create_project',
      {
         title: 'Create a Triangle project',
         description:
            'Create a project. Use triangle_list_projects first to choose valid status and priority IDs.',
         inputSchema: {
            name: z.string().min(1),
            status: z.string().min(1),
            priority: z.string().optional(),
            key: z.string().optional(),
            description: z.string().optional(),
            iconType: z.string().optional(),
            iconValue: z.string().optional(),
         },
      },
      (input) => run(() => convex.mutation(api.projects.create, input))
   );

   server.registerTool(
      'triangle_update_project',
      {
         title: 'Update a Triangle project',
         description:
            'Update a project status, priority, or its details. Passing null clears its description.',
         inputSchema: {
            projectId: z.string().min(1),
            status: z.string().min(1).optional(),
            priority: z.string().min(1).optional(),
            name: z.string().min(1).optional(),
            key: z.string().optional(),
            description: z.string().nullable().optional(),
            iconType: z.string().optional(),
            iconValue: z.string().optional(),
         },
      },
      async ({ projectId, status, priority, name, key, description, iconType, iconValue }) =>
         run(async () => {
            const statusOrPriorityChanged = status !== undefined || priority !== undefined;
            const detailsChanged =
               name !== undefined ||
               key !== undefined ||
               description !== undefined ||
               iconType !== undefined ||
               iconValue !== undefined;

            if (!statusOrPriorityChanged && !detailsChanged) {
               throw new Error('Provide at least one project field to update.');
            }

            if (detailsChanged) {
               await convex.mutation(api.projects.updateFields, {
                  projectId,
                  name,
                  key,
                  description,
                  iconType,
                  iconValue,
               });
            }

            if (statusOrPriorityChanged) {
               return convex.mutation(api.projects.update, { projectId, status, priority });
            }

            const project = await convex.query(api.projects.bySlug, { projectSlug: projectId });
            return project.project;
         })
   );

   server.registerTool(
      'triangle_create_project_update',
      {
         title: 'Create a Triangle project update',
         description:
            'Publish a dated project update with a health value: no-update, off-track, on-track, or at-risk.',
         inputSchema: {
            projectId: z.string().min(1),
            health: z.enum(['no-update', 'off-track', 'on-track', 'at-risk']),
            body: z.string().min(1),
         },
      },
      (input) => run(() => convex.mutation(api.projects.createUpdate, input))
   );

   server.registerTool(
      'triangle_add_issue_blocker',
      {
         title: 'Add issue blocker',
         description: 'Require blockerIssueId to be completed before blockedIssueId can start.',
         inputSchema: { blockedIssueId: z.string(), blockerIssueId: z.string() },
      },
      (input) => run(() => convex.mutation(api.issues.addBlocker, input))
   );
   server.registerTool(
      'triangle_remove_issue_blocker',
      {
         title: 'Remove issue blocker',
         inputSchema: { blockedIssueId: z.string(), blockerIssueId: z.string() },
      },
      (input) => run(() => convex.mutation(api.issues.removeBlocker, input))
   );
   server.registerTool(
      'triangle_create_label',
      { title: 'Create label', inputSchema: { name: z.string().min(1), color: z.string().min(1) } },
      (input) => run(() => convex.mutation(api.labels.create, input))
   );
   server.registerTool(
      'triangle_update_label',
      {
         title: 'Update label',
         inputSchema: {
            labelId: z.string(),
            name: z.string().optional(),
            color: z.string().optional(),
         },
      },
      (input) => run(() => convex.mutation(api.labels.update, input))
   );
   server.registerTool(
      'triangle_delete_label',
      { title: 'Delete label', inputSchema: { labelId: z.string() } },
      (input) => run(() => convex.mutation(api.labels.remove, input))
   );
   server.registerTool(
      'triangle_create_issue_status',
      {
         title: 'Create issue status',
         inputSchema: {
            name: z.string(),
            color: z.string(),
            type: z.enum(['unstarted', 'started', 'completed']),
         },
      },
      (input) => run(() => convex.mutation(api.issueStatuses.create, input))
   );
   server.registerTool(
      'triangle_update_issue_status',
      {
         title: 'Update issue status',
         inputSchema: {
            id: z.string(),
            name: z.string().optional(),
            color: z.string().optional(),
            type: z.enum(['unstarted', 'started', 'completed']).optional(),
         },
      },
      (input) => run(() => convex.mutation(api.issueStatuses.update, input))
   );
   server.registerTool(
      'triangle_delete_issue_status',
      { title: 'Delete issue status', inputSchema: { id: z.string() } },
      (input) => run(() => convex.mutation(api.issueStatuses.remove, input))
   );
   server.registerTool(
      'triangle_create_area',
      {
         title: 'Create project area',
         inputSchema: { projectId: z.string(), name: z.string(), color: z.string() },
      },
      (input) => run(() => convex.mutation(api.projects.createArea, input))
   );
   server.registerTool(
      'triangle_update_area',
      {
         title: 'Update project area',
         inputSchema: { areaId: z.string(), name: z.string(), color: z.string() },
      },
      (input) => run(() => convex.mutation(api.projects.updateArea, input))
   );
   server.registerTool(
      'triangle_delete_area',
      { title: 'Delete project area', inputSchema: { areaId: z.string() } },
      (input) => run(() => convex.mutation(api.projects.deleteArea, input))
   );

   return server;
}

if (process.argv[1]?.endsWith('/mcp/server.ts')) {
   const server = createTriangleMcpServer();
   await server.connect(new StdioServerTransport());
}
