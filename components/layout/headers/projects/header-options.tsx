import { Button } from '@/components/ui/button';
import {
   DropdownMenu,
   DropdownMenuCheckboxItem,
   DropdownMenuContent,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
   ProjectBoardGroupBy,
   ProjectDisplayProperty,
   ProjectViewType,
   useProjectsViewStore,
} from '@/store/projects-view-store';
import { BarChart3, HeartPulse, LayoutGrid, LayoutList, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const propertyLabels: Record<ProjectDisplayProperty, string> = {
   health: 'Health',
   priority: 'Priority',
   lead: 'Lead',
   targetDate: 'Target date',
   status: 'Status',
};

const boardGroupLabels: Record<ProjectBoardGroupBy, string> = {
   status: 'Status',
   priority: 'Priority',
   health: 'Health',
};

const boardGroupIcons: Record<ProjectBoardGroupBy, typeof BarChart3> = {
   status: LayoutGrid,
   priority: BarChart3,
   health: HeartPulse,
};

export function DisplayMenu() {
   const {
      viewType,
      setViewType,
      groupBy,
      setGroupBy,
      showEmptyGroups,
      setShowEmptyGroups,
      visibleProperties,
      toggleProperty,
   } = useProjectsViewStore();

   const handleViewChange = (nextView: ProjectViewType) => {
      setViewType(nextView);
   };

   return (
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <Button className="relative" size="xs" variant="secondary">
               <SlidersHorizontal className="size-4 mr-1" />
               Display
            </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent className="w-72 p-3 space-y-3" align="end">
            <div className="space-y-1">
               <DropdownMenuLabel className="px-2 text-xs text-muted-foreground">
                  View mode
               </DropdownMenuLabel>
               <div className="flex gap-2">
                  <DropdownMenuItem
                     onSelect={() => handleViewChange('list')}
                     className={cn(
                        'w-full text-xs border border-accent flex flex-col items-start gap-1',
                        viewType === 'list' ? 'bg-accent' : ''
                     )}
                  >
                     <LayoutList className="size-4" />
                     List
                  </DropdownMenuItem>
                  <DropdownMenuItem
                     onSelect={() => handleViewChange('board')}
                     className={cn(
                        'w-full text-xs border border-accent flex flex-col items-start gap-1',
                        viewType === 'board' ? 'bg-accent' : ''
                     )}
                  >
                     <LayoutGrid className="size-4" />
                     Board
                  </DropdownMenuItem>
               </div>
            </div>

            <DropdownMenuSeparator />

            <div className="space-y-1">
               <DropdownMenuLabel className="px-2 text-xs text-muted-foreground">
                  Board grouping
               </DropdownMenuLabel>
               {(Object.keys(boardGroupLabels) as ProjectBoardGroupBy[]).map((property) => {
                  const Icon = boardGroupIcons[property];

                  return (
                     <DropdownMenuItem
                        key={property}
                        onSelect={() => setGroupBy(property)}
                        className={cn(
                           'flex items-center justify-between',
                           groupBy === property ? 'bg-accent' : ''
                        )}
                     >
                        <span className="flex items-center gap-2">
                           <Icon className="size-4 text-muted-foreground" />
                           {boardGroupLabels[property]}
                        </span>
                        {groupBy === property && (
                           <span className="size-2 rounded-full bg-primary" />
                        )}
                     </DropdownMenuItem>
                  );
               })}
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuCheckboxItem
               checked={showEmptyGroups}
               onCheckedChange={(checked) => setShowEmptyGroups(Boolean(checked))}
            >
               Show empty board columns
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator />

            <div className="space-y-1">
               <DropdownMenuLabel className="px-2 text-xs text-muted-foreground">
                  Display properties
               </DropdownMenuLabel>
               {(Object.keys(propertyLabels) as ProjectDisplayProperty[]).map((property) => (
                  <DropdownMenuCheckboxItem
                     key={property}
                     checked={visibleProperties[property]}
                     onCheckedChange={() => toggleProperty(property)}
                  >
                     {propertyLabels[property]}
                  </DropdownMenuCheckboxItem>
               ))}
            </div>
         </DropdownMenuContent>
      </DropdownMenu>
   );
}
