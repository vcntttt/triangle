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
import type { User } from '@/lib/models';
import { CheckIcon, UserCircle } from 'lucide-react';
import { useId, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { issuesPageQuery } from '@/src/data/issues';
import { useViewerUser } from '@/hooks/use-viewer-user';

interface AssigneeSelectorProps {
   assignee: User | null;
   onChange: (assignee: User | null) => void;
}

export function AssigneeSelector({ assignee, onChange }: AssigneeSelectorProps) {
   const id = useId();
   const listId = `${id}-list`;
   const [open, setOpen] = useState<boolean>(false);
   const { data } = useQuery(issuesPageQuery());
   const value = assignee?.id ?? null;
   const currentUser = useViewerUser();
   const personalAssigneeOptions = [currentUser];

   const handleAssigneeChange = (userId: string) => {
      if (userId === 'unassigned') {
         onChange(null);
      } else {
         const newAssignee = personalAssigneeOptions.find((u) => u.id === userId);
         if (newAssignee) {
            onChange(newAssignee);
         }
      }
      setOpen(false);
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
                  {value ? (
                     (() => {
                        const selectedUser = personalAssigneeOptions.find(
                           (user) => user.id === value
                        );
                        if (selectedUser) {
                           return (
                              <Avatar className="size-5">
                                 <AvatarImage
                                    src={selectedUser.avatarUrl}
                                    alt={selectedUser.name}
                                 />
                                 <AvatarFallback>{selectedUser.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                           );
                        }
                        return <UserCircle className="size-5" />;
                     })()
                  ) : (
                     <UserCircle className="size-5" />
                  )}
                  <span>{value ? currentUser.name : 'Unassigned'}</span>
               </Button>
            </PopoverTrigger>
            <PopoverContent
               className="border-input w-full min-w-[var(--radix-popper-anchor-width)] p-0"
               align="start"
            >
               <Command>
                  <CommandInput placeholder="Assign to..." />
                  <CommandList id={listId}>
                     <CommandEmpty>No users found.</CommandEmpty>
                     <CommandGroup>
                        <CommandItem
                           value="unassigned"
                           onSelect={() => handleAssigneeChange('unassigned')}
                           className="flex items-center justify-between"
                        >
                           <div className="flex items-center gap-2">
                              <UserCircle className="size-5" />
                              Unassigned
                           </div>
                           {value === null && <CheckIcon size={16} className="ml-auto" />}
                           <span className="text-muted-foreground text-xs">
                              {data?.issues.filter((issue) => issue.assigneeId === null).length ??
                                 0}
                           </span>
                        </CommandItem>
                        {personalAssigneeOptions.map((user) => (
                           <CommandItem
                              key={user.id}
                              value={user.id}
                              onSelect={() => handleAssigneeChange(user.id)}
                              className="flex items-center justify-between"
                           >
                              <div className="flex items-center gap-2">
                                 <Avatar className="size-5">
                                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                 </Avatar>
                                 {user.name}
                              </div>
                              {value === user.id && <CheckIcon size={16} className="ml-auto" />}
                              <span className="text-muted-foreground text-xs">
                                 {data?.issues.filter((issue) => issue.assigneeId === user.id)
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
