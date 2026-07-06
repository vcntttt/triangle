'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { IssueListItem } from '@/lib/db/issues';
import { viewerProfileToUser } from '@/lib/current-user';
import { toPresentationIssue } from '@/lib/issues-presentation';
import { type Issue, archivedStatus, sortIssuesByPriority } from '@/lib/ui-catalog';
import { cn } from '@/lib/utils';
import { useFilterStore } from '@/store/filter-store';
import {
   IssuesDataProvider,
   useIssuesData,
   type IssuesData,
} from '@/components/common/issues/issues-data-context';
import { useSearchStore } from '@/store/search-store';
import { useViewStore } from '@/store/view-store';
import { useViewerProfile } from '@/src/data/viewer';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { CustomDragLayer } from './issue-grid';
import { GroupIssues } from './group-issues';
import { getIssueListRows } from './group-issue-rows';
import { IssueActionCommand, type IssueActionKind } from './issue-action-command';
import { IssueDetail } from './issue-detail';
import { SearchIssues } from './search-issues';
import { IssuesStatusProvider, useIssuesStatuses } from './issues-status-context';
import type { ProjectOptionLike } from '@/lib/projects-presentation';
import { groupIssuesForDisplayByStatus } from '@/lib/issue-status-groups';
import {
   hasOpenKeyboardBlockingLayer,
   isEditableTarget,
} from '@/components/common/shortcuts/keyboard-utils';

interface IssuesWorkspaceProps {
   initialIssues: IssueListItem[];
   initialStatuses: ProjectOptionLike[];
   databaseError: string | null;
   selectedIssueIdentifier?: string;
   projectFilterId?: string;
   onSelectIssue?: (issue: Issue) => void;
   onClearSelectedIssue?: () => void;
   onSelectAdjacentIssue?: (issue: Issue) => void;
   emptyCopy?: {
      title: string;
      description: string;
   };
}

function useIssueWorkspaceShortcuts({
   selectedIssue,
   visibleNavigationIssues,
   selectedIssueCount,
   actionTargetIssuesCount,
   onSelectIssue,
   onToggleIssueSelection,
   onClearIssueSelection,
   onOpenIssueActionPicker,
}: {
   selectedIssue?: Issue;
   visibleNavigationIssues: Issue[];
   selectedIssueCount: number;
   actionTargetIssuesCount: number;
   onSelectIssue: (issue: Issue) => void;
   onToggleIssueSelection: (issueId: string) => void;
   onClearIssueSelection: () => void;
   onOpenIssueActionPicker: (action: IssueActionKind) => void;
}) {
   useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
         if (event.metaKey || event.ctrlKey || event.altKey) {
            return;
         }

         if (isEditableTarget(event.target) || hasOpenKeyboardBlockingLayer()) {
            return;
         }

         const normalizedKey = event.key.toLowerCase();
         const isMoveDown = event.key === 'ArrowDown' || normalizedKey === 'j';
         const isMoveUp = event.key === 'ArrowUp' || normalizedKey === 'k';

         if (isMoveDown || isMoveUp) {
            event.preventDefault();

            if (visibleNavigationIssues.length === 0) {
               return;
            }

            const direction = isMoveDown ? 1 : -1;
            const currentIndex = selectedIssue
               ? visibleNavigationIssues.findIndex((issue) => issue.id === selectedIssue.id)
               : -1;
            const nextIndex =
               currentIndex === -1
                  ? direction === 1
                     ? 0
                     : visibleNavigationIssues.length - 1
                  : Math.min(
                       Math.max(currentIndex + direction, 0),
                       visibleNavigationIssues.length - 1
                    );
            const nextIssue = visibleNavigationIssues[nextIndex];

            if (nextIssue) {
               onSelectIssue(nextIssue);
            }

            return;
         }

         if (event.repeat) {
            return;
         }

         if (event.key === 'Escape') {
            if (selectedIssueCount === 0) {
               return;
            }

            event.preventDefault();
            onClearIssueSelection();
            return;
         }

         if (!event.shiftKey && normalizedKey === 'x') {
            if (!selectedIssue) {
               return;
            }

            event.preventDefault();
            onToggleIssueSelection(selectedIssue.id);
            return;
         }

         if (!event.shiftKey && normalizedKey === 's') {
            if (actionTargetIssuesCount === 0) {
               return;
            }

            event.preventDefault();
            onOpenIssueActionPicker('status');
            return;
         }

         if (!event.shiftKey && normalizedKey === 'l') {
            if (actionTargetIssuesCount === 0) {
               return;
            }

            event.preventDefault();
            onOpenIssueActionPicker('label');
            return;
         }

         if (!event.shiftKey && normalizedKey === 'p') {
            if (actionTargetIssuesCount === 0) {
               return;
            }

            event.preventDefault();
            onOpenIssueActionPicker('priority');
            return;
         }

         if (event.shiftKey && normalizedKey === 'p') {
            if (actionTargetIssuesCount === 0) {
               return;
            }

            event.preventDefault();
            onOpenIssueActionPicker('project');
         }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
   }, [
      actionTargetIssuesCount,
      onClearIssueSelection,
      onOpenIssueActionPicker,
      onSelectIssue,
      onToggleIssueSelection,
      selectedIssue,
      selectedIssueCount,
      visibleNavigationIssues,
   ]);
}

