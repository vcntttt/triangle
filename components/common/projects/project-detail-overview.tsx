import { Link, useRouter } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FileText, Pencil, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CreateProjectUpdateDialog } from '@/components/common/projects/create-project-update-dialog';
import { ProjectUpdateMentionText } from '@/components/common/projects/project-update-mention-text';
import { ProjectIcon } from '@/components/common/projects/project-icon';
import { ProjectIconPicker } from '@/components/common/projects/project-icon-picker';
import { ProjectAreasSection } from '@/components/common/projects/project-areas-section';
import { ProjectIssuesTab } from '@/components/common/projects/project-issues-tab';
import { PrioritySelector } from '@/components/common/projects/priority-selector';
import { StatusWithPercent } from '@/components/common/projects/status-with-percent';
import { AttentionSelector } from '@/components/common/projects/attention-selector';
import { viewerProfileToUser } from '@/lib/current-user';
import type { Issue, ProjectArea, ProjectIconConfig, ProjectUpdate } from '@/lib/models';
import {
   type ProjectLike,
   type ProjectOptionLike,
   toPresentationProject,
} from '@/lib/projects-presentation';
import { cn } from '@/lib/utils';
import type { IssueListItem } from '@/lib/db/issues';
import { useProjectCommands } from '@/src/data/projects';
import { useViewerProfile } from '@/src/data/viewer';
import { useCreateIssueStore } from '@/store/create-issue-store';
import { DisplayMenu } from '@/components/layout/headers/issues/header-options';

const updateDateFormatter = new Intl.DateTimeFormat('en-US');

export function ProjectToolbar({
   title,
   project,
   activeTab,
}: {
   title: string;
   project?: ProjectLike;
   activeTab?: 'overview' | 'issues';
}) {
   const showTabs = project && activeTab;
   const showIssueDisplay = activeTab === 'issues';

   return (
      <div className="flex min-h-10 w-full flex-wrap items-center justify-between gap-2 border-b px-4 py-1.5">
         <div className="flex min-w-0 items-center gap-2">
            {project ? (
               <ProjectIcon
                  icon={{ type: project.iconType ?? 'lucide', value: project.iconValue ?? 'box' }}
                  className="size-5 rounded"
                  iconClassName="size-3.5"
               />
            ) : null}
            <span className="truncate text-sm font-medium">{title}</span>
            {project ? <span className="text-xs text-muted-foreground">{project.key}</span> : null}
         </div>
         <div className="flex items-center gap-2">
            {showIssueDisplay ? <DisplayMenu /> : null}
            {showTabs ? (
               <div className="flex items-center gap-1">
                  <Button
                     asChild
                     size="sm"
                     variant={activeTab === 'overview' ? 'secondary' : 'ghost'}
                     className="h-7 rounded-full px-3"
                  >
                     <Link
                        to="/projects/$projectSlug"
                        params={{ projectSlug: project.slug }}
                        search={{ tab: 'overview' }}
                     >
                        Overview
                     </Link>
                  </Button>
                  <Button
                     asChild
                     size="sm"
                     variant={activeTab === 'issues' ? 'secondary' : 'ghost'}
                     className="h-7 rounded-full px-3"
                  >
                     <Link
                        to="/projects/$projectSlug"
                        params={{ projectSlug: project.slug }}
                        search={{ tab: 'issues' }}
                     >
                        Issues
                     </Link>
                  </Button>
               </div>
            ) : null}
         </div>
      </div>
   );
}

