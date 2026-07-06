'use client';

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
import { useQuery } from '@tanstack/react-query';
import { priorities, type Priority } from '@/lib/ui-catalog';
import { CheckIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { issuesPageQuery } from '@/src/data/issues';

interface PrioritySelectorProps {
   priority: Priority;
   onChange: (priority: Priority) => void;
}

export function PrioritySelector({ priority, onChange }: PrioritySelectorProps) {
   const id = useId();
   const listId = `${id}-list`;
   const [open, setOpen] = useState<boolean>(false);
   const { data } = useQuery(issuesPageQuery());

   const handlePriorityChange = (priorityId: string) => {
      setOpen(false);

      const newPriority = priorities.find((p) => p.id === priorityId);
      if (newPriority) {
         onChange(newPriority);
      }
   };

   return (
      <div className="*:not-first:mt-2">
         <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
               <Button
                  id={id}
                  className="flex items-center justify-center"
                  size="xs"
                  variant="secondary"
                  role="combobox"
                  aria-expanded={open}
                  aria-controls={listId}
               >
                  {(() => {
                     const selectedItem = priorities.find((item) => item.id === priority.id);
                     if (selectedItem) {
                        const Icon = selectedItem.icon;
                        return <Icon className="text-muted-foreground size-4" />;
                     }
                     return null;
                  })()}
                  <span>
                     {priority.id
                        ? priorities.find((p) => p.id === priority.id)?.name
                        : 'No priority'}
                  </span>
               </Button>
            </PopoverTrigger>
            <PopoverContent
               className="border-input w-full min-w-[var(--radix-popper-anchor-width)] p-0"
               align="start"
            >
               <Command>
                  <CommandInput placeholder="Set priority..." />
                  <CommandList id={listId}>
                     <CommandEmpty>No priority found.</CommandEmpty>
                     <CommandGroup>
                        {priorities.map((item) => (
                           <CommandItem
                              key={item.id}
                              value={item.id}
                              onSelect={() => handlePriorityChange(item.id)}
                              className="flex items-center justify-between"
                           >
                              <div className="flex items-center gap-2">
                                 <item.icon className="text-muted-foreground size-4" />
                                 {item.name}
                              </div>
                              {priority.id === item.id && (
                                 <CheckIcon size={16} className="ml-auto" />
                              )}
                              <span className="text-muted-foreground text-xs">
                                 {data?.issues.filter((issue) => issue.priority === item.id)
                                    .length ?? 0}
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
