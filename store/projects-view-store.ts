import { useViewerCommands, useViewerPreferences } from '@/src/data/viewer';

export type ProjectDisplayProperty = 'health' | 'priority' | 'lead' | 'targetDate' | 'status';
export type ProjectViewType = 'list' | 'board';
export type ProjectBoardGroupBy = 'status' | 'priority' | 'health';

const defaultProjectView = {
   viewType: 'list' as ProjectViewType,
   groupBy: 'status' as ProjectBoardGroupBy,
   showEmptyGroups: false,
   visibleProperties: {
      health: true,
      priority: true,
      lead: true,
      targetDate: true,
      status: true,
   },
};

export function useProjectsViewStore() {
   const preferences = useViewerPreferences();
   const { updatePreferences } = useViewerCommands();
   const projectView = preferences?.projectView ?? defaultProjectView;

   return {
      ...projectView,
      setViewType: (viewType: ProjectViewType) => {
         void updatePreferences({ projectView: { viewType } });
      },
      setGroupBy: (groupBy: ProjectBoardGroupBy) => {
         void updatePreferences({ projectView: { groupBy } });
      },
      setShowEmptyGroups: (showEmptyGroups: boolean) => {
         void updatePreferences({ projectView: { showEmptyGroups } });
      },
      toggleProperty: (property: ProjectDisplayProperty) => {
         void updatePreferences({
            projectView: {
               visibleProperties: {
                  [property]: !projectView.visibleProperties[property],
               },
            },
         });
      },
   };
}
