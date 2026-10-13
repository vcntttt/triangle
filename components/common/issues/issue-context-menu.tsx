import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
   ContextMenuContent,
   ContextMenuGroup,
   ContextMenuItem,
   ContextMenuSeparator,
   ContextMenuShortcut,
   ContextMenuSub,
   ContextMenuSubContent,
   ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import {
   BarChart3,
   CheckIcon,
   CircleCheck,
   Clipboard,
   Clock3,
   Folder,
   GitBranchPlus,
   Hash,
   Layers2,
   Link2Off,
   Tag,
   Trash2,
   User,
} from 'lucide-react';
import { useIssuesData } from '@/components/common/issues/issues-data-context';
import { useCreateIssueStore } from '@/store/create-issue-store';
import { useLabelOptions } from '@/hooks/use-label-options';
import { useProjectOptions } from '@/hooks/use-project-options';
import { useViewerUser } from '@/hooks/use-viewer-user';
import { archivedStatus } from '@/lib/ui-catalog';
import { toast } from 'sonner';
import { useIssuesStatuses } from './issues-status-context';
import { useIssuesPriorities } from './issues-priority-context';
import { ProjectIconGlyph } from '@/components/common/projects/project-icon';
import { projectAreasQuery } from '@/src/data/projects';
import { useQuery } from '@tanstack/react-query';

interface IssueContextMenuProps {
   issueId?: string;
}