export function IssuesWorkspace({
   initialIssues,
   initialStatuses,
   databaseError,
   selectedIssueIdentifier,
   projectFilterId,
   onSelectIssue,
   onClearSelectedIssue,
   onSelectAdjacentIssue,
   emptyCopy,
}: IssuesWorkspaceProps) {
   const viewerProfile = useViewerProfile();
   const viewer = useMemo(() => viewerProfileToUser(viewerProfile), [viewerProfile]);
   const hydratedIssues = useMemo(
      () => initialIssues.map((issue) => toPresentationIssue(issue, initialStatuses, viewer)),
      [initialIssues, initialStatuses, viewer]
   );

   return (
      <IssuesDataProvider issues={hydratedIssues}>
         <IssuesWorkspaceContent
            initialStatuses={initialStatuses}
            databaseError={databaseError}
            selectedIssueIdentifier={selectedIssueIdentifier}
            projectFilterId={projectFilterId}
            onSelectIssue={onSelectIssue}
            onClearSelectedIssue={onClearSelectedIssue}
            onSelectAdjacentIssue={onSelectAdjacentIssue}
            emptyCopy={emptyCopy}
         />
      </IssuesDataProvider>
   );
}

function IssuesWorkspaceContent({
   initialStatuses,
   databaseError,
   selectedIssueIdentifier,
   projectFilterId,
   onSelectIssue,
   onClearSelectedIssue,
   onSelectAdjacentIssue,
   emptyCopy,
}: Omit<IssuesWorkspaceProps, 'initialIssues'>) {
   const { issues, filterIssues } = useIssuesData();
   const { isSearchOpen, searchQuery } = useSearchStore();
   const { filters, hasActiveFilters } = useFilterStore();
   const { hideCompletedIssues, showEmptyStatuses, viewType } = useViewStore();
   const navigate = useNavigate();
   const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(() => new Set());
   const [issueAction, setIssueAction] = useState<IssueActionKind | null>(null);

   const selectedIssue = useMemo(
      () => issues.find((issue) => issue.identifier === selectedIssueIdentifier),
      [issues, selectedIssueIdentifier]
   );

   const isSearching = isSearchOpen && searchQuery.trim() !== '';
   const isFiltering = hasActiveFilters();
   const visibleIssues = issues.filter((issue) => issue.status.id !== archivedStatus.id);
   const storeFilteredIssues = isFiltering ? filterIssues(filters) : visibleIssues;
   const filteredIssues = projectFilterId
      ? storeFilteredIssues.filter((issue) => issue.project?.id === projectFilterId)
      : storeFilteredIssues;
   const displayIssues = useMemo(
      () =>
         hideCompletedIssues
            ? filteredIssues.filter((issue) => issue.status.id !== 'completed')
            : filteredIssues,
      [filteredIssues, hideCompletedIssues]
   );
   const searchResults = useMemo(() => {
      const normalizedQuery = searchQuery.trim().toLowerCase();

      if (!normalizedQuery) {
         return [];
      }

      return displayIssues.filter(
         (issue) =>
            issue.title.toLowerCase().includes(normalizedQuery) ||
            issue.identifier.toLowerCase().includes(normalizedQuery)
      );
   }, [displayIssues, searchQuery]);
   const visibleNavigationIssues = useMemo(() => {
      if (isSearching) {
         return searchResults;
      }

      const issuesByStatus = groupIssuesForDisplayByStatus(displayIssues);
      const statusIds: string[] = [];

      for (const status of initialStatuses) {
         if (showEmptyStatuses || (issuesByStatus[status.id] ?? []).length > 0) {
            statusIds.push(status.id);
         }
      }

      return statusIds.flatMap((statusId) => {
         const statusIssues = issuesByStatus[statusId] ?? [];

         if (viewType === 'grid') {
            return sortIssuesByPriority(statusIssues);
         }

         return getIssueListRows(statusIssues).map((row) => row.issue);
      });
   }, [displayIssues, initialStatuses, isSearching, searchResults, showEmptyStatuses, viewType]);
   const actionTargetIssues = useMemo(() => {
      if (selectedIssueIds.size > 0) {
         return issues.filter((issue) => selectedIssueIds.has(issue.id));
      }

      return selectedIssue ? [selectedIssue] : [];
   }, [issues, selectedIssue, selectedIssueIds]);

   useEffect(() => {
      setSelectedIssueIds((current) => {
         const validIssueIds = new Set(issues.map((issue) => issue.id));
         const next = new Set([...current].filter((issueId) => validIssueIds.has(issueId)));

         return next.size === current.size ? current : next;
      });
   }, [issues]);

   useIssueWorkspaceShortcuts({
      selectedIssue,
      visibleNavigationIssues,
      selectedIssueCount: selectedIssueIds.size,
      actionTargetIssuesCount: actionTargetIssues.length,
      onSelectIssue: handleSelectIssue,
      onToggleIssueSelection: toggleIssueSelection,
      onClearIssueSelection: () => setSelectedIssueIds(new Set()),
      onOpenIssueActionPicker: openIssueActionPicker,
   });

   if (databaseError) {
      return (
         <div className="w-full p-6">
            <div className="rounded-lg border bg-container p-6 max-w-2xl">
               <h2 className="text-sm font-semibold">Database unavailable</h2>
               <p className="mt-2 text-sm text-muted-foreground">{databaseError}</p>
            </div>
         </div>
      );
   }

   if (issues.length === 0) {
      return (
         <div className="w-full p-6">
            <div className="rounded-lg border bg-container p-6 max-w-2xl">
               <h2 className="text-sm font-semibold">{emptyCopy?.title ?? 'No issues yet'}</h2>
               <p className="mt-2 text-sm text-muted-foreground">
                  {emptyCopy?.description ??
                     'There are no issues yet. Create your first issue from the sidebar composer.'}
               </p>
            </div>
         </div>
      );
   }

   return (
      <IssuesStatusProvider statuses={initialStatuses}>
         <DndProvider backend={HTML5Backend}>
            <CustomDragLayer />
            <IssueActionCommand
               open={issueAction !== null}
               action={issueAction}
               targetIssues={actionTargetIssues}
               onOpenChange={(open) => {
                  if (!open) {
                     setIssueAction(null);
                  }
               }}
            />
            <div className="h-full w-full">
               <div className={cn('h-full lg:hidden', selectedIssue ? 'hidden' : 'block')}>
                  <IssuesListPanel
                     issues={filteredIssues}
                     showEmptyStatuses={showEmptyStatuses}
                     isSearching={isSearching}
                     searchIssues={displayIssues}
                     selectedIssueIdentifier={selectedIssueIdentifier}
                     selectedIssueIds={selectedIssueIds}
                     onSelectIssue={handleSelectIssue}
                     onToggleIssueSelection={handleToggleIssueSelection}
                  />
               </div>

               <div className={cn('h-full lg:hidden', selectedIssue ? 'block' : 'hidden')}>
                  {selectedIssue ? (
                     <IssueDetail
                        issueId={selectedIssue.id}
                        initialIssue={selectedIssue}
                        onDelete={navigateToAdjacentIssue}
                        onArchive={navigateToAdjacentIssue}
                        onMobileBack={handleClearSelectedIssue}
                        mobileBack
                     />
                  ) : null}
               </div>

               <ResizablePanelGroup direction="horizontal" className="hidden lg:flex h-full w-full">
                  <ResizablePanel defaultSize={60} minSize={32}>
                     <IssuesListPanel
                        issues={filteredIssues}
                        showEmptyStatuses={showEmptyStatuses}
                        isSearching={isSearching}
                        searchIssues={displayIssues}
                        selectedIssueIdentifier={selectedIssueIdentifier}
                        selectedIssueIds={selectedIssueIds}
                        onSelectIssue={handleSelectIssue}
                        onToggleIssueSelection={handleToggleIssueSelection}
                     />
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={40} minSize={28}>
                     {selectedIssue ? (
                        <IssueDetail
                           issueId={selectedIssue.id}
                           initialIssue={selectedIssue}
                           onDelete={navigateToAdjacentIssue}
                           onArchive={navigateToAdjacentIssue}
                        />
                     ) : (
                        <EmptyPreview />
                     )}
                  </ResizablePanel>
               </ResizablePanelGroup>
            </div>
         </DndProvider>
      </IssuesStatusProvider>
   );

   function toggleIssueSelection(issueId: string) {
      setSelectedIssueIds((current) => {
         const next = new Set(current);

         if (next.has(issueId)) {
            next.delete(issueId);
         } else {
            next.add(issueId);
         }

         return next;
      });
   }

   function handleToggleIssueSelection(issue: Issue) {
      toggleIssueSelection(issue.id);
   }

   function openIssueActionPicker(action: IssueActionKind) {
      if (actionTargetIssues.length === 0) {
         return;
      }

      setIssueAction(action);
   }

   function navigateToAdjacentIssue(issueId: string) {
      const currentIndex = filteredIssues.findIndex((issue) => issue.id === issueId);
      const nextIssue = filteredIssues[currentIndex + 1] ?? filteredIssues[currentIndex - 1];

      if (nextIssue) {
         if (onSelectAdjacentIssue) {
            onSelectAdjacentIssue(nextIssue);
            return;
         }

         void navigate({
            to: '/issues/$issueIdentifier',
            params: { issueIdentifier: nextIssue.identifier },
            search: projectFilterId ? { projectId: projectFilterId } : {},
            replace: true,
         });
         return;
      }

      if (onClearSelectedIssue) {
         onClearSelectedIssue();
         return;
      }

      void navigate({
         to: '/issues',
         search: projectFilterId ? { projectId: projectFilterId } : {},
      });
   }

   function handleSelectIssue(issue: Issue) {
      if (onSelectIssue) {
         onSelectIssue(issue);
         return;
      }

      void navigate({
         to: '/issues/$issueIdentifier',
         params: { issueIdentifier: issue.identifier },
         search: projectFilterId ? { projectId: projectFilterId } : {},
      });
   }

   function handleClearSelectedIssue() {
      if (onClearSelectedIssue) {
         onClearSelectedIssue();
         return;
      }

      void navigate({
         to: '/issues',
         search: projectFilterId ? { projectId: projectFilterId } : {},
      });
   }
}

