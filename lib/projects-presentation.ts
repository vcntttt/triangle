import { currentUser } from '@/lib/current-user';
import type { ProjectIconType, User } from '@/lib/models';
import {
   health,
   priorities,
   status,
   type Priority,
   type Project as PresentationProject,
   type Status,
} from '@/lib/ui-catalog';

export interface ProjectOptionLike {
   id: string;
   name: string;
   color: string;
   position?: number;
}

export interface ProjectLike {
   id: string;
   name: string;
   slug: string;
   key: string;
   iconType?: ProjectIconType;
   iconValue?: string;
   status: string;
   priority?: string;
   description?: string | null;
   latestUpdate?: {
      id: string;
      projectId: string;
      health: PresentationProject['health']['id'];
      body: string;
      createdAt: string;
      updatedAt: string;
   } | null;
   createdAt: string;
}

export type Project = PresentationProject;

const fallbackStatus = status.find((item) => item.id === 'backlog') ?? status[0];
const fallbackPriority = priorities.find((item) => item.id === 'no-priority') ?? priorities[0];

const statusIconMap: Record<string, Status['icon']> = Object.fromEntries(
   status.map((item) => [item.id, item.icon])
);

const priorityIconMap: Record<string, Priority['icon']> = Object.fromEntries(
   priorities.map((item) => [item.id, item.icon])
);

const noUpdateHealth = health.find((item) => item.id === 'no-update') ?? health[0];

function resolveStatus(
   statusId: string,
   statusOptions?: ProjectOptionLike[]
): PresentationProject['status'] {
   const option = statusOptions?.find((item) => item.id === statusId);
   const fallback = status.find((item) => item.id === statusId) ?? fallbackStatus;

   return {
      id: statusId,
      name: option?.name ?? fallback.name,
      color: option?.color ?? fallback.color,
      icon: statusIconMap[statusId] ?? fallback.icon,
   };
}

function resolvePriority(
   priorityId: string | undefined,
   priorityOptions?: ProjectOptionLike[]
): PresentationProject['priority'] {
   const selectedPriorityId = priorityId ?? 'no-priority';
   const option = priorityOptions?.find((item) => item.id === selectedPriorityId);
   const fallback = priorities.find((item) => item.id === selectedPriorityId) ?? fallbackPriority;

   return {
      id: selectedPriorityId,
      name: option?.name ?? fallback.name,
      icon: priorityIconMap[selectedPriorityId] ?? fallback.icon,
   };
}

export const toPresentationProject = (
   project: ProjectLike,
   statusOptions?: ProjectOptionLike[],
   priorityOptions?: ProjectOptionLike[],
   viewer: User = currentUser
): PresentationProject => {
   const resolvedStatus = resolveStatus(project.status, statusOptions);

   return {
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description ?? null,
      key: project.key,
      iconConfig: {
         type: project.iconType ?? 'lucide',
         value: project.iconValue ?? 'box',
      },
      status: resolvedStatus,
      percentComplete: 0,
      startDate: project.createdAt,
      lead: viewer,
      priority: resolvePriority(project.priority, priorityOptions),
      health: project.latestUpdate
         ? (health.find((item) => item.id === project.latestUpdate?.health) ?? health[0])
         : noUpdateHealth,
      latestUpdate: project.latestUpdate ?? null,
   };
};
