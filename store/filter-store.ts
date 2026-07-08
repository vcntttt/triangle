import { useViewerCommands, useViewerPreferences } from '@/src/data/viewer';

type IssueFilterType = 'status' | 'assignee' | 'priority' | 'labels' | 'project' | 'area';

const emptyIssueFilters: Record<IssueFilterType, string[]> = {
   status: [],
   assignee: [],
   priority: [],
   labels: [],
   project: [],
   area: [],
};

export function useFilterStore() {
   const preferences = useViewerPreferences();
   const { updatePreferences } = useViewerCommands();
   const filters = preferences?.issueFilters ?? emptyIssueFilters;

   const setFilter = (type: IssueFilterType, ids: string[]) => {
      void updatePreferences({ issueFilters: { [type]: ids } });
   };

   return {
      filters,
      setFilter,
      toggleFilter: (type: IssueFilterType, id: string) => {
         const currentFilters = filters[type];
         setFilter(
            type,
            currentFilters.includes(id)
               ? currentFilters.filter((item) => item !== id)
               : [...currentFilters, id]
         );
      },
      clearFilters: () => {
         void updatePreferences({ issueFilters: emptyIssueFilters });
      },
      clearFilterType: (type: IssueFilterType) => setFilter(type, []),
      hasActiveFilters: () => Object.values(filters).some((filterArray) => filterArray.length > 0),
      getActiveFiltersCount: () =>
         Object.values(filters).reduce((acc, current) => acc + current.length, 0),
   };
}

export type FilterState = ReturnType<typeof useFilterStore>;
