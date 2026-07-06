import { useViewerCommands, useViewerPreferences } from '@/src/data/viewer';

export type ProjectsSort =
   | 'title-asc'
   | 'title-desc'
   | 'date-asc'
   | 'date-desc'
   | 'status-asc'
   | 'status-desc'
   | 'priority-asc'
   | 'priority-desc';

type ProjectsFilterType = 'health' | 'priority';

const emptyProjectFilters = {
   health: [] as string[],
   priority: [] as string[],
   sort: 'title-asc' as ProjectsSort,
};

export function useProjectsFilterStore() {
   const preferences = useViewerPreferences();
   const { updatePreferences } = useViewerCommands();
   const projectFilters = preferences?.projectFilters ?? emptyProjectFilters;
   const filters = {
      health: projectFilters.health,
      priority: projectFilters.priority,
   };

   const setFilter = (type: ProjectsFilterType, ids: string[]) => {
      void updatePreferences({ projectFilters: { [type]: ids } });
   };

   return {
      filters,
      sort: projectFilters.sort as ProjectsSort,
      setSort: (sort: ProjectsSort) => {
         void updatePreferences({ projectFilters: { sort } });
      },
      setFilter,
      toggleFilter: (type: ProjectsFilterType, id: string) => {
         const current = filters[type];
         setFilter(
            type,
            current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
         );
      },
      clearFilters: () => {
         void updatePreferences({
            projectFilters: {
               health: [],
               priority: [],
               sort: 'title-asc',
            },
         });
      },
      clearFilterType: (type: ProjectsFilterType) => setFilter(type, []),
      hasActiveFilters: () => Object.values(filters).some((value) => value.length > 0),
      getActiveFiltersCount: () =>
         Object.values(filters).reduce((sum, value) => sum + value.length, 0),
   };
}

export type ProjectsFilterState = ReturnType<typeof useProjectsFilterStore>;
