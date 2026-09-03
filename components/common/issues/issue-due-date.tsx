'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { isResolvedIssueStatus } from '@/lib/issue-status';
import { IssueChip, issueChipIconClassName } from './issue-chip';

// Editable due-date chip: opens a calendar popover, marks overdue issues in
// red and lets the date be cleared by deselecting or via the clear button.
export function IssueDueDatePicker({
   dueDate,
   statusId,
   onChange,
}: {
   dueDate?: string;
   statusId: string;
   onChange: (dueDate: string | undefined) => void;
}) {
   const [open, setOpen] = useState(false);
   const selected = dueDate ? new Date(dueDate) : undefined;
   const overdue =
      selected !== undefined &&
      !isResolvedIssueStatus(statusId) &&
      selected.getTime() < new Date().setHours(0, 0, 0, 0);

   const handleSelect = (date: Date | undefined) => {
      onChange(date ? date.toISOString() : undefined);
      setOpen(false);
   };

   return (
      <Popover open={open} onOpenChange={setOpen}>
         <PopoverTrigger asChild>
            <button
               type="button"
               aria-label={dueDate ? 'Change due date' : 'Add due date'}
               className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
               <IssueChip className={cn(overdue && 'border-destructive/40 text-destructive')}>
                  <CalendarIcon className={issueChipIconClassName} />
                  {selected ? (
                     <span suppressHydrationWarning>Due {format(selected, 'MMM dd')}</span>
                  ) : (
                     <span className="text-muted-foreground">Due date</span>
                  )}
               </IssueChip>
            </button>
         </PopoverTrigger>
         <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={selected} onSelect={handleSelect} initialFocus />
            {selected ? (
               <div className="flex justify-end border-t border-border p-2">
                  <Button variant="ghost" size="xs" onClick={() => handleSelect(undefined)}>
                     <X className="size-3.5" />
                     Clear
                  </Button>
               </div>
            ) : null}
         </PopoverContent>
      </Popover>
   );
}
