'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DatePickerProps {
   date: Date | undefined;
   onDateChange?: (date: Date | undefined) => void;
}

export function DatePicker({ date, onDateChange }: DatePickerProps) {
   const [open, setOpen] = React.useState<boolean>(false);

   const handleDateSelect = (date: Date | undefined) => {
      if (onDateChange) {
         onDateChange(date);
      }
      setOpen(false);
   };

   return (
      <Popover open={open} onOpenChange={setOpen}>
         <PopoverTrigger asChild>
            <Button
               variant="ghost"
               className="h-7 px-2 justify-start text-left font-normal"
               size="sm"
            >
               <CalendarIcon className="size-4 md:mr-0.5" />
               {date ? (
                  <span className="text-xs hidden xl:inline mt-[1px]">
                     {format(date, 'MMM dd, yyyy')}
                  </span>
               ) : (
                  <span className="text-xs text-muted-foreground hidden xl:inline mt-[1px]">
                     No date
                  </span>
               )}
            </Button>
         </PopoverTrigger>
         <PopoverContent className="w-auto p-0" align="start">
            <Calendar
               mode="single"
               required
               selected={date}
               onSelect={handleDateSelect}
               initialFocus
            />
            {date ? (
               <div className="flex justify-end border-t border-border p-2">
                  <Button variant="ghost" size="xs" onClick={() => handleDateSelect(undefined)}>
                     <X className="size-3.5" />
                     Clear
                  </Button>
               </div>
            ) : null}
         </PopoverContent>
      </Popover>
   );
}