export function ProjectOverview({
   initialProject,
   statusOptions,
   priorityOptions,
   attentionOptions,
   areas,
   issues,
   activeTab,
   selectedIssueIdentifier,
   isConnected,
}: {
   initialProject: ProjectLike;
   statusOptions: ProjectOptionLike[];
   priorityOptions: ProjectOptionLike[];
   attentionOptions: ProjectOptionLike[];
   areas: ProjectArea[];
   issues: IssueListItem[];
   activeTab: 'overview' | 'issues';
   selectedIssueIdentifier?: string;
   isConnected: boolean;
}) {
   const router = useRouter();
   const { setDefaultProject } = useCreateIssueStore();
   const { updateProject, updateProjectFields } = useProjectCommands();
   const viewerProfile = useViewerProfile();
   const viewer = useMemo(() => viewerProfileToUser(viewerProfile), [viewerProfile]);
   const [project, setProject] = useState<ProjectLike>(() => initialProject);
   const [iconConfig, setIconConfig] = useState<ProjectIconConfig>(() => ({
      type: initialProject.iconType ?? 'lucide',
      value: initialProject.iconValue ?? 'box',
   }));
   const [isSavingDetails, setIsSavingDetails] = useState(false);
   const presentationProject = useMemo(
      () =>
         toPresentationProject(project, statusOptions, priorityOptions, attentionOptions, viewer),
      [attentionOptions, priorityOptions, project, statusOptions, viewer]
   );

   const handleProjectFieldSave = async (
      field: 'name' | 'key' | 'subtitle' | 'description',
      rawValue: string
   ) => {
      const trimmedValue = rawValue.trim();

      if (field === 'name' && !trimmedValue) {
         toast.error('Project name is required');
         return project.name;
      }

      if (field === 'key' && !trimmedValue) {
         toast.error('Project ID is required');
         return project.key;
      }

      const isLongTextField = field === 'description';
      const isOptionalTextField = field === 'subtitle' || isLongTextField;
      const nextValue = isOptionalTextField ? trimmedValue || null : trimmedValue;
      const currentValue = isOptionalTextField ? project[field] || null : project[field];

      if (nextValue === currentValue) {
         return nextValue ?? '';
      }

      setIsSavingDetails(true);

      try {
         const updated = await updateProjectFields({
            projectId: project.id,
            [field]: nextValue,
         });

         if (!updated) {
            throw new Error('Project no longer exists.');
         }

         setProject((current) => ({
            ...current,
            name: updated.name,
            key: updated.key,
            subtitle: updated.subtitle,
            description: updated.description,
            updatedAt: updated.updatedAt,
         }));
         toast.success('Project updated');
         await router.invalidate();

         return isOptionalTextField ? updated[field] || '' : updated[field];
      } catch (error) {
         const message = error instanceof Error ? error.message : 'Project could not be updated.';
         toast.error(message);
         return isOptionalTextField ? project[field] || '' : project[field];
      } finally {
         setIsSavingDetails(false);
      }
   };

   const handleIconChange = async (nextIcon: ProjectIconConfig) => {
      const previousIcon = iconConfig;
      setIconConfig(nextIcon);
      setProject((current) => ({
         ...current,
         iconType: nextIcon.type,
         iconValue: nextIcon.value,
      }));

      try {
         const updated = await updateProjectFields({
            projectId: project.id,
            iconType: nextIcon.type,
            iconValue: nextIcon.value,
         });

         if (!updated) {
            throw new Error('Project no longer exists.');
         }

         setProject((current) => ({
            ...current,
            iconType: updated.iconType,
            iconValue: updated.iconValue,
            updatedAt: updated.updatedAt,
         }));
         setIconConfig({ type: updated.iconType, value: updated.iconValue });
         toast.success('Project icon updated');
         await router.invalidate();
      } catch (error) {
         const message =
            error instanceof Error ? error.message : 'Project icon could not be updated.';
         setIconConfig(previousIcon);
         setProject((current) => ({
            ...current,
            iconType: previousIcon.type,
            iconValue: previousIcon.value,
         }));
         toast.error(message);
      }
   };

   const handleStatusChange = async (statusId: string) => {
      const nextStatus = statusOptions.find((option) => option.id === statusId);
      if (!nextStatus || statusId === project.status) return;

      const previous = project;
      setProject((current) => ({ ...current, status: statusId }));

      try {
         await updateProject({ projectId: project.id, status: statusId });
         toast.success('Project status updated');
      } catch (error) {
         console.error('Failed to update project status.', error);
         setProject(previous);
         toast.error('Project status could not be updated');
      }
   };

   const handlePriorityChange = async (priorityId: string) => {
      const nextPriority = priorityOptions.find((option) => option.id === priorityId);
      if (!nextPriority || priorityId === project.priority) return;

      const previous = project;
      setProject((current) => ({ ...current, priority: priorityId }));

      try {
         await updateProject({ projectId: project.id, priority: priorityId });
         toast.success('Project priority updated');
      } catch (error) {
         console.error('Failed to update project priority.', error);
         setProject(previous);
         toast.error('Project priority could not be updated');
      }
   };

   const handleAttentionChange = async (attentionId: string) => {
      const nextAttention = attentionOptions.find((option) => option.id === attentionId);
      if (!nextAttention || attentionId === project.attention) return;

      const previous = project;
      setProject((current) => ({ ...current, attention: attentionId }));

      try {
         await updateProject({ projectId: project.id, attention: attentionId });
         toast.success('Project attention updated');
      } catch (error) {
         console.error('Failed to update project attention.', error);
         setProject(previous);
         toast.error('Project attention could not be updated');
      }
   };

   const handleProjectUpdate = (_projectId: string, update: ProjectUpdate) => {
      setProject((current) => ({
         ...current,
         health: update.health,
         attention: update.attention.id,
         latestUpdate: update,
      }));
   };

   useEffect(() => {
      setDefaultProject(presentationProject);

      return () => {
         setDefaultProject(null);
      };
   }, [presentationProject, setDefaultProject]);

   const handleSelectIssue = (issue: Issue) => {
      return router.navigate({
         to: '/projects/$projectSlug',
         params: { projectSlug: project.slug },
         search: { tab: 'issues', issue: issue.identifier },
      });
   };

   const handleClearSelectedIssue = () => {
      return router.navigate({
         to: '/projects/$projectSlug',
         params: { projectSlug: project.slug },
         search: { tab: 'issues' },
         replace: true,
      });
   };

   return (
      <div className="flex h-full min-h-full flex-col bg-container">
         <ProjectToolbar title={project.name} project={project} activeTab={activeTab} />

         {activeTab === 'issues' ? (
            <div className="min-h-0 flex-1">
               <ProjectIssuesTab
                  project={presentationProject}
                  initialIssues={issues}
                  initialStatuses={statusOptions}
                  initialPriorities={priorityOptions}
                  selectedIssueIdentifier={selectedIssueIdentifier}
                  onSelectIssue={handleSelectIssue}
                  onClearSelectedIssue={handleClearSelectedIssue}
                  onSelectAdjacentIssue={handleSelectIssue}
               />
            </div>
         ) : (
            <div className="mx-auto w-full max-w-4xl px-10 py-16">
               <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0">
                     <div className="mb-5">
                        <ProjectIconPicker
                           value={iconConfig}
                           onChange={(nextIcon) => void handleIconChange(nextIcon)}
                           disabled={isSavingDetails}
                           triggerClassName="rounded-full"
                        />
                     </div>

                     <InlineEditableText
                        value={project.name}
                        placeholder="Untitled project"
                        maxLength={120}
                        disabled={isSavingDetails}
                        displayClassName="block max-w-5xl truncate text-3xl font-semibold tracking-normal hover:text-muted-foreground"
                        inputClassName="h-11 max-w-5xl text-3xl font-semibold"
                        onSave={(value) => handleProjectFieldSave('name', value)}
                     />

                     <InlineEditableText
                        value={project.subtitle || ''}
                        placeholder="Add a short project subtitle."
                        maxLength={160}
                        disabled={isSavingDetails}
                        displayClassName="mt-2 block max-w-3xl text-base text-muted-foreground hover:text-foreground"
                        inputClassName="mt-2 h-9 max-w-3xl text-base"
                        onSave={(value) => handleProjectFieldSave('subtitle', value)}
                     />

                     <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Project ID</span>
                        <InlineEditableText
                           value={project.key}
                           placeholder="ID"
                           maxLength={5}
                           disabled={isSavingDetails}
                           transformValue={(value) =>
                              value
                                 .toUpperCase()
                                 .replace(/[^A-Z0-9]+/g, '')
                                 .slice(0, 5)
                           }
                           displayClassName="rounded px-1.5 py-0.5 font-medium text-foreground hover:bg-muted/60"
                           inputClassName="h-7 w-28 px-2 text-sm font-medium uppercase"
                           onSave={(value) => handleProjectFieldSave('key', value)}
                        />
                     </div>

                     {/*
                        Keep this visual description hidden for now. It duplicates the
                        dedicated Description section below, but will be reused later.
                        <p className="mt-2 max-w-3xl text-lg text-muted-foreground">
                           {project.description || 'No description yet.'}
                        </p>
                     */}
                  </div>
               </div>

               <div className="mt-8 space-y-4 text-sm">
                  <div className="grid items-center gap-4 md:grid-cols-[116px_minmax(0,1fr)]">
                     <div className="font-medium text-muted-foreground">Properties</div>
                     <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                        <StatusWithPercent
                           status={presentationProject.status}
                           options={statusOptions}
                           onStatusChange={(statusId) => void handleStatusChange(statusId)}
                        />
                        <div className="inline-flex items-center gap-2 text-muted-foreground">
                           <Avatar className="size-5">
                              <AvatarImage src={viewer.avatarUrl} alt={viewer.name} />
                              <AvatarFallback>{viewer.name.charAt(0)}</AvatarFallback>
                           </Avatar>
                           <span>{viewer.name}</span>
                        </div>
                        <PrioritySelector
                           priority={presentationProject.priority}
                           options={priorityOptions}
                           onPriorityChange={(priorityId) => void handlePriorityChange(priorityId)}
                        />
                        <AttentionSelector
                           attention={presentationProject.attention}
                           options={attentionOptions}
                           onAttentionChange={(attentionId) =>
                              void handleAttentionChange(attentionId)
                           }
                        />
                        <span className="text-muted-foreground">Target date</span>
                     </div>
                  </div>

                  <div className="grid items-center gap-4 md:grid-cols-[116px_minmax(0,1fr)]">
                     <div className="font-medium text-muted-foreground">Resources</div>
                     <button
                        type="button"
                        className="inline-flex h-6 w-fit items-center gap-2 text-muted-foreground hover:text-foreground"
                     >
                        <Plus className="size-4" />
                        Add document or link…
                     </button>
                  </div>
               </div>

               <div className="mt-8">
                  <LatestUpdateCard
                     project={presentationProject}
                     isConnected={isConnected}
                     onProjectUpdate={handleProjectUpdate}
                  />
               </div>

               <ProjectAreasSection projectId={project.id} initialAreas={areas} />

               <section className="mt-8 border-t pt-5">
                  <button
                     type="button"
                     className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground"
                  >
                     Description
                     <span className="text-xs">⌄</span>
                  </button>
                  <div className="mt-3 max-w-5xl whitespace-pre-wrap text-sm leading-6 text-foreground">
                     <InlineEditableText
                        value={project.description || ''}
                        placeholder="Add a project description to capture scope, decisions, and links."
                        maxLength={500}
                        disabled={isSavingDetails}
                        multiline
                        displayClassName="block min-h-6 max-w-5xl whitespace-pre-wrap rounded-sm hover:text-muted-foreground"
                        inputClassName="min-h-28 max-w-5xl resize-none text-sm leading-6"
                        onSave={(value) => handleProjectFieldSave('description', value)}
                     />
                  </div>
               </section>
            </div>
         )}
      </div>
   );
}

