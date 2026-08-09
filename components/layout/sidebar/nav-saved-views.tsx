'use client';

import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
   SidebarGroup,
   SidebarGroupLabel,
   SidebarMenu,
   SidebarMenuButton,
   SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useProjectOptions } from '@/hooks/use-project-options';
import { savedViewsQuery, useSavedViewCommands } from '@/src/data/saved-views';
import { useViewerCommands, useViewerPreferences } from '@/src/data/viewer';
import { useQuery } from '@tanstack/react-query';
import { SavedViewDialog, type SavedViewLike } from '@/components/common/views/saved-view-dialog';

export function NavSavedViews() {
   const { data: views = [] } = useQuery(savedViewsQuery());
   const projects = useProjectOptions();
   const preferences = useViewerPreferences();
   const { updatePreferences } = useViewerCommands();
   const { removeSavedView } = useSavedViewCommands();
   const [createOpen, setCreateOpen] = useState(false);
   const [editing, setEditing] = useState<SavedViewLike | undefined>();
   const savedViewsCollapsed =
      preferences?.sidebar?.collapsedSections?.includes('saved-views') ?? false;

   const toggleSavedViews = () => {
      const collapsedSections = preferences?.sidebar?.collapsedSections ?? [];
      const nextCollapsedSections = savedViewsCollapsed
         ? collapsedSections.filter((section) => section !== 'saved-views')
         : [...collapsedSections, 'saved-views'];
      void updatePreferences({ sidebar: { collapsedSections: nextCollapsedSections } });
   };

   const handleDelete = async (viewId: SavedViewLike['id'], name: string) => {
      try {
         await removeSavedView(viewId);
         toast.success(`${name} deleted`);
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Saved view could not be deleted.');
      }
   };

   return (
      <>
         <SidebarGroup>
            <div className="flex items-center justify-between">
               <SidebarGroupLabel asChild>
                  <button
                     type="button"
                     className="w-full justify-start gap-2 text-left"
                     aria-expanded={!savedViewsCollapsed}
                     onClick={toggleSavedViews}
                  >
                     Saved views
                     {preferences?.sidebar?.showBadges !== false && views.length > 0 ? (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
                           {views.length}
                        </span>
                     ) : null}
                  </button>
               </SidebarGroupLabel>
               <Button
                  size="icon"
                  variant="ghost"
                  className="mr-2 size-6"
                  onClick={() => setCreateOpen(true)}
               >
                  <Plus className="size-3.5" />
                  <span className="sr-only">Create saved view</span>
               </Button>
            </div>
            {!savedViewsCollapsed ? (
               <SidebarMenu>
                  {views.length === 0 ? (
                     <SidebarMenuItem>
                        <span className="px-2 text-xs text-muted-foreground">
                           No saved views yet
                        </span>
                     </SidebarMenuItem>
                  ) : (
                     views.map((view) => {
                        const project = view.projectId
                           ? projects.find((item) => item.id === view.projectId)
                           : null;
                        return (
                           <SidebarMenuItem key={view.id} className="group/view">
                              <SidebarMenuButton asChild tooltip={view.name}>
                                 {project ? (
                                    <Link
                                       to="/projects/$projectSlug"
                                       params={{ projectSlug: project.slug ?? project.id }}
                                       search={{ tab: 'issues', view: view.id, scope: view.scope }}
                                    >
                                       <span className="truncate">{view.name}</span>
                                    </Link>
                                 ) : (
                                    <Link
                                       to="/issues"
                                       search={{ view: view.id, scope: view.scope }}
                                    >
                                       <span className="truncate">{view.name}</span>
                                    </Link>
                                 )}
                              </SidebarMenuButton>
                              <div className="absolute right-1 top-1 hidden items-center gap-0.5 group-hover/view:flex">
                                 <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-6"
                                    onClick={() => setEditing(view as SavedViewLike)}
                                 >
                                    <Pencil className="size-3" />
                                    <span className="sr-only">Rename {view.name}</span>
                                 </Button>
                                 <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-6 text-destructive"
                                    onClick={() => void handleDelete(view.id, view.name)}
                                 >
                                    <Trash2 className="size-3" />
                                    <span className="sr-only">Delete {view.name}</span>
                                 </Button>
                              </div>
                           </SidebarMenuItem>
                        );
                     })
                  )}
               </SidebarMenu>
            ) : null}
         </SidebarGroup>
         <SavedViewDialog open={createOpen} onOpenChange={setCreateOpen} />
         <SavedViewDialog
            open={Boolean(editing)}
            onOpenChange={(open) => {
               if (!open) setEditing(undefined);
            }}
            existing={editing}
         />
      </>
   );
}
