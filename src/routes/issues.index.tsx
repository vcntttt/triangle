import { createFileRoute } from '@tanstack/react-router';
import { IssuesWorkspace } from '@/components/common/issues/issues-workspace';
import { useIssuesPageData } from './issues';

export const Route = createFileRoute('/issues/')({
   component: IssuesIndexPage,
});

function IssuesIndexPage() {
   const {
      pageData: { issues, statusOptions, priorityOptions, databaseError },
      projectId,
   } = useIssuesPageData();
   const filteredIssues = projectId
      ? issues.filter((issue) => issue.project?.id === projectId)
      : issues;

   return (
      <IssuesWorkspace
         initialIssues={filteredIssues}
         initialStatuses={statusOptions}
         initialPriorities={priorityOptions}
         databaseError={databaseError}
         projectFilterId={projectId}
      />
   );
}
