import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
   ProjectOverview,
   ProjectToolbar,
} from '@/components/common/projects/project-detail-overview';
import { projectDetailQuery } from '@/src/data/projects';

const projectSearchSchema = z.object({
   tab: z.enum(['overview', 'issues']).optional().catch('overview'),
   issue: z.string().optional(),
});

export const Route = createFileRoute('/projects/$projectSlug')({
   validateSearch: (search) => projectSearchSchema.parse(search),
   loader: ({ context, params }) =>
      context.queryClient.ensureQueryData(projectDetailQuery(params.projectSlug)),
   head: ({ loaderData }) => ({
      meta: [
         {
            title: loaderData?.project
               ? `${loaderData.project.name} | Triangle`
               : 'Project | Triangle',
         },
      ],
   }),
   component: ProjectPage,
});

function ProjectPage() {
   const { projectSlug } = Route.useParams();
   const { data } = useSuspenseQuery(projectDetailQuery(projectSlug));
   const { project, statusOptions, priorityOptions, issues, databaseError, isConnected } = data;
   const { tab = 'overview', issue } = Route.useSearch();

   if (databaseError) {
      return (
         <>
            <ProjectToolbar title="Project" />
            <div className="w-full p-6">
               <div className="max-w-2xl rounded-lg border bg-container p-6">
                  <h2 className="text-sm font-semibold">Database unavailable</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{databaseError}</p>
               </div>
            </div>
         </>
      );
   }

   if (!project) {
      return (
         <>
            <ProjectToolbar title="Project not found" />
            <div className="mx-auto flex min-h-96 max-w-3xl flex-col justify-center px-6">
               <h1 className="text-xl font-semibold">Project not found</h1>
               <p className="mt-2 text-sm text-muted-foreground">
                  This project may have been deleted or renamed.
               </p>
               <Button asChild variant="outline" className="mt-4 w-fit">
                  <Link to="/projects">Back to projects</Link>
               </Button>
            </div>
         </>
      );
   }

   return (
      <ProjectOverview
         key={project.id}
         initialProject={project}
         statusOptions={statusOptions}
         priorityOptions={priorityOptions}
         issues={issues}
         activeTab={tab}
         selectedIssueIdentifier={issue}
         isConnected={isConnected}
      />
   );
}
