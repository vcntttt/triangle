'use client';

import { useId, useState } from 'react';
import { CheckIcon, CircleDashed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
   Command,
   CommandEmpty,
   CommandGroup,
   CommandInput,
   CommandItem,
   CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { type ProjectOptionLike } from '@/lib/projects-presentation';
import { status as allStatus, type Status } from '@/lib/ui-catalog';

interface StatusWithPercentProps {
   status: Status;
   options: ProjectOptionLike[];
   onStatusChange?: (statusId: string) => void;
}

const statusIconMap: Record<string, Status['icon']> = Object.fromEntries(
   allStatus.map((item) => [item.id, item.icon])
);

export function StatusWithPercent({ status, options, onStatusChange }: StatusWithPercentProps) {
   const id = useId();
   const listId = `${id}-list`;
   const [open, setOpen] = useState<boolean>(false);

   const handleStatusChange = (statusId: string) => {
      setOpen(false);
      onStatusChange?.(statusId);
   };

   const selectedOption = options.find((item) => item.id === status.id);
   const SelectedIcon =
      statusIconMap[status.id] ?? allStatus[allStatus.length - 1]?.icon ?? CircleDashed;

   return (
      <Popover open={open} onOpenChange={setOpen}>
         <PopoverTrigger asChild>
            <Button
               id={id}
               className="flex items-center justify-center gap-1.5"
               size="sm"
               variant="ghost"
               role="combobox"
               aria-expanded={open}
               aria-controls={listId}
            >
               <SelectedIcon />
               <span className="text-xs font-medium mt-[1px]">
                  {selectedOption?.name ?? status.name}
               </span>
            </Button>
         </PopoverTrigger>
         <PopoverContent className="border-input w-56 p-0" align="start">
            <Command>
               <CommandInput placeholder="Set status..." />
               <CommandList id={listId}>
                  <CommandEmpty>No status found.</CommandEmpty>
                  <CommandGroup>
                     {options.map((item) => {
                        const Icon =
                           statusIconMap[item.id] ??
                           allStatus[allStatus.length - 1]?.icon ??
                           CircleDashed;

                        return (
                           <CommandItem
                              key={item.id}
                              value={`${item.id} ${item.name}`}
                              onSelect={() => handleStatusChange(item.id)}
                              className="flex items-center justify-between"
                           >
                              <div className="flex items-center gap-2">
                                 <Icon />
                                 <span className="text-xs">{item.name}</span>
                              </div>
                              {status.id === item.id && <CheckIcon size={14} className="ml-auto" />}
                           </CommandItem>
                        );
                     })}
                  </CommandGroup>
               </CommandList>
            </Command>
         </PopoverContent>
      </Popover>
   );
}
