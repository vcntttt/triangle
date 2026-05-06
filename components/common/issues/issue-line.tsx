'use client';

import type { Issue } from '@/lib/models';
import { format } from 'date-fns';
import { GitBranchPlus } from 'lucide-react';
import { AssigneeUser } from './assignee-user';
import { LabelBadge } from './label-badge';
import { PrioritySelector } from './priority-selector';
import { ProjectBadge } from './project-badge';
import { StatusSelector } from './status-selector';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useViewStore } from '@/store/view-store';

import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu';
import { IssueContextMenu } from './issue-context-menu';
import { Clock3 } from 'lucide-react';
import { IssueChip, issueChipIconClassName } from './issue-chip';

const formatEstimatedHours = (estimatedHours?: number) => {
   if (estimatedHours === undefined) {
      return null;
   }

   const normalized = Number(estimatedHours.toFixed(2));
   return `${Number(normalized.toFixed(2)).toString()}h`;
};

export function IssueLine({
   issue,
   layoutId = false,
   isSelected = false,
   nestingLevel = 0,
   childrenCount = 0,
   completedChildrenCount = 0,
   onSelect,
}: {
   issue: Issue;
   layoutId?: boolean;
   isSelected?: boolean;
   nestingLevel?: number;
   childrenCount?: number;
   completedChildrenCount?: number;
   onSelect?: (issue: Issue) => void;
}) {
   const { visibleProperties } = useViewStore();

   return (
      <ContextMenu>
         <ContextMenuTrigger asChild>
            <motion.div
               {...(layoutId && { layoutId: `issue-line-${issue.identifier}` })}
               onClick={() => onSelect?.(issue)}
               onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                     event.preventDefault();
                     onSelect?.(issue);
                  }
               }}
               role="button"
               tabIndex={0}
               className={cn(
                  'w-full flex items-center justify-start min-h-10 px-6 py-1 hover:bg-sidebar/50 cursor-pointer',
                  isSelected && 'bg-accent/70 hover:bg-accent/70'
               )}
               style={{
                  paddingLeft: `${24 + nestingLevel * 22}px`,
               }}
            >
               <div
                  className="flex items-center gap-0.5"
                  onMouseDownCapture={(event) => event.stopPropagation()}
               >
                  <PrioritySelector priority={issue.priority} issueId={issue.id} />
                  <StatusSelector status={issue.status} issueId={issue.id} />
               </div>
               <div className="min-w-0 flex items-center justify-start mr-1 ml-0.5">
                  <div className="min-w-0">
                     <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium leading-5 truncate hover:underline">
                           {issue.title}
                        </span>
                        {childrenCount > 0 && (
                           <span className="inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] text-muted-foreground">
                              <GitBranchPlus className="size-3" />
                              {completedChildrenCount}/{childrenCount}
                           </span>
                        )}
                     </div>
                  </div>
               </div>
               <div className="flex items-center justify-end gap-2 ml-auto sm:w-fit">
                  <div className="w-3 shrink-0"></div>
                  {(visibleProperties.labels || visibleProperties.project) && (
                     <div className="hidden items-center justify-end gap-1 sm:flex">
                        {visibleProperties.labels && <LabelBadge label={issue.labels} />}
                        {visibleProperties.project && issue.project && (
                           <ProjectBadge project={issue.project} />
                        )}
                     </div>
                  )}
                  {issue.estimatedHours !== undefined && (
                     <IssueChip>
                        <Clock3 className={issueChipIconClassName} />
                        {formatEstimatedHours(issue.estimatedHours)}
                     </IssueChip>
                  )}
                  {visibleProperties.createdAt && (
                     <span className="text-xs leading-none text-muted-foreground shrink-0 hidden sm:inline-block">
                        {format(new Date(issue.createdAt), 'MMM dd')}
                     </span>
                  )}
                  {visibleProperties.assignee && (
                     <div onMouseDownCapture={(event) => event.stopPropagation()}>
                        <AssigneeUser user={issue.assignee} issueId={issue.id} />
                     </div>
                  )}
               </div>
            </motion.div>
         </ContextMenuTrigger>
         <IssueContextMenu issueId={issue.id} />
      </ContextMenu>
   );
}
