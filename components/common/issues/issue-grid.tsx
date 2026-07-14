'use client';

import type { Issue } from '@/lib/models';
import { format } from 'date-fns';
import { LazyMotion, domAnimation } from 'motion/react';
import * as m from 'motion/react-m';
import { memo, useEffect, useRef } from 'react';
import { DragSourceMonitor, useDrag, useDragLayer, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { AssigneeUser } from './assignee-user';
import { LabelBadge } from './label-badge';
import { PrioritySelector } from './priority-selector';
import { ProjectBadge } from './project-badge';
import { ProjectAreaBadge } from '@/components/common/projects/project-area-badge';
import { StatusSelector } from './status-selector';
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu';
import { IssueContextMenu } from './issue-context-menu';
import { cn } from '@/lib/utils';
import { useViewStore } from '@/store/view-store';

export const IssueDragType = 'ISSUE';
type IssueGridProps = {
   issue: Issue;
   isActive?: boolean;
   isBulkSelected?: boolean;
   onSelect?: (issue: Issue) => void;
   onToggleSelection?: (issue: Issue) => void;
};

// Custom DragLayer component to render the drag preview
function IssueDragPreview({ issue }: { issue: Issue }) {
   const createdAtLabel = format(new Date(issue.createdAt), 'MMM dd');

   return (
      <div className="w-full p-3 bg-background rounded-md border border-border/50 overflow-hidden">
         <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
               <PrioritySelector priority={issue.priority} issueId={issue.id} />
            </div>
            <StatusSelector status={issue.status} issueId={issue.id} />
         </div>

         <div className="block mb-3">
            <div className="mb-1 text-xs font-medium text-muted-foreground">{issue.identifier}</div>
            <h3 className="text-sm font-semibold line-clamp-2 hover:underline">{issue.title}</h3>
         </div>

         <div className="flex flex-wrap gap-1.5 mb-3 min-h-[1.5rem]">
            <LabelBadge label={issue.labels} />
            {issue.project && <ProjectBadge project={issue.project} />}
            {issue.area && <ProjectAreaBadge area={issue.area} />}
         </div>

         <div className="flex items-center justify-between mt-auto pt-2">
            <span className="text-xs text-muted-foreground" suppressHydrationWarning>
               {createdAtLabel}
            </span>
            <AssigneeUser user={issue.assignee} issueId={issue.id} />
         </div>
      </div>
   );
}

// Custom DragLayer to show custom preview during drag
export function CustomDragLayer() {
   const { itemType, isDragging, item, currentOffset } = useDragLayer((monitor) => ({
      item: monitor.getItem() as Issue,
      itemType: monitor.getItemType(),
      currentOffset: monitor.getSourceClientOffset(),
      isDragging: monitor.isDragging(),
   }));

   if (!isDragging || itemType !== IssueDragType || !currentOffset) {
      return null;
   }

   return (
      <div
         className="fixed pointer-events-none z-50 left-0 top-0"
         style={{
            transform: `translate(${currentOffset.x}px, ${currentOffset.y}px)`,
            width: '348px', // Match the width of your cards
         }}
      >
         <IssueDragPreview issue={item} />
      </div>
   );
}

export const IssueGrid = memo(function IssueGrid({
   issue,
   isActive = false,
   isBulkSelected = false,
   onSelect,
   onToggleSelection,
}: IssueGridProps) {
   const ref = useRef<HTMLDivElement>(null);
   const { visibleProperties } = useViewStore();
   const createdAtLabel = format(new Date(issue.createdAt), 'MMM dd');

   // Set up drag functionality.
   const [{ isDragging }, drag, preview] = useDrag(() => ({
      type: IssueDragType,
      item: issue,
      collect: (monitor: DragSourceMonitor) => ({
         isDragging: monitor.isDragging(),
      }),
   }));

   // Use empty image as drag preview (we'll create a custom one with DragLayer)
   useEffect(() => {
      preview(getEmptyImage(), { captureDraggingState: true });
   }, [preview]);

   // Set up drop functionality.
   const [, drop] = useDrop(() => ({
      accept: IssueDragType,
   }));

   // Connect drag and drop to the element.
   drag(drop(ref));

   return (
      <LazyMotion features={domAnimation}>
         <ContextMenu>
            <ContextMenuTrigger asChild>
               <m.div
                  ref={ref}
                  onClick={(event) => {
                     if (event.shiftKey) {
                        event.preventDefault();
                        onToggleSelection?.(issue);
                        return;
                     }

                     onSelect?.(issue);
                  }}
                  onKeyDown={(event) => {
                     if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelect?.(issue);
                     }
                  }}
                  role="button"
                  tabIndex={0}
                  className={cn(
                     'w-full p-3 bg-background rounded-md shadow-xs border border-border/50 cursor-pointer',
                     isBulkSelected && 'border-primary/50 bg-primary/5',
                     isActive && 'border-primary/60 bg-accent/30',
                     isActive && isBulkSelected && 'border-primary bg-accent/40'
                  )}
                  layoutId={`issue-grid-${issue.identifier}`}
                  style={{
                     opacity: isDragging ? 0.5 : 1,
                     cursor: isDragging ? 'grabbing' : 'default',
                  }}
               >
                  <div className="flex items-center justify-between mb-2">
                     <div
                        className="flex items-center gap-1.5"
                        onMouseDownCapture={(event) => event.stopPropagation()}
                     >
                        <PrioritySelector priority={issue.priority} issueId={issue.id} />
                     </div>
                     <div onMouseDownCapture={(event) => event.stopPropagation()}>
                        <StatusSelector status={issue.status} issueId={issue.id} />
                     </div>
                  </div>
                  <div className="mb-3 space-y-1">
                     {visibleProperties.identifier && (
                        <div className="text-xs font-medium text-muted-foreground">
                           {issue.identifier}
                        </div>
                     )}
                     <h3 className="text-sm font-semibold line-clamp-2">{issue.title}</h3>
                  </div>
                  {(visibleProperties.labels ||
                     visibleProperties.project ||
                     visibleProperties.area) && (
                     <div className="flex flex-wrap gap-1.5 mb-3 min-h-[1.5rem]">
                        {visibleProperties.labels && <LabelBadge label={issue.labels} />}
                        {visibleProperties.project && issue.project && (
                           <ProjectBadge project={issue.project} />
                        )}
                        {visibleProperties.area && issue.area && (
                           <ProjectAreaBadge area={issue.area} />
                        )}
                     </div>
                  )}
                  <div className="flex items-center justify-between mt-auto pt-2">
                     {visibleProperties.createdAt ? (
                        <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                           {createdAtLabel}
                        </span>
                     ) : (
                        <span />
                     )}
                     {visibleProperties.assignee && (
                        <div onMouseDownCapture={(event) => event.stopPropagation()}>
                           <AssigneeUser user={issue.assignee} issueId={issue.id} />
                        </div>
                     )}
                  </div>
               </m.div>
            </ContextMenuTrigger>
            <IssueContextMenu issueId={issue.id} />
         </ContextMenu>
      </LazyMotion>
   );
});
