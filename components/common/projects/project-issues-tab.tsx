'use client';

import { useEffect } from 'react';
import type { IssueListItem } from '@/lib/db/issues';
import type { Issue, Project } from '@/lib/models';
import type { ProjectOptionLike } from '@/lib/projects-presentation';
import { IssuesWorkspace } from '@/components/common/issues/issues-workspace';
import type { IssueDisplayConfig, IssueFilters, IssueScope } from '@/lib/issue-view';

interface ProjectIssuesTabProps {
   project: Project;
   initialIssues: IssueListItem[];
   initialStatuses: ProjectOptionLike[];
   initialPriorities: ProjectOptionLike[];
   selectedIssueIdentifier?: string;
   onSelectIssue: (issue: Issue) => void | Promise<void>;
   onClearSelectedIssue: () => void | Promise<void>;
   onSelectAdjacentIssue: (issue: Issue) => void | Promise<void>;
   scope?: IssueScope;
   viewOverride?: { filters: IssueFilters; display: IssueDisplayConfig };
}

export function ProjectIssuesTab({
   project,
   initialIssues,
   initialStatuses,
   initialPriorities,
   selectedIssueIdentifier,
   onSelectIssue,
   onClearSelectedIssue,
   onSelectAdjacentIssue,
   scope = 'all',
   viewOverride,
}: ProjectIssuesTabProps) {
   useEffect(() => {
      if (!selectedIssueIdentifier) {
         return;
      }

      if (initialIssues.some((issue) => issue.identifier === selectedIssueIdentifier)) {
         return;
      }

      void Promise.resolve()
         .then(onClearSelectedIssue)
         .catch((error) => {
            console.error('Failed to clear an unavailable project issue.', error);
         });
   }, [initialIssues, onClearSelectedIssue, selectedIssueIdentifier]);

   return (
      <IssuesWorkspace
         initialIssues={initialIssues}
         initialStatuses={initialStatuses}
         initialPriorities={initialPriorities}
         databaseError={null}
         selectedIssueIdentifier={selectedIssueIdentifier}
         projectFilterId={project.id}
         scope={scope}
         viewOverride={viewOverride}
         applyIssueFilters={false}
         onSelectIssue={onSelectIssue}
         onClearSelectedIssue={onClearSelectedIssue}
         onSelectAdjacentIssue={onSelectAdjacentIssue}
         emptyCopy={{
            title: 'No issues yet',
            description: `There are no issues in ${project.name} yet. Create the first issue from the sidebar composer.`,
         }}
      />
   );
}
