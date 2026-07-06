import { convexQuery } from '@convex-dev/react-query';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';

export function viewerProfileQuery() {
   return convexQuery(api.viewer.profile, {});
}

export function viewerPreferencesQuery() {
   return convexQuery(api.viewer.preferences, {});
}

export function useViewerProfile() {
   return useQuery(api.viewer.profile, {});
}

export function useViewerPreferences() {
   return useQuery(api.viewer.preferences, {});
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
