'use client';

import { Button } from '@/components/ui/button';
import {
   Command,
   CommandEmpty,
   CommandGroup,
   CommandInput,
   CommandItem,
   CommandList,
   CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLabelOptions } from '@/hooks/use-label-options';
import { useProjectOptions } from '@/hooks/use-project-options';
import { useViewerUser } from '@/hooks/use-viewer-user';
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '@/store/filter-store';
import {
   CheckIcon,
   ChevronRight,
   ListFilter,
   User,
   CircleCheck,
   BarChart3,
   Tag,
   Folder,
   Layers2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIssuesStatuses } from '@/components/common/issues/issues-status-context';
import { useIssuesPriorities } from '@/components/common/issues/issues-priority-context';
import { ProjectIconGlyph } from '@/components/common/projects/project-icon';
import { issuesPageQuery } from '@/src/data/issues';
import type { IssueListItem } from '@/lib/db/issues';

const emptyIssues: IssueListItem[] = [];

// Define filter types
type FilterType = 'status' | 'assignee' | 'priority' | 'labels' | 'project' | 'area';

export function Filter() {
   const [open, setOpen] = useState<boolean>(false);
   const [activeFilter, setActiveFilter] = useState<FilterType | null>(null);
   const labels = useLabelOptions();
   const projects = useProjectOptions();
   const allStatus = useIssuesStatuses();
   const allPriorities = useIssuesPriorities();
   const { data } = useQuery(issuesPageQuery());
   const currentUser = useViewerUser();
   const personalAssigneeOptions = [currentUser];

   const { filters, toggleFilter, clearFilters, getActiveFiltersCount } = useFilterStore();
   const issues = data?.issues ?? emptyIssues;
   const projectFilterSet = useMemo(() => new Set(filters.project), [filters.project]);
   const statusFilterSet = useMemo(() => new Set(filters.status), [filters.status]);
   const assigneeFilterSet = useMemo(() => new Set(filters.assignee), [filters.assignee]);
   const priorityFilterSet = useMemo(() => new Set(filters.priority), [filters.priority]);
   const labelFilterSet = useMemo(() => new Set(filters.labels), [filters.labels]);
   const areaFilterSet = useMemo(() => new Set(filters.area), [filters.area]);
   const areas = useMemo(() => {
      const areaMap = new Map<
         string,
         NonNullable<(typeof issues)[number]['area']> & { projectName: string | null }
      >();

      for (const issue of issues) {
         if (!issue.area) continue;
         if (projectFilterSet.size > 0 && !projectFilterSet.has(issue.area.projectId)) {
            continue;
         }
         areaMap.set(issue.area.id, {
            ...issue.area,
            projectName: issue.project?.name ?? null,
         });
      }

      return Array.from(areaMap.values()).toSorted((left, right) =>
         left.name.localeCompare(right.name)
      );
   }, [issues, projectFilterSet]);

   return (
      <Popover open={open} onOpenChange={setOpen}>
         <PopoverTrigger asChild>
            <Button size="xs" variant="ghost" className="relative">
               <ListFilter className="size-4 mr-1" />
               Filter
               {getActiveFiltersCount() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full size-4 flex items-center justify-center">
                     {getActiveFiltersCount()}
                  </span>
               )}
            </Button>
         </PopoverTrigger>
         <PopoverContent className="p-0 w-60" align="start">
            {activeFilter === null ? (
               <Command>
                  <CommandList>
                     <CommandGroup>
                        <CommandItem
                           onSelect={() => setActiveFilter('status')}
                           className="flex items-center justify-between cursor-pointer"
                        >
                           <span className="flex items-center gap-2">
                              <CircleCheck className="size-4 text-muted-foreground" />
                              Status
                           </span>
                           <div className="flex items-center">
                              {filters.status.length > 0 && (
                                 <span className="text-xs text-muted-foreground mr-1">
                                    {filters.status.length}
                                 </span>
                              )}
                              <ChevronRight className="size-4" />
                           </div>
                        </CommandItem>
                        <CommandItem
                           onSelect={() => setActiveFilter('assignee')}
                           className="flex items-center justify-between cursor-pointer"
                        >
                           <span className="flex items-center gap-2">
                              <User className="size-4 text-muted-foreground" />
                              Assignee
                           </span>
                           <div className="flex items-center">
                              {filters.assignee.length > 0 && (
                                 <span className="text-xs text-muted-foreground mr-1">
                                    {filters.assignee.length}
                                 </span>
                              )}
                              <ChevronRight className="size-4" />
                           </div>
                        </CommandItem>
                        <CommandItem
                           onSelect={() => setActiveFilter('priority')}
                           className="flex items-center justify-between cursor-pointer"
                        >
                           <span className="flex items-center gap-2">
                              <BarChart3 className="size-4 text-muted-foreground" />
                              Priority
                           </span>
                           <div className="flex items-center">
                              {filters.priority.length > 0 && (
                                 <span className="text-xs text-muted-foreground mr-1">
                                    {filters.priority.length}
                                 </span>
                              )}
                              <ChevronRight className="size-4" />
                           </div>
                        </CommandItem>
                        <CommandItem
                           onSelect={() => setActiveFilter('labels')}
                           className="flex items-center justify-between cursor-pointer"
                        >
                           <span className="flex items-center gap-2">
                              <Tag className="size-4 text-muted-foreground" />
                              Labels
                           </span>
                           <div className="flex items-center">
                              {filters.labels.length > 0 && (
                                 <span className="text-xs text-muted-foreground mr-1">
                                    {filters.labels.length}
                                 </span>
                              )}
                              <ChevronRight className="size-4" />
                           </div>
                        </CommandItem>
                        <CommandItem
                           onSelect={() => setActiveFilter('project')}
                           className="flex items-center justify-between cursor-pointer"
                        >
                           <span className="flex items-center gap-2">
                              <Folder className="size-4 text-muted-foreground" />
                              Project
                           </span>
                           <div className="flex items-center">
                              {filters.project.length > 0 && (
                                 <span className="text-xs text-muted-foreground mr-1">
                                    {filters.project.length}
                                 </span>
                              )}
                              <ChevronRight className="size-4" />
                           </div>
                        </CommandItem>
                        <CommandItem
                           onSelect={() => setActiveFilter('area')}
                           className="flex items-center justify-between cursor-pointer"
                        >
                           <span className="flex items-center gap-2">
                              <Layers2 className="size-4 text-muted-foreground" />
                              Area
                           </span>
                           <div className="flex items-center">
                              {filters.area.length > 0 && (
                                 <span className="text-xs text-muted-foreground mr-1">
                                    {filters.area.length}
                                 </span>
                              )}
                              <ChevronRight className="size-4" />
                           </div>
                        </CommandItem>
                     </CommandGroup>
                     {getActiveFiltersCount() > 0 && (
                        <>
                           <CommandSeparator />
                           <CommandGroup>
                              <CommandItem
                                 onSelect={() => clearFilters()}
                                 className="text-destructive"
                              >
                                 Clear all filters
                              </CommandItem>
                           </CommandGroup>
                        </>
                     )}
                  </CommandList>
               </Command>
            ) : activeFilter === 'status' ? (
               <Command>
                  <div className="flex items-center border-b p-2">
                     <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => setActiveFilter(null)}
                     >
                        <ChevronRight className="size-4 rotate-180" />
                     </Button>
                     <span className="ml-2 font-medium">Status</span>
                  </div>
                  <CommandInput placeholder="Search status..." />
                  <CommandList>
                     <CommandEmpty>No status found.</CommandEmpty>
                     <CommandGroup>
                        {allStatus.map((item) => (
                           <CommandItem
                              key={item.id}
                              value={item.id}
                              onSelect={() => toggleFilter('status', item.id)}
                              className="flex items-center justify-between"
                           >
                              <div className="flex items-center gap-2">
                                 <item.icon />
                                 {item.name}
                              </div>
                              {statusFilterSet.has(item.id) && (
                                 <CheckIcon size={16} className="ml-auto" />
                              )}
                              <span className="text-muted-foreground text-xs">
                                 {issues.filter((issue) => issue.status === item.id).length}
                              </span>
                           </CommandItem>
                        ))}
                     </CommandGroup>
                  </CommandList>
               </Command>
            ) : activeFilter === 'assignee' ? (
               <Command>
                  <div className="flex items-center border-b p-2">
                     <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => setActiveFilter(null)}
                     >
                        <ChevronRight className="size-4 rotate-180" />
                     </Button>
                     <span className="ml-2 font-medium">Assignee</span>
                  </div>
                  <CommandInput placeholder="Search assignee..." />
                  <CommandList>
                     <CommandEmpty>No assignees found.</CommandEmpty>
                     <CommandGroup>
                        <CommandItem
                           value="unassigned"
                           onSelect={() => toggleFilter('assignee', 'unassigned')}
                           className="flex items-center justify-between"
                        >
                           <div className="flex items-center gap-2">
                              <User className="size-5" />
                              Unassigned
                           </div>
                           {assigneeFilterSet.has('unassigned') && (
                              <CheckIcon size={16} className="ml-auto" />
                           )}
                           <span className="text-muted-foreground text-xs">
                              {issues.filter((issue) => issue.assigneeId === null).length}
                           </span>
                        </CommandItem>
                        {personalAssigneeOptions.map((user) => (
                           <CommandItem
                              key={user.id}
                              value={user.id}
                              onSelect={() => toggleFilter('assignee', user.id)}
                              className="flex items-center justify-between"
                           >
                              <div className="flex items-center gap-2">
                                 <Avatar className="size-5">
                                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                 </Avatar>
                                 {user.name}
                              </div>
                              {assigneeFilterSet.has(user.id) && (
                                 <CheckIcon size={16} className="ml-auto" />
                              )}
                              <span className="text-muted-foreground text-xs">
                                 {issues.filter((issue) => issue.assigneeId === user.id).length}
                              </span>
                           </CommandItem>
                        ))}
                        <CommandItem value="me-label" disabled>
                           <div className="flex items-center gap-2 text-muted-foreground">
                              <Avatar className="size-5">
                                 <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                                 <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              Personal mode uses a single current user.
                           </div>
                        </CommandItem>
                     </CommandGroup>
                  </CommandList>
               </Command>
            ) : activeFilter === 'priority' ? (
               <Command>
                  <div className="flex items-center border-b p-2">
                     <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => setActiveFilter(null)}
                     >
                        <ChevronRight className="size-4 rotate-180" />
                     </Button>
                     <span className="ml-2 font-medium">Priority</span>
                  </div>
                  <CommandInput placeholder="Search priority..." />
                  <CommandList>
                     <CommandEmpty>No priorities found.</CommandEmpty>
                     <CommandGroup>
                        {allPriorities.map((item) => (
                           <CommandItem
                              key={item.id}
                              value={item.id}
                              onSelect={() => toggleFilter('priority', item.id)}
                              className="flex items-center justify-between"
                           >
                              <div className="flex items-center gap-2">
                                 <item.icon className="text-muted-foreground size-4" />
                                 {item.name}
                              </div>
                              {priorityFilterSet.has(item.id) && (
                                 <CheckIcon size={16} className="ml-auto" />
                              )}
                              <span className="text-muted-foreground text-xs">
                                 {issues.filter((issue) => issue.priority === item.id).length}
                              </span>
                           </CommandItem>
                        ))}
                     </CommandGroup>
                  </CommandList>
               </Command>
            ) : activeFilter === 'labels' ? (
               <Command>
                  <div className="flex items-center border-b p-2">
                     <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => setActiveFilter(null)}
                     >
                        <ChevronRight className="size-4 rotate-180" />
                     </Button>
                     <span className="ml-2 font-medium">Labels</span>
                  </div>
                  <CommandInput placeholder="Search labels..." />
                  <CommandList>
                     <CommandEmpty>No labels found.</CommandEmpty>
                     <CommandGroup>
                        {labels.map((label) => (
                           <CommandItem
                              key={label.id}
                              value={label.id}
                              onSelect={() => toggleFilter('labels', label.id)}
                              className="flex items-center justify-between"
                           >
                              <div className="flex items-center gap-2">
                                 <span
                                    className="size-3 rounded-full"
                                    style={{ backgroundColor: label.color }}
                                 ></span>
                                 {label.name}
                              </div>
                              {labelFilterSet.has(label.id) && (
                                 <CheckIcon size={16} className="ml-auto" />
                              )}
                              <span className="text-muted-foreground text-xs">
                                 {
                                    issues.filter((issue) =>
                                       issue.labels.some((item) => item.id === label.id)
                                    ).length
                                 }
                              </span>
                           </CommandItem>
                        ))}
                     </CommandGroup>
                  </CommandList>
               </Command>
            ) : activeFilter === 'project' ? (
               <Command>
                  <div className="flex items-center border-b p-2">
                     <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => setActiveFilter(null)}
                     >
                        <ChevronRight className="size-4 rotate-180" />
                     </Button>
                     <span className="ml-2 font-medium">Project</span>
                  </div>
                  <CommandInput placeholder="Search projects..." />
                  <CommandList>
                     <CommandEmpty>No projects found.</CommandEmpty>
                     <CommandGroup>
                        {projects.map((project) => (
                           <CommandItem
                              key={project.id}
                              value={project.id}
                              onSelect={() => toggleFilter('project', project.id)}
                              className="flex items-center justify-between"
                           >
                              <div className="flex items-center gap-2">
                                 <ProjectIconGlyph icon={project.iconConfig} className="size-4" />
                                 {project.name}
                              </div>
                              {projectFilterSet.has(project.id) && (
                                 <CheckIcon size={16} className="ml-auto" />
                              )}
                              <span className="text-muted-foreground text-xs">
                                 {issues.filter((issue) => issue.project?.id === project.id).length}
                              </span>
                           </CommandItem>
                        ))}
                     </CommandGroup>
                  </CommandList>
               </Command>
            ) : activeFilter === 'area' ? (
               <Command>
                  <div className="flex items-center border-b p-2">
                     <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => setActiveFilter(null)}
                     >
                        <ChevronRight className="size-4 rotate-180" />
                     </Button>
                     <span className="ml-2 font-medium">Area</span>
                  </div>
                  <CommandInput placeholder="Search areas..." />
                  <CommandList>
                     <CommandEmpty>No areas found.</CommandEmpty>
                     <CommandGroup>
                        {areas.map((area) => (
                           <CommandItem
                              key={area.id}
                              value={`${area.name} ${area.projectName ?? ''} ${area.id}`}
                              onSelect={() => toggleFilter('area', area.id)}
                              className="flex items-center justify-between"
                           >
                              <div className="flex min-w-0 items-center gap-2">
                                 <span
                                    className="size-3 shrink-0 rounded-full"
                                    style={{ backgroundColor: area.color }}
                                 />
                                 <span className="truncate">{area.name}</span>
                                 {filters.project.length === 0 && area.projectName && (
                                    <span className="truncate text-xs text-muted-foreground">
                                       {area.projectName}
                                    </span>
                                 )}
                              </div>
                              {areaFilterSet.has(area.id) && (
                                 <CheckIcon size={16} className="ml-auto" />
                              )}
                              <span className="text-muted-foreground text-xs">
                                 {issues.filter((issue) => issue.area?.id === area.id).length}
                              </span>
                           </CommandItem>
                        ))}
                     </CommandGroup>
                  </CommandList>
               </Command>
            ) : null}
         </PopoverContent>
      </Popover>
   );
}
