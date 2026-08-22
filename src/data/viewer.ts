import { convexQuery } from '@convex-dev/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMutation } from 'convex/react';
import type { FunctionArgs, FunctionReturnType } from 'convex/server';
import { api } from '@convex/_generated/api';

export function viewerProfileQuery() {
   return convexQuery(api.viewer.profile, {});
}

export function viewerPreferencesQuery() {
   return convexQuery(api.viewer.preferences, {});
}

export function useViewerProfile() {
   return useQuery(viewerProfileQuery()).data;
}

export function useViewerPreferences() {
   return useQuery(viewerPreferencesQuery()).data;
}

export type ViewerPreferences = FunctionReturnType<typeof api.viewer.preferences>;
type UpdatePreferencesPatch = FunctionArgs<typeof api.viewer.updatePreferences>;

// Mirrors the per-key merge semantics of the server mutation in
// convex/viewer.ts: top-level keys are replaced wholesale (with nested
// visibleProperties merged per field), arrays replace wholesale.
function mergePreferencesPatch(
   prev: ViewerPreferences,
   patch: UpdatePreferencesPatch
): ViewerPreferences {
   return {
      issueView: patch.issueView
         ? {
              ...prev.issueView,
              ...patch.issueView,
              visibleProperties: {
                 ...prev.issueView.visibleProperties,
                 ...patch.issueView.visibleProperties,
              },
           }
         : prev.issueView,
      issueFilters: patch.issueFilters
         ? { ...prev.issueFilters, ...patch.issueFilters }
         : prev.issueFilters,
      projectView: patch.projectView
         ? {
              ...prev.projectView,
              ...patch.projectView,
              visibleProperties: {
                 ...prev.projectView.visibleProperties,
                 ...patch.projectView.visibleProperties,
              },
           }
         : prev.projectView,
      projectFilters: patch.projectFilters
         ? { ...prev.projectFilters, ...patch.projectFilters }
         : prev.projectFilters,
      pinnedProjectIds: patch.pinnedProjectIds ?? prev.pinnedProjectIds,
      savedViewsEnabled: patch.savedViewsEnabled ?? prev.savedViewsEnabled,
      sidebar: patch.sidebar ? { ...prev.sidebar, ...patch.sidebar } : prev.sidebar,
      sidebarOpen: patch.sidebarOpen ?? prev.sidebarOpen,
   };
}

// Optimistic wrapper around the updatePreferences mutation: patches the
// TanStack Query cache immediately so rapid toggles read their own previous
// write instead of a stale render-time snapshot.
export function useUpdatePreferences() {
   const queryClient = useQueryClient();
   const updatePreferences = useMutation(api.viewer.updatePreferences);

   return (patch: UpdatePreferencesPatch) => {
      queryClient.setQueryData<ViewerPreferences>(viewerPreferencesQuery().queryKey, (prev) =>
         prev === undefined ? prev : mergePreferencesPatch(prev, patch)
      );
      void updatePreferences(patch);
   };
}

export function useViewerCommands() {
   const updateProfile = useMutation(api.viewer.updateProfile);
   const updatePreferences = useMutation(api.viewer.updatePreferences);
   const togglePinnedProject = useMutation(api.viewer.togglePinnedProject);
   const setSidebarOpen = useMutation(api.viewer.setSidebarOpen);

   return {
      updateProfile,
      updatePreferences,
      togglePinnedProject,
      setSidebarOpen,
   };
}
