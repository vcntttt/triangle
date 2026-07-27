'use client';

import { useRef } from 'react';
import { useDrop } from 'react-dnd';
import type { Project, ProjectUpdate } from '@/lib/models';
import type { ProjectOptionLike } from '@/lib/projects-presentation';
import { cn } from '@/lib/utils';
import type { ProjectBoardGroupBy, ProjectDisplayProperty } from '@/store/projects-view-store';
import { ProjectBoardCard, ProjectDragType } from './project-board-card';
import type { ComponentType } from 'react';

interface ProjectBoardGroup {
   id: string;
   name: string;
   color: string;
   icon: ComponentType<{ className?: string; size?: string | number }>;
}

interface ProjectBoardColumnProps {
   group: ProjectBoardGroup;
   projects: Project[];
   groupBy: ProjectBoardGroupBy;
   visibleProperties: Record<ProjectDisplayProperty, boolean>;
   statusOptions: ProjectOptionLike[];
   priorityOptions: ProjectOptionLike[];
   attentionOptions: ProjectOptionLike[];
   isReadOnly: boolean;
   onOpenIssues: (project: Project) => void;
   onStatusChange: (projectId: string, statusId: string) => void;
   onPriorityChange: (projectId: string, priorityId: string) => void;
   onAttentionChange: (projectId: string, attentionId: string) => void;
   onProjectUpdate: (projectId: string, update: ProjectUpdate) => void;
   onMoveProject: (projectId: string, targetGroupId: string) => void;
}

export function ProjectBoardColumn({
   group,
   projects,
   groupBy,
   visibleProperties,
   statusOptions,
   priorityOptions,
   attentionOptions,
   isReadOnly,
   onOpenIssues,
   onStatusChange,
   onPriorityChange,
   onAttentionChange,
   onProjectUpdate,
   onMoveProject,
}: ProjectBoardColumnProps) {
   const ref = useRef<HTMLDivElement>(null);

   const [{ isOver }, drop] = useDrop(
      () => ({
         accept: ProjectDragType,
         canDrop: () => !isReadOnly,
         drop(item: Project) {
            if (!isReadOnly) {
               onMoveProject(item.id, group.id);
            }
         },
         collect: (monitor) => ({
            isOver: !!monitor.isOver({ shallow: true }),
         }),
      }),
      [group.id, isReadOnly, onMoveProject]
   );

   drop(ref);

   return (
      <div
         ref={ref}
         className={cn(
            'flex h-full w-[344px] flex-shrink-0 flex-col overflow-hidden rounded-md border border-border/60 bg-container',
            isOver && !isReadOnly && 'border-primary/60 ring-1 ring-primary/20'
         )}
      >
         <div
            className="flex items-center justify-between border-b px-3 py-2.5"
            style={{ backgroundColor: `${group.color}12` }}
         >
            <div className="flex min-w-0 items-center gap-2">
               <group.icon className="size-4 shrink-0" style={{ color: group.color }} />
               <span className="truncate text-sm font-medium">{group.name}</span>
               <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                  {projects.length}
               </span>
            </div>

            {isReadOnly ? (
               <span className="text-[11px] text-muted-foreground">Read only</span>
            ) : null}
         </div>

         <div className="flex-1 overflow-y-auto p-2">
            {projects.length === 0 ? (
               <div className="flex h-full min-h-28 items-center justify-center rounded-md border border-dashed border-border/60 bg-background/40 px-4 text-center text-xs text-muted-foreground">
                  {isReadOnly ? 'No projects in this group.' : 'Drop a project here.'}
               </div>
            ) : (
               <div className="space-y-2">
                  {projects.map((project) => (
                     <ProjectBoardCard
                        key={project.id}
                        project={project}
                        groupBy={groupBy}
                        visibleProperties={visibleProperties}
                        statusOptions={statusOptions}
                        priorityOptions={priorityOptions}
                        attentionOptions={attentionOptions}
                        onOpenIssues={onOpenIssues}
                        onStatusChange={onStatusChange}
                        onPriorityChange={onPriorityChange}
                        onAttentionChange={onAttentionChange}
                        onProjectUpdate={onProjectUpdate}
                     />
                  ))}
               </div>
            )}
         </div>
      </div>
   );
}
