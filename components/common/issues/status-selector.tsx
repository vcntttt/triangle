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
import { useIssuesStore } from '@/store/issues-store';
import { type Status } from '@/lib/ui-catalog';
import { CheckIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { useIssuesStatuses } from './issues-status-context';
import { cn } from '@/lib/utils';
import { issueChipClassName } from './issue-chip';

interface StatusSelectorProps {
   status: Status;
   issueId: string;
   display?: 'icon' | 'chip';
}

export function StatusSelector({ status, issueId, display = 'icon' }: StatusSelectorProps) {
   const id = useId();
   const listId = `${id}-list`;
   const [open, setOpen] = useState<boolean>(false);
   const allStatus = useIssuesStatuses();

   const { updateIssueStatus, filterByStatus } = useIssuesStore();

   const handleStatusChange = (statusId: string) => {
      setOpen(false);

      if (issueId) {
         const newStatus = allStatus.find((s) => s.id === statusId);
         if (newStatus) {
            updateIssueStatus(issueId, newStatus);
         }
      }
   };

   const selectedItem = allStatus.find((item) => item.id === status.id) ?? status;
   const SelectedIcon = selectedItem.icon;

   return (
      <div className="*:not-first:mt-2">
         <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
               <Button
                  id={id}
                  className={cn(
                     display === 'icon'
                        ? 'size-7 flex items-center justify-center'
                        : issueChipClassName
                  )}
                  size={display === 'icon' ? 'icon' : 'sm'}
                  variant="ghost"
                  role="combobox"
                  aria-expanded={open}
                  aria-controls={listId}
               >
                  <SelectedIcon />
                  {display === 'chip' && (
                     <span className="max-w-[160px] truncate">{selectedItem.name}</span>
                  )}
               </Button>
            </PopoverTrigger>
            <PopoverContent
               className="border-input w-full min-w-[var(--radix-popper-anchor-width)] p-0"
               align="start"
            >
               <Command>
                  <CommandInput placeholder="Set status..." />
                  <CommandList id={listId}>
                     <CommandEmpty>No status found.</CommandEmpty>
                     <CommandGroup>
                        {allStatus.map((item) => (
                           <CommandItem
                              key={item.id}
                              value={item.id}
                              onSelect={handleStatusChange}
                              className="flex items-center justify-between"
                           >
                              <div className="flex items-center gap-2">
                                 <item.icon />
                                 {item.name}
                              </div>
                              {status.id === item.id && <CheckIcon size={16} className="ml-auto" />}
                              <span className="text-muted-foreground text-xs">
                                 {filterByStatus(item.id).length}
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
