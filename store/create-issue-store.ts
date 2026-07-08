import type { Issue, Project, ProjectArea, Status } from '@/lib/models';
import { create } from 'zustand';

interface CreateIssueState {
   isOpen: boolean;
   defaultStatus: Status | null;
   defaultProject: Project | null;
   defaultArea: ProjectArea | null;
   defaultParentIssue: Pick<Issue, 'id' | 'identifier' | 'title'> | null;

   // Actions
   openModal: (
      status?: Status,
      project?: Project,
      parentIssue?: Pick<Issue, 'id' | 'identifier' | 'title'> | null,
      area?: ProjectArea | null
   ) => void;
   closeModal: () => void;
   setDefaultStatus: (status: Status | null) => void;
   setDefaultProject: (project: Project | null) => void;
   setDefaultArea: (area: ProjectArea | null) => void;
   setDefaultParentIssue: (parentIssue: Pick<Issue, 'id' | 'identifier' | 'title'> | null) => void;
}

export const useCreateIssueStore = create<CreateIssueState>((set, get) => ({
   // Initial state
   isOpen: false,
   defaultStatus: null,
   defaultProject: null,
   defaultArea: null,
   defaultParentIssue: null,

   // Actions
   openModal: (status, project, parentIssue, area) =>
      set({
         isOpen: true,
         defaultStatus: status || null,
         defaultProject: project === undefined ? get().defaultProject : (project ?? null),
         defaultArea: area ?? null,
         defaultParentIssue: parentIssue ?? null,
      }),
   closeModal: () => set({ isOpen: false }),
   setDefaultStatus: (status) => set({ defaultStatus: status }),
   setDefaultProject: (project) => set({ defaultProject: project }),
   setDefaultArea: (area) => set({ defaultArea: area }),
   setDefaultParentIssue: (parentIssue) => set({ defaultParentIssue: parentIssue }),
}));
