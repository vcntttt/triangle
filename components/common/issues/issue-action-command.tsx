'use client';

import { CheckIcon, FolderIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
   Command,
   CommandEmpty,
   CommandGroup,
   CommandInput,
   CommandItem,
   CommandList,
} from '@/components/ui/command';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import { useLabelOptions } from '@/hooks/use-label-options';
import { useProjectOptions } from '@/hooks/use-project-options';
import type { Issue } from '@/lib/models';
import { useIssuesData } from '@/components/common/issues/issues-data-context';
import { ProjectIconGlyph } from '@/components/common/projects/project-icon';
import { useIssuesStatuses } from './issues-status-context';
import { useIssuesPriorities } from './issues-priority-context';

export type IssueActionKind = 'status' | 'label' | 'priority' | 'project';

interface IssueActionCommandProps {
   open: boolean;
   action: IssueActionKind | null;
   targetIssues: Issue[];
   onOpenChange: (open: boolean) => void;
}

const actionCopy: Record<
   IssueActionKind,
   { title: string; description: string; placeholder: string }
> = {
   status: {
      title: 'Set status',
      description: 'Choose a status for the targeted issue selection.',
      placeholder: 'Set status...',
   },
   label: {
      title: 'Set labels',
      description: 'Toggle a label across the targeted issue selection.',
      placeholder: 'Set labels...',
   },
   priority: {
      title: 'Set priority',
      description: 'Choose a priority for the targeted issue selection.',
      placeholder: 'Set priority...',
   },
   project: {
      title: 'Set project',
      description: 'Choose a project for the targeted issue selection.',
      placeholder: 'Set project...',
   },
};

function showUpdatedToast(targetIssues: Issue[], singleMessage: string) {
   if (targetIssues.length === 1) {
      toast.success(singleMessage);
      return;
   }

   toast.success(`Updated ${targetIssues.length} issues`);
}

export function IssueActionCommand({
   open,
   action,
   targetIssues,
   onOpenChange,
}: IssueActionCommandProps) {
   const statuses = useIssuesStatuses();
   const labels = useLabelOptions();
   const projects = useProjectOptions();
   const {
      addIssueLabel,
      removeIssueLabel,
      updateIssuePriority,
      updateIssueProject,
      updateIssueStatus,
   } = useIssuesData();

   const copy = action ? actionCopy[action] : actionCopy.status;
   const hasTargets = targetIssues.length > 0;

   const close = () => onOpenChange(false);

   const handleStatusSelect = (statusId: string) => {
      const nextStatus = statuses.find((status) => status.id === statusId);
      if (!nextStatus || !hasTargets) {
         close();
         return;
      }

      targetIssues.forEach((issue) => updateIssueStatus(issue.id, nextStatus));
      close();
      showUpdatedToast(targetIssues, `Status updated to ${nextStatus.name}`);
   };

   const handleLabelSelect = (labelId: string) => {
      const nextLabel = labels.find((label) => label.id === labelId);
      if (!nextLabel || !hasTargets) {
         close();
         return;
      }

      targetIssues.forEach((issue) => {
         const hasLabel = issue.labels.some((label) => label.id === nextLabel.id);

         if (hasLabel) {
            removeIssueLabel(issue.id, nextLabel.id);
            return;
         }

         addIssueLabel(issue.id, nextLabel);
      });

      close();
      showUpdatedToast(targetIssues, `Label updated: ${nextLabel.name}`);
   };

   const handleProjectSelect = (projectId: string) => {
      if (!hasTargets) {
         close();
         return;
      }

      if (projectId === 'no-project') {
         targetIssues.forEach((issue) => updateIssueProject(issue.id, undefined));
         close();
         showUpdatedToast(targetIssues, 'Project removed');
         return;
      }

      const nextProject = projects.find((project) => project.id === projectId);
      if (!nextProject) {
         close();
         return;
      }

      targetIssues.forEach((issue) => updateIssueProject(issue.id, nextProject));
      close();
      showUpdatedToast(targetIssues, `Project set to ${nextProject.name}`);
   };

   const priorities = useIssuesPriorities();

   const handlePrioritySelect = (priorityId: string) => {
      const nextPriority = priorities.find((priority) => priority.id === priorityId);
      if (!nextPriority || !hasTargets) {
         close();
         return;
      }

      targetIssues.forEach((issue) => updateIssuePriority(issue.id, nextPriority));
      close();
      showUpdatedToast(targetIssues, `Priority updated to ${nextPriority.name}`);
   };

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="overflow-hidden p-0 sm:max-w-md">
            <DialogHeader className="sr-only">
               <DialogTitle>{copy.title}</DialogTitle>
               <DialogDescription>{copy.description}</DialogDescription>
            </DialogHeader>
            <Command>
               <CommandInput placeholder={copy.placeholder} />
               <CommandList>
                  {!hasTargets && <CommandEmpty>No issue selected.</CommandEmpty>}
                  {action === 'status' && (
                     <CommandGroup heading="Status">
                        {statuses.map((status) => (
                           <CommandItem
                              key={status.id}
                              value={`${status.name} ${status.id}`}
                              onSelect={() => handleStatusSelect(status.id)}
                           >
                              <status.icon />
                              {status.name}
                           </CommandItem>
                        ))}
                     </CommandGroup>
                  )}
                  {action === 'label' && (
                     <CommandGroup heading="Labels">
                        {labels.map((label) => (
                           <CommandItem
                              key={label.id}
                              value={`${label.name} ${label.id}`}
                              onSelect={() => handleLabelSelect(label.id)}
                           >
                              <span
                                 className="inline-block size-3 rounded-full"
                                 style={{ backgroundColor: label.color }}
                                 aria-hidden="true"
                              />
                              {label.name}
                           </CommandItem>
                        ))}
                     </CommandGroup>
                  )}
                  {action === 'priority' && (
                     <CommandGroup heading="Priority">
                        {priorities.map((priority) => (
                           <CommandItem
                              key={priority.id}
                              value={`${priority.name} ${priority.id}`}
                              onSelect={() => handlePrioritySelect(priority.id)}
                           >
                              <priority.icon />
                              {priority.name}
                              {targetIssues.length > 0 &&
                                 targetIssues.every(
                                    (issue) => issue.priority.id === priority.id
                                 ) && <CheckIcon className="ml-auto size-4" />}
                           </CommandItem>
                        ))}
                     </CommandGroup>
                  )}
                  {action === 'project' && (
                     <CommandGroup heading="Project">
                        <CommandItem
                           value="no project no-project none"
                           onSelect={() => handleProjectSelect('no-project')}
                        >
                           <FolderIcon className="size-4" />
                           No Project
                           {targetIssues.every((issue) => !issue.project) && (
                              <CheckIcon className="ml-auto size-4" />
                           )}
                        </CommandItem>
                        {projects.map((project) => (
                           <CommandItem
                              key={project.id}
                              value={`${project.name} ${project.id}`}
                              onSelect={() => handleProjectSelect(project.id)}
                           >
                              <ProjectIconGlyph icon={project.iconConfig} className="size-4" />
                              {project.name}
                              {targetIssues.length > 0 &&
                                 targetIssues.every(
                                    (issue) => issue.project?.id === project.id
                                 ) && <CheckIcon className="ml-auto size-4" />}
                           </CommandItem>
                        ))}
                     </CommandGroup>
                  )}
               </CommandList>
            </Command>
         </DialogContent>
      </Dialog>
   );
}
