'use client';

import { useState } from 'react';
import { FolderOpen, Radio, Trash2 } from 'lucide-react';
import {
   ContextMenu,
   ContextMenuContent,
   ContextMenuItem,
   ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
   SidebarGroup,
   SidebarGroupLabel,
   SidebarMenu,
   SidebarMenuBadge,
   SidebarMenuButton,
   SidebarMenuItem,
   SidebarMenuSub,
   SidebarMenuSubButton,
   SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { CreateProjectUpdateDialog } from '@/components/common/projects/create-project-update-dialog';
import { DeleteProjectDialog } from '@/components/common/projects/delete-project-dialog';
import { ProjectIconGlyph } from '@/components/common/projects/project-icon';
import { workspaceItems } from '@/lib/ui-catalog';
import type { Project } from '@/lib/projects-presentation';
import { useProjectOptions } from '@/hooks/use-project-options';
import { useViewerCommands, useViewerPreferences } from '@/src/data/viewer';

export function NavWorkspace() {
   const preferences = useViewerPreferences();
   const { updatePreferences } = useViewerCommands();
   const configuredProjectOrder = preferences?.sidebar?.projectOrder?.length
      ? preferences.sidebar.projectOrder
      : (preferences?.pinnedProjectIds ?? []);
   const projectOrderMap = new Map(configuredProjectOrder.map((id, index) => [id, index]));
   const projects = useProjectOptions()
      .filter((project) => project.source !== 'external')
      .toSorted((left, right) => {
         const leftPosition = projectOrderMap.get(left.id) ?? Number.MAX_SAFE_INTEGER;
         const rightPosition = projectOrderMap.get(right.id) ?? Number.MAX_SAFE_INTEGER;
         return leftPosition - rightPosition || left.name.localeCompare(right.name);
      });
   const pathname = useRouterState({ select: (state) => state.location.pathname });
   const hiddenItems = preferences?.sidebar?.hiddenItems ?? [];
   const workspaceCollapsed =
      preferences?.sidebar?.collapsedSections?.includes('workspace') ?? false;
   const showBadges = preferences?.sidebar?.showBadges ?? true;
   const configuredOrder = preferences?.sidebar?.itemOrder ?? [];
   const hiddenItemSet = new Set(hiddenItems);
   const configuredOrderMap = new Map(configuredOrder.map((item, index) => [item, index]));
   const items = workspaceItems
      .filter((item) => !hiddenItemSet.has(item.name.toLowerCase().replaceAll(' ', '-')))
      .toSorted((left, right) => {
         const leftPosition =
            configuredOrderMap.get(left.name.toLowerCase().replaceAll(' ', '-')) ??
            workspaceItems.length;
         const rightPosition =
            configuredOrderMap.get(right.name.toLowerCase().replaceAll(' ', '-')) ??
            workspaceItems.length;
         return leftPosition - rightPosition;
      });
   const toggleWorkspace = () => {
      const collapsedSections = preferences?.sidebar?.collapsedSections ?? [];
      const nextCollapsedSections = collapsedSections.includes('workspace')
         ? collapsedSections.filter((section) => section !== 'workspace')
         : [...collapsedSections, 'workspace'];
      void updatePreferences({ sidebar: { collapsedSections: nextCollapsedSections } });
   };

   return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
         <SidebarGroupLabel asChild>
            <button
               type="button"
               className="w-full text-left"
               aria-expanded={!workspaceCollapsed}
               onClick={toggleWorkspace}
            >
               Workspace
            </button>
         </SidebarGroupLabel>
         {!workspaceCollapsed ? (
            <SidebarMenu>
               {items.map((item) => {
                  const isProjectsItem = item.name === 'Projects';

                  return (
                     <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild isActive={pathname === item.url}>
                           <Link to={item.url}>
                              <item.icon />
                              <span>{item.name}</span>
                           </Link>
                        </SidebarMenuButton>
                        {showBadges && isProjectsItem ? (
                           <SidebarMenuBadge>{projects.length}</SidebarMenuBadge>
                        ) : null}

                        {isProjectsItem && (
                           <SidebarMenuSub>
                              {projects.map((project) => (
                                 <ProjectMenuItem
                                    key={project.id}
                                    project={project}
                                    isActive={
                                       pathname === `/projects/${project.slug ?? project.id}`
                                    }
                                 />
                              ))}
                           </SidebarMenuSub>
                        )}
                     </SidebarMenuItem>
                  );
               })}
            </SidebarMenu>
         ) : null}
      </SidebarGroup>
   );
}

function ProjectMenuItem({ project, isActive }: { project: Project; isActive: boolean }) {
   const navigate = useNavigate();
   const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

   const handleOpenProject = () => {
      void navigate({
         to: '/projects/$projectSlug',
         params: { projectSlug: project.slug ?? project.id },
         search: { tab: 'issues' },
      });
   };

   return (
      <>
         <ContextMenu>
            <ContextMenuTrigger asChild>
               <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild isActive={isActive}>
                     <Link
                        to="/projects/$projectSlug"
                        params={{ projectSlug: project.slug ?? project.id }}
                        search={{ tab: 'issues' }}
                     >
                        <ProjectIconGlyph icon={project.iconConfig} className="size-4" />
                        <span className="truncate">{project.name}</span>
                     </Link>
                  </SidebarMenuSubButton>
               </SidebarMenuSubItem>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-56">
               <ContextMenuItem onSelect={handleOpenProject}>
                  <FolderOpen className="size-4" />
                  Open project
               </ContextMenuItem>
               <ContextMenuItem onSelect={() => setUpdateDialogOpen(true)}>
                  <Radio className="size-4" />
                  New update
               </ContextMenuItem>
               <ContextMenuItem onSelect={() => setDeleteDialogOpen(true)} variant="destructive">
                  <Trash2 className="size-4" />
                  Eliminar proyecto…
               </ContextMenuItem>
            </ContextMenuContent>
         </ContextMenu>
         <CreateProjectUpdateDialog
            project={project}
            open={updateDialogOpen}
            onOpenChange={setUpdateDialogOpen}
         />
         <DeleteProjectDialog
            project={project}
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
         />
      </>
   );
}
