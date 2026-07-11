'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { Project } from '@/lib/models';
import type { ProjectOptionLike } from '@/lib/projects-presentation';
import { useProjectCommands } from '@/src/data/projects';

export function useProjectFieldUpdates(
   project: Project,
   statusOptions: ProjectOptionLike[],
   priorityOptions: ProjectOptionLike[]
) {
   const [currentStatus, setCurrentStatus] = useState(project.status);
   const [currentPriority, setCurrentPriority] = useState(project.priority);
   const { updateProject } = useProjectCommands();

   const handleStatusChange = async (statusId: string) => {
      if (statusId === currentStatus.id) {
         return;
      }

      const nextStatus = statusOptions.find((option) => option.id === statusId);
      if (!nextStatus) {
         return;
      }

      const previousStatus = currentStatus;
      setCurrentStatus((state) => ({ ...state, id: statusId, name: nextStatus.name }));

      try {
         await updateProject({ projectId: project.id, status: statusId });
         toast.success('Project status updated');
      } catch (error) {
         console.error('Failed to update project status.', error);
         setCurrentStatus(previousStatus);
         toast.error('Project status could not be updated');
      }
   };

   const handlePriorityChange = async (priorityId: string) => {
      if (priorityId === currentPriority.id) {
         return;
      }

      const nextPriority = priorityOptions.find((option) => option.id === priorityId);
      if (!nextPriority) {
         return;
      }

      const previousPriority = currentPriority;
      setCurrentPriority((state) => ({ ...state, id: priorityId, name: nextPriority.name }));

      try {
         await updateProject({ projectId: project.id, priority: priorityId });
         toast.success('Project priority updated');
      } catch (error) {
         console.error('Failed to update project priority.', error);
         setCurrentPriority(previousPriority);
         toast.error('Project priority could not be updated');
      }
   };

   return {
      currentStatus,
      currentPriority,
      handleStatusChange,
      handlePriorityChange,
   };
}
