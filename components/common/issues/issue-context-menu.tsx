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
   CircleCheck,
   User,
   BarChart3,
   Tag,
   Folder,
   CalendarClock,
   Pencil,
   Link as LinkIcon,
   Repeat2,
   Copy as CopyIcon,
   PlusSquare,
   Flag,
   ArrowRightLeft,
   Bell,
   Star,
   AlarmClock,
   Trash2,
   CheckCircle2,
   Clock,
   FileText,
   MessageSquare,
   Clipboard,
   Clock3,
   GitBranchPlus,
   Link2Off,
   CheckIcon,
   Layers2,
} from 'lucide-react';
import React, { useState } from 'react';
import { useIssuesData } from '@/components/common/issues/issues-data-context';
import { useCreateIssueStore } from '@/store/create-issue-store';
import { useLabelOptions } from '@/hooks/use-label-options';
import { useProjectOptions } from '@/hooks/use-project-options';
import { useViewerUser } from '@/hooks/use-viewer-user';
import { archivedStatus, priorities } from '@/lib/ui-catalog';
import { usePinnedProjectsStore } from '@/store/pinned-projects-store';
import { toast } from 'sonner';
import { useIssuesStatuses } from './issues-status-context';
import { ProjectIconGlyph } from '@/components/common/projects/project-icon';
import { projectAreasQuery } from '@/src/data/projects';
import { useQuery } from '@tanstack/react-query';

function notifyLinkAdded() {
   toast.success('Link added');
}

function notifyIssueCopied() {
   toast.success('Issue copied');
}

function notifyRelatedIssueCreated() {
   toast.success('Related issue created');
}

function notifyMarkedAs(type: string) {
   toast.success(`Marked as ${type}`);
}

function notifyIssueMoved() {
   toast.success('Issue moved');
}

function notifyReminderSet() {
   toast.success('Reminder set');
}

interface IssueContextMenuProps {
   issueId?: string;
}

