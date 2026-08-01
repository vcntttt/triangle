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

export function NavWorkspace() {
   const projects = useProjectOptions();
   const pathname = useRouterState({ select: (state) => state.location.pathname });

   return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
         <SidebarGroupLabel>Workspace</SidebarGroupLabel>
         <SidebarMenu>
            {workspaceItems.map((item) => {
               const isProjectsItem = item.name === 'Projects';

               return (
                  <SidebarMenuItem key={item.name}>
                     <SidebarMenuButton asChild isActive={pathname === item.url}>
                        <Link to={item.url}>
                           <item.icon />
                           <span>{item.name}</span>
                        </Link>
                     </SidebarMenuButton>

                     {isProjectsItem && (
                        <SidebarMenuSub>
                           {projects.map((project) => (
                              <ProjectMenuItem
                                 key={project.id}
                                 project={project}
                                 isActive={pathname === `/projects/${project.slug ?? project.id}`}
                              />
                           ))}
                        </SidebarMenuSub>
                     )}
                  </SidebarMenuItem>
               );
            })}
         </SidebarMenu>
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
