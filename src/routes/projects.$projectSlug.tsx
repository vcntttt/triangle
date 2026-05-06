import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { FileText, MoreHorizontal, Pencil, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CreateProjectUpdateDialog } from '@/components/common/projects/create-project-update-dialog';
import { ProjectIcon } from '@/components/common/projects/project-icon';
import { ProjectIconPicker } from '@/components/common/projects/project-icon-picker';
import { ProjectIssuesTab } from '@/components/common/projects/project-issues-tab';
import { PrioritySelector } from '@/components/common/projects/priority-selector';
import { StatusWithPercent } from '@/components/common/projects/status-with-percent';
import { persistProjectUpdate } from '@/components/common/projects/project-update';
import { currentUser } from '@/lib/current-user';
import type { ProjectIconConfig, ProjectUpdate } from '@/lib/models';
import {
   type ProjectLike,
   type ProjectOptionLike,
   toPresentationProject,
} from '@/lib/projects-presentation';
import { cn } from '@/lib/utils';
import type { IssueListItem } from '@/lib/db/issues';
import { getIssuesPage } from '@/src/server/issues';
import { getProjectsPage, updateProjectDetails } from '@/src/server/projects';

const projectSearchSchema = z.object({
   tab: z.enum(['overview', 'issues']).optional().catch('overview'),
});

export const Route = createFileRoute('/projects/$projectSlug')({
   validateSearch: (search) => projectSearchSchema.parse(search),
   loader: async ({ params }) => {
      const [projectsResult, issuesResult] = await Promise.all([
         getProjectsPage(),
         getIssuesPage(),
      ]);
      const project = projectsResult.projects.find((item) => item.slug === params.projectSlug);

      return {
         project: project ?? null,
         statusOptions: projectsResult.statusOptions,
         priorityOptions: projectsResult.priorityOptions,
         issues: project
            ? issuesResult.issues.filter((issue) => issue.project?.id === project.id)
            : [],
         databaseError: projectsResult.databaseError ?? issuesResult.databaseError,
         isConnected: projectsResult.isConnected && issuesResult.isConnected,
      };
   },
   head: ({ loaderData }) => ({
      meta: [
         {
            title: loaderData?.project
               ? `${loaderData.project.name} | Triangle`
               : 'Project | Triangle',
         },
      ],
   }),
   component: ProjectPage,
});

function ProjectPage() {
   const { project, statusOptions, priorityOptions, issues, databaseError, isConnected } =
      Route.useLoaderData();
   const { tab = 'overview' } = Route.useSearch();

   if (databaseError) {
      return (
         <>
            <ProjectToolbar title="Project" />
            <div className="w-full p-6">
               <div className="max-w-2xl rounded-lg border bg-container p-6">
                  <h2 className="text-sm font-semibold">Database unavailable</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{databaseError}</p>
               </div>
            </div>
         </>
      );
   }

   if (!project) {
      return (
         <>
            <ProjectToolbar title="Project not found" />
            <div className="mx-auto flex min-h-96 max-w-3xl flex-col justify-center px-6">
               <h1 className="text-xl font-semibold">Project not found</h1>
               <p className="mt-2 text-sm text-muted-foreground">
                  This project may have been deleted or renamed.
               </p>
               <Button asChild variant="outline" className="mt-4 w-fit">
                  <Link to="/projects">Back to projects</Link>
               </Button>
            </div>
         </>
      );
   }

   return (
      <>
         <ProjectOverview
            initialProject={project}
            statusOptions={statusOptions}
            priorityOptions={priorityOptions}
            issues={issues}
            activeTab={tab}
            isConnected={isConnected}
         />
      </>
   );
}

function ProjectToolbar({
   title,
   project,
   activeTab,
}: {
   title: string;
   project?: ProjectLike;
   activeTab?: 'overview' | 'issues';
}) {
   const showTabs = project && activeTab;

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
            <Button size="icon" variant="ghost" className="size-7">
               <MoreHorizontal className="size-4" />
            </Button>
         </div>
      </div>
   );
}

