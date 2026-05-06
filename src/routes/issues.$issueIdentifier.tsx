import { createFileRoute, notFound } from '@tanstack/react-router';
import { IssuesWorkspace } from '@/components/common/issues/issues-workspace';
import { getIssuesPage } from '@/src/server/issues';

export const Route = createFileRoute('/issues/$issueIdentifier')({
   loader: async ({ params }) => {
      const result = await getIssuesPage();
      const issue = result.issues.find((item) => item.identifier === params.issueIdentifier);

      if (!issue) {
         throw notFound();
      }

      return result;
   },
   head: ({ params }) => ({
      meta: [{ title: `${params.issueIdentifier} | Triangle` }],
   }),
   component: IssueDetailPage,
});

function IssueDetailPage() {
   const { issues, statusOptions, databaseError } = Route.useLoaderData();
   const { issueIdentifier } = Route.useParams();
   const { projectId } = Route.useSearch();
   const filteredIssues = projectId
      ? issues.filter((issue) => issue.project?.id === projectId)
      : issues;

   return (
      <IssuesWorkspace
         initialIssues={filteredIssues}
         initialStatuses={statusOptions}
         databaseError={databaseError}
         selectedIssueIdentifier={issueIdentifier}
         projectFilterId={projectId}
      />
   );
}