function InlineEditableText({
   value,
   placeholder,
   maxLength,
   disabled,
   multiline = false,
   displayClassName,
   inputClassName,
   transformValue,
   onSave,
}: {
   value: string;
   placeholder: string;
   maxLength: number;
   disabled?: boolean;
   multiline?: boolean;
   displayClassName?: string;
   inputClassName?: string;
   transformValue?: (value: string) => string;
   onSave: (value: string) => Promise<string>;
}) {
   const [isEditing, setIsEditing] = useState(false);
   const [draft, setDraft] = useState('');

   const commit = async () => {
      const nextValue = transformValue ? transformValue(draft) : draft;
      const persistedValue = await onSave(nextValue);

      setDraft(persistedValue);
      setIsEditing(false);
   };

   const cancel = () => {
      setDraft(value);
      setIsEditing(false);
   };

   if (isEditing) {
      if (multiline) {
         return (
            <Textarea
               value={draft}
               maxLength={maxLength}
               disabled={disabled}
               className={inputClassName}
               placeholder={placeholder}
               onChange={(event) => setDraft(event.target.value)}
               onBlur={() => void commit()}
               onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                     event.preventDefault();
                     cancel();
                  }

                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                     event.preventDefault();
                     void commit();
                  }
               }}
            />
         );
      }

      return (
         <Input
            value={draft}
            maxLength={maxLength}
            disabled={disabled}
            className={inputClassName}
            placeholder={placeholder}
            onChange={(event) => {
               const nextValue = transformValue
                  ? transformValue(event.target.value)
                  : event.target.value;
               setDraft(nextValue);
            }}
            onBlur={() => void commit()}
            onKeyDown={(event) => {
               if (event.key === 'Escape') {
                  event.preventDefault();
                  cancel();
               }

               if (event.key === 'Enter') {
                  event.preventDefault();
                  void commit();
               }
            }}
         />
      );
   }

   return (
      <button
         type="button"
         disabled={disabled}
         className={cn(
            'cursor-text text-left transition-colors disabled:cursor-default disabled:opacity-70',
            displayClassName
         )}
         onClick={() => {
            setDraft(value);
            setIsEditing(true);
         }}
      >
         {value || placeholder}
      </button>
   );
}

