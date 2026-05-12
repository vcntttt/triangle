'use client';

import { useEffect, useState } from 'react';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { format } from 'date-fns';
import * as m from 'motion/react-m';
import { CheckCircle2, CircleAlert, CircleDashed, CircleHelp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu';
import type { Project, ProjectUpdate } from '@/lib/models';
import type { ProjectOptionLike } from '@/lib/projects-presentation';
import { cn } from '@/lib/utils';
import { usePinnedProjectsStore } from '@/store/pinned-projects-store';
import type { ProjectBoardGroupBy, ProjectDisplayProperty } from '@/store/projects-view-store';
import { ProjectContextMenu } from './project-context-menu';
import { CreateProjectUpdateDialog } from './create-project-update-dialog';
import { PrioritySelector } from './priority-selector';
import { StatusWithPercent } from './status-with-percent';
import { health as allHealth } from '@/lib/ui-catalog';

export const ProjectDragType = 'PROJECT';

interface ProjectBoardCardProps {
   project: Project;
   groupBy: ProjectBoardGroupBy;
   visibleProperties: Record<ProjectDisplayProperty, boolean>;
   statusOptions: ProjectOptionLike[];
   priorityOptions: ProjectOptionLike[];
   onOpenIssues: (project: Project) => void;
   onStatusChange: (projectId: string, statusId: string) => void;
   onPriorityChange: (projectId: string, priorityId: string) => void;
   onProjectUpdate: (projectId: string, update: ProjectUpdate) => void;
}

interface ProjectBoardCardPreviewProps {
   project: Project;
   groupBy: ProjectBoardGroupBy;
   visibleProperties: Record<ProjectDisplayProperty, boolean>;
}

function getHealthMeta(healthId: Project['health']['id']) {
   return allHealth.find((item) => item.id === healthId) ?? allHealth[0];
}

export function ProjectBoardCard({
   project,
   groupBy,
   visibleProperties,
   statusOptions,
   priorityOptions,
   onOpenIssues,
   onStatusChange,
   onPriorityChange,
   onProjectUpdate,
}: ProjectBoardCardProps) {
   const { pinnedProjectIds, togglePinnedProject } = usePinnedProjectsStore();
   const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
   const isPinned = pinnedProjectIds.includes(project.id);
   const isReadOnly = groupBy === 'health';
   const startDateLabel = format(new Date(project.startDate), 'MMM dd, yyyy');

   const [{ isDragging }, drag, preview] = useDrag(() => ({
      type: ProjectDragType,
      item: project,
      canDrag: !isReadOnly,
      collect: (monitor) => ({
         isDragging: monitor.isDragging(),
      }),
   }));

   useEffect(() => {
      preview(getEmptyImage(), { captureDraggingState: true });
   }, [preview]);

   return (
      <ContextMenu>
         <ContextMenuTrigger asChild>
            <m.div
               ref={drag}
               layoutId={`project-board-${project.id}`}
               className={cn(
                  'group rounded-md border border-border/60 bg-background p-3 shadow-xs transition-colors',
                  'hover:border-border hover:bg-accent/20',
                  isDragging && 'opacity-50',
                  isReadOnly && 'cursor-default',
                  !isReadOnly && 'cursor-grab active:cursor-grabbing'
               )}
            >
               <button
                  type="button"
                  onClick={() => onOpenIssues(project)}
                  className="w-full text-left cursor-pointer bg-transparent border-0 p-0"
               >
                  <h3 className="text-sm font-medium leading-5 line-clamp-2 group-hover:underline">
                     {project.name}
                  </h3>
                  {project.description ? (
                     <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {project.description}
                     </p>
                  ) : null}
               </button>

               <div className="mt-3 flex flex-wrap gap-2">
                  {groupBy !== 'status' ? (
                     <StatusWithPercent
                        status={project.status}
                        options={statusOptions}
                        onStatusChange={(statusId) => onStatusChange(project.id, statusId)}
                     />
                  ) : null}

                  {groupBy !== 'priority' ? (
                     <PrioritySelector
                        priority={project.priority}
                        options={priorityOptions}
                        onPriorityChange={(priorityId) => onPriorityChange(project.id, priorityId)}
                     />
                  ) : null}

                  {visibleProperties.health && (
                     <div className="inline-flex items-center gap-1.5 rounded-md border border-border/50 px-2 py-1 text-xs text-muted-foreground">
                        {(() => {
                           const health = getHealthMeta(project.health.id);
                           const Icon =
                              {
                                 'no-update': CircleHelp,
                                 'off-track': CircleAlert,
                                 'on-track': CheckCircle2,
                                 'at-risk': CircleDashed,
                              }[health.id] ?? CircleHelp;

                           return (
                              <>
                                 <Icon className="size-3.5" style={{ color: health.color }} />
                                 <span>{health.name}</span>
                              </>
                           );
                        })()}
                     </div>
                  )}

                  {visibleProperties.lead && (
                     <div className="inline-flex items-center gap-2 rounded-md border border-border/50 px-2 py-1">
                        <Avatar className="size-4">
                           <AvatarImage src={project.lead.avatarUrl} alt={project.lead.name} />
                           <AvatarFallback>{project.lead.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">{project.lead.name}</span>
                     </div>
                  )}

                  {visibleProperties.targetDate && (
                     <div className="inline-flex items-center gap-1.5 rounded-md border border-border/50 px-2 py-1 text-xs text-muted-foreground">
                        <span suppressHydrationWarning>{startDateLabel}</span>
                     </div>
                  )}
               </div>

               {isReadOnly && (
                  <p className="mt-3 text-[11px] text-muted-foreground">
                     Health is set by project updates, so this board is read only.
                  </p>
               )}
            </m.div>
         </ContextMenuTrigger>
         <ProjectContextMenu
            isPinned={isPinned}
            statusId={project.status.id}
            priorityId={project.priority.id}
            statusOptions={statusOptions}
            priorityOptions={priorityOptions}
            onOpenIssues={() => onOpenIssues(project)}
            onNewUpdate={() => setUpdateDialogOpen(true)}
            onTogglePin={() => togglePinnedProject(project.id)}
            onStatusChange={(statusId) => onStatusChange(project.id, statusId)}
            onPriorityChange={(priorityId) => onPriorityChange(project.id, priorityId)}
         />
         <CreateProjectUpdateDialog
            project={project}
            open={updateDialogOpen}
            onOpenChange={setUpdateDialogOpen}
            onProjectUpdate={onProjectUpdate}
         />
      </ContextMenu>
   );
}

export function ProjectBoardCardPreview({
   project,
   groupBy,
   visibleProperties,
}: ProjectBoardCardPreviewProps) {
   return (
      <div className="w-full rounded-md border border-border/70 bg-background p-3 shadow-lg">
         <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
               <h3 className="text-sm font-medium leading-5 line-clamp-2">{project.name}</h3>
               {project.description ? (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                     {project.description}
                  </p>
               ) : null}
            </div>
            <div className="size-7 rounded-md border border-border/50 bg-accent/30" />
         </div>

         <div className="mt-3 flex flex-wrap gap-2">
            {groupBy !== 'status' ? (
               <div className="inline-flex items-center gap-1.5 rounded-md border border-border/50 px-2 py-1 text-xs">
                  <span>Status</span>
                  <span className="text-muted-foreground">{project.status.name}</span>
               </div>
            ) : null}

            {groupBy !== 'priority' ? (
               <div className="inline-flex items-center gap-1.5 rounded-md border border-border/50 px-2 py-1 text-xs">
                  <span>Priority</span>
                  <span className="text-muted-foreground">{project.priority.name}</span>
               </div>
            ) : null}

            {visibleProperties.health && (
               <div className="inline-flex items-center gap-1.5 rounded-md border border-border/50 px-2 py-1 text-xs text-muted-foreground">
                  <span>Health</span>
                  <span>{project.health.name}</span>
               </div>
            )}
         </div>
      </div>
   );
}
