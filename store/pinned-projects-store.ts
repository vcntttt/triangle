import type { Id } from '@convex/_generated/dataModel';
import { useViewerCommands, useViewerPreferences } from '@/src/data/viewer';

export function usePinnedProjectsStore() {
   const preferences = useViewerPreferences();
   const { togglePinnedProject } = useViewerCommands();
   const pinnedProjectIds = preferences?.pinnedProjectIds ?? [];

   return {
      pinnedProjectIds,
      togglePinnedProject: (projectId: string) => {
         void togglePinnedProject({ projectId: projectId as Id<'projects'> });
      },
      isPinned: (projectId: string) => pinnedProjectIds.includes(projectId as Id<'projects'>),
   };
}
