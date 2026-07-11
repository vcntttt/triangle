import type { IssueListItem } from '@/lib/db/issues';
import { resolveCurrentAssignee } from '@/lib/current-user';
import type { User } from '@/lib/models';
import {
   priorities as fallbackPriorities,
   type Issue,
   status as fallbackStatuses,
} from '@/lib/ui-catalog';
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
   viewer?: User,
   priorityOptions?: ProjectOptionLike[]
): Issue => {
   const resolveStatus = (statusId: string) =>
      statusOptions?.find((item) => item.id === statusId) ??
      fallbackStatuses.find((item) => item.id === statusId) ??
      fallbackStatuses[fallbackStatuses.length - 1];

   const resolvePriority = (priorityId: string) =>
      priorityOptions?.find((item) => item.id === priorityId) ??
      fallbackPriorities.find((item) => item.id === priorityId) ??
      fallbackPriorities[0];

   return {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description ?? '',
      status: resolveStatus(issue.status),
      assignee: resolveCurrentAssignee(issue.assigneeId, viewer),
      priority: resolvePriority(issue.priority),
      labels: issue.labels,
      createdAt: issue.createdAt,
      cycleId: '',
      project: issue.project
         ? toPresentationProject(issue.project, undefined, undefined, viewer)
         : undefined,
      area: issue.area,
      parentIssueId: issue.parentIssueId,
      parent: issue.parentIssue,
      subissues: issue.subissues.map((subissue) => ({
         id: subissue.id,
         identifier: subissue.identifier,
         title: subissue.title,
         status: resolveStatus(subissue.status),
         priority: resolvePriority(subissue.priority),
         assignee: resolveCurrentAssignee(subissue.assigneeId, viewer),
         parentIssueId: issue.id,
      })),
      blockedBy: issue.blockedBy ?? [],
      blocks: issue.blocks ?? [],
      rank: issue.rank,
      dueDate: issue.dueDate ?? undefined,
      estimatedHours: parseEstimatedHours(issue.estimatedHours),
   };
};
