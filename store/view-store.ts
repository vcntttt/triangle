import { useViewerCommands, useViewerPreferences } from '@/src/data/viewer';

export type ViewType = 'list' | 'grid';
export type IssueDisplayProperty =
   | 'identifier'
   | 'labels'
   | 'project'
   | 'area'
   | 'assignee'
   | 'createdAt';

const defaultIssueView = {
   viewType: 'list' as ViewType,
   showEmptyStatuses: true,
   hideCompletedIssues: false,
   visibleProperties: {
      identifier: true,
      labels: true,
      project: true,
      area: true,
      assignee: true,
      createdAt: true,
   },
};

export function useViewStore() {
   const preferences = useViewerPreferences();
   const { updatePreferences } = useViewerCommands();
   const issueView = preferences?.issueView ?? defaultIssueView;

   return {
      ...issueView,
      setViewType: (viewType: ViewType) => {
         void updatePreferences({ issueView: { viewType } });
      },
      setShowEmptyStatuses: (showEmptyStatuses: boolean) => {
         void updatePreferences({ issueView: { showEmptyStatuses } });
      },
      setHideCompletedIssues: (hideCompletedIssues: boolean) => {
         void updatePreferences({ issueView: { hideCompletedIssues } });
      },
      toggleProperty: (property: IssueDisplayProperty) => {
         void updatePreferences({
            issueView: {
               visibleProperties: {
                  [property]: !issueView.visibleProperties[property],
               },
            },
         });
      },
   };
}
