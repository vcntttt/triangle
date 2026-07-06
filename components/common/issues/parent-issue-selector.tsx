'use client';

import { useId, useMemo, useState } from 'react';
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
import { CheckIcon, GitBranchPlus, Link2Off } from 'lucide-react';
import { useIssuesData } from '@/components/common/issues/issues-data-context';
import type { Issue } from '@/lib/models';
import { issueChipClassName, issueChipIconClassName } from './issue-chip';

interface ParentIssueSelectorProps {
   issueId: string;
   parent: Issue['parent'];
   onChange: (parent: Issue['parent']) => void;
   compact?: boolean;
   emptyLabel?: string;
}

export function ParentIssueSelector({
   issueId,
   parent,
   onChange,
   compact = false,
   emptyLabel = 'Set parent',
}: ParentIssueSelectorProps) {
   const id = useId();
   const listId = `${id}-list`;
   const [open, setOpen] = useState(false);
   const { getAllIssues, getSubissues } = useIssuesData();
   const issues = getAllIssues();
   const value = parent?.id ?? 'no-parent';

   const currentIssueChildren = getSubissues(issueId);
   const options = useMemo(
      () =>
         issues.filter(
            (issue) =>
               issue.id !== issueId &&
               !issue.parentIssueId &&
               !currentIssueChildren.some((child) => child.id === issue.id)
         ),
      [currentIssueChildren, issueId, issues]
   );

   const handleSelect = (nextParentId: string) => {
      if (nextParentId === 'no-parent') {
         onChange(null);
         setOpen(false);
         return;
      }

      const selected = options.find((issue) => issue.id === nextParentId);
      if (!selected) {
         return;
      }

      onChange({
         id: selected.id,
         identifier: selected.identifier,
         title: selected.title,
      });
      setOpen(false);
   };

   return (
      <Popover open={open} onOpenChange={setOpen}>
         <PopoverTrigger asChild>
            <Button
               id={id}
               size="sm"
               variant="ghost"
               role="combobox"
               aria-expanded={open}
               aria-controls={listId}
               className={compact ? issueChipClassName : 'max-w-full justify-start gap-1.5 h-7'}
            >
               <GitBranchPlus className={compact ? issueChipIconClassName : 'size-4'} />
               <span className="max-w-[180px] truncate">
                  {parent ? `Parent ${parent.identifier}` : emptyLabel}
               </span>
            </Button>
         </PopoverTrigger>
         <PopoverContent className="border-input w-[320px] p-0" align="start">
            <Command>
               <CommandInput placeholder="Set parent issue..." />
               <CommandList id={listId}>
                  <CommandEmpty>No issues available.</CommandEmpty>
                  <CommandGroup>
                     <CommandItem
                        value="no parent remove detach"
                        onSelect={() => handleSelect('no-parent')}
                        className="flex items-center justify-between"
                     >
                        <div className="flex items-center gap-2">
                           <Link2Off className="size-4" />
                           No parent
                        </div>
                        {value === 'no-parent' && <CheckIcon size={16} className="ml-auto" />}
                     </CommandItem>
                     {options.map((issue) => (
                        <CommandItem
                           key={issue.id}
                           value={`${issue.identifier} ${issue.title}`}
                           onSelect={() => handleSelect(issue.id)}
                           className="flex items-center justify-between gap-3"
                        >
                           <div className="min-w-0">
                              <div className="text-xs text-muted-foreground">
                                 {issue.identifier}
                              </div>
                              <div className="truncate">{issue.title}</div>
                           </div>
                           {value === issue.id && (
                              <CheckIcon size={16} className="ml-auto shrink-0" />
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
