import { currentUser } from '@/lib/current-user';
import type {
   ProjectAttention,
   ProjectIconType,
   ProjectUpdateAreaMention,
   User,
} from '@/lib/models';
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
   listPosition?: number;
   boardPosition?: number;
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
   health?: PresentationProject['health']['id'];
   attention?: string;
   description?: string | null;
   latestUpdate?: {
      id: string;
      projectId: string;
      health: PresentationProject['health']['id'];
      attention: ProjectAttention;
      body: string;
      areaMentions: ProjectUpdateAreaMention[];
      createdAt: string;
      updatedAt: string;
   } | null;
   createdAt: string;
}

export type Project = PresentationProject;

const fallbackStatus = status.find((item) => item.id === 'backlog') ?? status[0];
const fallbackPriority = priorities.find((item) => item.id === 'no-priority') ?? priorities[0];
const fallbackAttention: ProjectAttention = {
   id: 'a-su-ritmo',
   name: 'A su ritmo',
   color: '#38bdf8',
};

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

function resolveAttention(
   attentionId: string | undefined,
   attentionOptions?: ProjectOptionLike[]
): ProjectAttention {
   const selectedAttentionId = attentionId ?? fallbackAttention.id;
   const option = attentionOptions?.find((item) => item.id === selectedAttentionId);

   return {
      id: selectedAttentionId,
      name:
         option?.name ??
         (selectedAttentionId === fallbackAttention.id
            ? fallbackAttention.name
            : selectedAttentionId),
      color: option?.color ?? fallbackAttention.color,
   };
}

export const toPresentationProject = (
   project: ProjectLike,
   statusOptions?: ProjectOptionLike[],
   priorityOptions?: ProjectOptionLike[],
   attentionOptions?: ProjectOptionLike[],
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
      attention: resolveAttention(project.attention, attentionOptions),
      health: health.find((item) => item.id === (project.health ?? 'no-update')) ?? noUpdateHealth,
      latestUpdate: project.latestUpdate ?? null,
   };
};
