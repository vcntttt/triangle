'use client';

import { useId, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { Activity, CheckIcon, CircleAlert, CircleHelp, Plus, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
   DialogFooter,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useProjectOptions } from '@/hooks/use-project-options';
import type { Health, Project, ProjectUpdate } from '@/lib/models';
import { health as healthOptions } from '@/lib/ui-catalog';
import { cn } from '@/lib/utils';
import { useProjectCommands } from '@/src/data/projects';
import { projectAreasQuery } from '@/src/data/projects';
import {
   adjustAreaMentions,
   getAreaMentionContext,
   insertAreaMention,
   trimUpdateBody,
} from '@/lib/project-update-mentions';
import { ProjectIconGlyph } from './project-icon';

interface CreateProjectUpdateDialogProps {
   project?: Pick<Project, 'id' | 'name' | 'health'>;
   open?: boolean;
   onOpenChange?: (open: boolean) => void;
   trigger?: ReactNode;
   onProjectUpdate?: (projectId: string, update: ProjectUpdate) => void;
}

export function CreateProjectUpdateDialog({
   project,
   open,
   onOpenChange,
   trigger,
   onProjectUpdate,
}: CreateProjectUpdateDialogProps) {
   const router = useRouter();
   const projects = useProjectOptions();
   const [internalOpen, setInternalOpen] = useState(false);
   const [projectPickerOpen, setProjectPickerOpen] = useState(false);
   const [healthPickerOpen, setHealthPickerOpen] = useState(false);
   const projectListId = useId();
   const healthListId = useId();
   const [projectId, setProjectId] = useState(project?.id ?? '');
   const [selectedHealth, setSelectedHealth] = useState<Health['id']>(
      project?.health.id === 'no-update' || !project ? 'on-track' : project.health.id
   );
   const [body, setBody] = useState('');
   const [areaMentions, setAreaMentions] = useState<
      Array<{ areaId: string; start: number; end: number }>
   >([]);
   const [cursor, setCursor] = useState(0);
   const [activeAreaIndex, setActiveAreaIndex] = useState(0);
   const textareaRef = useRef<HTMLTextAreaElement>(null);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const { createProjectUpdate } = useProjectCommands();

   const isOpen = open ?? internalOpen;
   const setIsOpen = onOpenChange ?? setInternalOpen;
   const [previousOpen, setPreviousOpen] = useState(isOpen);
   const selectedProject = project ?? projects.find((item) => item.id === projectId);
   const targetProjectId = project?.id ?? projectId;
   const { data: areas = [] } = useQuery({
      ...projectAreasQuery(targetProjectId),
      enabled: Boolean(targetProjectId),
   });
   const areaSuggestion = useMemo(
      () => getAreaMentionContext(body, cursor, areas),
      [areas, body, cursor]
   );
   const selectedHealthOption =
      healthOptions.find((item) => item.id === selectedHealth) ?? healthOptions[0];

   const resetForm = () => {
      setProjectId(project?.id ?? '');
      setSelectedHealth(
         project?.health.id && project.health.id !== 'no-update' ? project.health.id : 'on-track'
      );
      setBody('');
      setAreaMentions([]);
      setCursor(0);
      setProjectPickerOpen(false);
      setHealthPickerOpen(false);
   };

   if (isOpen !== previousOpen) {
      setPreviousOpen(isOpen);

      if (isOpen) {
         resetForm();
      }
   }

   const handleOpenChange = (nextOpen: boolean) => {
      if (nextOpen) {
         resetForm();
      }

      setIsOpen(nextOpen);
   };

   const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmed = trimUpdateBody(body, areaMentions);

      if (!targetProjectId) {
         toast.error('Choose a project first');
         return;
      }

      if (!trimmed.body) {
         toast.error('Project update cannot be empty');
         return;
      }

      setIsSubmitting(true);

      try {
         const update = await createProjectUpdate({
            projectId: targetProjectId,
            health: selectedHealth,
            body: trimmed.body,
            areaMentions: trimmed.mentions,
         });

         onProjectUpdate?.(targetProjectId, update);
         await router.invalidate();
         setIsOpen(false);
         toast.success('Project update posted');
      } catch (error) {
         console.error('Failed to create project update.', error);
         toast.error('Project update could not be posted');
      } finally {
         setIsSubmitting(false);
      }
   };

   const selectArea = (index: number) => {
      if (!areaSuggestion) return;
      const area = areaSuggestion.items[index];
      if (!area) return;
      const inserted = insertAreaMention(body, areaSuggestion.start, areaSuggestion.end, area);
      setBody(inserted.body);
      setAreaMentions((current) => [...current, inserted.mention]);
      setCursor(inserted.cursor);
      setActiveAreaIndex(0);
      requestAnimationFrame(() => {
         textareaRef.current?.focus();
         textareaRef.current?.setSelectionRange(inserted.cursor, inserted.cursor);
      });
   };

   const handleBodyKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!areaSuggestion) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
         event.preventDefault();
         const direction = event.key === 'ArrowDown' ? 1 : -1;
         setActiveAreaIndex(
            (current) =>
               (current + direction + areaSuggestion.items.length) % areaSuggestion.items.length
         );
      } else if (event.key === 'Enter' || event.key === 'Tab') {
         event.preventDefault();
         selectArea(activeAreaIndex);
      } else if (event.key === 'Escape') {
         setCursor(-1);
      }
   };

   return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
         {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
         <DialogContent className="w-full p-0 shadow-xl sm:max-w-[750px] top-[30%]">
            <DialogHeader className="px-4 pt-4 pb-0">
               <DialogTitle className="text-2xl font-medium leading-tight">
                  New project update
               </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
               <div className="px-4 pt-3 pb-4 space-y-4">
                  <div className="relative">
                     <Textarea
                        ref={textareaRef}
                        id="project-update-body"
                        value={body}
                        onChange={(event) => {
                           const nextBody = event.target.value;
                           setAreaMentions((current) =>
                              adjustAreaMentions(body, nextBody, current)
                           );
                           setBody(nextBody);
                           setCursor(event.target.selectionStart);
                           setActiveAreaIndex(0);
                        }}
                        onSelect={(event) => setCursor(event.currentTarget.selectionStart)}
                        onKeyDown={handleBodyKeyDown}
                        placeholder={
                           selectedProject
                              ? `What's changed in ${selectedProject.name}?`
                              : "What's changed?"
                        }
                        className="min-h-36 resize-none border-none px-0 text-base shadow-none focus-visible:ring-0"
                     />
                     {areaSuggestion ? (
                        <div
                           role="listbox"
                           aria-label="Project areas"
                           className="absolute inset-x-0 top-full z-50 mt-1 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                        >
                           <div className="px-2 py-1 text-xs text-muted-foreground">Areas</div>
                           {areaSuggestion.items.map((area, index) => (
                              <button
                                 key={area.id}
                                 type="button"
                                 role="option"
                                 aria-selected={index === activeAreaIndex}
                                 className={cn(
                                    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm',
                                    index === activeAreaIndex && 'bg-accent text-accent-foreground'
                                 )}
                                 onMouseDown={(event) => event.preventDefault()}
                                 onClick={() => selectArea(index)}
                              >
                                 <span
                                    className="size-2.5 rounded-full"
                                    style={{ backgroundColor: area.color }}
                                 />
                                 <span className="flex-1 truncate">{area.name}</span>
                                 <span className="text-xs text-muted-foreground">
                                    @{area.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                                 </span>
                              </button>
                           ))}
                        </div>
                     ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                     {project ? (
                        <Button
                           type="button"
                           size="xs"
                           variant="secondary"
                           className="gap-1.5"
                           disabled
                        >
                           <Activity className="size-4" />
                           <span className="max-w-[180px] truncate">{project.name}</span>
                        </Button>
                     ) : (
                        <Popover open={projectPickerOpen} onOpenChange={setProjectPickerOpen}>
                           <PopoverTrigger asChild>
                              <Button
                                 type="button"
                                 size="xs"
                                 variant="secondary"
                                 className="gap-1.5"
                                 role="combobox"
                                 aria-expanded={projectPickerOpen}
                                 aria-controls={projectListId}
                              >
                                 <Activity className="size-4" />
                                 <span className="max-w-[180px] truncate">
                                    {selectedProject?.name ?? 'Project'}
                                 </span>
                              </Button>
                           </PopoverTrigger>
                           <PopoverContent className="w-72 p-0" align="start">
                              <Command>
                                 <CommandInput placeholder="Set project..." />
                                 <CommandList id={projectListId}>
                                    <CommandEmpty>No projects found.</CommandEmpty>
                                    <CommandGroup>
                                       {projects.map((item) => (
                                          <CommandItem
                                             key={item.id}
                                             value={`${item.name} ${item.id}`}
                                             onSelect={() => {
                                                setProjectId(item.id);
                                                setAreaMentions([]);
                                                setProjectPickerOpen(false);
                                             }}
                                             className="flex items-center justify-between"
                                          >
                                             <div className="flex min-w-0 items-center gap-2">
                                                <ProjectIconGlyph
                                                   icon={item.iconConfig}
                                                   className="size-4 shrink-0"
                                                />
                                                <span className="truncate">{item.name}</span>
                                             </div>
                                             {projectId === item.id && (
                                                <CheckIcon className="ml-auto size-4" />
                                             )}
                                          </CommandItem>
                                       ))}
                                    </CommandGroup>
                                 </CommandList>
                              </Command>
                           </PopoverContent>
                        </Popover>
                     )}

                     <Popover open={healthPickerOpen} onOpenChange={setHealthPickerOpen}>
                        <PopoverTrigger asChild>
                           <Button
                              type="button"
                              size="xs"
                              variant="secondary"
                              className="gap-1.5"
                              role="combobox"
                              aria-expanded={healthPickerOpen}
                              aria-controls={healthListId}
                           >
                              <HealthDot health={selectedHealth} />
                              {selectedHealthOption.name}
                           </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-0" align="start">
                           <Command>
                              <CommandInput placeholder="Set health..." />
                              <CommandList id={healthListId}>
                                 <CommandEmpty>No health found.</CommandEmpty>
                                 <CommandGroup>
                                    {healthOptions.flatMap((item) =>
                                       item.id === 'no-update' ? (
                                          []
                                       ) : (
                                          <CommandItem
                                             key={item.id}
                                             value={item.id}
                                             onSelect={() => {
                                                setSelectedHealth(item.id);
                                                setHealthPickerOpen(false);
                                             }}
                                             className="flex items-center justify-between"
                                          >
                                             <div className="flex items-center gap-2">
                                                <HealthDot health={item.id} />
                                                {item.name}
                                             </div>
                                             {selectedHealth === item.id && (
                                                <CheckIcon className="ml-auto size-4" />
                                             )}
                                          </CommandItem>
                                       )
                                    )}
                                 </CommandGroup>
                              </CommandList>
                           </Command>
                        </PopoverContent>
                     </Popover>
                  </div>
               </div>

               <DialogFooter className="flex-row items-center justify-end border-t px-4 py-2.5">
                  <Button
                     size="sm"
                     type="submit"
                     disabled={isSubmitting || (!project && !projectId)}
                  >
                     {isSubmitting ? (
                        'Posting...'
                     ) : (
                        <>
                           <Send className="size-4" />
                           Post update
                        </>
                     )}
                  </Button>
               </DialogFooter>
            </form>
         </DialogContent>
      </Dialog>
   );
}

function HealthDot({ health }: { health: Health['id'] }) {
   return (
      <span
         className={cn(
            'inline-flex size-4 items-center justify-center rounded-full',
            health === 'on-track' && 'bg-green-500/15 text-green-500',
            health === 'at-risk' && 'bg-amber-500/15 text-amber-500',
            health === 'off-track' && 'bg-red-500/15 text-red-500',
            health === 'no-update' && 'bg-muted text-muted-foreground'
         )}
      >
         {health === 'off-track' ? (
            <CircleAlert className="size-3" />
         ) : health === 'no-update' ? (
            <CircleHelp className="size-3" />
         ) : (
            <Activity className="size-3" />
         )}
      </span>
   );
}

export function CreateProjectUpdateButton({ disabled = false }: { disabled?: boolean }) {
   return (
      <CreateProjectUpdateDialog
         trigger={
            <Button className="relative" size="xs" variant="secondary" disabled={disabled}>
               <Plus className="size-4" />
               <span className="hidden sm:inline ml-1">New update</span>
            </Button>
         }
      />
   );
}
