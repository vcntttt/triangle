import { convexQuery } from '@convex-dev/react-query';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';

export function projectsPageQuery() {
   return convexQuery(api.projects.page, {});
}

export function projectOptionsQuery() {
   return convexQuery(api.projects.options, {});
}

export function projectStatusListQuery() {
   return convexQuery(api.projects.statusList, {});
}

export function projectPriorityListQuery() {
   return convexQuery(api.projects.priorityList, {});
}

export function projectDetailQuery(projectSlug: string) {
   return convexQuery(api.projects.detail, { projectSlug });
}

export function projectUpdatesPageQuery() {
   return convexQuery(api.projects.updatesPage, {});
}

export function useProjectCommands() {
   const createProject = useMutation(api.projects.create);
   const updateProject = useMutation(api.projects.update);
   const updateProjectFields = useMutation(api.projects.updateFields);
   const createProjectUpdate = useMutation(api.projects.createUpdate);
   const createProjectStatus = useMutation(api.projects.createStatus);
   const updateProjectStatus = useMutation(api.projects.updateStatus);
   const deleteProjectStatus = useMutation(api.projects.deleteStatus);
   const reorderProjectStatuses = useMutation(api.projects.reorderStatuses);
   const createProjectPriority = useMutation(api.projects.createPriority);
   const updateProjectPriority = useMutation(api.projects.updatePriority);
   const deleteProjectPriority = useMutation(api.projects.deletePriority);

   return {
      createProject,
      updateProject,
      updateProjectFields,
      createProjectUpdate,
      createProjectStatus,
      updateProjectStatus,
      deleteProjectStatus,
      reorderProjectStatuses,
      createProjectPriority,
      updateProjectPriority,
      deleteProjectPriority,
   };
}
