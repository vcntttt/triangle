'use client';

import { Button } from '@/components/ui/button';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CheckIcon, Code2, Rocket } from 'lucide-react';
import { useId, useState } from 'react';
import {
   issueEnvironmentLabels,
   issueEnvironments,
   type IssueEnvironment,
} from '@/lib/issue-environment';
import { cn } from '@/lib/utils';
import { issueChipClassName, issueChipIconClassName } from './issue-chip';

const environmentIcons: Record<IssueEnvironment, typeof Code2> = {
   development: Code2,
   production: Rocket,
};

export function IssueEnvironmentSelector({
   environment,
   onChange,
}: {
   environment: IssueEnvironment;
   onChange: (environment: IssueEnvironment) => void;
}) {
   const id = useId();
   const [open, setOpen] = useState(false);
   const SelectedIcon = environmentIcons[environment];

   return (
      <Popover open={open} onOpenChange={setOpen}>
         <PopoverTrigger asChild>
            <Button
               id={id}
               className={issueChipClassName}
               size="sm"
               variant="ghost"
               role="combobox"
               aria-expanded={open}
               aria-label="Entorno del issue"
            >
               <SelectedIcon className={issueChipIconClassName} />
               <span className="max-w-[160px] truncate">{issueEnvironmentLabels[environment]}</span>
            </Button>
         </PopoverTrigger>
         <PopoverContent className="w-44 p-0" align="start">
            <Command>
               <CommandList>
                  <CommandGroup>
                     {issueEnvironments.map((item) => {
                        const Icon = environmentIcons[item];

                        return (
                           <CommandItem
                              key={item}
                              value={item}
                              onSelect={() => {
                                 onChange(item);
                                 setOpen(false);
                              }}
                           >
                              <Icon className="size-4 text-muted-foreground" />
                              <span>{issueEnvironmentLabels[item]}</span>
                              {environment === item && <CheckIcon className="ml-auto size-4" />}
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

export function ProductionEnvironmentBadge({ className }: { className?: string }) {
   return (
      <span
         className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300',
            className
         )}
      >
         <Rocket className="size-3" aria-hidden="true" />
         <span>Producción</span>
      </span>
   );
}