function IssuesListPanel({
   issues,
   showEmptyStatuses,
   isSearching,
   searchIssues,
   selectedIssueIdentifier,
   selectedIssueIds,
   onSelectIssue,
   onToggleIssueSelection,
}: {
   issues: IssuesData['issues'];
   showEmptyStatuses: boolean;
   isSearching: boolean;
   searchIssues: IssuesData['issues'];
   selectedIssueIdentifier?: string;
   selectedIssueIds: Set<string>;
   onSelectIssue: (issue: Issue) => void;
   onToggleIssueSelection: (issue: Issue) => void;
}) {
   const { viewType } = useViewStore();
   const isViewTypeGrid = viewType === 'grid';
   const statuses = useIssuesStatuses();
   const { hideCompletedIssues } = useViewStore();
   const completedStatus = statuses.find((status) => status.id === 'completed');
   const completedIssuesCount = useMemo(
      () => issues.filter((issue) => issue.status.id === 'completed').length,
      [issues]
   );
   const displayIssues = useMemo(
      () =>
         hideCompletedIssues ? issues.filter((issue) => issue.status.id !== 'completed') : issues,
      [hideCompletedIssues, issues]
   );
   const issuesByStatus = useMemo(
      () => groupIssuesForDisplayByStatus(displayIssues),
      [displayIssues]
   );
   const displayedStatuses = useMemo(() => {
      if (showEmptyStatuses) {
         return hideCompletedIssues
            ? statuses.filter((status) => status.id !== 'completed')
            : statuses;
      }

      return statuses.filter(
         (status) =>
            (!hideCompletedIssues || status.id !== 'completed') &&
            (issuesByStatus[status.id] ?? []).length > 0
      );
   }, [hideCompletedIssues, issuesByStatus, showEmptyStatuses, statuses]);
   const showCompletedSummary = hideCompletedIssues && completedIssuesCount > 0 && completedStatus;

   return (
      <div className="h-full w-full overflow-hidden border-r border-border/60 bg-container">
         {isSearching ? (
            <div className="px-6 pb-6 overflow-y-auto h-full">
               <SearchIssues
                  issues={searchIssues}
                  selectedIssueIdentifier={selectedIssueIdentifier}
                  selectedIssueIds={selectedIssueIds}
                  onSelectIssue={onSelectIssue}
                  onToggleIssueSelection={onToggleIssueSelection}
               />
            </div>
         ) : (
            <div className={cn('h-full overflow-auto', isViewTypeGrid && 'overflow-x-auto')}>
               <div className={cn(isViewTypeGrid && 'flex h-full gap-3 px-2 py-2 min-w-max')}>
                  {displayedStatuses.map((statusItem) => {
                     const statusIssues = issuesByStatus[statusItem.id] ?? [];

                     return (
                        <GroupIssues
                           key={statusItem.id}
                           status={statusItem}
                           issues={statusIssues}
                           count={statusIssues.length}
                           selectedIssueIdentifier={selectedIssueIdentifier}
                           selectedIssueIds={selectedIssueIds}
                           onSelectIssue={onSelectIssue}
                           onToggleIssueSelection={onToggleIssueSelection}
                        />
                     );
                  })}
                  {showCompletedSummary && (
                     <CompletedIssuesSummary
                        color={completedStatus.color}
                        count={completedIssuesCount}
                        isGrid={isViewTypeGrid}
                     />
                  )}
               </div>
            </div>
         )}
      </div>
   );
}

function CompletedIssuesSummary({
   color,
   count,
   isGrid,
}: {
   color: string;
   count: number;
   isGrid: boolean;
}) {
   return (
      <div
         className={cn(
            'flex items-center text-sm text-muted-foreground',
            isGrid ? 'h-full w-[348px] shrink-0 rounded-md px-3' : 'h-10 border-t px-6'
         )}
         style={{
            backgroundColor: `${color}08`,
            borderColor: `${color}24`,
         }}
      >
         <span>
            {count} {count === 1 ? 'issue completado' : 'issues completados'}
         </span>
      </div>
   );
}

function EmptyPreview() {
   return (
      <div className="flex h-full items-center justify-center p-8 text-center bg-background">
         <div className="max-w-sm space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Select an issue</h3>
            <p className="text-sm text-muted-foreground">
               Pick an issue from the list to preview and edit it without leaving the workspace.
            </p>
         </div>
      </div>
   );
}