export function IssueContextMenu({ issueId }: IssueContextMenuProps) {
   const [isSubscribed, setIsSubscribed] = useState(false);
   const [isFavorite, setIsFavorite] = useState(false);
   const labels = useLabelOptions();
   const projects = useProjectOptions();
   const issueStatusOptions = useIssuesStatuses();
   const { isPinned, togglePinnedProject } = usePinnedProjectsStore();
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
      updateIssueDueDate,
      archiveIssue,
      deleteIssue,
      getIssueById,
      getIssueChildrenCount,
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
      const newPriority = priorities.find((p) => p.id === priorityId);
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

   const handleToggleProjectPin = () => {
      if (!issueId) return;

      const issue = getIssueById(issueId);
      if (!issue?.project) {
         toast.error('This issue has no project to pin');
         return;
      }

      const pinned = isPinned(issue.project.id);
      togglePinnedProject(issue.project.id);
      toast.success(pinned ? `Unpinned ${issue.project.name}` : `Pinned ${issue.project.name}`);
   };

   const handleSetDueDate = () => {
      if (!issueId) return;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      updateIssueDueDate(issueId, dueDate.toISOString());
      toast.success('Due date set to 7 days from now');
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

   const handleSubscribe = () => {
      setIsSubscribed(!isSubscribed);
      toast.success(isSubscribed ? 'Unsubscribed from issue' : 'Subscribed to issue');
   };

   const handleFavorite = () => {
      setIsFavorite(!isFavorite);
      toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
   };

   const handleCopy = () => {
      if (!issueId) return;
      const issue = getIssueById(issueId);
      if (issue) {
         navigator.clipboard.writeText(issue.title);
         toast.success('Copied to clipboard');
      }
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
      <ContextMenuContent className="w-64">
         <ContextMenuGroup>
            <ContextMenuSub>
               <ContextMenuSubTrigger>
                  <CircleCheck className="mr-2 size-4" /> Status
               </ContextMenuSubTrigger>
               <ContextMenuSubContent className="w-48">
                  {issueStatusOptions.map((s) => {
                     const Icon = s.icon;
                     return (
                        <ContextMenuItem key={s.id} onClick={() => handleStatusChange(s.id)}>
                           <Icon /> {s.name}
                        </ContextMenuItem>
                     );
                  })}
               </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuSub>
               <ContextMenuSubTrigger>
                  <Clock3 className="mr-2 size-4" /> Estimate
               </ContextMenuSubTrigger>
               <ContextMenuSubContent className="w-48">
                  {[1, 2, 4, 8].map((hours) => (
                     <ContextMenuItem key={hours} onClick={() => handleSetEstimate(hours)}>
                        {hours}h
                     </ContextMenuItem>
                  ))}
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => handleSetEstimate(null)}>Clear</ContextMenuItem>
               </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuSub>
               <ContextMenuSubTrigger>
                  <User className="mr-2 size-4" /> Assignee
               </ContextMenuSubTrigger>
               <ContextMenuSubContent className="w-48">
                  <ContextMenuItem onClick={() => handleAssigneeChange(null)}>
                     <User className="size-4" /> Unassigned
                  </ContextMenuItem>
                  {personalAssigneeOptions.map((user) => (
                     <ContextMenuItem key={user.id} onClick={() => handleAssigneeChange(user.id)}>
                        <Avatar className="size-4">
                           <AvatarImage src={user.avatarUrl} alt={user.name} />
                           <AvatarFallback>{user.name[0]}</AvatarFallback>
                        </Avatar>
                        {user.name}
                     </ContextMenuItem>
                  ))}
                  <ContextMenuSeparator />
                  <ContextMenuItem disabled>{currentUser.name}</ContextMenuItem>
               </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuSub>
               <ContextMenuSubTrigger>
                  <BarChart3 className="mr-2 size-4" /> Priority
               </ContextMenuSubTrigger>
               <ContextMenuSubContent className="w-48">
                  {priorities.map((priority) => (
                     <ContextMenuItem
                        key={priority.id}
                        onClick={() => handlePriorityChange(priority.id)}
                     >
                        <priority.icon className="size-4" /> {priority.name}
                     </ContextMenuItem>
                  ))}
               </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuSub>
               <ContextMenuSubTrigger>
                  <Tag className="mr-2 size-4" /> Labels
               </ContextMenuSubTrigger>
               <ContextMenuSubContent className="w-48">
                  {labels.map((label) => (
                     <ContextMenuItem key={label.id} onClick={() => handleLabelToggle(label.id)}>
                        <span
                           className="inline-block size-3 rounded-full"
                           style={{ backgroundColor: label.color }}
                           aria-hidden="true"
                        />
                        {label.name}
                     </ContextMenuItem>
                  ))}
               </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuSub>
               <ContextMenuSubTrigger>
                  <Folder className="mr-2 size-4" /> Project
               </ContextMenuSubTrigger>
               <ContextMenuSubContent className="w-64">
                  <ContextMenuItem onClick={() => handleProjectChange(null)}>
                     <Folder className="size-4" /> No Project
                  </ContextMenuItem>
                  {projects.slice(0, 5).map((project) => (
                     <ContextMenuItem
                        key={project.id}
                        onClick={() => handleProjectChange(project.id)}
                     >
                        <ProjectIconGlyph icon={project.iconConfig} className="size-4" />{' '}
                        {project.name}
                     </ContextMenuItem>
                  ))}
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={handleToggleProjectPin}>
                     <Star className="size-4" /> Pin/unpin current project
                  </ContextMenuItem>
               </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuSub>
               <ContextMenuSubTrigger disabled={!issue?.project}>
                  <Layers2 className="mr-2 size-4" /> Area
               </ContextMenuSubTrigger>
               <ContextMenuSubContent className="w-56">
                  <ContextMenuItem onClick={() => handleAreaChange(null)}>
                     <Layers2 className="size-4" /> No area
                     {!issue?.area && <CheckIcon className="ml-auto size-4" />}
                  </ContextMenuItem>
                  {areas.map((area) => (
                     <ContextMenuItem key={area.id} onClick={() => handleAreaChange(area.id)}>
                        <span
                           className="size-3 rounded-full"
                           style={{ backgroundColor: area.color }}
                           aria-hidden="true"
                        />
                        {area.name}
                        {issue?.area?.id === area.id && <CheckIcon className="ml-auto size-4" />}
                     </ContextMenuItem>
                  ))}
               </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuItem onClick={handleSetDueDate}>
               <CalendarClock className="size-4" /> Set due date…
               <ContextMenuShortcut>D</ContextMenuShortcut>
            </ContextMenuItem>

            <ContextMenuItem>
               <Pencil className="size-4" /> Rename…
               <ContextMenuShortcut>R</ContextMenuShortcut>
            </ContextMenuItem>

            <ContextMenuSeparator />

            <ContextMenuItem onClick={notifyLinkAdded}>
               <LinkIcon className="size-4" /> Add link…
               <ContextMenuShortcut>Ctrl L</ContextMenuShortcut>
            </ContextMenuItem>

            <ContextMenuSub>
               <ContextMenuSubTrigger>
                  <Repeat2 className="mr-2 size-4" /> Convert into
               </ContextMenuSubTrigger>
               <ContextMenuSubContent className="w-48">
                  <ContextMenuItem>
                     <FileText className="size-4" /> Document
                  </ContextMenuItem>
                  <ContextMenuItem>
                     <MessageSquare className="size-4" /> Comment
                  </ContextMenuItem>
               </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuItem onClick={notifyIssueCopied}>
               <CopyIcon className="size-4" /> Make a copy…
            </ContextMenuItem>
         </ContextMenuGroup>

         <ContextMenuSeparator />

         <ContextMenuItem onClick={notifyRelatedIssueCreated}>
            <PlusSquare className="size-4" /> Create related
         </ContextMenuItem>

         <ContextMenuItem onClick={handleAddSubissue}>
            <GitBranchPlus className="size-4" /> Add subissue
         </ContextMenuItem>

         <ContextMenuSub>
            <ContextMenuSubTrigger>
               <GitBranchPlus className="mr-2 size-4" /> Parent
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-64 max-h-80 overflow-y-auto">
               <ContextMenuItem onClick={() => handleSetParent(null)}>
                  <Link2Off className="size-4" /> No parent
                  {issueId && !getIssueById(issueId)?.parent && (
                     <CheckIcon className="ml-auto size-4" />
                  )}
               </ContextMenuItem>
               {parentOptions.map((option) => {
                  const isCurrent = issueId && getIssueById(issueId)?.parent?.id === option.id;
                  return (
                     <ContextMenuItem key={option.id} onClick={() => handleSetParent(option.id)}>
                        <span
                           className="inline-block size-2 rounded-full"
                           style={{ backgroundColor: option.status.color }}
                        />
                        <span className="min-w-0">
                           <span className="text-xs text-muted-foreground">
                              {option.identifier}
                           </span>
                           <span className="truncate"> {option.title}</span>
                        </span>
                        {isCurrent && <CheckIcon className="ml-auto size-4 shrink-0" />}
                     </ContextMenuItem>
                  );
               })}
            </ContextMenuSubContent>
         </ContextMenuSub>

         {issueId && getIssueChildrenCount(issueId) > 0 && (
            <ContextMenuItem disabled>
               <GitBranchPlus className="size-4" /> Has subissues
            </ContextMenuItem>
         )}

         <ContextMenuSub>
            <ContextMenuSubTrigger>
               <Flag className="mr-2 size-4" /> Mark as
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-48">
               <ContextMenuItem onClick={() => notifyMarkedAs('Completed')}>
                  <CheckCircle2 className="size-4" /> Completed
               </ContextMenuItem>
               <ContextMenuItem onClick={() => notifyMarkedAs('Duplicate')}>
                  <CopyIcon className="size-4" /> Duplicate
               </ContextMenuItem>
               <ContextMenuItem onClick={() => notifyMarkedAs("Won't Fix")}>
                  <Clock className="size-4" /> Won&apos;t Fix
               </ContextMenuItem>
            </ContextMenuSubContent>
         </ContextMenuSub>

         <ContextMenuItem onClick={notifyIssueMoved}>
            <ArrowRightLeft className="size-4" /> Move
         </ContextMenuItem>

         <ContextMenuSeparator />

         <ContextMenuItem onClick={handleSubscribe}>
            <Bell className="size-4" /> {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
            <ContextMenuShortcut>S</ContextMenuShortcut>
         </ContextMenuItem>

         <ContextMenuItem onClick={handleFavorite}>
            <Star className="size-4" /> {isFavorite ? 'Unfavorite' : 'Favorite'}
            <ContextMenuShortcut>F</ContextMenuShortcut>
         </ContextMenuItem>

         <ContextMenuItem onClick={handleCopy}>
            <Clipboard className="size-4" /> Copy
         </ContextMenuItem>

         <ContextMenuItem onClick={notifyReminderSet}>
            <AlarmClock className="size-4" /> Remind me
            <ContextMenuShortcut>H</ContextMenuShortcut>
         </ContextMenuItem>

         <ContextMenuSeparator />

         <ContextMenuItem onClick={handleArchive}>
            <span className="size-4 inline-flex items-center justify-center">
               <archivedStatus.icon />
            </span>
            Archive
         </ContextMenuItem>

         <ContextMenuItem onClick={handleDelete} variant="destructive">
            <Trash2 className="size-4" /> Delete…
            <ContextMenuShortcut>⌘⌫</ContextMenuShortcut>
         </ContextMenuItem>
      </ContextMenuContent>
   );
}
