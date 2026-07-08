import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogTitle,
   DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverAnchor } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RiEditLine } from '@remixicon/react';
import { GitBranchPlus, Plus, X } from 'lucide-react';
import {
   useState,
   useEffect,
   useLayoutEffect,
   useCallback,
   useMemo,
   useRef,
   type KeyboardEvent as ReactKeyboardEvent,
   type ReactNode,
} from 'react';
import { priorities, status, type Issue } from '@/lib/ui-catalog';
import { useCreateIssueStore } from '@/store/create-issue-store';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { useProjectOptions } from '@/hooks/use-project-options';
import { useLabelOptions } from '@/hooks/use-label-options';
import { useViewerUser } from '@/hooks/use-viewer-user';
import { normalizeInlineToken, parseIssueInlineTokens } from '@/lib/issue-inline-tokens';
import {
   applyInlineTokenSuggestion,
   getInlineTokenSuggestionContext,
} from '@/lib/issue-inline-suggestions';
import type { LabelInterface } from '@/lib/models';
import type { Project } from '@/lib/projects-presentation';
import { StatusSelector } from './status-selector';
import { PrioritySelector } from './priority-selector';
import { AssigneeSelector } from './assignee-selector';
import { ProjectSelector } from './project-selector';
import { AreaSelector } from './area-selector';
import { LabelSelector } from './label-selector';
import { EstimatedHoursSelector } from './estimated-hours-selector';
import { InlineTokenSuggestions } from './inline-token-suggestions';
import { useIssueCommands } from '@/src/data/issues';

type TitlePreviewSegment =
   | {
        type: 'text';
        key: string;
        value: string;
     }
   | {
        type: 'project';
        key: string;
        value: string;
        project: Project;
     }
   | {
        type: 'label';
        key: string;
        value: string;
        label: LabelInterface;
     };

type DraftSubIssue = {
   id: string;
   title: string;
};

const trailingTokenPunctuation = /[.,;:!?]+$/;

function buildTitlePreviewSegments(
   title: string,
   projects: Project[],
   labels: LabelInterface[]
): TitlePreviewSegment[] {
   if (!title.trim()) {
      return [];
   }

   const projectLookup = new Map(
      projects.map((project) => [normalizeInlineToken(project.name), project])
   );
   const labelLookup = new Map(labels.map((label) => [normalizeInlineToken(label.name), label]));

   let cursor = 0;

   return title.split(/(\s+)/).flatMap((chunk) => {
      if (!chunk) {
         return [];
      }

      const key = `${cursor}-${chunk}`;
      cursor += chunk.length;

      if (/^\s+$/.test(chunk)) {
         return [{ type: 'text', key, value: chunk } satisfies TitlePreviewSegment];
      }

      const cleanChunk = chunk.replace(trailingTokenPunctuation, '');
      const suffix = chunk.slice(cleanChunk.length);
      const prefix = cleanChunk[0];
      const token = cleanChunk.slice(1);

      if ((prefix === '@' || prefix === '#') && token) {
         const normalizedToken = normalizeInlineToken(token);
         const matchedItem =
            prefix === '@' ? projectLookup.get(normalizedToken) : labelLookup.get(normalizedToken);

         if (matchedItem) {
            const displayToken = normalizeInlineToken(matchedItem.name);

            return [
               prefix === '@'
                  ? ({
                       type: 'project',
                       key,
                       value: `@${displayToken}`,
                       project: matchedItem,
                    } satisfies TitlePreviewSegment)
                  : ({
                       type: 'label',
                       key,
                       value: `#${displayToken}`,
                       label: matchedItem,
                    } satisfies TitlePreviewSegment),
               ...(suffix
                  ? [
                       {
                          type: 'text',
                          key: `${key}-suffix`,
                          value: suffix,
                       } satisfies TitlePreviewSegment,
                    ]
                  : []),
            ];
         }
      }

      return [{ type: 'text', key, value: chunk } satisfies TitlePreviewSegment];
   });
}

function renderTitlePreviewSegment(segment: TitlePreviewSegment): ReactNode {
   if (segment.type === 'text') {
      return <span key={segment.key}>{segment.value}</span>;
   }

   const accentColor =
      segment.type === 'project'
         ? 'color-mix(in oklab, var(--secondary) 88%, transparent)'
         : `color-mix(in srgb, ${segment.label.color} 24%, transparent)`;
   const borderColor =
      segment.type === 'project'
         ? 'color-mix(in oklab, var(--border) 85%, transparent)'
         : `color-mix(in srgb, ${segment.label.color} 58%, var(--border))`;

   return (
      <span
         key={segment.key}
         className="rounded-[0.65em] text-foreground"
         style={{
            backgroundColor: accentColor,
            boxShadow: `inset 0 0 0 1px ${borderColor}`,
            boxDecorationBreak: 'clone',
            WebkitBoxDecorationBreak: 'clone',
         }}
      >
         {segment.value}
      </span>
   );
}

