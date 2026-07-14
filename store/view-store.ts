import { useViewerCommands, useViewerPreferences } from '@/src/data/viewer';

export type ViewType = 'list' | 'grid' | 'graph';
export type IssueListMode = 'hierarchy' | 'flat';
export type IssueDisplayProperty =
   | 'identifier'
   | 'labels'
   | 'project'
   | 'area'
   | 'dependencies'
   | 'assignee'
   | 'createdAt';

const defaultIssueView = {
   viewType: 'list' as ViewType,
   listMode: 'hierarchy' as IssueListMode,
   objectiveIssueIds: [] as string[],
   showEmptyStatuses: true,
   hideCompletedIssues: false,
   visibleProperties: {
      identifier: true,
      labels: true,
      project: true,
      area: true,
      dependencies: true,
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
      setListMode: (listMode: IssueListMode) => {
         void updatePreferences({ issueView: { listMode } });
      },
      setObjectiveIssueIds: (objectiveIssueIds: string[]) => {
         void updatePreferences({ issueView: { objectiveIssueIds } });
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