function LatestUpdateCard({
   project,
   isConnected,
   onProjectUpdate,
}: {
   project: ReturnType<typeof toPresentationProject>;
   isConnected: boolean;
   onProjectUpdate: (projectId: string, update: ProjectUpdate) => void;
}) {
   const latestUpdateDate = project.latestUpdate
      ? updateDateFormatter.format(new Date(project.latestUpdate.createdAt))
      : null;

   return (
      <section className="rounded-md border bg-background/40 p-4">
         <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">Latest update</h2>
            <CreateProjectUpdateDialog
               project={project}
               onProjectUpdate={onProjectUpdate}
               trigger={
                  <Button size="sm" variant="ghost" className="h-7 gap-1.5">
                     <Pencil className="size-3.5" />
                     Update
                  </Button>
               }
            />
         </div>

         {project.latestUpdate ? (
            <div className="mt-4">
               <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span
                     className={cn(
                        'font-medium',
                        project.latestUpdate.health === 'on-track' && 'text-green-500',
                        project.latestUpdate.health === 'off-track' && 'text-red-500',
                        project.latestUpdate.health === 'at-risk' && 'text-amber-500'
                     )}
                  >
                     {project.health.name}
                  </span>
                  <span
                     className="inline-flex items-center gap-1.5 font-medium"
                     style={{ color: project.latestUpdate.attention.color }}
                  >
                     <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: project.latestUpdate.attention.color }}
                     />
                     {project.latestUpdate.attention.name}
                  </span>
                  <Avatar className="size-5">
                     <AvatarImage src={project.lead.avatarUrl} alt={project.lead.name} />
                     <AvatarFallback>{project.lead.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span>{project.lead.name}</span>
                  {latestUpdateDate ? <span>{latestUpdateDate}</span> : null}
               </div>
               <p className="mt-5 whitespace-pre-wrap text-[15px] leading-7">
                  <ProjectUpdateMentionText
                     body={project.latestUpdate.body}
                     mentions={project.latestUpdate.areaMentions}
                  />
               </p>
            </div>
         ) : (
            <div className="mt-4 flex min-h-14 items-center justify-between gap-4">
               <div className="flex min-w-0 items-center gap-3">
                  <FileText className="size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                     <h3 className="text-sm font-medium">No updates yet</h3>
                     <p className="truncate text-sm text-muted-foreground">
                        Post the first update to capture project health and recent progress.
                     </p>
                  </div>
               </div>
               <CreateProjectUpdateDialog
                  project={project}
                  onProjectUpdate={onProjectUpdate}
                  trigger={
                     <Button size="sm" disabled={!isConnected}>
                        New update
                     </Button>
                  }
               />
            </div>
         )}
      </section>
   );
}
