import { useUpdatePreferences, useViewerPreferences } from '@/src/data/viewer';
import {
   defaultIssueDisplay,
   type IssueDisplayConfig,
   type IssueDisplayProperty,
   type IssueGroupBy,
   type IssueListMode,
   type IssueOrderBy,
   type IssueOrderDirection,
   type IssueViewType,
} from '@/lib/issue-view';

export type ViewType = IssueViewType;
export type {
   IssueDisplayConfig,
   IssueDisplayProperty,
   IssueGroupBy,
   IssueListMode,
   IssueOrderBy,
   IssueOrderDirection,
};

export function useViewStore() {
   const preferences = useViewerPreferences();
   const updatePreferences = useUpdatePreferences();
   const issueView = {
      ...defaultIssueDisplay,
      ...(preferences?.issueView ?? {}),
      visibleProperties: {
         ...defaultIssueDisplay.visibleProperties,
         ...(preferences?.issueView?.visibleProperties ?? {}),
      },
   };

   return {
      ...issueView,
      showEmptyStatuses: preferences?.issueView?.showEmptyStatuses ?? issueView.showEmptyGroups,
      objectiveIssueIds: preferences?.issueView?.objectiveIssueIds ?? [],
      setViewType: (viewType: ViewType) => {
         void updatePreferences({ issueView: { viewType } });
      },
      setListMode: (listMode: IssueListMode) => {
         void updatePreferences({ issueView: { listMode } });
      },
      setGroupBy: (groupBy: IssueGroupBy) => {
         void updatePreferences({ issueView: { groupBy } });
      },
      setOrderBy: (orderBy: IssueOrderBy) => {
         void updatePreferences({ issueView: { orderBy } });
      },
      setOrderDirection: (orderDirection: IssueOrderDirection) => {
         void updatePreferences({ issueView: { orderDirection } });
      },
      setObjectiveIssueIds: (objectiveIssueIds: string[]) => {
         void updatePreferences({ issueView: { objectiveIssueIds } });
      },
      setShowEmptyStatuses: (showEmptyStatuses: boolean) => {
         void updatePreferences({
            issueView: { showEmptyStatuses, showEmptyGroups: showEmptyStatuses },
         });
      },
      setShowEmptyGroups: (showEmptyGroups: boolean) => {
         void updatePreferences({
            issueView: { showEmptyGroups, showEmptyStatuses: showEmptyGroups },
         });
      },
      setHideCompletedIssues: (hideCompletedIssues: boolean) => {
         void updatePreferences({ issueView: { hideCompletedIssues } });
      },
      setShowSubissues: (showSubissues: boolean) => {
         void updatePreferences({ issueView: { showSubissues } });
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
      setDisplay: (display: Partial<IssueDisplayConfig>) => {
         void updatePreferences({
            issueView: {
               ...display,
               visibleProperties: display.visibleProperties,
            },
         });
      },
   };
}
