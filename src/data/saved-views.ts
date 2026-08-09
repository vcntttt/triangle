import { convexQuery } from '@convex-dev/react-query';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import type { IssueDisplayConfig, IssueFilters } from '@/lib/issue-view';

export type SavedViewTarget = 'global' | 'project';
export type SavedViewScope = 'active' | 'backlog' | 'all';

export interface SavedViewInput {
   name: string;
   icon?: string;
   target: SavedViewTarget;
   projectId?: Id<'projects'>;
   scope: SavedViewScope;
   filters: IssueFilters;
   display: IssueDisplayConfig;
   position?: number;
}

export function savedViewsQuery(
   args: {
      target?: SavedViewTarget;
      projectId?: string;
   } = {}
) {
   return convexQuery(api.savedViews.list, {
      target: args.target,
      projectId: args.projectId as Id<'projects'> | undefined,
   });
}

export function savedViewQuery(viewId?: string) {
   return convexQuery(api.savedViews.get, {
      viewId: viewId as Id<'savedViews'>,
   });
}

export function useSavedViewCommands() {
   const createSavedView = useMutation(api.savedViews.create);
   const updateSavedView = useMutation(api.savedViews.update);
   const removeSavedView = useMutation(api.savedViews.remove);

   return { createSavedView, updateSavedView, removeSavedView };
}
