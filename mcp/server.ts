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
   const message = error instanceof Error ? error.message : 'Unexpected Circle MCP error.';
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

export function createCircleMcpServer(
   convexUrl = process.env.CONVEX_SELF_HOSTED_URL ?? process.env.VITE_CONVEX_URL
) {
   if (!convexUrl) {
      throw new Error('CONVEX_SELF_HOSTED_URL or VITE_CONVEX_URL is required.');
   }

   const convex = new ConvexHttpClient(convexUrl, {
      logger: false,
      skipConvexDeploymentUrlCheck: true,
   });
   const server = new McpServer({ name: 'circle', version: '0.1.0' });

   server.registerTool(
      'circle_workspace',
      {
         title: 'Circle workspace',
         description:
            'Return issue statuses, project statuses and priorities, projects, labels, and recent project updates. Use this before creating or changing records when you need valid option IDs.',
         annotations: { readOnlyHint: true },
      },
      () =>
         run(async () => {
            const [issues, projects, labels, updates] = await Promise.all([
               convex.query(api.issues.page, {}),
               convex.query(api.projects.page, {}),
               convex.query(api.labels.options, {}),
               convex.query(api.projects.updatesPage, {}),
            ]);

            return {
               issueStatuses: issues.statusOptions,
               projectStatuses: projects.statusOptions,
               projectPriorities: projects.priorityOptions,
               projects: projects.projects,
               labels,
               recentProjectUpdates: updates.updates,
            };
         })
   );

   server.registerTool(
      'circle_list_issues',
      {
         title: 'List Circle issues',
         description: 'List all issues, optionally limited to one project ID.',
         inputSchema: { projectId: z.string().optional() },
         annotations: { readOnlyHint: true },
      },
      ({ projectId }) => run(() => convex.query(api.issues.page, { projectId: projectId ?? null }))
   );

   server.registerTool(
      'circle_get_issue',
      {
         title: 'Get a Circle issue',
         description: 'Get an issue by its human-readable identifier, such as CIRC-12 or APP-3.',
         inputSchema: { identifier: z.string().min(1) },
         annotations: { readOnlyHint: true },
      },
      ({ identifier }) =>
         run(() => convex.query(api.issues.detail, { issueIdentifier: identifier }))
   );

   server.registerTool(
      'circle_create_issue',
      {
         title: 'Create a Circle issue',
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
      'circle_update_issue',
      {
         title: 'Update a Circle issue',
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
      'circle_set_issue_status',
      {
         title: 'Set Circle issue status',
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
      'circle_archive_issue',
      {
         title: 'Archive a Circle issue',
         description:
            'Archive an issue. This changes its status to archived and is reversible through circle_set_issue_status.',
         inputSchema: { issueId: z.string().min(1) },
         annotations: { destructiveHint: true },
      },
      ({ issueId }) => run(() => convex.mutation(api.issues.archive, { issueId }))
   );

   server.registerTool(
      'circle_list_projects',
      {
         title: 'List Circle projects',
         description:
            'List projects with their latest update and valid project status and priority options.',
         annotations: { readOnlyHint: true },
      },
      () => run(() => convex.query(api.projects.page, {}))
   );

   server.registerTool(
      'circle_get_project',
      {
         title: 'Get a Circle project',
         description:
            'Get a project, its areas, issues, updates context, and valid options by project slug or internal ID.',
         inputSchema: { projectSlug: z.string().min(1) },
         annotations: { readOnlyHint: true },
      },
      ({ projectSlug }) => run(() => convex.query(api.projects.detail, { projectSlug }))
   );

   server.registerTool(
      'circle_create_project',
      {
         title: 'Create a Circle project',
         description:
            'Create a project. Use circle_list_projects first to choose valid status and priority IDs.',
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
      'circle_update_project',
      {
         title: 'Update a Circle project',
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
      'circle_create_project_update',
      {
         title: 'Create a Circle project update',
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

   return server;
}

if (process.argv[1]?.endsWith('/mcp/server.ts')) {
   const server = createCircleMcpServer();
   await server.connect(new StdioServerTransport());
}
