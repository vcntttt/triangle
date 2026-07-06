import type { IssueListItem } from '@/lib/db/issues';
import { resolveCurrentAssignee } from '@/lib/current-user';
import type { User } from '@/lib/models';
import { priorities, type Issue, status as fallbackStatuses } from '@/lib/ui-catalog';
import { toPresentationProject } from './projects-presentation';
import type { ProjectOptionLike } from './projects-presentation';

const parseEstimatedHours = (estimatedHours: string | null): number | undefined => {
   if (estimatedHours === null) {
      return undefined;
   }

   const parsed = Number.parseFloat(estimatedHours);
   return Number.isFinite(parsed) ? parsed : undefined;
};

export const toPresentationIssue = (
   issue: IssueListItem,
   statusOptions?: ProjectOptionLike[],
   viewer?: User
): Issue => {
   const resolveStatus = (statusId: string) =>
      statusOptions?.find((item) => item.id === statusId) ??
      fallbackStatuses.find((item) => item.id === statusId) ??
      fallbackStatuses[fallbackStatuses.length - 1];

   return {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description ?? '',
      status: resolveStatus(issue.status),
      assignee: resolveCurrentAssignee(issue.assigneeId, viewer),
      priority: priorities.find((item) => item.id === issue.priority) ?? priorities[0],
      labels: issue.labels,
      createdAt: issue.createdAt,
      cycleId: '',
      project: issue.project
         ? toPresentationProject(issue.project, undefined, undefined, viewer)
         : undefined,
      parentIssueId: issue.parentIssueId,
      parent: issue.parentIssue,
      subissues: issue.subissues.map((subissue) => ({
         id: subissue.id,
         identifier: subissue.identifier,
         title: subissue.title,
         status: resolveStatus(subissue.status),
         priority: priorities.find((item) => item.id === subissue.priority) ?? priorities[0],
         assignee: resolveCurrentAssignee(subissue.assigneeId, viewer),
         parentIssueId: issue.id,
      })),
      rank: issue.rank,
      dueDate: issue.dueDate ?? undefined,
      estimatedHours: parseEstimatedHours(issue.estimatedHours),
   };
};
