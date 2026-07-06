'use client';

import { useState } from 'react';
import { FolderOpen, PinOff, Radio } from 'lucide-react';
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
} from '@/components/ui/sidebar';
import { Link, useNavigate } from '@tanstack/react-router';
import { CreateProjectUpdateDialog } from '@/components/common/projects/create-project-update-dialog';
import { ProjectIconGlyph } from '@/components/common/projects/project-icon';
import { workspaceItems } from '@/lib/ui-catalog';
import type { Project } from '@/lib/projects-presentation';
import { useProjectOptions } from '@/hooks/use-project-options';
import { usePinnedProjectsStore } from '@/store/pinned-projects-store';

export function NavWorkspace() {
   const projects = useProjectOptions();
   const { pinnedProjectIds } = usePinnedProjectsStore();

   const pinnedProjects = projects.filter((project) => pinnedProjectIds.includes(project.id));

   return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
         <SidebarGroupLabel>Workspace</SidebarGroupLabel>
         <SidebarMenu>
            {workspaceItems.map((item) => (
               <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild>
                     <Link to={item.url}>
                        <item.icon />
                        <span>{item.name}</span>
                     </Link>
                  </SidebarMenuButton>
               </SidebarMenuItem>
            ))}
         </SidebarMenu>

         <div className="mt-3">
            <div className="px-2 mb-2 flex items-center justify-between">
               <span className="text-xs font-normal text-muted-foreground">Pinned projects</span>
            </div>

            <SidebarMenu>
               {pinnedProjects.map((project) => (
                  <PinnedProjectMenuItem key={project.id} project={project} />
               ))}

               {pinnedProjects.length === 0 && (
                  <SidebarMenuItem>
                     <SidebarMenuButton className="pointer-events-none opacity-70">
                        <PinOff className="size-4" />
                        <span>No pinned projects</span>
                     </SidebarMenuButton>
                  </SidebarMenuItem>
               )}
            </SidebarMenu>
         </div>
      </SidebarGroup>
   );
}

function PinnedProjectMenuItem({ project }: { project: Project }) {
   const navigate = useNavigate();
   const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
   const { togglePinnedProject } = usePinnedProjectsStore();

   const handleOpenProject = () => {
      void navigate({
         to: '/projects/$projectSlug',
         params: { projectSlug: project.slug ?? project.id },
      });
   };

   return (
      <>
         <ContextMenu>
            <ContextMenuTrigger asChild>
               <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                     <Link
                        to="/projects/$projectSlug"
                        params={{ projectSlug: project.slug ?? project.id }}
                     >
                        <ProjectIconGlyph icon={project.iconConfig} className="size-4" />
                        <span className="truncate">{project.name}</span>
                     </Link>
                  </SidebarMenuButton>
               </SidebarMenuItem>
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
               <ContextMenuItem onSelect={() => togglePinnedProject(project.id)}>
                  <PinOff className="size-4" />
                  Unpin project
               </ContextMenuItem>
            </ContextMenuContent>
         </ContextMenu>
         <CreateProjectUpdateDialog
            project={project}
            open={updateDialogOpen}
            onOpenChange={setUpdateDialogOpen}
         />
      </>
   );
}
