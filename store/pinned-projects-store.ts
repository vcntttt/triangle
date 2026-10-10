import type { Id } from '@convex/_generated/dataModel';
import { toast } from 'sonner';
import { useViewerCommands, useViewerPreferences } from '@/src/data/viewer';

export function usePinnedProjectsStore() {
   const preferences = useViewerPreferences();
   const { togglePinnedProject } = useViewerCommands();
   const pinnedProjectIds = preferences?.pinnedProjectIds ?? [];

   return {
      pinnedProjectIds,
      togglePinnedProject: (projectId: string) => {
         togglePinnedProject({ projectId: projectId as Id<'projects'> }).catch((error) => {
            console.error('Failed to toggle a pinned project.', error);
            toast.error('No se pudo fijar el proyecto.');
         });
      },
      isPinned: (projectId: string) => pinnedProjectIds.includes(projectId as Id<'projects'>),
   };
}
