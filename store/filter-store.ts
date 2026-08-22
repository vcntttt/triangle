import { useUpdatePreferences, useViewerPreferences } from '@/src/data/viewer';
import { defaultIssueFilters, type IssueFilters } from '@/lib/issue-view';

type IssueFilterType = 'status' | 'assignee' | 'priority' | 'labels' | 'project' | 'area';

export type { IssueFilters };

export function useFilterStore() {
   const preferences = useViewerPreferences();
   const updatePreferences = useUpdatePreferences();
   const filters = { ...defaultIssueFilters, ...(preferences?.issueFilters ?? {}) };

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
         void updatePreferences({ issueFilters: defaultIssueFilters });
      },
      clearFilterType: (type: IssueFilterType) => setFilter(type, []),
      hasActiveFilters: () => Object.values(filters).some((filterArray) => filterArray.length > 0),
      getActiveFiltersCount: () =>
         Object.values(filters).reduce((acc, current) => acc + current.length, 0),
   };
}

export type FilterState = ReturnType<typeof useFilterStore>;
