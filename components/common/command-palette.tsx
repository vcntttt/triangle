'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
   ArrowLeft,
   Check,
   Clipboard,
   FolderKanban,
   FolderOpen,
   ListTodo,
   Plus,
   Settings,
   Tag,
   UserRound,
} from 'lucide-react';
import {
   CommandDialog,
   CommandEmpty,
   CommandGroup,
   CommandInput,
   CommandItem,
   CommandList,
   CommandSeparator,
   CommandShortcut,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { useCreateIssueStore } from '@/store/create-issue-store';
import {
   useIssueCommands,
   globalIssueSearchQuery,
   issueDetailQuery,
   issuesPageQuery,
} from '@/src/data/issues';
import { useLabelOptions } from '@/hooks/use-label-options';
import { useProjectOptions } from '@/hooks/use-project-options';
import {
   hasOpenKeyboardBlockingLayer,
   isEditableTarget,
} from '@/components/common/shortcuts/keyboard-utils';

type ContextAction = 'status' | 'priority' | 'labels' | 'project';

function slugify(value: string) {
   return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
}

async function copyText(value: string, label: string) {
   try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
   } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`);
   }
}

export function CommandPalette() {
   const navigate = useNavigate();
   const location = useRouterState({ select: (state) => state.location });
   const { openModal } = useCreateIssueStore();
   const { updateIssue, setIssueStatus } = useIssueCommands();
   const labels = useLabelOptions();
   const projects = useProjectOptions();
   const [open, setOpen] = useState(false);
   const [query, setQuery] = useState('');
   const [contextAction, setContextAction] = useState<ContextAction | null>(null);

   const currentIssueIdentifier = useMemo(() => {
      const pathname = location.pathname;
      if (pathname.startsWith('/issues/') && pathname.split('/')[2]) {
         return pathname.split('/')[2];
      }

      const search = location.search as { issue?: string };
      return search.issue;
   }, [location.pathname, location.search]);
   const currentIssueQuery = useQuery({
      ...issueDetailQuery(currentIssueIdentifier ?? ''),
      enabled: Boolean(currentIssueIdentifier),
   });
   const searchQuery = useQuery({
      ...globalIssueSearchQuery(query),
      enabled: open && query.trim().length > 0,
   });
   const issueOptionsQuery = useQuery({
      ...issuesPageQuery(),
      enabled: open,
   });
   const currentIssue = currentIssueQuery.data;

   useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
         if (
            (event.metaKey || event.ctrlKey) &&
            event.key.toLowerCase() === 'k' &&
            !event.repeat &&
            !isEditableTarget(event.target) &&
            !hasOpenKeyboardBlockingLayer()
         ) {
            event.preventDefault();
            setOpen((value) => !value);
         }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
   }, []);

   useEffect(() => {
      if (!open) {
         setQuery('');
         setContextAction(null);
      }
   }, [open]);

   const close = () => setOpen(false);
   const navigateTo = (to: '/issues' | '/my-work' | '/projects' | '/settings') => {
      close();
      void navigate({ to });
   };

   const handleContextAction = async (value: string) => {
      if (!currentIssue) return;

      try {
         if (contextAction === 'status') {
            await setIssueStatus({ issueId: currentIssue.id, status: value });
         } else if (contextAction === 'priority') {
            await updateIssue({ issueId: currentIssue.id, priority: value });
         } else if (contextAction === 'project') {
            await updateIssue({
               issueId: currentIssue.id,
               projectId: value === 'no-project' ? null : value,
            });
         } else {
            const labelIds = currentIssue.labels.some((label) => label.id === value)
               ? currentIssue.labels.filter((label) => label.id !== value).map((label) => label.id)
               : [...currentIssue.labels.map((label) => label.id), value];
            await updateIssue({ issueId: currentIssue.id, labelIds });
         }

         toast.success('Issue updated');
         close();
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Issue could not be updated.');
      }
   };

   const issueStatusOptions = issueOptionsQuery.data?.statusOptions ?? [];
   const issuePriorityOptions = issueOptionsQuery.data?.priorityOptions ?? [];

   return (
      <CommandDialog
         open={open}
         onOpenChange={setOpen}
         title="Command palette"
         description="Navigate and act on your Triangle workspace."
      >
         {contextAction ? (
            <>
               <div className="flex items-center gap-2 border-b px-3 py-2">
                  <Button
                     variant="ghost"
                     size="icon"
                     className="size-7"
                     onClick={() => setContextAction(null)}
                  >
                     <ArrowLeft className="size-4" />
                     <span className="sr-only">Back</span>
                  </Button>
                  <span className="text-sm font-medium capitalize">Set {contextAction}</span>
               </div>
               <CommandInput placeholder={`Choose ${contextAction}...`} />
               <CommandList>
                  <CommandEmpty>No options found.</CommandEmpty>
                  {contextAction === 'status' && (
                     <CommandGroup heading="Status">
                        {issueStatusOptions.map((status) => (
                           <CommandItem
                              key={status.id}
                              value={`${status.name} ${status.id}`}
                              onSelect={() => void handleContextAction(status.id)}
                           >
                              {status.name}
                              {currentIssue?.status === status.id ? (
                                 <Check className="ml-auto size-4" />
                              ) : null}
                           </CommandItem>
                        ))}
                     </CommandGroup>
                  )}
                  {contextAction === 'priority' && (
                     <CommandGroup heading="Priority">
                        {issuePriorityOptions.map((priority) => (
                           <CommandItem
                              key={priority.id}
                              value={`${priority.name} ${priority.id}`}
                              onSelect={() => void handleContextAction(priority.id)}
                           >
                              {priority.name}
                              {currentIssue?.priority === priority.id ? (
                                 <Check className="ml-auto size-4" />
                              ) : null}
                           </CommandItem>
                        ))}
                     </CommandGroup>
                  )}
                  {contextAction === 'labels' && (
                     <CommandGroup heading="Labels">
                        {labels.map((label) => (
                           <CommandItem
                              key={label.id}
                              value={`${label.name} ${label.id}`}
                              onSelect={() => void handleContextAction(label.id)}
                           >
                              <Tag className="size-4" style={{ color: label.color }} />
                              {label.name}
                              {currentIssue?.labels.some((item) => item.id === label.id) ? (
                                 <Check className="ml-auto size-4" />
                              ) : null}
                           </CommandItem>
                        ))}
                     </CommandGroup>
                  )}
                  {contextAction === 'project' && (
                     <CommandGroup heading="Project">
                        <CommandItem
                           value="no project"
                           onSelect={() => void handleContextAction('no-project')}
                        >
                           <FolderOpen className="size-4" />
                           No project
                        </CommandItem>
                        {projects.map((project) => (
                           <CommandItem
                              key={project.id}
                              value={`${project.name} ${project.key}`}
                              onSelect={() => void handleContextAction(project.id)}
                           >
                              <FolderOpen className="size-4" />
                              {project.name}
                              {currentIssue?.project?.id === project.id ? (
                                 <Check className="ml-auto size-4" />
                              ) : null}
                           </CommandItem>
                        ))}
                     </CommandGroup>
                  )}
               </CommandList>
            </>
         ) : (
            <>
               <CommandInput
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search commands, issues, or projects..."
               />
               <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  {!query.trim() && (
                     <>
                        <CommandGroup heading="Navigate">
                           <CommandItem onSelect={() => navigateTo('/issues')}>
                              <ListTodo className="size-4" />
                              Issues
                           </CommandItem>
                           <CommandItem onSelect={() => navigateTo('/my-work')}>
                              <UserRound className="size-4" />
                              My work
                           </CommandItem>
                           <CommandItem onSelect={() => navigateTo('/projects')}>
                              <FolderKanban className="size-4" />
                              Projects
                           </CommandItem>
                           <CommandItem onSelect={() => navigateTo('/settings')}>
                              <Settings className="size-4" />
                              Settings
                           </CommandItem>
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup heading="Actions">
                           <CommandItem
                              onSelect={() => {
                                 close();
                                 openModal();
                              }}
                           >
                              <Plus className="size-4" />
                              Create issue
                              <CommandShortcut>C</CommandShortcut>
                           </CommandItem>
                        </CommandGroup>
                     </>
                  )}
                  {currentIssue && !query.trim() && (
                     <>
                        <CommandSeparator />
                        <CommandGroup
                           heading={`${currentIssue.identifier} · ${currentIssue.title}`}
                        >
                           <CommandItem onSelect={() => setContextAction('status')}>
                              Change status
                           </CommandItem>
                           <CommandItem onSelect={() => setContextAction('priority')}>
                              Change priority
                           </CommandItem>
                           <CommandItem onSelect={() => setContextAction('labels')}>
                              Change labels
                           </CommandItem>
                           <CommandItem onSelect={() => setContextAction('project')}>
                              Change project
                           </CommandItem>
                           <CommandItem
                              onSelect={() => void copyText(currentIssue.identifier, 'Issue ID')}
                           >
                              <Clipboard className="size-4" /> Copy ID
                           </CommandItem>
                           <CommandItem
                              onSelect={() =>
                                 void copyText(
                                    `${window.location.origin}/issues/${currentIssue.identifier}`,
                                    'Issue URL'
                                 )
                              }
                           >
                              <Clipboard className="size-4" /> Copy URL
                           </CommandItem>
                           <CommandItem
                              onSelect={() =>
                                 void copyText(
                                    `- [ ] ${currentIssue.identifier}: ${currentIssue.title}`,
                                    'Issue Markdown'
                                 )
                              }
                           >
                              <Clipboard className="size-4" /> Copy Markdown
                           </CommandItem>
                           <CommandItem
                              onSelect={() =>
                                 void copyText(
                                    `${currentIssue.identifier.toLowerCase()}-${slugify(currentIssue.title)}`,
                                    'Branch name'
                                 )
                              }
                           >
                              <Clipboard className="size-4" /> Copy branch name
                           </CommandItem>
                        </CommandGroup>
                     </>
                  )}
                  {query.trim() && searchQuery.data?.issues.length ? (
                     <CommandGroup heading="Issues">
                        {searchQuery.data.issues.map((issue) => (
                           <CommandItem
                              key={issue.id}
                              value={`${issue.identifier} ${issue.title}`}
                              onSelect={() => {
                                 close();
                                 void navigate({
                                    to: '/issues/$issueIdentifier',
                                    params: { issueIdentifier: issue.identifier },
                                 });
                              }}
                           >
                              <ListTodo className="size-4" />
                              <span className="truncate">
                                 {issue.identifier} · {issue.title}
                              </span>
                           </CommandItem>
                        ))}
                     </CommandGroup>
                  ) : null}
                  {query.trim() && searchQuery.data?.projects.length ? (
                     <CommandGroup heading="Projects">
                        {searchQuery.data.projects.map((project) => (
                           <CommandItem
                              key={project.id}
                              value={`${project.name} ${project.key}`}
                              onSelect={() => {
                                 close();
                                 void navigate({
                                    to: '/projects/$projectSlug',
                                    params: { projectSlug: project.slug },
                                 });
                              }}
                           >
                              <FolderKanban className="size-4" />
                              <span className="truncate">{project.name}</span>
                           </CommandItem>
                        ))}
                     </CommandGroup>
                  ) : null}
               </CommandList>
            </>
         )}
      </CommandDialog>
   );
}
