import type { IssueListItem } from '@/lib/db/issues';
import { resolveCurrentAssignee } from '@/lib/current-user';
import type { Priority, Status, User } from '@/lib/models';
import {
   priorities as fallbackPriorities,
   type Issue,
   status as fallbackStatuses,
} from '@/lib/ui-catalog';
import { toPresentationProject } from './projects-presentation';
import type { ProjectOptionLike } from './projects-presentation';
import { defaultIssueEnvironment } from './issue-environment';

const statusIconMap: Record<string, Status['icon']> = Object.fromEntries(
   fallbackStatuses.map((item) => [item.id, item.icon])
);

const priorityIconMap: Record<string, Priority['icon']> = Object.fromEntries(
   fallbackPriorities.map((item) => [item.id, item.icon])
);

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
   const resolveStatus = (statusId: string): Status => {
      const option = statusOptions?.find((item) => item.id === statusId);
      const fallback =
         fallbackStatuses.find((item) => item.id === statusId) ??
         fallbackStatuses[fallbackStatuses.length - 1];

      return {
         id: statusId,
         name: option?.name ?? fallback.name,
         color: option?.color ?? fallback.color,
         icon: statusIconMap[statusId] ?? fallback.icon,
      };
   };

   const resolvePriority = (priorityId: string): Priority => {
      const option = priorityOptions?.find((item) => item.id === priorityId);
      const fallback =
         fallbackPriorities.find((item) => item.id === priorityId) ?? fallbackPriorities[0];

      return {
         id: priorityId,
         name: option?.name ?? fallback.name,
         icon: priorityIconMap[priorityId] ?? fallback.icon,
      };
   };

   return {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description ?? '',
      status: resolveStatus(issue.status),
      assignee: resolveCurrentAssignee(issue.assigneeId, viewer),
      priority: resolvePriority(issue.priority),
      environment: issue.environment ?? defaultIssueEnvironment,
      labels: issue.labels,
      createdAt: issue.createdAt,
      lastActivityAt: issue.lastActivityAt,
      cycleId: '',
      project: issue.project
         ? toPresentationProject(issue.project, undefined, undefined, undefined, viewer)
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