export function CreateNewIssue() {
   const [createMore, setCreateMore] = useState<boolean>(false);
   const [draftSubIssues, setDraftSubIssues] = useState<DraftSubIssue[]>([]);
   const [projectSelectorOpen, setProjectSelectorOpen] = useState(false);
   const [areaSelectorOpen, setAreaSelectorOpen] = useState(false);
   const [labelSelectorOpen, setLabelSelectorOpen] = useState(false);
   const [titleFocused, setTitleFocused] = useState(false);
   const [titleCaretPosition, setTitleCaretPosition] = useState(0);
   const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
   const titleInputRef = useRef<HTMLTextAreaElement | null>(null);
   const {
      isOpen,
      defaultStatus,
      defaultProject,
      defaultArea,
      defaultParentIssue,
      openModal,
      closeModal,
   } = useCreateIssueStore();
   const { createIssueWithSubissues } = useIssueCommands();
   const projectOptions = useProjectOptions();
   const labelOptions = useLabelOptions();
   const currentUser = useViewerUser();

   const createDefaultData = useCallback(() => {
      return {
         id: uuidv4(),
         identifier: '',
         title: '',
         description: '',
         status: defaultStatus || status.find((s) => s.id === 'to-do')!,
         assignee: currentUser,
         priority: priorities.find((p) => p.id === 'no-priority')!,
         labels: [],
         estimatedHours: undefined,
         createdAt: new Date().toISOString(),
         cycleId: '',
         project: defaultProject ?? undefined,
         area: defaultArea,
         parentIssueId: defaultParentIssue?.id ?? null,
         parent: defaultParentIssue ?? null,
         subissues: [],
         rank: Date.now().toString(36),
      };
   }, [currentUser, defaultArea, defaultParentIssue, defaultProject, defaultStatus]);

   const [addIssueForm, setAddIssueForm] = useState<Issue>(() => createDefaultData());

   useEffect(() => {
      setAddIssueForm(createDefaultData());
   }, [createDefaultData]);

   const inlineDraft = useMemo(
      () => parseIssueInlineTokens(addIssueForm.title, projectOptions, labelOptions),
      [addIssueForm.title, projectOptions, labelOptions]
   );
   const canCreateSubIssues = !addIssueForm.parent;

   const inlineSuggestion = useMemo(
      () =>
         titleFocused
            ? getInlineTokenSuggestionContext(
                 addIssueForm.title,
                 titleCaretPosition,
                 projectOptions,
                 labelOptions
              )
            : null,
      [addIssueForm.title, labelOptions, projectOptions, titleCaretPosition, titleFocused]
   );

   const titlePreviewSegments = useMemo(
      () => buildTitlePreviewSegments(addIssueForm.title, projectOptions, labelOptions),
      [addIssueForm.title, labelOptions, projectOptions]
   );

   useEffect(() => {
      setActiveSuggestionIndex(0);
   }, [inlineSuggestion?.kind, inlineSuggestion?.query, inlineSuggestion?.tokenStart]);

   const focusTitleAt = useCallback((position: number) => {
      const input = titleInputRef.current;
      if (!input) return;

      window.requestAnimationFrame(() => {
         input.focus();
         input.setSelectionRange(position, position);
      });
      setTitleCaretPosition(position);
   }, []);

   useEffect(() => {
      if (!isOpen) {
         setProjectSelectorOpen(false);
         setLabelSelectorOpen(false);
         setTitleFocused(false);
         setActiveSuggestionIndex(0);
         setDraftSubIssues([]);
      }
   }, [isOpen]);

   useEffect(() => {
      if (!canCreateSubIssues) {
         setDraftSubIssues([]);
      }
   }, [canCreateSubIssues]);

   useLayoutEffect(() => {
      const el = titleInputRef.current;
      if (!el) return;
      el.setAttribute('style', `${el.getAttribute('style') ?? ''}; height: auto;`);
      el.setAttribute('style', `${el.getAttribute('style') ?? ''}; height: ${el.scrollHeight}px;`);
   }, [addIssueForm.title]);

   useEffect(() => {
      if (!isOpen) {
         return;
      }

      const input = titleInputRef.current;
      if (!input) {
         return;
      }

      const frame = window.requestAnimationFrame(() => {
         input.focus();
         input.setSelectionRange(addIssueForm.title.length, addIssueForm.title.length);
      });

      return () => window.cancelAnimationFrame(frame);
   }, [addIssueForm.title.length, isOpen]);

   useEffect(() => {
      if (!isOpen) {
         return;
      }

      const handleKeyDown = (event: globalThis.KeyboardEvent) => {
         if (event.defaultPrevented || event.repeat) {
            return;
         }

         if (event.metaKey || event.ctrlKey || !event.altKey || event.shiftKey) {
            return;
         }

         const key = event.key.toLowerCase();

         if (key === 'p') {
            event.preventDefault();
            setLabelSelectorOpen(false);
            setProjectSelectorOpen(true);
            return;
         }

         if (key === 'l') {
            event.preventDefault();
            setProjectSelectorOpen(false);
            setLabelSelectorOpen(true);
         }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
   }, [isOpen]);

   const handleTitleCaretChange = (value: string, selectionStart?: number | null) => {
      setAddIssueForm((current) => ({ ...current, title: value }));
      setTitleCaretPosition(selectionStart ?? value.length);
   };

   const handleInlineSuggestionSelect = (index: number) => {
      const suggestion = inlineSuggestion;

      if (!suggestion) {
         return;
      }

      const item = suggestion.items[index];
      if (!item) {
         return;
      }

      const next = applyInlineTokenSuggestion(
         addIssueForm.title,
         suggestion.tokenStart,
         suggestion.tokenEnd,
         item
      );

      setAddIssueForm((current) => ({ ...current, title: next.title }));
      focusTitleAt(next.cursor);
      setTitleFocused(true);
      setActiveSuggestionIndex(0);
   };

   const addDraftSubIssue = () => {
      setDraftSubIssues((current) => [...current, { id: uuidv4(), title: '' }]);
   };

   const updateDraftSubIssueTitle = (id: string, title: string) => {
      setDraftSubIssues((current) =>
         current.map((subIssue) => (subIssue.id === id ? { ...subIssue, title } : subIssue))
      );
   };

   const removeDraftSubIssue = (id: string) => {
      setDraftSubIssues((current) => current.filter((subIssue) => subIssue.id !== id));
   };

   const handleTitleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (!inlineSuggestion || inlineSuggestion.items.length === 0) {
         return;
      }

      if (event.key === 'ArrowDown') {
         event.preventDefault();
         setActiveSuggestionIndex((current) => (current + 1) % inlineSuggestion.items.length);
         return;
      }

      if (event.key === 'ArrowUp') {
         event.preventDefault();
         setActiveSuggestionIndex(
            (current) =>
               (current - 1 + inlineSuggestion.items.length) % inlineSuggestion.items.length
         );
         return;
      }

      if (event.key === 'Enter' || event.key === 'Tab') {
         event.preventDefault();
         handleInlineSuggestionSelect(activeSuggestionIndex);
         return;
      }

      if (event.key === 'Escape') {
         event.preventDefault();
         setTitleFocused(false);
      }
   };

   const createIssue = useCallback(async () => {
      const finalTitle = inlineDraft.title || addIssueForm.title.trim();
      const finalProject = inlineDraft.project ?? addIssueForm.project;
      const finalArea = finalProject?.id === addIssueForm.project?.id ? addIssueForm.area : null;
      const finalLabels = [...addIssueForm.labels, ...inlineDraft.labels].filter(
         (label, index, currentLabels) =>
            currentLabels.findIndex((item) => item.id === label.id) === index
      );

      if (!finalTitle) {
         toast.error('Title is required');
         return;
      }

      try {
         const subIssueTitles = canCreateSubIssues
            ? draftSubIssues.flatMap((subIssue) => {
                 const title = subIssue.title.trim();
                 return title ? [title] : [];
              })
            : [];

         await createIssueWithSubissues({
            title: finalTitle,
            description: addIssueForm.description,
            status: addIssueForm.status.id,
            priority: addIssueForm.priority.id,
            assigneeId: addIssueForm.assignee?.id ?? null,
            estimatedHours: addIssueForm.estimatedHours ?? null,
            dueDate: addIssueForm.dueDate ?? null,
            parentIssueId: addIssueForm.parent?.id ?? null,
            projectId: finalProject?.id ?? null,
            areaId: finalArea?.id ?? null,
            labelIds: finalLabels.map((label) => label.id),
            subissues: subIssueTitles.map((title) => ({ title })),
         });

         toast.success(
            subIssueTitles.length > 0
               ? `Issue created with ${subIssueTitles.length} sub-issue${subIssueTitles.length > 1 ? 's' : ''}`
               : 'Issue created'
         );

         if (!createMore) {
            closeModal();
         }

         setAddIssueForm(createDefaultData());
         setDraftSubIssues([]);
         setProjectSelectorOpen(false);
         setAreaSelectorOpen(false);
         setLabelSelectorOpen(false);
      } catch (error) {
         console.error('Failed to create issue.', error);
         toast.error('Issue could not be created');
      }
   }, [
      addIssueForm,
      closeModal,
      createIssueWithSubissues,
      createMore,
      createDefaultData,
      draftSubIssues,
      inlineDraft,
      canCreateSubIssues,
   ]);

   useEffect(() => {
      if (!isOpen) {
         return;
      }

      const handleSubmitShortcut = (event: globalThis.KeyboardEvent) => {
         if (event.defaultPrevented || event.repeat) {
            return;
         }

         if (!(event.metaKey || event.ctrlKey) || event.key !== 'Enter') {
            return;
         }

         event.preventDefault();
         void createIssue();
      };

      window.addEventListener('keydown', handleSubmitShortcut);
      return () => window.removeEventListener('keydown', handleSubmitShortcut);
   }, [createIssue, isOpen]);

   return (
      <Dialog open={isOpen} onOpenChange={(value) => (value ? openModal() : closeModal())}>
         <DialogTrigger asChild>
            <Button className="size-8 shrink-0" variant="secondary" size="icon">
               <RiEditLine />
            </Button>
         </DialogTrigger>
         <DialogContent className="w-full sm:max-w-[750px] p-0 shadow-xl top-[30%]">
            <DialogTitle className="sr-only">Create issue</DialogTitle>
            <DialogDescription className="sr-only">
               Create a new issue with optional project, labels, priority, assignee, and estimate.
            </DialogDescription>
            <div className="px-4 pt-4 pb-0 space-y-3 w-full">
               <Popover open={Boolean(inlineSuggestion)}>
                  <PopoverAnchor asChild>
                     <div className="relative w-full">
                        <div
                           aria-hidden="true"
                           className="pointer-events-none absolute inset-0 flex items-start px-0 py-1 text-2xl font-medium leading-tight"
                        >
                           {titlePreviewSegments.length > 0 ? (
                              <div className="whitespace-pre-wrap break-words text-foreground">
                                 {titlePreviewSegments.map(renderTitlePreviewSegment)}
                              </div>
                           ) : (
                              <span className="text-muted-foreground">Issue title</span>
                           )}
                        </div>
                        <Textarea
                           ref={titleInputRef}
                           className="relative z-10 w-full border-none bg-transparent px-0 py-1 text-2xl md:text-2xl font-medium leading-tight text-transparent shadow-none outline-none caret-foreground placeholder:text-transparent focus-visible:ring-0 resize-none overflow-hidden break-words whitespace-pre-wrap min-h-0"
                           placeholder="Issue title"
                           rows={1}
                           value={addIssueForm.title}
                           onChange={(event) =>
                              handleTitleCaretChange(
                                 event.target.value,
                                 event.currentTarget.selectionStart
                              )
                           }
                           onClick={(event) =>
                              setTitleCaretPosition(event.currentTarget.selectionStart ?? 0)
                           }
                           onKeyUp={(event) =>
                              setTitleCaretPosition(event.currentTarget.selectionStart ?? 0)
                           }
                           onSelect={(event) =>
                              setTitleCaretPosition(event.currentTarget.selectionStart ?? 0)
                           }
                           onFocus={() => setTitleFocused(true)}
                           onBlur={() => setTitleFocused(false)}
                           onKeyDown={handleTitleKeyDown}
                        />
                     </div>
                  </PopoverAnchor>
                  <InlineTokenSuggestions
                     suggestion={inlineSuggestion}
                     activeIndex={activeSuggestionIndex}
                     onSelect={(suggestion) => {
                        const index = inlineSuggestion?.items.findIndex(
                           (item) => item.kind === suggestion.kind && item.id === suggestion.id
                        );

                        if (index !== undefined && index >= 0) {
                           handleInlineSuggestionSelect(index);
                        }
                     }}
                  />
               </Popover>

               <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {addIssueForm.parent && (
                     <Badge variant="outline" className="gap-1 rounded-full px-2 py-0.5">
                        <GitBranchPlus className="size-3" />
                        Sub-issue of {addIssueForm.parent.identifier}
                     </Badge>
                  )}
                  <span>Inline tokens:</span>
                  <Badge variant="outline" className="rounded-full px-2 py-0.5">
                     @project
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-2 py-0.5">
                     #tag
                  </Badge>
                  <span>Press space after the token to keep typing.</span>
               </div>

               <Textarea
                  className="border-none w-full shadow-none outline-none resize-none px-0 min-h-16 focus-visible:ring-0 break-words whitespace-normal overflow-wrap"
                  placeholder="Add description..."
                  value={addIssueForm.description}
                  onChange={(e) =>
                     setAddIssueForm((current) => ({ ...current, description: e.target.value }))
                  }
               />

               {canCreateSubIssues && (
                  <div className="space-y-2">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                           <GitBranchPlus className="size-4" />
                           <span>Sub-issues</span>
                        </div>
                        <Button
                           type="button"
                           variant="ghost"
                           size="sm"
                           className="h-7 gap-1 px-2 text-muted-foreground hover:text-foreground"
                           onClick={addDraftSubIssue}
                        >
                           <Plus className="size-4" />
                           Add
                        </Button>
                     </div>
                     {draftSubIssues.length > 0 && (
                        <div className="space-y-1.5">
                           {draftSubIssues.map((subIssue, index) => (
                              <div
                                 key={subIssue.id}
                                 className="flex items-center gap-2 rounded-md bg-secondary/45 px-2 py-1.5"
                              >
                                 <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">
                                    {index + 1}
                                 </span>
                                 <Input
                                    className="h-7 border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
                                    placeholder="Sub-issue title"
                                    value={subIssue.title}
                                    onChange={(event) =>
                                       updateDraftSubIssueTitle(subIssue.id, event.target.value)
                                    }
                                    onKeyDown={(event) => {
                                       if (
                                          event.key === 'Enter' &&
                                          subIssue.title.trim().length > 0
                                       ) {
                                          event.preventDefault();
                                          addDraftSubIssue();
                                       }
                                    }}
                                 />
                                 <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                                    aria-label="Remove sub-issue"
                                    onClick={() => removeDraftSubIssue(subIssue.id)}
                                 >
                                    <X className="size-4" />
                                 </Button>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               )}

               <div className="w-full flex items-center justify-start gap-1.5 flex-wrap">
                  <ProjectSelector
                     project={addIssueForm.project}
                     onChange={(newProject) =>
                        setAddIssueForm((current) => ({
                           ...current,
                           project: newProject,
                           area:
                              current.area && current.area.projectId === newProject?.id
                                 ? current.area
                                 : null,
                        }))
                     }
                     open={projectSelectorOpen}
                     onOpenChange={setProjectSelectorOpen}
                  />
                  <AreaSelector
                     project={addIssueForm.project}
                     area={addIssueForm.area}
                     onChange={(newArea) =>
                        setAddIssueForm((current) => ({ ...current, area: newArea }))
                     }
                     open={areaSelectorOpen}
                     onOpenChange={setAreaSelectorOpen}
                  />
                  <LabelSelector
                     selectedLabels={addIssueForm.labels}
                     onChange={(newLabels) =>
                        setAddIssueForm((current) => ({ ...current, labels: newLabels }))
                     }
                     open={labelSelectorOpen}
                     onOpenChange={setLabelSelectorOpen}
                  />
                  <StatusSelector
                     status={addIssueForm.status}
                     onChange={(newStatus) =>
                        setAddIssueForm((current) => ({ ...current, status: newStatus }))
                     }
                  />
                  <PrioritySelector
                     priority={addIssueForm.priority}
                     onChange={(newPriority) =>
                        setAddIssueForm((current) => ({ ...current, priority: newPriority }))
                     }
                  />
                  <AssigneeSelector
                     assignee={addIssueForm.assignee}
                     onChange={(newAssignee) =>
                        setAddIssueForm((current) => ({ ...current, assignee: newAssignee }))
                     }
                  />
                  <EstimatedHoursSelector
                     estimatedHours={addIssueForm.estimatedHours}
                     onChange={(estimatedHours) =>
                        setAddIssueForm((current) => ({ ...current, estimatedHours }))
                     }
                  />
               </div>
            </div>
            <div className="flex items-center justify-between py-2.5 px-4 w-full border-t">
               <div className="flex items-center gap-2">
                  <div className="flex items-center gap-x-2">
                     <Switch
                        id="create-more"
                        checked={createMore}
                        onCheckedChange={setCreateMore}
                     />
                     <Label htmlFor="create-more">Create more</Label>
                  </div>
               </div>
               <Button
                  size="sm"
                  onClick={() => {
                     void createIssue();
                  }}
               >
                  Create issue
               </Button>
            </div>
         </DialogContent>
      </Dialog>
   );
}
