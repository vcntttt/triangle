'use client';

import { Button } from '@/components/ui/button';
import type { ButtonProps } from '@/components/ui/button';
import {
   Command,
   CommandEmpty,
   CommandGroup,
   CommandInput,
   CommandItem,
   CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Project, ProjectArea } from '@/lib/models';
import { projectAreasQuery } from '@/src/data/projects';
import { useQuery } from '@tanstack/react-query';
import { CheckIcon, Component, Layers2 } from 'lucide-react';
import { useId, useState } from 'react';

interface AreaSelectorProps {
   project: Project | undefined;
   area: ProjectArea | null | undefined;
   onChange: (area: ProjectArea | null) => void;
   open?: boolean;
   onOpenChange?: (open: boolean) => void;
   triggerClassName?: string;
   variant?: ButtonProps['variant'];
   size?: ButtonProps['size'];
}

export function AreaSelector({
   project,
   area,
   onChange,
   open,
   onOpenChange,
   triggerClassName,
   variant = 'secondary',
   size = 'xs',
}: AreaSelectorProps) {
   const id = useId();
   const listId = `${id}-list`;
   const [internalOpen, setInternalOpen] = useState(false);
   const projectId = project?.id ?? '';
   const { data: areas = [] } = useQuery({
      ...projectAreasQuery(projectId),
      enabled: Boolean(projectId),
   });
   const isOpen = open ?? internalOpen;
   const setOpen = onOpenChange ?? setInternalOpen;
   const selectedArea = area ? areas.find((item) => item.id === area.id) : null;

   const handleAreaChange = (areaId: string) => {
      if (areaId === 'no-area') {
         onChange(null);
         setOpen(false);
         return;
      }

      const nextArea = areas.find((item) => item.id === areaId);
      if (nextArea) {
         onChange(nextArea);
      }
      setOpen(false);
   };

   return (
      <Popover open={isOpen} onOpenChange={setOpen}>
         <PopoverTrigger asChild>
            <Button
               id={id}
               className={cn('flex items-center gap-1.5', triggerClassName)}
               size={size}
               variant={variant}
               role="combobox"
               disabled={!project}
               title={project ? 'Open area picker' : 'Choose a project before setting an area'}
               aria-expanded={isOpen}
               aria-controls={listId}
            >
               {selectedArea ? (
                  <span
                     className="size-2.5 shrink-0 rounded-full"
                     style={{ backgroundColor: selectedArea.color }}
                     aria-hidden="true"
                  />
               ) : (
                  <Layers2 className="size-4" />
               )}
               <span className="max-w-[160px] truncate">
                  {selectedArea?.name ?? (project ? 'No area' : 'Area')}
               </span>
            </Button>
         </PopoverTrigger>
         <PopoverContent
            className="border-input w-full min-w-[var(--radix-popper-anchor-width)] p-0"
            align="start"
         >
            <Command>
               <CommandInput placeholder="Set area..." />
               <CommandList id={listId}>
                  <CommandEmpty>No areas found.</CommandEmpty>
                  <CommandGroup>
                     <CommandItem
                        value="no area no-area none"
                        onSelect={() => handleAreaChange('no-area')}
                        className="flex items-center justify-between"
                     >
                        <div className="flex items-center gap-2">
                           <Component className="size-4" />
                           No area
                        </div>
                        {!selectedArea && <CheckIcon size={16} className="ml-auto" />}
                     </CommandItem>
                     {areas.map((item) => (
                        <CommandItem
                           key={item.id}
                           value={`${item.name} ${item.id}`}
                           onSelect={() => handleAreaChange(item.id)}
                           className="flex items-center justify-between"
                        >
                           <div className="flex min-w-0 items-center gap-2">
                              <span
                                 className="size-3 shrink-0 rounded-full"
                                 style={{ backgroundColor: item.color }}
                                 aria-hidden="true"
                              />
                              <span className="truncate">{item.name}</span>
                           </div>
                           {selectedArea?.id === item.id && (
                              <CheckIcon size={16} className="ml-auto" />
                           )}
                        </CommandItem>
                     ))}
                  </CommandGroup>
               </CommandList>
            </Command>
         </PopoverContent>
      </Popover>
   );
}
