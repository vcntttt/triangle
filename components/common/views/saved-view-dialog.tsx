'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Id } from '@convex/_generated/dataModel';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { BookmarkPlus } from 'lucide-react';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useFilterStore } from '@/store/filter-store';
import { useViewStore } from '@/store/view-store';
import { useViewerPreferences } from '@/src/data/viewer';
import {
   useSavedViewCommands,
   type SavedViewInput,
   type SavedViewScope,
} from '@/src/data/saved-views';
import type { IssueDisplayConfig, IssueFilters } from '@/lib/issue-view';

export interface SavedViewLike {
   id: Id<'savedViews'>;
   name: string;
   icon: string | null;
   target: 'global' | 'project';
   projectId: string | null;
   scope: SavedViewScope;
   filters: IssueFilters;
   display: IssueDisplayConfig;
}

export function SavedViewDialog({
   open,
   onOpenChange,
   projectId,
   scope = 'all',
   existing,
}: {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   projectId?: string;
   scope?: SavedViewScope;
   existing?: SavedViewLike;
}) {
   const [name, setName] = useState('');
   const { filters } = useFilterStore();
   const view = useViewStore();
   const { createSavedView, updateSavedView } = useSavedViewCommands();

   useEffect(() => {
      if (open) setName(existing?.name ?? '');
   }, [existing?.name, open]);

   const currentDisplay = useMemo<IssueDisplayConfig>(
      () => ({
         viewType: existing?.display.viewType ?? view.viewType,
         listMode: existing?.display.listMode ?? view.listMode,
         groupBy: existing?.display.groupBy ?? view.groupBy,
         orderBy: existing?.display.orderBy ?? view.orderBy,
         orderDirection: existing?.display.orderDirection ?? view.orderDirection,
         showEmptyGroups: existing?.display.showEmptyGroups ?? view.showEmptyGroups,
         hideCompletedIssues: existing?.display.hideCompletedIssues ?? view.hideCompletedIssues,
         showSubissues: existing?.display.showSubissues ?? view.showSubissues,
         visibleProperties: existing?.display.visibleProperties ?? view.visibleProperties,
      }),
      [existing?.display, view]
   );

   const handleSave = async () => {
      const trimmedName = name.trim();
      if (!trimmedName) {
         toast.error('Saved view name is required');
         return;
      }

      try {
         if (existing) {
            await updateSavedView({ viewId: existing.id, name: trimmedName });
         } else {
            const input: SavedViewInput = {
               name: trimmedName,
               target: projectId ? 'project' : 'global',
               projectId: projectId as Id<'projects'> | undefined,
               scope,
               filters: existing?.filters ?? filters,
               display: currentDisplay,
            };
            await createSavedView(input);
         }
         toast.success(existing ? 'Saved view updated' : 'Saved view created');
         onOpenChange(false);
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Saved view could not be saved.');
      }
   };

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent>
            <DialogHeader>
               <DialogTitle>{existing ? 'Rename saved view' : 'Save current view'}</DialogTitle>
               <DialogDescription>
                  {existing
                     ? 'Choose a name for this saved view.'
                     : 'Save the current filters and display settings for quick access.'}
               </DialogDescription>
            </DialogHeader>
            <Input
               value={name}
               autoFocus
               placeholder="e.g. High priority work"
               onChange={(event) => setName(event.target.value)}
               onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                     event.preventDefault();
                     void handleSave();
                  }
               }}
            />
            <DialogFooter>
               <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
               </Button>
               <Button onClick={() => void handleSave()}>
                  {existing ? 'Rename' : 'Save view'}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}

export function SaveViewButton({
   projectId,
   scope = 'all',
}: {
   projectId?: string;
   scope?: SavedViewScope;
}) {
   const [open, setOpen] = useState(false);
   const preferences = useViewerPreferences();

   if (preferences?.savedViewsEnabled === false) {
      return null;
   }

   return (
      <>
         <Button size="xs" variant="ghost" onClick={() => setOpen(true)}>
            <BookmarkPlus className="mr-1 size-4" /> Save view
         </Button>
         <SavedViewDialog open={open} onOpenChange={setOpen} projectId={projectId} scope={scope} />
      </>
   );
}
