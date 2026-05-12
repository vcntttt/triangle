'use client';

import { Button } from '@/components/ui/button';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { IssueDisplayProperty, useViewStore, ViewType } from '@/store/view-store';
import { LayoutGrid, LayoutList, SlidersHorizontal } from 'lucide-react';

const propertyLabels: Record<IssueDisplayProperty, string> = {
   identifier: 'ID',
   labels: 'Tags',
   project: 'Project',
   assignee: 'Assignee',
   createdAt: 'Created',
};

export function DisplayMenu() {
   const {
      viewType,
      setViewType,
      visibleProperties,
      toggleProperty,
      showEmptyStatuses,
      setShowEmptyStatuses,
      hideCompletedIssues,
      setHideCompletedIssues,
   } = useViewStore();

   const handleViewChange = (type: ViewType) => {
      setViewType(type);
   };

   return (
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <Button className="relative" size="xs" variant="secondary">
               <SlidersHorizontal className="size-4 mr-1" />
               Display
               {viewType === 'grid' && (
                  <span className="absolute right-0 top-0 size-2 bg-orange-500 rounded-full" />
               )}
            </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent className="w-72 p-3 space-y-3" align="end">
            <div className="flex gap-2">
               <DropdownMenuItem
                  onClick={() => handleViewChange('list')}
                  className={cn(
                     'w-full text-xs border border-accent flex flex-col gap-1',
                     viewType === 'list' ? 'bg-accent' : ''
                  )}
               >
                  <LayoutList className="size-4" />
                  List
               </DropdownMenuItem>
               <DropdownMenuItem
                  onClick={() => handleViewChange('grid')}
                  className={cn(
                     'w-full text-xs border border-accent flex flex-col gap-1',
                     viewType === 'grid' ? 'bg-accent' : ''
                  )}
               >
                  <LayoutGrid className="size-4" />
                  Board
               </DropdownMenuItem>
            </div>

            <DropdownMenuSeparator />

            <div className="space-y-1">
               <DropdownMenuLabel className="px-2 text-xs text-muted-foreground">
                  Display properties
               </DropdownMenuLabel>
               {(Object.keys(propertyLabels) as IssueDisplayProperty[]).map((property) => (
                  <DropdownMenuItem
                     key={property}
                     className="justify-between"
                     onSelect={(event) => {
                        event.preventDefault();
                        toggleProperty(property);
                     }}
                  >
                     <span>{propertyLabels[property]}</span>
                     <Switch
                        checked={visibleProperties[property]}
                        aria-label={propertyLabels[property]}
                        className="pointer-events-none"
                     />
                  </DropdownMenuItem>
               ))}
            </div>

            <DropdownMenuSeparator />

            <div className="space-y-1">
               <DropdownMenuLabel className="px-0 text-xs text-muted-foreground">
                  Statuses without issues
               </DropdownMenuLabel>
               <DropdownMenuItem
                  className="justify-between"
                  onSelect={(event) => {
                     event.preventDefault();
                     setShowEmptyStatuses(!showEmptyStatuses);
                  }}
               >
                  <span>Show empty statuses</span>
                  <Switch
                     checked={showEmptyStatuses}
                     aria-label="Show empty statuses"
                     className="pointer-events-none"
                  />
               </DropdownMenuItem>
               <DropdownMenuItem
                  className="justify-between"
                  onSelect={(event) => {
                     event.preventDefault();
                     setHideCompletedIssues(!hideCompletedIssues);
                  }}
               >
                  <span>Hide completed issues</span>
                  <Switch
                     checked={hideCompletedIssues}
                     aria-label="Hide completed issues"
                     className="pointer-events-none"
                  />
               </DropdownMenuItem>
            </div>
         </DropdownMenuContent>
      </DropdownMenu>
   );
}
