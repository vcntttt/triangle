'use client';

import { Button } from '@/components/ui/button';
import type { ButtonProps } from '@/components/ui/button';
import { useProjectOptions } from '@/hooks/use-project-options';
import {
   Command,
   CommandEmpty,
   CommandGroup,
   CommandInput,
   CommandItem,
   CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Kbd } from '@/components/ui/kbd';
import { useIssuesStore } from '@/store/issues-store';
import type { Project } from '@/lib/models';
import { Box, CheckIcon, FolderIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { cn } from '@/lib/utils';
import { ProjectIconGlyph } from '@/components/common/projects/project-icon';

interface ProjectSelectorProps {
   project: Project | undefined;
   onChange: (project: Project | undefined) => void;
   open?: boolean;
   onOpenChange?: (open: boolean) => void;
   showShortcut?: boolean;
   triggerClassName?: string;
   variant?: ButtonProps['variant'];
   size?: ButtonProps['size'];
}

export function ProjectSelector({
   project,
   onChange,
   open,
   onOpenChange,
   showShortcut = true,
   triggerClassName,
   variant = 'secondary',
   size = 'xs',
}: ProjectSelectorProps) {
   const id = useId();
   const listId = `${id}-list`;
   const [internalOpen, setInternalOpen] = useState<boolean>(false);
   const projects = useProjectOptions();

   const { filterByProject } = useIssuesStore();
   const isOpen = open ?? internalOpen;
   const setOpen = onOpenChange ?? setInternalOpen;

   const value = project?.id;

   const handleProjectChange = (projectId: string) => {
      if (projectId === 'no-project') {
         onChange(undefined);
      } else {
         const newProject = projects.find((p) => p.id === projectId);
         if (newProject) {
            onChange(newProject);
         }
      }
      setOpen(false);
   };

   return (
      <div className="*:not-first:mt-2">
         <Popover open={isOpen} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
               <Button
                  id={id}
                  className={cn('flex items-center gap-1.5', triggerClassName)}
                  size={size}
                  variant={variant}
                  role="combobox"
                  title={showShortcut ? 'Open project picker (Alt+P)' : 'Open project picker'}
                  aria-expanded={isOpen}
                  aria-controls={listId}
                  aria-keyshortcuts={showShortcut ? 'Alt+P' : undefined}
               >
                  {value ? (
                     (() => {
                        const selectedProject = projects.find((p) => p.id === value);
                        if (selectedProject) {
                           return (
                              <ProjectIconGlyph
                                 icon={selectedProject.iconConfig}
                                 className="size-4"
                              />
                           );
                        }
                        return <Box className="size-4" />;
                     })()
                  ) : (
                     <Box className="size-4" />
                  )}
                  <span className="max-w-[160px] truncate">
                     {value ? projects.find((p) => p.id === value)?.name : 'No project'}
                  </span>
                  {showShortcut && <Kbd className="ml-auto">Alt+P</Kbd>}
               </Button>
            </PopoverTrigger>
            <PopoverContent
               className="border-input w-full min-w-[var(--radix-popper-anchor-width)] p-0"
               align="start"
            >
               <Command>
                  <CommandInput placeholder="Set project..." />
                  <CommandList id={listId}>
                     <CommandEmpty>No projects found.</CommandEmpty>
                     <CommandGroup>
                        <CommandItem
                           value="no project no-project none"
                           onSelect={() => handleProjectChange('no-project')}
                           className="flex items-center justify-between"
                        >
                           <div className="flex items-center gap-2">
                              <FolderIcon className="size-4" />
                              No Project
                           </div>
                           {value === undefined && <CheckIcon size={16} className="ml-auto" />}
                        </CommandItem>
                        {projects.map((project) => (
                           <CommandItem
                              key={project.id}
                              value={`${project.name} ${project.id}`}
                              onSelect={() => handleProjectChange(project.id)}
                              className="flex items-center justify-between"
                           >
                              <div className="flex items-center gap-2">
                                 <ProjectIconGlyph icon={project.iconConfig} className="size-4" />
                                 {project.name}
                              </div>
                              {value === project.id && <CheckIcon size={16} className="ml-auto" />}
                              <span className="text-muted-foreground text-xs">
                                 {filterByProject(project.id).length}
                              </span>
                           </CommandItem>
                        ))}
                     </CommandGroup>
                  </CommandList>
               </Command>
            </PopoverContent>
         </Popover>
      </div>
   );
}
