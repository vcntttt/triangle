import { createFileRoute, useMatches } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useEffect, useMemo } from 'react';
import Header from '@/components/layout/headers/issues/header';
import MainLayout from '@/components/layout/main-layout';
import { useProjectOptions } from '@/hooks/use-project-options';
import type { Project } from '@/lib/models';
import { useCreateIssueStore } from '@/store/create-issue-store';
import { issuesPageQuery } from '@/src/data/issues';
import { IssuesWorkspace } from '@/components/common/issues/issues-workspace';

const issuesSearchSchema = z.object({
   projectId: z.string().optional(),
});

export const Route = createFileRoute('/issues')({
   validateSearch: (search) => issuesSearchSchema.parse(search),
   loaderDeps: ({ search }) => ({ projectId: search.projectId }),
   loader: ({ context, deps }) => context.queryClient.ensureQueryData(issuesPageQuery(deps)),
   head: () => ({
      meta: [
         { title: 'Issues | Triangle' },
         { name: 'description', content: 'Issue tracking for the personal Triangle workspace.' },
      ],
   }),
   component: IssuesLayout,
});

function IssuesLayout() {
   const { projectId } = Route.useSearch();
   const { data: pageData } = useSuspenseQuery(issuesPageQuery({ projectId }));
   const { issues, isConnected } = pageData;
   const projects = useProjectOptions();
   const { setDefaultProject } = useCreateIssueStore();
   const selectedIssueIdentifier = useMatches({
      select: (matches) => {
         const issueMatch = matches.find((match) => match.routeId === '/issues/$issueIdentifier');

         return (issueMatch?.params as { issueIdentifier?: string } | undefined)?.issueIdentifier;
      },
   });

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
         <IssuesWorkspace
            initialIssues={filteredIssues}
            initialStatuses={pageData.statusOptions}
            initialPriorities={pageData.priorityOptions}
            databaseError={pageData.databaseError}
            selectedIssueIdentifier={selectedIssueIdentifier}
            projectFilterId={projectId}
         />
      </MainLayout>
   );
}
