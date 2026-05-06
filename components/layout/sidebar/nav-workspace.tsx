'use client';

import { Pin, PinOff } from 'lucide-react';
import {
   Command,
   CommandEmpty,
   CommandGroup,
   CommandInput,
   CommandItem,
   CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
   SidebarGroup,
   SidebarGroupLabel,
   SidebarMenu,
   SidebarMenuButton,
   SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Link } from '@tanstack/react-router';
import { workspaceItems } from '@/lib/ui-catalog';
import { useProjectOptions } from '@/hooks/use-project-options';
import { usePinnedProjectsStore } from '@/store/pinned-projects-store';
import { ProjectIconGlyph } from '@/components/common/projects/project-icon';

export function NavWorkspace() {
   const projects = useProjectOptions();
   const { pinnedProjectIds, togglePinnedProject, isPinned } = usePinnedProjectsStore();

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
               <Popover>
                  <PopoverTrigger asChild>
                     <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground"
                     >
                        Manage
                     </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                     <Command>
                        <CommandInput placeholder="Search projects..." />
                        <CommandList>
                           <CommandEmpty>No projects found.</CommandEmpty>
                           <CommandGroup>
                              {projects.map((project) => {
                                 const pinned = isPinned(project.id);

                                 return (
                                    <CommandItem
                                       key={project.id}
                                       value={`${project.id} ${project.name}`}
                                       onSelect={() => togglePinnedProject(project.id)}
                                       className="flex items-center justify-between"
                                    >
                                       <span className="truncate pr-2">{project.name}</span>
                                       {pinned ? (
                                          <Pin className="size-3.5 text-muted-foreground" />
                                       ) : (
                                          <PinOff className="size-3.5 text-muted-foreground" />
                                       )}
                                    </CommandItem>
                                 );
                              })}
                           </CommandGroup>
                        </CommandList>
                     </Command>
                  </PopoverContent>
               </Popover>
            </div>

            <SidebarMenu>
               {pinnedProjects.map((project) => (
                  <SidebarMenuItem key={project.id}>
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
