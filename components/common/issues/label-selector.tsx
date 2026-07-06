'use client';

import { useMemo, useState } from 'react';
import { CheckIcon, PlusIcon } from 'lucide-react';
import {
   Command,
   CommandEmpty,
   CommandGroup,
   CommandInput,
   CommandItem,
   CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLabelOptions } from '@/hooks/use-label-options';
import { useIssuesData } from '@/components/common/issues/issues-data-context';
import { IssueChip, issueChipDotClassName } from './issue-chip';

export function LabelSelector({ issueId }: { issueId: string }) {
   const [open, setOpen] = useState(false);
   const allLabels = useLabelOptions();
   const currentLabels = useIssuesData(
      (state) => state.issues.find((issue) => issue.id === issueId)?.labels ?? []
   );
   const { addIssueLabel, removeIssueLabel } = useIssuesData();

   const selectedIds = useMemo(
      () => new Set(currentLabels.map((label) => label.id)),
      [currentLabels]
   );

   const handleToggle = (labelId: string) => {
      const label = allLabels.find((item) => item.id === labelId);
      if (!label) return;

      if (selectedIds.has(labelId)) {
         removeIssueLabel(issueId, labelId);
         return;
      }

      addIssueLabel(issueId, label);
   };

   return (
      <Popover open={open} onOpenChange={setOpen}>
         <PopoverTrigger asChild>
            <button
               type="button"
               className="flex flex-wrap items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
               {currentLabels.length > 0 ? (
                  currentLabels.map((label) => (
                     <IssueChip key={label.id}>
                        <span
                           className={issueChipDotClassName}
                           style={{ backgroundColor: label.color }}
                           aria-hidden="true"
                        ></span>
                        <span className="truncate">{label.name}</span>
                     </IssueChip>
                  ))
               ) : (
                  <IssueChip>
                     <PlusIcon className="size-3.5" />
                     Add label
                  </IssueChip>
               )}
            </button>
         </PopoverTrigger>
         <PopoverContent className="border-input w-64 p-0" align="start">
            <Command>
               <CommandInput placeholder="Set labels..." />
               <CommandList>
                  <CommandEmpty>No labels found.</CommandEmpty>
                  <CommandGroup>
                     {allLabels.map((label) => {
                        const isSelected = selectedIds.has(label.id);

                        return (
                           <CommandItem
                              key={label.id}
                              value={label.name}
                              onSelect={() => handleToggle(label.id)}
                              className="flex items-center justify-between"
                           >
                              <div className="flex items-center gap-2">
                                 <span
                                    className="inline-block size-3 rounded-full"
                                    style={{ backgroundColor: label.color }}
                                    aria-hidden="true"
                                 />
                                 {label.name}
                              </div>
                              {isSelected && <CheckIcon size={16} className="ml-auto" />}
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
