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
import {
   IssueDisplayProperty,
   type IssueListMode,
   useViewStore,
   ViewType,
} from '@/store/view-store';
import {
   ArrowDownAZ,
   ArrowUpAZ,
   GitFork,
   LayoutGrid,
   LayoutList,
   ListTree,
   SlidersHorizontal,
} from 'lucide-react';
import type { IssueGroupBy, IssueOrderBy } from '@/lib/issue-view';

const propertyLabels: Record<IssueDisplayProperty, string> = {
   identifier: 'ID',
   labels: 'Tags',
   project: 'Project',
   area: 'Area',
   dependencies: 'Dependencies',
   assignee: 'Assignee',
   createdAt: 'Created',
};

export function DisplayMenu() {
   const {
      viewType,
      setViewType,
      listMode,
      setListMode,
      groupBy,
      setGroupBy,
      orderBy,
      setOrderBy,
      orderDirection,
      setOrderDirection,
      visibleProperties,
      toggleProperty,
      hideCompletedIssues,
      setHideCompletedIssues,
      showSubissues,
      setShowSubissues,
      showEmptyGroups,
      setShowEmptyGroups,
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
            <div className="grid grid-cols-3 gap-2">
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
               <DropdownMenuItem
                  onClick={() => handleViewChange('graph')}
                  className={cn(
                     'w-full text-xs border border-accent flex flex-col gap-1',
                     viewType === 'graph' ? 'bg-accent' : ''
                  )}
               >
                  <GitFork className="size-4" />
                  Graph
               </DropdownMenuItem>
            </div>

            {viewType === 'list' && (
               <>
                  <DropdownMenuSeparator />
                  <div className="space-y-2">
                     <DropdownMenuLabel className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
                        <ListTree className="size-3.5" />
                        List organization
                     </DropdownMenuLabel>
                     <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/50 p-1">
                        {(['hierarchy', 'flat'] as IssueListMode[]).map((mode) => (
                           <button
                              key={mode}
                              type="button"
                              className={cn(
                                 'rounded-md px-2 py-1.5 text-xs capitalize transition-colors',
                                 listMode === mode
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                              )}
                              onClick={(event) => {
                                 event.preventDefault();
                                 setListMode(mode);
                              }}
                           >
                              {mode}
                           </button>
                        ))}
                     </div>
                  </div>
               </>
            )}

            <DropdownMenuSeparator />

            <div className="space-y-1">
               <DropdownMenuLabel className="px-2 text-xs text-muted-foreground">
                  Group issues by
               </DropdownMenuLabel>
               {(['status', 'priority', 'project', 'assignee', 'none'] as IssueGroupBy[]).map(
                  (value) => (
                     <DropdownMenuItem
                        key={value}
                        className="justify-between"
                        onSelect={() => setGroupBy(value)}
                     >
                        <span className="capitalize">
                           {value === 'none' ? 'No grouping' : value}
                        </span>
                        {groupBy === value ? <span className="text-primary">✓</span> : null}
                     </DropdownMenuItem>
                  )
               )}
            </div>

            <div className="space-y-1">
               <DropdownMenuLabel className="px-2 text-xs text-muted-foreground">
                  Order issues by
               </DropdownMenuLabel>
               {(['priority', 'created', 'title'] as IssueOrderBy[]).map((value) => (
                  <DropdownMenuItem
                     key={value}
                     className="justify-between"
                     onSelect={() => setOrderBy(value)}
                  >
                     <span className="capitalize">{value === 'created' ? 'Created' : value}</span>
                     {orderBy === value ? <span className="text-primary">✓</span> : null}
                  </DropdownMenuItem>
               ))}
               <DropdownMenuItem
                  className="justify-between"
                  onSelect={() =>
                     setOrderDirection(orderDirection === 'ascending' ? 'descending' : 'ascending')
                  }
               >
                  <span>Direction</span>
                  {orderDirection === 'ascending' ? (
                     <ArrowUpAZ className="size-4" />
                  ) : (
                     <ArrowDownAZ className="size-4" />
                  )}
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
                  Groups and subissues
               </DropdownMenuLabel>
               <DropdownMenuItem
                  className="justify-between"
                  onSelect={(event) => {
                     event.preventDefault();
                     setShowEmptyGroups(!showEmptyGroups);
                  }}
               >
                  <span>Show empty groups</span>
                  <Switch
                     checked={showEmptyGroups}
                     aria-label="Show empty groups"
                     className="pointer-events-none"
                  />
               </DropdownMenuItem>
               <DropdownMenuItem
                  className="justify-between"
                  onSelect={(event) => {
                     event.preventDefault();
                     setShowSubissues(!showSubissues);
                  }}
               >
                  <span>Show subissues</span>
                  <Switch
                     checked={showSubissues}
                     aria-label="Show subissues"
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
