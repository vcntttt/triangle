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
import { AttentionSelector } from './attention-selector';
import { DatePicker } from './date-picker';
import { CreateProjectUpdateDialog } from './create-project-update-dialog';
import { DeleteProjectDialog } from './delete-project-dialog';
import { ProjectIcon } from './project-icon';
import { useProjectFieldUpdates } from './use-project-field-updates';
import { ProjectExternalLink, ProjectSourceBadge } from './project-source';

interface ProjectLineProps {
   project: Project;
   visibleProperties: Record<ProjectDisplayProperty, boolean>;
   statusOptions: ProjectOptionLike[];
   priorityOptions: ProjectOptionLike[];
   attentionOptions: ProjectOptionLike[];
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
      project.attention.id,
      project.attention.name,
   ].join(':');

   return <ProjectLineContent key={fieldStateKey} {...props} />;
}

function ProjectLineContent({
   project,
   visibleProperties,
   statusOptions,
   priorityOptions,
   attentionOptions,
   onProjectUpdate,
}: ProjectLineProps) {
   const navigate = useNavigate();
   const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
   const { togglePinnedProject, isPinned } = usePinnedProjectsStore();
   const {
      currentStatus,
      currentPriority,
      currentAttention,
      handleStatusChange,
      handlePriorityChange,
      handleAttentionChange,
   } = useProjectFieldUpdates(project, statusOptions, priorityOptions, attentionOptions);
   const startDate = project.startDate ? new Date(project.startDate) : undefined;

   const handleOpenIssues = () => {
      void navigate({
         to: '/projects/$projectSlug',
         params: { projectSlug: project.slug ?? project.id },
      });
   };

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
                     {project.subtitle ? (
                        <span className="w-full truncate text-xs text-muted-foreground">
                           {project.subtitle}
                        </span>
                     ) : null}
                  </button>
                  {project.source === 'external' ? (
                     <span className="flex items-center gap-2">
                        <ProjectSourceBadge source={project.source} className="px-1.5 py-0" />
                        <ProjectExternalLink url={project.externalUrl} />
                     </span>
                  ) : null}
               </div>

               {visibleProperties.health && (
                  <div className="w-[20%] sm:w-[10%] xl:w-[13%] shrink-0">
                     <HealthPopover
                        project={{
                           ...project,
                           status: currentStatus,
                           priority: currentPriority,
                           attention: currentAttention,
                        }}
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

               {visibleProperties.attention && (
                  <div className="hidden xl:block xl:w-[13%] shrink-0">
                     <AttentionSelector
                        attention={currentAttention}
                        options={attentionOptions}
                        onAttentionChange={(attentionId) => {
                           void handleAttentionChange(attentionId);
                        }}
                     />
                  </div>
               )}
            </div>
         </ContextMenuTrigger>
         <ProjectContextMenu
            isPinned={isPinned(project.id)}
            statusId={currentStatus.id}
            priorityId={currentPriority.id}
            attentionId={currentAttention.id}
            statusOptions={statusOptions}
            priorityOptions={priorityOptions}
            attentionOptions={attentionOptions}
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
            onAttentionChange={(attentionId) => {
               void handleAttentionChange(attentionId);
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
