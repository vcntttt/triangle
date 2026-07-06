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
import { Kbd } from '@/components/ui/kbd';
import { useLabelOptions } from '@/hooks/use-label-options';
import { useQuery } from '@tanstack/react-query';
import type { LabelInterface } from '@/lib/models';
import { CheckIcon, TagIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { issuesPageQuery } from '@/src/data/issues';

interface LabelSelectorProps {
   selectedLabels: LabelInterface[];
   onChange: (labels: LabelInterface[]) => void;
   open?: boolean;
   onOpenChange?: (open: boolean) => void;
}

export function LabelSelector({
   selectedLabels,
   onChange,
   open,
   onOpenChange,
}: LabelSelectorProps) {
   const id = useId();
   const [internalOpen, setInternalOpen] = useState<boolean>(false);
   const labels = useLabelOptions();
   const { data } = useQuery(issuesPageQuery());
   const isOpen = open ?? internalOpen;
   const setOpen = onOpenChange ?? setInternalOpen;

   const handleLabelToggle = (label: LabelInterface) => {
      const isSelected = selectedLabels.some((l) => l.id === label.id);
      let newLabels: LabelInterface[];

      if (isSelected) {
         newLabels = selectedLabels.filter((l) => l.id !== label.id);
      } else {
         newLabels = [...selectedLabels, label];
      }

      onChange(newLabels);
   };

   return (
      <div className="*:not-first:mt-2">
         <Popover open={isOpen} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
               <Button
                  id={id}
                  className="flex items-center gap-1.5"
                  size="xs"
                  variant="secondary"
                  role="combobox"
                  title="Open tag picker (Alt+L)"
                  aria-expanded={isOpen}
                  aria-controls={`${id}-content`}
                  aria-keyshortcuts="Alt+L"
               >
                  <TagIcon className="size-4" />
                  {selectedLabels.length > 0 && (
                     <div className="flex gap-x-0.5">
                        {selectedLabels.map((label) => (
                           <div
                              key={label.id}
                              className={`size-3 rounded-full`}
                              style={{ backgroundColor: label.color }}
                           />
                        ))}
                     </div>
                  )}
                  <span className="max-w-[140px] truncate">
                     {selectedLabels.length > 0
                        ? `${selectedLabels.length} label${selectedLabels.length === 1 ? '' : 's'}`
                        : 'No labels'}
                  </span>
                  <Kbd className="ml-auto">Alt+L</Kbd>
               </Button>
            </PopoverTrigger>
            <PopoverContent
               id={`${id}-content`}
               className="border-input w-full min-w-[var(--radix-popper-anchor-width)] p-0"
               align="start"
            >
               <Command>
                  <CommandInput placeholder="Search labels..." />
                  <CommandList>
                     <CommandEmpty>No labels found.</CommandEmpty>
                     <CommandGroup>
                        {labels.map((label) => {
                           const isSelected = selectedLabels.some((l) => l.id === label.id);
                           return (
                              <CommandItem
                                 key={label.id}
                                 value={`${label.name} ${label.id}`}
                                 onSelect={() => handleLabelToggle(label)}
                                 className="flex items-center justify-between"
                              >
                                 <div className="flex items-center gap-2">
                                    <div
                                       className={`size-3 rounded-full`}
                                       style={{ backgroundColor: label.color }}
                                    />
                                    <span>{label.name}</span>
                                 </div>
                                 {isSelected && <CheckIcon size={16} className="ml-auto" />}
                                 <span className="text-muted-foreground text-xs">
                                    {data?.issues.filter((issue) =>
                                       issue.labels.some((item) => item.id === label.id)
                                    ).length ?? 0}
                                 </span>
                              </CommandItem>
                           );
                        })}
                     </CommandGroup>
                  </CommandList>
               </Command>
            </PopoverContent>
         </Popover>
      </div>
   );
}
