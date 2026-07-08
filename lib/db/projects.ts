export type ProjectHealth = 'no-update' | 'off-track' | 'on-track' | 'at-risk';

export interface ProjectLatestUpdate {
   id: string;
   projectId: string;
   health: ProjectHealth;
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
   description: string | null;
   iconType: string;
   iconValue: string;
   status: string;
   priority: string;
   latestUpdate: ProjectLatestUpdate | null;
   createdAt: string;
   updatedAt: string;
}

export interface ProjectStatusOption {
   id: string;
   name: string;
   color: string;
   position: number;
}

export interface ProjectPriorityOption {
   id: string;
   name: string;
   color: string;
   position: number;
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
   databaseError: string | null;
   isConnected: boolean;
}

export interface ProjectUpdatesPageData {
   updates: ProjectTimelineUpdate[];
   databaseError: string | null;
   isConnected: boolean;
}

export interface CreateProjectInput {
   name: string;
   key?: string;
   description?: string;
   iconType?: string;
   iconValue?: string;
   status: string;
   priority?: string;
}

export interface UpdateProjectInput {
   status?: string;
   priority?: string;
}

export interface UpdateProjectDetailsInput {
   name?: string;
   key?: string;
   description?: string | null;
   iconType?: string;
   iconValue?: string;
}

export interface CreateProjectUpdateInput {
   projectId: string;
   health: ProjectHealth;
   body: string;
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
