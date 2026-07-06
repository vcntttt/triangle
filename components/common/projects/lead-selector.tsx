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
import type { User } from '@/lib/models';
import { CheckIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useId, useState } from 'react';
import { useViewerUser } from '@/hooks/use-viewer-user';

interface LeadSelectorProps {
   lead: User;
   onLeadChange?: (userId: string) => void;
}

export function LeadSelector({ lead, onLeadChange }: LeadSelectorProps) {
   const id = useId();
   const listId = `${id}-list`;
   const [open, setOpen] = useState<boolean>(false);
   const viewer = useViewerUser();

   const handleLeadChange = (userId: string) => {
      setOpen(false);

      if (onLeadChange) {
         onLeadChange(userId);
      }
   };

   return (
      <div>
         <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
               <Button
                  id={id}
                  className="flex items-center justify-center gap-1 h-7 px-2"
                  size="sm"
                  variant="ghost"
                  role="combobox"
                  aria-expanded={open}
                  aria-controls={listId}
               >
                  {(() => {
                     if (viewer.id === lead.id) {
                        return (
                           <>
                              <Avatar className="size-5 mr-1">
                                 <AvatarImage src={viewer.avatarUrl} alt={viewer.name} />
                                 <AvatarFallback>{viewer.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs hidden md:inline">{viewer.name}</span>
                           </>
                        );
                     }
                     return null;
                  })()}
               </Button>
            </PopoverTrigger>
            <PopoverContent className="border-input w-48 p-0" align="start">
               <Command>
                  <CommandInput placeholder="Set lead..." />
                  <CommandList id={listId}>
                     <CommandEmpty>No user found.</CommandEmpty>
                     <CommandGroup>
                        <CommandItem
                           value={viewer.id}
                           onSelect={handleLeadChange}
                           className="flex items-center justify-between"
                        >
                           <div className="flex items-center gap-2">
                              <Avatar className="size-5">
                                 <AvatarImage src={viewer.avatarUrl} alt={viewer.name} />
                                 <AvatarFallback>{viewer.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs">{viewer.name}</span>
                           </div>
                           {lead.id === viewer.id && <CheckIcon size={14} className="ml-auto" />}
                        </CommandItem>
                     </CommandGroup>
                  </CommandList>
               </Command>
            </PopoverContent>
         </Popover>
      </div>
   );
}
