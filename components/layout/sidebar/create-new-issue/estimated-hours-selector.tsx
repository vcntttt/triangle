'use client';

import { useState } from 'react';
import { Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface EstimatedHoursSelectorProps {
   estimatedHours: number | undefined;
   onChange: (estimatedHours: number | undefined) => void;
}

function formatEstimatedHours(estimatedHours: number | undefined) {
   if (estimatedHours === undefined) {
      return 'Add estimate';
   }

   const normalized = Number(estimatedHours.toFixed(2));
   return `${Number(normalized.toFixed(2)).toString()}h`;
}

export function EstimatedHoursSelector({ estimatedHours, onChange }: EstimatedHoursSelectorProps) {
   const [open, setOpen] = useState(false);
   const [value, setValue] = useState(estimatedHours !== undefined ? String(estimatedHours) : '');

   const applyValue = () => {
      const nextValue = value.trim();

      if (!nextValue) {
         onChange(undefined);
         setOpen(false);
         return;
      }

      const parsed = Number.parseFloat(nextValue);
      if (!Number.isFinite(parsed) || parsed < 0) {
         setValue(estimatedHours !== undefined ? String(estimatedHours) : '');
         setOpen(false);
         return;
      }

      onChange(parsed);
      setOpen(false);
   };

   const handleOpenChange = (nextOpen: boolean) => {
      if (nextOpen) {
         setValue(estimatedHours !== undefined ? String(estimatedHours) : '');
      }
      setOpen(nextOpen);
   };

   return (
      <Popover open={open} onOpenChange={handleOpenChange}>
         <PopoverTrigger asChild>
            <Button
               type="button"
               size="xs"
               variant="secondary"
               className="gap-1.5"
               aria-label="Set estimated hours"
            >
               <Clock3 className="size-4" />
               <span>{formatEstimatedHours(estimatedHours)}</span>
            </Button>
         </PopoverTrigger>
         <PopoverContent className="w-56 p-3" align="start">
            <div className="space-y-2">
               <div className="text-xs text-muted-foreground">Estimated hours</div>
               <Input
                  type="number"
                  min="0"
                  step="0.25"
                  inputMode="decimal"
                  placeholder="Leave blank"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  onKeyDown={(event) => {
                     if (event.key === 'Enter') {
                        event.preventDefault();
                        applyValue();
                     }

                     if (event.key === 'Escape') {
                        event.preventDefault();
                        setOpen(false);
                     }
                  }}
               />
               <div className="flex items-center justify-between gap-2">
                  <Button
                     type="button"
                     size="sm"
                     variant="ghost"
                     onClick={() => {
                        onChange(undefined);
                        setValue('');
                        setOpen(false);
                     }}
                  >
                     Clear
                  </Button>
                  <Button type="button" size="sm" onClick={applyValue}>
                     Apply
                  </Button>
               </div>
            </div>
         </PopoverContent>
      </Popover>
   );
}
