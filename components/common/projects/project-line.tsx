import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { Project, ProjectUpdate } from '@/lib/models';
import type { ProjectOptionLike } from '@/lib/projects-presentation';
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu';
import { usePinnedProjectsStore } from '@/store/pinned-projects-store';
import type { ProjectDisplayProperty } from '@/store/projects-view-store';
import { HealthPopover } from './health-popover';
import { LeadSelector } from './lead-selector';
import { ProjectContextMenu } from './project-context-menu';
import { PrioritySelector } from './priority-selector';
import { StatusWithPercent } from './status-with-percent';
import { DatePicker } from './date-picker';
import { CreateProjectUpdateDialog } from './create-project-update-dialog';
import { DeleteProjectDialog } from './delete-project-dialog';
import { ProjectIcon } from './project-icon';
import { useProjectFieldUpdates } from './use-project-field-updates';

interface ProjectLineProps {
   project: Project;
   visibleProperties: Record<ProjectDisplayProperty, boolean>;
   statusOptions: ProjectOptionLike[];
   priorityOptions: ProjectOptionLike[];
   onProjectUpdate?: (projectId: string, update: ProjectUpdate) => void;
}

export default function ProjectLine(props: ProjectLineProps) {
   const { project } = props;
   const fieldStateKey = [
      project.id,
      project.status.id,
      project.status.name,
      project.priority.id,
      project.priority.name,
   ].join(':');

   return <ProjectLineContent key={fieldStateKey} {...props} />;
}

function ProjectLineContent({
   project,
   visibleProperties,
   statusOptions,
   priorityOptions,
   onProjectUpdate,
}: ProjectLineProps) {
   const navigate = useNavigate();
   const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
   const { pinnedProjectIds, togglePinnedProject } = usePinnedProjectsStore();
   const { currentStatus, currentPriority, handleStatusChange, handlePriorityChange } =
      useProjectFieldUpdates(project, statusOptions, priorityOptions);
   const startDate = project.startDate ? new Date(project.startDate) : undefined;

   const handleOpenIssues = () => {
      void navigate({
         to: '/projects/$projectSlug',
         params: { projectSlug: project.slug ?? project.id },
      });
   };

   const isPinned = pinnedProjectIds.includes(project.id);

   return (
      <ContextMenu>
         <ContextMenuTrigger asChild>
            <div className="w-full flex items-center py-3 px-6 border-b hover:bg-sidebar/50 border-muted-foreground/5 text-sm">
               <div className="flex-1 min-w-0 flex items-center gap-2">
                  <div className="relative">
                     <ProjectIcon project={project} />
                  </div>
                  <button
                     type="button"
                     className="flex flex-col items-start overflow-hidden text-left"
                     onClick={handleOpenIssues}
                  >
                     <span className="font-medium truncate w-full hover:underline">
                        {project.name}
                     </span>
                  </button>
               </div>

               {visibleProperties.health && (
                  <div className="w-[20%] sm:w-[10%] xl:w-[13%] shrink-0">
                     <HealthPopover
                        project={{ ...project, status: currentStatus, priority: currentPriority }}
                        onProjectUpdate={onProjectUpdate}
                     />
                  </div>
               )}

               {visibleProperties.priority && (
                  <div className="hidden w-[10%] sm:block shrink-0">
                     <PrioritySelector
                        priority={currentPriority}
                        options={priorityOptions}
                        onPriorityChange={(priorityId) => {
                           void handlePriorityChange(priorityId);
                        }}
                     />
                  </div>
               )}

               {visibleProperties.lead && (
                  <div className="hidden xl:block xl:w-[13%] shrink-0">
                     <LeadSelector lead={project.lead} />
                  </div>
               )}

               {visibleProperties.targetDate && (
                  <div className="hidden xl:block xl:w-[13%] shrink-0">
                     <DatePicker date={startDate} />
                  </div>
               )}

               {visibleProperties.status && (
                  <div className="w-[20%] sm:w-[10%] shrink-0">
                     <StatusWithPercent
                        status={currentStatus}
                        options={statusOptions}
                        onStatusChange={(statusId) => {
                           void handleStatusChange(statusId);
                        }}
                     />
                  </div>
               )}
            </div>
         </ContextMenuTrigger>
         <ProjectContextMenu
            isPinned={isPinned}
            statusId={currentStatus.id}
            priorityId={currentPriority.id}
            statusOptions={statusOptions}
            priorityOptions={priorityOptions}
            onOpenIssues={handleOpenIssues}
            onNewUpdate={() => setUpdateDialogOpen(true)}
            onTogglePin={() => togglePinnedProject(project.id)}
            onDelete={() => setDeleteDialogOpen(true)}
            onStatusChange={(statusId) => {
               void handleStatusChange(statusId);
            }}
            onPriorityChange={(priorityId) => {
               void handlePriorityChange(priorityId);
            }}
         />
         <CreateProjectUpdateDialog
            project={project}
            open={updateDialogOpen}
            onOpenChange={setUpdateDialogOpen}
            onProjectUpdate={onProjectUpdate}
         />
         <DeleteProjectDialog
            project={project}
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
         />
      </ContextMenu>
   );
}
