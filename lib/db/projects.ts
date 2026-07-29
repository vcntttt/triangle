import type { ProjectAttention } from '@/lib/models';

export type ProjectHealth = 'no-update' | 'off-track' | 'on-track' | 'at-risk';

export interface ProjectLatestUpdate {
   id: string;
   projectId: string;
   health: ProjectHealth;
   attention: ProjectAttention;
   body: string;
   createdAt: string;
   updatedAt: string;
}

export interface ProjectTimelineUpdate extends ProjectLatestUpdate {
   project: {
      id: string;
      name: string;
      slug: string;
   };
}

export interface ProjectListItem {
   id: string;
   name: string;
   slug: string;
   key: string;
   subtitle: string | null;
   description: string | null;
   iconType: string;
   iconValue: string;
   status: string;
   priority: string;
   health?: ProjectHealth;
   attention?: string;
   latestUpdate: ProjectLatestUpdate | null;
   createdAt: string;
   updatedAt: string;
}

export interface ProjectStatusOption {
   id: string;
   name: string;
   color: string;
   listPosition: number;
   boardPosition: number;
}

export interface ProjectPriorityOption {
   id: string;
   name: string;
   color: string;
   listPosition: number;
   boardPosition: number;
}

export interface ProjectArea {
   id: string;
   projectId: string;
   name: string;
   color: string;
   position: number;
   createdAt?: string;
   updatedAt?: string;
}

export interface ProjectsPageData {
   projects: ProjectListItem[];
   statusOptions: ProjectStatusOption[];
   priorityOptions: ProjectPriorityOption[];
   attentionOptions: Array<{
      id: string;
      name: string;
      color: string;
      listPosition: number;
      boardPosition: number;
   }>;
   databaseError: string | null;
   isConnected: boolean;
}

export interface ProjectUpdatesPageData {
   updates: ProjectTimelineUpdate[];
   areas: import('@/lib/models').ProjectTimelineArea[];
   databaseError: string | null;
   isConnected: boolean;
}

export interface CreateProjectInput {
   name: string;
   key?: string;
   subtitle?: string;
   description?: string;
   iconType?: string;
   iconValue?: string;
   status: string;
   priority?: string;
   health?: ProjectHealth;
   attention?: string;
}

export interface UpdateProjectInput {
   status?: string;
   priority?: string;
   health?: ProjectHealth;
   attention?: string;
}

export interface UpdateProjectDetailsInput {
   name?: string;
   key?: string;
   subtitle?: string | null;
   description?: string | null;
   iconType?: string;
   iconValue?: string;
}

export interface CreateProjectUpdateInput {
   projectId: string;
   health: ProjectHealth;
   attention: string;
   body: string;
   areaMentions?: Array<{ areaId: string; start: number; end: number }>;
}

export interface SaveProjectAreaInput {
   projectId: string;
   name: string;
   color: string;
}

export interface SaveProjectOptionInput {
   name: string;
   color: string;
}

export interface ReorderProjectOptionsInput {
   ids: string[];
}
