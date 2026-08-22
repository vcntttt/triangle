'use client';

import type { Issue, Status } from '@/lib/models';
import { useIssuesData } from '@/components/common/issues/issues-data-context';
import { useIssueDisplay } from './issues-display-context';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { FC, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { Button } from '../../ui/button';
import { IssueDragType, IssueGrid } from './issue-grid';
import { IssueLine } from './issue-line';
import { useCreateIssueStore } from '@/store/create-issue-store';
import { AnimatePresence, LazyMotion, domAnimation } from 'motion/react';
import * as m from 'motion/react-m';
import { useMemo } from 'react';
import { getIssueListRows } from './group-issue-rows';
import { sortIssuesByConfiguredPriority } from '@/lib/issue-view';
import type { ProjectOptionLike } from '@/lib/projects-presentation';

interface GroupIssuesProps {
   status: Status;
   issues: Issue[];
   count: number;
   selectedIssueIdentifier?: string;
   selectedIssueIds?: Set<string>;
   collapsedParentIds?: ReadonlySet<string>;
   isCollapsed?: boolean;
   onSelectIssue?: (issue: Issue) => void;
   onToggleIssueSelection?: (issue: Issue) => void;
   onToggleParentCollapse?: (issueId: string) => void;
   onToggleStatusCollapse?: () => void;
   allowCreate?: boolean;
   priorities?: ProjectOptionLike[];
}

const emptyPriorities: ProjectOptionLike[] = [];

export function GroupIssues({
   status,
   issues,
   count,
   selectedIssueIdentifier,
   selectedIssueIds,
   collapsedParentIds,
   isCollapsed = false,
   onSelectIssue,
   onToggleIssueSelection,
   onToggleParentCollapse,
   onToggleStatusCollapse,
   allowCreate = true,
   priorities,
}: GroupIssuesProps) {
   const configuredPriorities = priorities ?? emptyPriorities;
   const display = useIssueDisplay();
   const { viewType, listMode } = display;
   const isViewTypeGrid = viewType === 'grid';
   const { openModal } = useCreateIssueStore();
   const listRows = useMemo(
      () =>
         getIssueListRows(issues, listMode, collapsedParentIds, {
            kind: 'display',
            display,
            priorities: configuredPriorities,
         }),
      [collapsedParentIds, configuredPriorities, display, issues, listMode]
   );

   return (
      <div
         className={cn(
            'bg-conainer',
            isViewTypeGrid
               ? cn(
                    'overflow-hidden rounded-md flex-shrink-0 w-[348px] flex flex-col',
                    isCollapsed ? 'h-fit' : 'h-full'
                 )
               : ''
         )}
      >
         <div
            className={cn(
               'sticky top-0 z-10 bg-container w-full',
               isViewTypeGrid ? 'rounded-t-md h-[50px]' : 'h-10'
            )}
         >
            <div
               className={cn(
                  'w-full h-full flex items-center justify-between',
                  isViewTypeGrid ? 'px-3' : 'px-6'
               )}
               style={{
                  backgroundColor: isViewTypeGrid ? `${status.color}10` : `${status.color}06`,
               }}
            >
               <div className="flex items-center gap-2">
                  <Button
                     type="button"
                     className="size-6"
                     size="icon"
                     variant="ghost"
                     aria-expanded={!isCollapsed}
                     aria-label={
                        isCollapsed
                           ? `Expandir estado ${status.name}`
                           : `Colapsar estado ${status.name}`
                     }
                     title={isCollapsed ? 'Expandir estado' : 'Colapsar estado'}
                     onClick={onToggleStatusCollapse}
                  >
                     {isCollapsed ? (
                        <ChevronRight className="size-4" />
                     ) : (
                        <ChevronDown className="size-4" />
                     )}
                  </Button>
                  <status.icon />
                  <span className="text-sm font-normal">{status.name}</span>
                  <span className="text-sm leading-none text-muted-foreground">{count}</span>
               </div>

               {allowCreate ? (
                  <Button
                     className="size-6"
                     size="icon"
                     variant="ghost"
                     onClick={(e) => {
                        e.stopPropagation();
                        openModal(status, null, null);
                     }}
                  >
                     <Plus className="size-4" />
                  </Button>
               ) : null}
            </div>
         </div>

         {!isCollapsed && viewType === 'list' ? (
            <div className="space-y-0">
               {listRows.map(({ issue, nestingLevel, childrenCount, completedChildrenCount }) => (
                  <IssueLine
                     key={issue.id}
                     issue={issue}
                     layoutId={true}
                     isActive={selectedIssueIdentifier === issue.identifier}
                     isBulkSelected={selectedIssueIds?.has(issue.id) ?? false}
                     nestingLevel={nestingLevel}
                     childrenCount={childrenCount}
                     completedChildrenCount={completedChildrenCount}
                     isCollapsed={collapsedParentIds?.has(issue.id) ?? false}
                     onSelect={onSelectIssue}
                     onToggleSelection={onToggleIssueSelection}
                     onToggleCollapse={onToggleParentCollapse}
                  />
               ))}
            </div>
         ) : !isCollapsed ? (
            <IssueGridList
               issues={issues}
               status={status}
               priorities={configuredPriorities}
               selectedIssueIdentifier={selectedIssueIdentifier}
               selectedIssueIds={selectedIssueIds}
               onSelectIssue={onSelectIssue}
               onToggleIssueSelection={onToggleIssueSelection}
            />
         ) : null}
      </div>
   );
}

const IssueGridList: FC<{
   issues: Issue[];
   status: Status;
   priorities: ProjectOptionLike[];
   selectedIssueIdentifier?: string;
   selectedIssueIds?: Set<string>;
   onSelectIssue?: (issue: Issue) => void;
   onToggleIssueSelection?: (issue: Issue) => void;
}> = ({
   issues,
   status,
   priorities,
   selectedIssueIdentifier,
   selectedIssueIds,
   onSelectIssue,
   onToggleIssueSelection,
}) => {
   const ref = useRef<HTMLDivElement>(null);
   const { updateIssueStatus } = useIssuesData();

   // Set up drop functionality to accept only issue items.
   const [{ isOver }, drop] = useDrop(() => ({
      accept: IssueDragType,
      drop(item: Issue, monitor) {
         if (!monitor.didDrop() && item.status.id !== status.id) {
            updateIssueStatus(item.id, status);
         }
      },
      collect: (monitor) => ({
         isOver: !!monitor.isOver(),
      }),
   }));
   drop(ref);

   const sortedIssues = sortIssuesByConfiguredPriority(issues, priorities);

   return (
      <div
         ref={ref}
         className="flex-1 h-full overflow-y-auto p-2 space-y-2 bg-zinc-50/50 dark:bg-zinc-900/50 relative"
      >
         <LazyMotion features={domAnimation}>
            <AnimatePresence>
               {isOver && (
                  <m.div
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     transition={{ duration: 0.1 }}
                     className="fixed top-0 left-0 right-0 bottom-0 z-10 flex items-center justify-center pointer-events-none bg-background/90"
                     style={{
                        width: ref.current?.getBoundingClientRect().width || '100%',
                        height: ref.current?.getBoundingClientRect().height || '100%',
                        transform: `translate(${ref.current?.getBoundingClientRect().left || 0}px, ${ref.current?.getBoundingClientRect().top || 0}px)`,
                     }}
                  >
                     <div className="bg-background border border-border rounded-md p-3 shadow-md max-w-[90%]">
                        <p className="text-sm font-medium text-center">Board ordered by priority</p>
                     </div>
                  </m.div>
               )}
            </AnimatePresence>
         </LazyMotion>
         {sortedIssues.map((issue) => (
            <IssueGrid
               key={issue.id}
               issue={issue}
               isActive={selectedIssueIdentifier === issue.identifier}
               isBulkSelected={selectedIssueIds?.has(issue.id) ?? false}
               onSelect={onSelectIssue}
               onToggleSelection={onToggleIssueSelection}
            />
         ))}
      </div>
   );
};
