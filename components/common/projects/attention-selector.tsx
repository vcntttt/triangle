'use client';

import { useId, useState } from 'react';
import { CheckIcon } from 'lucide-react';
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
import type { ProjectAttention } from '@/lib/models';
import type { ProjectOptionLike } from '@/lib/projects-presentation';

interface AttentionSelectorProps {
   attention: ProjectAttention;
   options: ProjectOptionLike[];
   onAttentionChange?: (attentionId: string) => void;
}

export function AttentionSelector({
   attention,
   options,
   onAttentionChange,
}: AttentionSelectorProps) {
   const id = useId();
   const listId = `${id}-list`;
   const [open, setOpen] = useState(false);
   const selectedOption = options.find((item) => item.id === attention.id);
   const selectedName = selectedOption?.name ?? attention.name;
   const selectedColor = selectedOption?.color ?? attention.color;

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
               <span className="size-2 rounded-full" style={{ backgroundColor: selectedColor }} />
               <span className="text-xs font-medium mt-px">{selectedName}</span>
            </Button>
         </PopoverTrigger>
         <PopoverContent className="w-56 p-0" align="start">
            <Command>
               <CommandInput placeholder="Set attention..." />
               <CommandList id={listId}>
                  <CommandEmpty>No attention state found.</CommandEmpty>
                  <CommandGroup>
                     {options.map((item) => (
                        <CommandItem
                           key={item.id}
                           value={`${item.id} ${item.name}`}
                           onSelect={() => {
                              setOpen(false);
                              onAttentionChange?.(item.id);
                           }}
                           className="flex items-center justify-between"
                        >
                           <span className="flex items-center gap-2">
                              <span
                                 className="size-2 rounded-full"
                                 style={{ backgroundColor: item.color }}
                              />
                              <span className="text-xs">{item.name}</span>
                           </span>
                           {attention.id === item.id ? (
                              <CheckIcon size={14} className="ml-auto" />
                           ) : null}
                        </CommandItem>
                     ))}
                  </CommandGroup>
               </CommandList>
            </Command>
         </PopoverContent>
      </Popover>
   );
}
