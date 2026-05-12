import { Outlet, createFileRoute, useMatches } from '@tanstack/react-router';
import { z } from 'zod';
import { useEffect, useMemo } from 'react';
import Header from '@/components/layout/headers/issues/header';
import MainLayout from '@/components/layout/main-layout';
import { useProjectOptions } from '@/hooks/use-project-options';
import type { Project } from '@/lib/models';
import { useCreateIssueStore } from '@/store/create-issue-store';
import { getIssuesPage } from '@/src/server/issues';

const issuesSearchSchema = z.object({
   projectId: z.string().optional(),
});

type IssuesPageData = Awaited<ReturnType<typeof getIssuesPage>>;

export const Route = createFileRoute('/issues')({
   validateSearch: (search) => issuesSearchSchema.parse(search),
   loader: () => getIssuesPage(),
   head: () => ({
      meta: [
         { title: 'Issues | Triangle' },
         { name: 'description', content: 'Issue tracking for the personal Triangle workspace.' },
      ],
   }),
   component: IssuesLayout,
});

function IssuesLayout() {
   const pageData = Route.useLoaderData();
   const { issues, isConnected } = pageData;
   const { projectId } = Route.useSearch();
   const projects = useProjectOptions();
   const { setDefaultProject } = useCreateIssueStore();

   const project = useMemo<Project | undefined>(
      () => (projectId ? projects.find((project) => project.id === projectId) : undefined),
      [projectId, projects]
   );
   const filteredIssues = useMemo(
      () => (projectId ? issues.filter((issue) => issue.project?.id === projectId) : issues),
      [issues, projectId]
   );
   const projectTitle = project ? `Issues for ${project.name}` : 'Issues';

   useEffect(() => {
      setDefaultProject(project ?? null);

      return () => {
         setDefaultProject(null);
      };
   }, [project, setDefaultProject]);

   useEffect(() => {
      document.title = project ? `${project.name} issues | Triangle` : 'Issues | Triangle';
   }, [project]);

   return (
      <MainLayout
         headersNumber={1}
         header={
            <Header
               count={filteredIssues.length}
               isConnected={isConnected}
               projectTitle={projectTitle}
               project={project}
            />
         }
      >
         <Outlet />
      </MainLayout>
   );
}

export function useIssuesPageData() {
   const data = useMatches({
      select: (matches) => {
         const match = matches.find((item) => item.routeId === '/issues');

         return {
            pageData: match?.loaderData as IssuesPageData | undefined,
            projectId: (match?.search as { projectId?: string } | undefined)?.projectId,
         };
      },
   });

   if (!data.pageData) {
      throw new Error('Issues route data is unavailable.');
   }

   return {
      pageData: data.pageData,
      projectId: data.projectId,
   };
}
