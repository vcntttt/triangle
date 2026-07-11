'use client';

import { useEffect } from 'react';
import type { IssueListItem } from '@/lib/db/issues';
import type { Issue, Project } from '@/lib/models';
import type { ProjectOptionLike } from '@/lib/projects-presentation';
import { IssuesWorkspace } from '@/components/common/issues/issues-workspace';

interface ProjectIssuesTabProps {
   project: Project;
   initialIssues: IssueListItem[];
   initialStatuses: ProjectOptionLike[];
   initialPriorities: ProjectOptionLike[];
   selectedIssueIdentifier?: string;
   onSelectIssue: (issue: Issue) => void;
   onClearSelectedIssue: () => void;
   onSelectAdjacentIssue: (issue: Issue) => void;
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
}: ProjectIssuesTabProps) {
   useEffect(() => {
      if (!selectedIssueIdentifier) {
         return;
      }

      if (initialIssues.some((issue) => issue.identifier === selectedIssueIdentifier)) {
         return;
      }

      onClearSelectedIssue();
   }, [initialIssues, onClearSelectedIssue, selectedIssueIdentifier]);

   return (
      <IssuesWorkspace
         initialIssues={initialIssues}
         initialStatuses={initialStatuses}
         initialPriorities={initialPriorities}
         databaseError={null}
         selectedIssueIdentifier={selectedIssueIdentifier}
         projectFilterId={project.id}
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