export function IssueContextMenu({ issueId }: IssueContextMenuProps) {
   const labels = useLabelOptions();
   const projects = useProjectOptions();
   const issueStatusOptions = useIssuesStatuses();
   const issuePriorityOptions = useIssuesPriorities();
   const { openModal } = useCreateIssueStore();
   const currentUser = useViewerUser();
   const personalAssigneeOptions = [currentUser];

   const {
      updateIssueStatus,
      updateIssuePriority,
      updateIssueAssignee,
      addIssueLabel,
      removeIssueLabel,
      updateIssueProject,
      updateIssueArea,
      archiveIssue,
      deleteIssue,
      getIssueById,
      updateIssueParent,
      getAllIssues,
      getSubissues,
      updateIssueEstimatedHours,
   } = useIssuesData();
   const issue = issueId ? getIssueById(issueId) : undefined;
   const { data: areas = [] } = useQuery({
      ...projectAreasQuery(issue?.project?.id ?? ''),
      enabled: Boolean(issue?.project?.id),
   });

   const handleStatusChange = (statusId: string) => {
      if (!issueId) return;
      const newStatus = issueStatusOptions.find((s) => s.id === statusId);
      if (newStatus) {
         updateIssueStatus(issueId, newStatus);
         toast.success(`Status updated to ${newStatus.name}`);
      }
   };

   const handlePriorityChange = (priorityId: string) => {
      if (!issueId) return;
      const newPriority = issuePriorityOptions.find((p) => p.id === priorityId);
      if (newPriority) {
         updateIssuePriority(issueId, newPriority);
         toast.success(`Priority updated to ${newPriority.name}`);
      }
   };

   const handleAssigneeChange = (userId: string | null) => {
      if (!issueId) return;
      const newAssignee = userId
         ? personalAssigneeOptions.find((u) => u.id === userId) || null
         : null;
      updateIssueAssignee(issueId, newAssignee);
      toast.success(newAssignee ? `Assigned to ${newAssignee.name}` : 'Unassigned');
   };

   const handleLabelToggle = (labelId: string) => {
      if (!issueId) return;
      const issue = getIssueById(issueId);
      const label = labels.find((l) => l.id === labelId);

      if (!issue || !label) return;

      const hasLabel = issue.labels.some((l) => l.id === labelId);

      if (hasLabel) {
         removeIssueLabel(issueId, labelId);
         toast.success(`Removed label: ${label.name}`);
      } else {
         addIssueLabel(issueId, label);
         toast.success(`Added label: ${label.name}`);
      }
   };

   const handleProjectChange = (projectId: string | null) => {
      if (!issueId) return;
      const newProject = projectId ? projects.find((p) => p.id === projectId) : undefined;
      updateIssueProject(issueId, newProject);
      const issue = getIssueById(issueId);
      if (issue?.area?.projectId !== newProject?.id) {
         updateIssueArea(issueId, null);
      }
      toast.success(newProject ? `Project set to ${newProject.name}` : 'Project removed');
   };

   const handleAreaChange = (areaId: string | null) => {
      if (!issueId) return;
      const area = areaId ? areas.find((item) => item.id === areaId) : null;
      updateIssueArea(issueId, area?.id ?? null);
      toast.success(area ? `Area set to ${area.name}` : 'Area removed');
   };

   const handleSetEstimate = (hours: number | null) => {
      if (!issueId) return;
      updateIssueEstimatedHours(issueId, hours ?? undefined);
      toast.success(hours === null ? 'Estimate cleared' : `Estimate set to ${hours}h`);
   };

   const handleArchive = () => {
      if (!issueId) return;
      archiveIssue(issueId);
      toast.success('Issue archived');
   };

   const handleDelete = () => {
      if (!issueId) return;
      deleteIssue(issueId);
      toast.success('Issue deleted');
   };

   const copyToClipboard = (value: string, label: string) => {
      void navigator.clipboard.writeText(value).then(
         () => toast.success(`${label} copied`),
         () => toast.error(`Could not copy ${label.toLowerCase()}`)
      );
   };

   const handleAddSubissue = () => {
      if (!issueId) return;
      const issue = getIssueById(issueId);
      if (!issue) return;

      openModal(
         undefined,
         issue.project,
         {
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
         },
         issue.area ?? null
      );
   };

   const handleSetParent = (parentId: string | null) => {
      if (!issueId) return;

      if (parentId === null) {
         updateIssueParent(issueId, null);
         toast.success('Removed from parent');
         return;
      }

      const selected = getAllIssues().find((issue) => issue.id === parentId);
      if (!selected) return;

      updateIssueParent(issueId, {
         id: selected.id,
         identifier: selected.identifier,
         title: selected.title,
      });
      toast.success(`Parent set to ${selected.identifier}`);
   };

   const parentOptions = (() => {
      if (!issueId) return [];
      const issue = getIssueById(issueId);
      if (!issue) return [];

      const currentChildren = getSubissues(issueId);
      return getAllIssues().filter(
         (candidate) =>
            candidate.id !== issueId &&
            !candidate.parentIssueId &&
            !currentChildren.some((child) => child.id === candidate.id) &&
            (issue.project ? candidate.project?.id === issue.project.id : !candidate.project)
      );
   })();

   return (
      <ContextMenuContent className="w-56">
         <ContextMenuGroup>
            <ContextMenuSub>
               <ContextMenuSubTrigger>
                  <CircleCheck /> Status
                  <ContextMenuShortcut>S</ContextMenuShortcut>
               </ContextMenuSubTrigger>
               <ContextMenuSubContent className="w-48">
                  {issueStatusOptions.map((s) => {
                     const Icon = s.icon;
                     return (
                        <ContextMenuItem key={s.id} onClick={() => handleStatusChange(s.id)}>
                           <Icon /> {s.name}
                           {issue?.status.id === s.id && <CheckIcon className="ml-auto" />}
                        </ContextMenuItem>
                     );
                  })}
               </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuSub>
               <ContextMenuSubTrigger>
                  <BarChart3 /> Priority
                  <ContextMenuShortcut>P</ContextMenuShortcut>
               </ContextMenuSubTrigger>
               <ContextMenuSubContent className="w-48">
                  {issuePriorityOptions.map((priority) => (
                     <ContextMenuItem
                        key={priority.id}
                        onClick={() => handlePriorityChange(priority.id)}
                     >
                        <priority.icon /> {priority.name}
                        {issue?.priority.id === priority.id && <CheckIcon className="ml-auto" />}
                     </ContextMenuItem>
                  ))}
               </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuSub>
               <ContextMenuSubTrigger>
                  <User /> Assignee
               </ContextMenuSubTrigger>
               <ContextMenuSubContent className="w-48">
                  <ContextMenuItem onClick={() => handleAssigneeChange(null)}>
                     <User /> Unassigned
                     {issue && !issue.assignee && <CheckIcon className="ml-auto" />}
                  </ContextMenuItem>
                  {personalAssigneeOptions.map((user) => (
                     <ContextMenuItem key={user.id} onClick={() => handleAssigneeChange(user.id)}>
                        <Avatar className="size-4">
                           <AvatarImage src={user.avatarUrl} alt={user.name} />
                           <AvatarFallback>{user.name[0]}</AvatarFallback>
                        </Avatar>
                        {user.name}
                        {issue?.assignee?.id === user.id && <CheckIcon className="ml-auto" />}
                     </ContextMenuItem>
                  ))}
               </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuSub>
               <ContextMenuSubTrigger>
                  <Tag /> Labels
                  <ContextMenuShortcut>L</ContextMenuShortcut>
               </ContextMenuSubTrigger>
               <ContextMenuSubContent className="w-48">
                  {labels.map((label) => (
                     <ContextMenuItem key={label.id} onClick={() => handleLabelToggle(label.id)}>
                        <span
                           className="inline-block size-2 rounded-full"
                           style={{ backgroundColor: label.color }}
                           aria-hidden="true"
                        />
                        {label.name}
                        {issue?.labels.some((item) => item.id === label.id) && (
                           <CheckIcon className="ml-auto" />
                        )}
                     </ContextMenuItem>
                  ))}
               </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuSub>
               <ContextMenuSubTrigger>
                  <Folder /> Project
                  <ContextMenuShortcut>⇧P</ContextMenuShortcut>
               </ContextMenuSubTrigger>
               <ContextMenuSubContent className="max-h-80 w-64 overflow-y-auto">
                  <ContextMenuItem onClick={() => handleProjectChange(null)}>
                     <Folder /> No project
                     {issue && !issue.project && <CheckIcon className="ml-auto" />}
                  </ContextMenuItem>
                  {projects.map((project) => (
                     <ContextMenuItem
                        key={project.id}
                        onClick={() => handleProjectChange(project.id)}
                     >
                        <ProjectIconGlyph icon={project.iconConfig} className="size-4" />
                        <span className="truncate">{project.name}</span>
                        {issue?.project?.id === project.id && <CheckIcon className="ml-auto" />}
                     </ContextMenuItem>
                  ))}
               </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuSub>
               <ContextMenuSubTrigger disabled={!issue?.project}>
                  <Layers2 /> Area
               </ContextMenuSubTrigger>
               <ContextMenuSubContent className="w-56">
                  <ContextMenuItem onClick={() => handleAreaChange(null)}>
                     <Layers2 /> No area
                     {!issue?.area && <CheckIcon className="ml-auto" />}
                  </ContextMenuItem>
                  {areas.map((area) => (
                     <ContextMenuItem key={area.id} onClick={() => handleAreaChange(area.id)}>
                        <span
                           className="size-2 rounded-full"
                           style={{ backgroundColor: area.color }}
                           aria-hidden="true"
                        />
                        {area.name}
                        {issue?.area?.id === area.id && <CheckIcon className="ml-auto" />}
                     </ContextMenuItem>
                  ))}
               </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuSub>
               <ContextMenuSubTrigger>
                  <Clock3 /> Estimate
               </ContextMenuSubTrigger>
               <ContextMenuSubContent className="w-40">
                  {[1, 2, 4, 8].map((hours) => (
                     <ContextMenuItem key={hours} onClick={() => handleSetEstimate(hours)}>
                        {hours}h
                        {issue?.estimatedHours === hours && <CheckIcon className="ml-auto" />}
                     </ContextMenuItem>
                  ))}
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => handleSetEstimate(null)}>Clear</ContextMenuItem>
               </ContextMenuSubContent>
            </ContextMenuSub>
         </ContextMenuGroup>

         <ContextMenuSeparator />

         <ContextMenuItem onClick={handleAddSubissue}>
            <GitBranchPlus /> Add sub-issue
         </ContextMenuItem>

         <ContextMenuSub>
            <ContextMenuSubTrigger>
               <GitBranchPlus /> Set parent
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-64 max-h-80 overflow-y-auto">
               <ContextMenuItem onClick={() => handleSetParent(null)}>
                  <Link2Off /> No parent
                  {issue && !issue.parent && <CheckIcon className="ml-auto" />}
               </ContextMenuItem>
               {parentOptions.map((option) => (
                  <ContextMenuItem key={option.id} onClick={() => handleSetParent(option.id)}>
                     <span
                        className="inline-block size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: option.status.color }}
                     />
                     <span className="min-w-0 truncate">
                        <span className="text-muted-foreground">{option.identifier}</span>{' '}
                        {option.title}
                     </span>
                     {issue?.parent?.id === option.id && <CheckIcon className="ml-auto shrink-0" />}
                  </ContextMenuItem>
               ))}
            </ContextMenuSubContent>
         </ContextMenuSub>

         <ContextMenuSeparator />

         {issue && (
            <>
               <ContextMenuItem onClick={() => copyToClipboard(issue.identifier, 'ID')}>
                  <Hash /> Copy ID
               </ContextMenuItem>
               <ContextMenuItem onClick={() => copyToClipboard(issue.title, 'Title')}>
                  <Clipboard /> Copy title
               </ContextMenuItem>
               <ContextMenuSeparator />
            </>
         )}

         <ContextMenuItem onClick={handleArchive}>
            <archivedStatus.icon /> Archive
         </ContextMenuItem>

         <ContextMenuItem onClick={handleDelete} variant="destructive">
            <Trash2 /> Delete
         </ContextMenuItem>
      </ContextMenuContent>
   );
}
