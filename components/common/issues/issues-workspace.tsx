'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { IssueListItem } from '@/lib/db/issues';
import { toPresentationIssue } from '@/lib/issues-presentation';
import { type Issue, archivedStatus } from '@/lib/ui-catalog';
import { cn } from '@/lib/utils';
import { useFilterStore } from '@/store/filter-store';
import { useIssuesStore } from '@/store/issues-store';
import { useSearchStore } from '@/store/search-store';
import { useViewStore } from '@/store/view-store';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { CustomDragLayer } from './issue-grid';
import { GroupIssues } from './group-issues';
import { IssueDetail } from './issue-detail';
import { SearchIssues } from './search-issues';
import { IssuesStatusProvider, useIssuesStatuses } from './issues-status-context';
import type { ProjectOptionLike } from '@/lib/projects-presentation';
import { groupIssuesForDisplayByStatus } from '@/lib/issue-status-groups';

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

const getIssuesHydrationKey = (issues: IssueListItem[]) =>
   issues
      .map((issue) =>
         [
            issue.id,
            issue.status,
            issue.priority,
            issue.assigneeId ?? '',
            issue.project?.id ?? '',
            issue.parentIssueId ?? '',
            issue.labels.map((label) => label.id).join(','),
         ].join(':')
      )
      .join('|');

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
   const { replaceIssues, issues, filterIssues } = useIssuesStore();
   const { isSearchOpen, searchQuery } = useSearchStore();
   const { filters, hasActiveFilters } = useFilterStore();
   const { showEmptyStatuses } = useViewStore();
   const navigate = useNavigate();
   const lastHydrationKeyRef = useRef<string | null>(null);

   const hydratedIssues = useMemo(
      () => initialIssues.map((issue) => toPresentationIssue(issue, initialStatuses)),
      [initialIssues, initialStatuses]
   );
   const hydrationKey = useMemo(() => getIssuesHydrationKey(initialIssues), [initialIssues]);

   useLayoutEffect(() => {
      if (lastHydrationKeyRef.current === hydrationKey) {
         return;
      }

      lastHydrationKeyRef.current = hydrationKey;
      replaceIssues(hydratedIssues);
   }, [hydratedIssues, hydrationKey, replaceIssues]);

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

   if (hydratedIssues.length === 0) {
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
            <div className="h-full w-full">
               <div className={cn('h-full lg:hidden', selectedIssue ? 'hidden' : 'block')}>
                  <IssuesListPanel
                     issues={filteredIssues}
                     showEmptyStatuses={showEmptyStatuses}
                     isSearching={isSearching}
                     selectedIssueIdentifier={selectedIssueIdentifier}
                     onSelectIssue={handleSelectIssue}
                  />
               </div>

               <div className={cn('h-full lg:hidden', selectedIssue ? 'block' : 'hidden')}>
                  {selectedIssue ? (
                     <IssueDetail
                        issueId={selectedIssue.id}
                        initialIssue={selectedIssue}
                        onDelete={handleDelete}
                        onArchive={handleArchive}
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
                        selectedIssueIdentifier={selectedIssueIdentifier}
                        onSelectIssue={handleSelectIssue}
                     />
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={40} minSize={28}>
                     {selectedIssue ? (
                        <IssueDetail
                           issueId={selectedIssue.id}
                           initialIssue={selectedIssue}
                           onDelete={handleDelete}
                           onArchive={handleArchive}
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

   function handleDelete(deletedIssueId: string) {
      navigateToAdjacentIssue(deletedIssueId);
   }

   function handleArchive(archivedIssueId: string) {
      navigateToAdjacentIssue(archivedIssueId);
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
   selectedIssueIdentifier,
   onSelectIssue,
}: {
   issues: ReturnType<typeof useIssuesStore.getState>['issues'];
   showEmptyStatuses: boolean;
   isSearching: boolean;
   selectedIssueIdentifier?: string;
   onSelectIssue: (issue: Issue) => void;
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
                  selectedIssueIdentifier={selectedIssueIdentifier}
                  onSelectIssue={onSelectIssue}
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
                           onSelectIssue={onSelectIssue}
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
