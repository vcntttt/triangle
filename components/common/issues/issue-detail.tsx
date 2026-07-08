'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { format } from 'date-fns';
import { Archive, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { LabelSelector } from './label-selector';
import { LabelBadge } from './label-badge';
import { PrioritySelector } from './priority-selector';
import { StatusSelector } from './status-selector';
import { AssigneeUser } from './assignee-user';
import { useIssuesData } from '@/components/common/issues/issues-data-context';
import { toast } from 'sonner';
import type { Issue } from '@/lib/models';
import { ProjectSelector } from '@/components/layout/sidebar/create-new-issue/project-selector';
import { AreaSelector } from '@/components/layout/sidebar/create-new-issue/area-selector';
import { ParentIssueSelector } from './parent-issue-selector';
import { cn } from '@/lib/utils';
import { priorities, status as statusOptions } from '@/lib/ui-catalog';
import { IssueChip, issueChipClassName } from './issue-chip';
import { parseIssueInlineTokens } from '@/lib/issue-inline-tokens';
import { useProjectOptions } from '@/hooks/use-project-options';
import { useLabelOptions } from '@/hooks/use-label-options';
import { useViewerUser } from '@/hooks/use-viewer-user';
import { useIssueCommands } from '@/src/data/issues';

export function IssueDetail({
   issueId,
   initialIssue,
   onDelete,
   onArchive,
   onMobileBack,
   mobileBack = false,
}: {
   issueId: string;
   initialIssue?: Issue;
   onDelete?: (issueId: string) => void;
   onArchive?: (issueId: string) => void;
   onMobileBack?: () => void;
   mobileBack?: boolean;
}) {
   const navigate = useNavigate();
   const {
      getIssueById,
      updateIssueContent,
      deleteIssue,
      archiveIssue,
      updateIssueProject,
      updateIssueArea,
      updateIssueParent,
      addIssueLabel,
   } = useIssuesData();
   const { createIssue } = useIssueCommands();
   const projectOptions = useProjectOptions();
   const labelOptions = useLabelOptions();
   const currentUser = useViewerUser();
   const presentationIssue = useMemo(
      () => getIssueById(issueId) ?? initialIssue ?? null,
      [getIssueById, issueId, initialIssue]
   );
   const presentationDescription = presentationIssue?.description ?? '';
   const createdAtLabel = presentationIssue
      ? format(new Date(presentationIssue.createdAt), 'MMM dd, yyyy')
      : '';
   const dueDateLabel = presentationIssue?.dueDate
      ? format(new Date(presentationIssue.dueDate), 'MMM dd')
      : null;
   const [title, setTitle] = useState(presentationIssue?.title ?? '');
   const [description, setDescription] = useState(presentationIssue?.description ?? '');
   const [subissueComposerOpen, setSubissueComposerOpen] = useState(false);
   const [newSubissueTitle, setNewSubissueTitle] = useState('');
   const [newSubissueDescription, setNewSubissueDescription] = useState('');
   const [creatingSubissue, setCreatingSubissue] = useState(false);
   const newSubissueTitleRef = useRef<HTMLInputElement | null>(null);

   const applyInlineTokenMetadata = useCallback(
      (rawTitle: string) => {
         const inlineDraft = parseIssueInlineTokens(rawTitle, projectOptions, labelOptions);
         const finalTitle = inlineDraft.title || rawTitle.trim();

         if (inlineDraft.project) {
            updateIssueProject(issueId, inlineDraft.project);
         }

         inlineDraft.labels.forEach((label) => {
            addIssueLabel(issueId, label);
         });

         return finalTitle;
      },
      [addIssueLabel, issueId, labelOptions, projectOptions, updateIssueProject]
   );

   useEffect(() => {
      setTitle(presentationIssue?.title ?? '');
      setDescription(presentationIssue?.description ?? '');
   }, [presentationIssue?.title, presentationIssue?.description]);

   useEffect(() => {
      if (!presentationIssue) return;
      const inlineDraft = parseIssueInlineTokens(title, projectOptions, labelOptions);
      const nextTitle = inlineDraft.title || title.trim();
      if (!nextTitle) return;
      if (nextTitle === presentationIssue.title.trim() && !inlineDraft.hasInlineTokens) return;

      const timeout = setTimeout(() => {
         const finalTitle = applyInlineTokenMetadata(title);
         setTitle(finalTitle);
         updateIssueContent(issueId, { title: finalTitle });
      }, 1000);

      return () => clearTimeout(timeout);
   }, [
      applyInlineTokenMetadata,
      labelOptions,
      presentationIssue,
      projectOptions,
      title,
      issueId,
      updateIssueContent,
   ]);

   useEffect(() => {
      if (!presentationIssue) return;
      const trimmed = description.trim();
      if (trimmed === presentationDescription.trim()) return;

      const timeout = setTimeout(() => {
         updateIssueContent(issueId, { description: trimmed });
      }, 1000);

      return () => clearTimeout(timeout);
   }, [description, issueId, presentationDescription, presentationIssue, updateIssueContent]);

   if (!presentationIssue) {
      return (
         <div className="flex h-full items-center justify-center p-8 text-center bg-background">
            <div className="space-y-2">
               <h3 className="text-lg font-semibold">Issue not found</h3>
               <p className="text-sm text-muted-foreground">
                  The selected issue is no longer available in the workspace.
               </p>
            </div>
         </div>
      );
   }

   const canBecomeSubissue = presentationIssue.subissues.length === 0;

   const persistTitle = () => {
      const nextTitle = applyInlineTokenMetadata(title);

      if (!nextTitle || nextTitle === presentationIssue.title) {
         setTitle(presentationIssue.title);
         return;
      }

      setTitle(nextTitle);
      updateIssueContent(issueId, { title: nextTitle });
   };

   const persistDescription = () => {
      const nextDescription = description.trim();
      const normalizedCurrentDescription = presentationIssue.description.trim();

      if (nextDescription === normalizedCurrentDescription) {
         return;
      }

      updateIssueContent(issueId, { description: nextDescription });
   };

   const handleEditorShortcuts = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Escape') {
         event.preventDefault();
         setTitle(presentationIssue.title);
         setDescription(presentationIssue.description);
         event.currentTarget.blur();
      }
   };

   const handleDelete = () => {
      if (!window.confirm(`Delete ${presentationIssue.identifier}? This cannot be undone.`)) {
         return;
      }

      deleteIssue(issueId);
      toast.success('Issue deleted');
      if (onDelete) {
         onDelete(issueId);
         return;
      }

      void navigate({ to: '/issues', replace: true });
   };

   const handleArchive = () => {
      archiveIssue(issueId);
      toast.success('Issue archived');
      if (onArchive) {
         onArchive(issueId);
         return;
      }

      void navigate({ to: '/issues', replace: true });
   };

   const handleCreateSubissue = async () => {
      const inlineDraft = parseIssueInlineTokens(newSubissueTitle, projectOptions, labelOptions);
      const finalTitle = inlineDraft.title || newSubissueTitle.trim();
      const finalProject = inlineDraft.project ?? presentationIssue.project;
      const finalArea =
         finalProject?.id === presentationIssue.project?.id ? presentationIssue.area : null;

      if (!finalTitle) {
         toast.error('Subissue title is required');
         return;
      }

      setCreatingSubissue(true);

      try {
         await createIssue({
            title: finalTitle,
            description: newSubissueDescription.trim() || undefined,
            status: statusOptions.find((item) => item.id === 'to-do')?.id ?? statusOptions[0].id,
            priority: priorities.find((item) => item.id === 'no-priority')?.id ?? priorities[0].id,
            assigneeId: currentUser.id,
            parentIssueId: presentationIssue.id,
            projectId: finalProject?.id ?? null,
            areaId: finalArea?.id ?? null,
            labelIds: inlineDraft.labels.map((label) => label.id),
         });
         setNewSubissueTitle('');
         setNewSubissueDescription('');
         setSubissueComposerOpen(true);
         requestAnimationFrame(() => {
            newSubissueTitleRef.current?.focus();
         });
         toast.success('Subissue created');
      } catch (error) {
         console.error('Failed to create subissue.', error);
         toast.error('Subissue could not be created');
      } finally {
         setCreatingSubissue(false);
      }
   };

   return (
      <div className="flex h-full flex-col bg-background">
         <div className="flex items-center justify-between px-4 h-10 border-b border-border">
            <div className="flex items-center gap-3 min-w-0">
               <SidebarTrigger className="inline-flex lg:hidden" />
               {mobileBack &&
                  (onMobileBack ? (
                     <Button variant="ghost" size="xs" onClick={onMobileBack}>
                        <ArrowLeft className="size-4" />
                        Back
                     </Button>
                  ) : (
                     <Button variant="ghost" size="xs" asChild>
                        <Link to="/issues">
                           <ArrowLeft className="size-4" />
                           Back
                        </Link>
                     </Button>
                  ))}
               <span
                  className="text-xs text-muted-foreground hidden sm:inline-block"
                  suppressHydrationWarning
               >
                  Created {createdAtLabel}
               </span>
            </div>

            <div className="flex items-center gap-2">
               <Button variant="ghost" size="icon" className="size-7" onClick={handleArchive}>
                  <Archive className="size-4 text-muted-foreground" />
               </Button>
               <Button variant="ghost" size="icon" className="size-7" onClick={handleDelete}>
                  <Trash2 className="size-4 text-muted-foreground" />
               </Button>
            </div>
         </div>

         <div className="pt-8 pb-6 px-5 space-y-6 w-full max-w-4xl mx-auto overflow-y-auto h-full">
            <div className="space-y-3">
               <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                  {presentationIssue.identifier}
               </div>
               <Textarea
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  onBlur={persistTitle}
                  onKeyDown={(event) => {
                     if (event.key === 'Enter') {
                        event.preventDefault();
                        event.currentTarget.blur();
                     }
                     handleEditorShortcuts(event);
                  }}
                  rows={1}
                  className="min-h-0 resize-none border-none bg-transparent px-0 text-[26px] font-semibold leading-tight shadow-none focus-visible:ring-0"
               />
               {presentationIssue.parent && (
                  <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                     <span>Sub-issue of</span>
                     <Link
                        to="/issues/$issueIdentifier"
                        params={{ issueIdentifier: presentationIssue.parent.identifier }}
                        className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                     >
                        {(() => {
                           const parent = getIssueById(presentationIssue.parent!.id);
                           return parent ? (
                              <span
                                 className="inline-block size-2 rounded-full"
                                 style={{ backgroundColor: parent.status.color }}
                              />
                           ) : null;
                        })()}
                        <span className="font-medium text-foreground">
                           {presentationIssue.parent.identifier}
                        </span>
                        <span>{presentationIssue.parent.title}</span>
                     </Link>
                  </div>
               )}
               <div className="flex flex-wrap items-center gap-2">
                  <PrioritySelector
                     priority={presentationIssue.priority}
                     issueId={presentationIssue.id}
                     display="chip"
                  />
                  <StatusSelector
                     status={presentationIssue.status}
                     issueId={presentationIssue.id}
                     display="chip"
                  />
                  <AssigneeUser user={presentationIssue.assignee} issueId={presentationIssue.id} />
                  <ProjectSelector
                     project={presentationIssue.project}
                     onChange={(project) => {
                        updateIssueProject(presentationIssue.id, project);
                        if (presentationIssue.area?.projectId !== project?.id) {
                           updateIssueArea(presentationIssue.id, null);
                        }
                     }}
                     showShortcut={false}
                     triggerClassName={issueChipClassName}
                     variant="ghost"
                     size="sm"
                  />
                  <AreaSelector
                     project={presentationIssue.project}
                     area={presentationIssue.area}
                     onChange={(area) => updateIssueArea(presentationIssue.id, area?.id ?? null)}
                     triggerClassName={issueChipClassName}
                     variant="ghost"
                     size="sm"
                  />
                  <LabelSelector issueId={presentationIssue.id} />
                  {presentationIssue.dueDate && (
                     <IssueChip suppressHydrationWarning>Due {dueDateLabel}</IssueChip>
                  )}
                  {!presentationIssue.parent && (
                     <ParentIssueSelector
                        issueId={presentationIssue.id}
                        parent={null}
                        onChange={(parent) => {
                           if (!canBecomeSubissue && parent) {
                              toast.error('Issues with subissues cannot become subissues');
                              return;
                           }

                           updateIssueParent(presentationIssue.id, parent);
                           if (parent) {
                              toast.success(`Parent set to ${parent.identifier}`);
                           }
                        }}
                        compact
                        emptyLabel="Add parent"
                     />
                  )}
               </div>
            </div>

            <div className="prose prose-sm max-w-none">
               <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Description</span>
               </div>
               <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  onBlur={persistDescription}
                  onKeyDown={(event) => {
                     if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                        event.preventDefault();
                        event.currentTarget.blur();
                     }
                     handleEditorShortcuts(event);
                  }}
                  placeholder="Add a description..."
                  rows={7}
                  className="min-h-[156px] resize-none rounded-lg border bg-card p-4 text-sm leading-relaxed"
               />
            </div>

            <section className="border-t border-border/60 pt-5">
               <div className="space-y-3">
                  {presentationIssue.subissues.map((subissue) => {
                     const childIssue = getIssueById(subissue.id);
                     const subissueStatus = childIssue?.status ?? subissue.status;
                     const subissuePriority = childIssue?.priority ?? subissue.priority;
                     const subissueLabels = childIssue?.labels ?? [];
                     const subissueDescription = childIssue?.description.trim();
                     const hasSubissueDescription = Boolean(subissueDescription);
                     const hasSubissueLabels = subissueLabels.length > 0;

                     return (
                        <div
                           key={subissue.id}
                           className={cn(
                              'flex gap-2 rounded-lg border border-border/70 bg-card/30 px-2.5 py-2',
                              hasSubissueDescription ? 'items-start' : 'items-center'
                           )}
                        >
                           <div
                              className={cn(
                                 'flex items-center gap-0.5',
                                 hasSubissueDescription && 'pt-0.5'
                              )}
                              onMouseDownCapture={(event) => event.stopPropagation()}
                           >
                              <PrioritySelector priority={subissuePriority} issueId={subissue.id} />
                              <StatusSelector status={subissueStatus} issueId={subissue.id} />
                           </div>
                           <Link
                              to="/issues/$issueIdentifier"
                              params={{ issueIdentifier: subissue.identifier }}
                              className="min-w-0 flex-1 space-y-1"
                           >
                              <div className="flex min-w-0 items-center gap-2">
                                 <div className="min-w-0 flex-1 truncate text-sm font-medium leading-5 text-foreground">
                                    {subissue.title}
                                 </div>
                                 {hasSubissueLabels && (
                                    <div className="ml-auto flex shrink-0 items-center gap-1">
                                       <LabelBadge label={subissueLabels} />
                                    </div>
                                 )}
                              </div>
                              {subissueDescription && (
                                 <p className="line-clamp-2 text-xs text-muted-foreground">
                                    {subissueDescription}
                                 </p>
                              )}
                           </Link>
                        </div>
                     );
                  })}

                  {subissueComposerOpen ? (
                     <div className="rounded-xl border bg-card">
                        <div className="px-4 pt-3">
                           <div className="flex items-start gap-3">
                              <div className="pt-2">
                                 <div className="size-4 rounded-full border border-muted-foreground/50" />
                              </div>
                              <div className="flex-1 space-y-3">
                                 <Input
                                    ref={newSubissueTitleRef}
                                    value={newSubissueTitle}
                                    onChange={(event) => setNewSubissueTitle(event.target.value)}
                                    onKeyDown={(event) => {
                                       if (event.key === 'Enter') {
                                          event.preventDefault();
                                          void handleCreateSubissue();
                                       }
                                    }}
                                    placeholder="Issue title"
                                    className="h-auto border-none bg-transparent p-0 text-base font-medium shadow-none focus-visible:ring-0"
                                 />
                                 <Textarea
                                    value={newSubissueDescription}
                                    onChange={(event) =>
                                       setNewSubissueDescription(event.target.value)
                                    }
                                    onKeyDown={(event) => {
                                       if (
                                          (event.metaKey || event.ctrlKey) &&
                                          event.key === 'Enter'
                                       ) {
                                          event.preventDefault();
                                          void handleCreateSubissue();
                                       }
                                    }}
                                    placeholder="Add description..."
                                    rows={2}
                                    className="min-h-0 resize-none border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                                 />
                              </div>
                           </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 border-t px-4 py-2.5">
                           <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                 setSubissueComposerOpen(false);
                                 setNewSubissueTitle('');
                                 setNewSubissueDescription('');
                              }}
                           >
                              Cancel
                           </Button>
                           <Button
                              size="sm"
                              onClick={() => {
                                 void handleCreateSubissue();
                              }}
                              disabled={creatingSubissue}
                           >
                              Create
                           </Button>
                        </div>
                     </div>
                  ) : (
                     <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-0 text-muted-foreground hover:text-foreground"
                        onClick={() => setSubissueComposerOpen(true)}
                     >
                        <Plus className="size-4" />
                        Add sub-issues
                     </Button>
                  )}
               </div>
            </section>
         </div>
      </div>
   );
}