function ProjectOverview({
   initialProject,
   statusOptions,
   priorityOptions,
   issues,
   activeTab,
   isConnected,
}: {
   initialProject: ProjectLike;
   statusOptions: ProjectOptionLike[];
   priorityOptions: ProjectOptionLike[];
   issues: IssueListItem[];
   activeTab: 'overview' | 'issues';
   isConnected: boolean;
}) {
   const router = useRouter();
   const [project, setProject] = useState<ProjectLike>(initialProject);
   const [editingDetails, setEditingDetails] = useState(false);
   const [name, setName] = useState(initialProject.name);
   const [description, setDescription] = useState(initialProject.description ?? '');
   const [iconConfig, setIconConfig] = useState<ProjectIconConfig>({
      type: initialProject.iconType ?? 'lucide',
      value: initialProject.iconValue ?? 'box',
   });
   const [isSavingDetails, setIsSavingDetails] = useState(false);
   const presentationProject = useMemo(
      () => toPresentationProject(project, statusOptions, priorityOptions),
      [priorityOptions, project, statusOptions]
   );

   const handleDetailsSave = async () => {
      const trimmedName = name.trim();

      if (!trimmedName) {
         toast.error('Project name is required');
         return;
      }

      setIsSavingDetails(true);

      try {
         const updated = await updateProjectDetails({
            data: {
               projectId: project.id,
               name: trimmedName,
               description: description.trim() || null,
               iconType: iconConfig.type,
               iconValue: iconConfig.value,
            },
         });

         if (!updated) {
            throw new Error('Project no longer exists.');
         }

         setProject((current) => ({
            ...current,
            name: updated.name,
            description: updated.description,
            iconType: updated.iconType,
            iconValue: updated.iconValue,
            updatedAt: updated.updatedAt,
         }));
         setIconConfig({ type: updated.iconType, value: updated.iconValue });
         setEditingDetails(false);
         toast.success('Project updated');
         await router.invalidate();
      } catch (error) {
         const message = error instanceof Error ? error.message : 'Project could not be updated.';
         toast.error(message);
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
         const updated = await updateProjectDetails({
            data: {
               projectId: project.id,
               iconType: nextIcon.type,
               iconValue: nextIcon.value,
            },
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
         await persistProjectUpdate(project.id, { status: statusId });
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
         await persistProjectUpdate(project.id, { priority: priorityId });
         toast.success('Project priority updated');
      } catch (error) {
         console.error('Failed to update project priority.', error);
         setProject(previous);
         toast.error('Project priority could not be updated');
      }
   };

   const handleProjectUpdate = (_projectId: string, update: ProjectUpdate) => {
      setProject((current) => ({ ...current, latestUpdate: update }));
   };

   return (
      <div className="min-h-full bg-container">
         <ProjectToolbar title={project.name} project={project} activeTab={activeTab} />

         {activeTab === 'issues' ? (
            <ProjectIssuesTab
               project={presentationProject}
               initialIssues={issues}
               initialStatuses={statusOptions}
            />
         ) : (
            <div className="mx-auto max-w-[1030px] px-6 py-16">
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

                     {editingDetails ? (
                        <div className="flex max-w-3xl flex-col gap-3">
                           <div className="flex items-center gap-2">
                              <ProjectIconPicker
                                 value={iconConfig}
                                 onChange={setIconConfig}
                                 disabled={isSavingDetails}
                              />
                              <span className="text-sm text-muted-foreground">Project icon</span>
                           </div>
                           <Input
                              value={name}
                              onChange={(event) => setName(event.target.value)}
                              className="h-10 max-w-xl text-2xl font-semibold"
                              maxLength={120}
                           />
                           <Textarea
                              value={description}
                              onChange={(event) => setDescription(event.target.value)}
                              className="min-h-24 max-w-3xl resize-none text-base"
                              maxLength={500}
                           />
                           <div className="flex items-center gap-2">
                              <Button
                                 size="sm"
                                 onClick={() => void handleDetailsSave()}
                                 disabled={isSavingDetails}
                              >
                                 {isSavingDetails ? 'Saving...' : 'Save'}
                              </Button>
                              <Button
                                 size="sm"
                                 variant="outline"
                                 onClick={() => {
                                    setName(project.name);
                                    setDescription(project.description ?? '');
                                    setIconConfig({
                                       type: project.iconType ?? 'lucide',
                                       value: project.iconValue ?? 'box',
                                    });
                                    setEditingDetails(false);
                                 }}
                                 disabled={isSavingDetails}
                              >
                                 Cancel
                              </Button>
                           </div>
                        </div>
                     ) : (
                        <>
                           <h1 className="truncate text-3xl font-semibold tracking-normal">
                              {project.name}
                           </h1>
                           <p className="mt-2 max-w-3xl text-lg text-muted-foreground">
                              {project.description || 'No description yet.'}
                           </p>
                        </>
                     )}
                  </div>

                  {!editingDetails ? (
                     <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setEditingDetails(true)}
                     >
                        <Pencil className="size-4" />
                        Edit
                     </Button>
                  ) : null}
               </div>

               <div className="mt-8 grid gap-4 text-sm md:grid-cols-[90px_1fr]">
                  <div className="font-medium text-muted-foreground">Properties</div>
                  <div className="flex flex-wrap items-center gap-3">
                     <StatusWithPercent
                        status={presentationProject.status}
                        options={statusOptions}
                        onStatusChange={(statusId) => void handleStatusChange(statusId)}
                     />
                     <div className="inline-flex items-center gap-2 text-muted-foreground">
                        <Avatar className="size-5">
                           <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                           <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{currentUser.name}</span>
                     </div>
                     <PrioritySelector
                        priority={presentationProject.priority}
                        options={priorityOptions}
                        onPriorityChange={(priorityId) => void handlePriorityChange(priorityId)}
                     />
                     <span className="text-muted-foreground">Target date</span>
                  </div>

                  <div className="font-medium text-muted-foreground">Resources</div>
                  <button className="inline-flex w-fit items-center gap-2 text-muted-foreground hover:text-foreground">
                     <Plus className="size-4" />
                     Add document or link...
                  </button>
               </div>

               <div className="mt-8">
                  <LatestUpdateCard
                     project={presentationProject}
                     isConnected={isConnected}
                     onProjectUpdate={handleProjectUpdate}
                  />
               </div>

               <section className="mt-8 border-t pt-5">
                  <button className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                     Description
                     <span className="text-xs">⌄</span>
                  </button>
                  <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-foreground">
                     {project.description ||
                        'Add a project description to capture scope, decisions, and links.'}
                  </p>
               </section>
            </div>
         )}
      </div>
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
      ? new Date(project.latestUpdate.createdAt).toLocaleDateString()
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
                  <Avatar className="size-5">
                     <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                     <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span>{currentUser.name}</span>
                  {latestUpdateDate ? <span>{latestUpdateDate}</span> : null}
               </div>
               <p className="mt-5 whitespace-pre-wrap text-[15px] leading-7">
                  {project.latestUpdate.body}
               </p>
            </div>
         ) : (
            <div className="mt-8 flex min-h-40 flex-col items-center justify-center text-center">
               <FileText className="size-8 text-muted-foreground" />
               <h3 className="mt-3 text-sm font-medium">No updates yet</h3>
               <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Post the first update to capture project health and recent progress.
               </p>
               <CreateProjectUpdateDialog
                  project={project}
                  onProjectUpdate={onProjectUpdate}
                  trigger={
                     <Button size="sm" className="mt-4" disabled={!isConnected}>
                        New update
                     </Button>
                  }
               />
            </div>
         )}
      </section>
   );
}
