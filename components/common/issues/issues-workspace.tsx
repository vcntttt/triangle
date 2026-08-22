'use client';

import {
   useCallback,
   useEffect,
   useLayoutEffect,
   useMemo,
   useRef,
   useState,
   useSyncExternalStore,
} from 'react';
import { useNavigate } from '@tanstack/react-router';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { Crosshair } from 'lucide-react';
import { toast } from 'sonner';
import { IssueListItem } from '@/lib/db/issues';
import { viewerProfileToUser } from '@/lib/current-user';
import { toPresentationIssue } from '@/lib/issues-presentation';
import { type Issue, archivedStatus } from '@/lib/ui-catalog';
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
import { useProjectOptions } from '@/hooks/use-project-options';
import { usePersistentStringSet } from '@/hooks/use-persistent-string-set';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { CustomDragLayer } from './issue-grid';
import { GroupIssues } from './group-issues';
import { getIssueListRows } from './group-issue-rows';
import { IssueActionCommand, type IssueActionKind } from './issue-action-command';
import { IssueDetail } from './issue-detail';
import { IssueInsightsPanel } from './issue-insights-panel';
import { IssueDependencyGraph } from './issue-dependency-graph';
import { SearchIssues } from './search-issues';
import { IssuesStatusProvider, useIssuesStatuses } from './issues-status-context';
import { IssuesPriorityProvider } from './issues-priority-context';
import { IssuesDisplayProvider } from './issues-display-context';
import { useIssueInsightsStore } from '@/store/issue-insights-store';
import type { ProjectOptionLike } from '@/lib/projects-presentation';
import { groupIssuesForDisplayByStatus } from '@/lib/issue-status-groups';
import {
   buildIssueDisplayGroups,
   filterIssuesByScope,
   sortIssuesByConfiguredPriority,
   type IssueScope,
   type IssueFilters,
   type IssueDisplayConfig,
} from '@/lib/issue-view';
import {
   hasOpenKeyboardBlockingLayer,
   isEditableTarget,
} from '@/components/common/shortcuts/keyboard-utils';

interface IssuesWorkspaceProps {
   initialIssues: IssueListItem[];
   initialStatuses: ProjectOptionLike[];
   initialPriorities: ProjectOptionLike[];
   databaseError: string | null;
   selectedIssueIdentifier?: string;
   projectFilterId?: string;
   scope?: IssueScope;
   viewOverride?: {
      filters: IssueFilters;
      display: IssueDisplayConfig;
   };
   applyIssueFilters?: boolean;
   onSelectIssue?: (issue: Issue) => void | Promise<void>;
   onClearSelectedIssue?: () => void | Promise<void>;
   onSelectAdjacentIssue?: (issue: Issue) => void | Promise<void>;
   emptyCopy?: {
      title: string;
      description: string;
   };
}

const desktopWorkspaceQuery = '(min-width: 768px)';
const collapsedParentStorageKey = 'triangle:issues:collapsed-parent-ids';
const collapsedStatusStorageKey = 'triangle:issues:collapsed-status-ids';

function subscribeToDesktopWorkspace(callback: () => void) {
   const mediaQuery = window.matchMedia(desktopWorkspaceQuery);
   mediaQuery.addEventListener('change', callback);

   return () => mediaQuery.removeEventListener('change', callback);
}

function getDesktopWorkspaceSnapshot() {
   return window.matchMedia(desktopWorkspaceQuery).matches;
}

function useIsDesktopWorkspace() {
   return useSyncExternalStore(
      subscribeToDesktopWorkspace,
      getDesktopWorkspaceSnapshot,
      () => true
   );
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
   initialPriorities,
   databaseError,
   selectedIssueIdentifier,
   projectFilterId,
   scope = 'all',
   viewOverride,
   applyIssueFilters,
   onSelectIssue,
   onClearSelectedIssue,
   onSelectAdjacentIssue,
   emptyCopy,
}: IssuesWorkspaceProps) {
   const viewerProfile = useViewerProfile();
   const viewer = useMemo(() => viewerProfileToUser(viewerProfile), [viewerProfile]);
   const hydratedIssues = useMemo(
      () =>
         initialIssues.map((issue) =>
            toPresentationIssue(issue, initialStatuses, viewer, initialPriorities)
         ),
      [initialIssues, initialPriorities, initialStatuses, viewer]
   );

   return (
      <IssuesDataProvider issues={hydratedIssues}>
         <IssuesPriorityProvider priorities={initialPriorities}>
            <IssuesWorkspaceContent
               initialStatuses={initialStatuses}
               initialPriorities={initialPriorities}
               scopeStatuses={initialStatuses}
               databaseError={databaseError}
               selectedIssueIdentifier={selectedIssueIdentifier}
               projectFilterId={projectFilterId}
               scope={scope}
               viewOverride={viewOverride}
               applyIssueFilters={applyIssueFilters}
               onSelectIssue={onSelectIssue}
               onClearSelectedIssue={onClearSelectedIssue}
               onSelectAdjacentIssue={onSelectAdjacentIssue}
               emptyCopy={emptyCopy}
            />
         </IssuesPriorityProvider>
      </IssuesDataProvider>
   );
}

function IssuesWorkspaceContent({
   initialStatuses,
   initialPriorities,
   scopeStatuses,
   databaseError,
   selectedIssueIdentifier,
   projectFilterId,
   scope = 'all',
   viewOverride,
   applyIssueFilters = true,
   onSelectIssue,
   onClearSelectedIssue,
   onSelectAdjacentIssue,
   emptyCopy,
}: Omit<IssuesWorkspaceProps, 'initialIssues'> & {
   scopeStatuses: ProjectOptionLike[];
}) {
   const { issues, filterIssues } = useIssuesData();
   const { isSearchOpen, searchQuery } = useSearchStore();
   const { filters, hasActiveFilters } = useFilterStore();
   const {
      hideCompletedIssues,
      showEmptyStatuses,
      showEmptyGroups,
      viewType,
      listMode,
      groupBy,
      orderBy,
      orderDirection,
      showSubissues,
      visibleProperties,
      objectiveIssueIds,
      setObjectiveIssueIds,
   } = useViewStore();
   const isDesktopWorkspace = useIsDesktopWorkspace();
   const navigate = useNavigate();
   const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(() => new Set());
   const [collapsedParentIds, setCollapsedParentIds, parentCollapseStateReady] =
      usePersistentStringSet(collapsedParentStorageKey);
   const [collapsedStatusIds, setCollapsedStatusIds, statusCollapseStateReady] =
      usePersistentStringSet(collapsedStatusStorageKey);
   const [issueAction, setIssueAction] = useState<IssueActionKind | null>(null);
   const [selectionOverride, setSelectionOverride] = useState<{
      identifier?: string;
   } | null>(null);
   const selectionChangeIdRef = useRef(0);
   const clearIssueSelection = useCallback(() => setSelectedIssueIds(new Set()), []);
   const toggleIssueSelection = useCallback((issueId: string) => {
      setSelectedIssueIds((current) => {
         const next = new Set(current);

         if (next.has(issueId)) {
            next.delete(issueId);
         } else {
            next.add(issueId);
         }

         return next;
      });
   }, []);
   const toggleParentCollapse = useCallback(
      (issueId: string) => {
         setCollapsedParentIds((current) => {
            const next = new Set(current);

            if (next.has(issueId)) {
               next.delete(issueId);
            } else {
               next.add(issueId);
            }

            return next;
         });
      },
      [setCollapsedParentIds]
   );
   const toggleStatusCollapse = useCallback(
      (statusId: string) => {
         setCollapsedStatusIds((current) => {
            const next = new Set(current);

            if (next.has(statusId)) {
               next.delete(statusId);
            } else {
               next.add(statusId);
            }

            return next;
         });
      },
      [setCollapsedStatusIds]
   );
   const selectIssueHandlerRef = useRef(handleSelectIssue);
   useEffect(() => {
      selectIssueHandlerRef.current = handleSelectIssue;
   });
   const handleListSelectIssue = useCallback(
      (issue: Issue) => selectIssueHandlerRef.current(issue),
      []
   );
   const handleListToggleIssueSelection = useCallback(
      (issue: Issue) => toggleIssueSelection(issue.id),
      [toggleIssueSelection]
   );
   const activeSelectedIssueIdentifier = selectionOverride
      ? selectionOverride.identifier
      : selectedIssueIdentifier;

   const selectedIssue = useMemo(
      () => issues.find((issue) => issue.identifier === activeSelectedIssueIdentifier),
      [activeSelectedIssueIdentifier, issues]
   );

   const isSearching = isSearchOpen && searchQuery.trim() !== '';
   const preferenceDisplay = useMemo<IssueDisplayConfig>(
      () => ({
         viewType,
         listMode,
         groupBy,
         orderBy,
         orderDirection,
         showEmptyGroups,
         hideCompletedIssues,
         showSubissues,
         visibleProperties,
      }),
      [
         groupBy,
         hideCompletedIssues,
         listMode,
         orderBy,
         orderDirection,
         showEmptyGroups,
         showSubissues,
         viewType,
         visibleProperties,
      ]
   );
   const activeDisplay = viewOverride?.display ?? preferenceDisplay;
   const activeFilters = viewOverride?.filters ?? filters;
   const hasActiveFilterValues = Object.values(activeFilters).some((values) => values.length > 0);
   const isFiltering =
      applyIssueFilters && (viewOverride ? hasActiveFilterValues : hasActiveFilters());
   const statusTypes = useMemo(
      () => new Map(scopeStatuses.map((status) => [status.id, status.type ?? 'unstarted'])),
      [scopeStatuses]
   );
   const scopedIssues = useMemo(
      () => filterIssuesByScope(issues, scope, statusTypes),
      [issues, scope, statusTypes]
   );
   const visibleIssues = scopedIssues.filter((issue) => issue.status.id !== archivedStatus.id);
   const scopedIssueIds = useMemo(
      () => new Set(visibleIssues.map((issue) => issue.id)),
      [visibleIssues]
   );
   const storeFilteredIssues = isFiltering
      ? filterIssues(activeFilters).filter((issue) => scopedIssueIds.has(issue.id))
      : visibleIssues;
   const filteredIssues = projectFilterId
      ? storeFilteredIssues.filter((issue) => issue.project?.id === projectFilterId)
      : storeFilteredIssues;
   const displayIssues = useMemo(
      () =>
         (activeDisplay.hideCompletedIssues
            ? filteredIssues.filter((issue) => issue.status.id !== 'completed')
            : filteredIssues
         ).filter((issue) => activeDisplay.showSubissues || !issue.parentIssueId),
      [activeDisplay, filteredIssues]
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
         if (viewType !== 'graph' && collapsedStatusIds.has(statusId)) {
            return [];
         }

         const statusIssues = issuesByStatus[statusId] ?? [];

         if (viewType === 'grid' || viewType === 'graph') {
            return sortIssuesByConfiguredPriority(statusIssues, initialPriorities);
         }

         return getIssueListRows(statusIssues, listMode, collapsedParentIds, initialPriorities).map(
            (row) => row.issue
         );
      });
   }, [
      collapsedParentIds,
      collapsedStatusIds,
      displayIssues,
      initialStatuses,
      initialPriorities,
      isSearching,
      listMode,
      searchResults,
      showEmptyStatuses,
      viewType,
   ]);
   const actionTargetIssues = useMemo(() => {
      if (selectedIssueIds.size > 0) {
         return issues.filter((issue) => selectedIssueIds.has(issue.id));
      }

      return selectedIssue ? [selectedIssue] : [];
   }, [issues, selectedIssue, selectedIssueIds]);
   const markSelectedAsObjectives = useCallback(() => {
      if (selectedIssueIds.size === 0) {
         return;
      }

      const nextObjectiveIds = Array.from(new Set([...objectiveIssueIds, ...selectedIssueIds]));
      setObjectiveIssueIds(nextObjectiveIds);
      toast.success(
         `${selectedIssueIds.size} ${selectedIssueIds.size === 1 ? 'issue marcado' : 'issues marcados'} como objetivo${selectedIssueIds.size === 1 ? '' : 's'} del grafo`
      );
   }, [objectiveIssueIds, selectedIssueIds, setObjectiveIssueIds]);

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
      onSelectIssue: handleListSelectIssue,
      onToggleIssueSelection: toggleIssueSelection,
      onClearIssueSelection: clearIssueSelection,
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

   if (!parentCollapseStateReady || !statusCollapseStateReady) {
      return <div className="h-full w-full bg-container" aria-busy="true" />;
   }

   return (
      <IssuesDisplayProvider display={activeDisplay}>
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
                  {isDesktopWorkspace ? (
                     <DesktopIssuesWorkspace
                        selectedIssue={selectedIssue}
                        listPanelProps={{
                           issues: filteredIssues,
                           showEmptyStatuses,
                           initialStatuses,
                           initialPriorities,
                           display: activeDisplay,
                           isSearching,
                           searchIssues: displayIssues,
                           selectedIssueIdentifier: activeSelectedIssueIdentifier,
                           selectedIssueIds,
                           onSelectIssue: handleListSelectIssue,
                           onToggleIssueSelection: handleListToggleIssueSelection,
                           onMarkSelectedAsObjectives: markSelectedAsObjectives,
                           onClearIssueSelection: clearIssueSelection,
                           collapsedParentIds,
                           collapsedStatusIds,
                           onToggleParentCollapse: toggleParentCollapse,
                           onToggleStatusCollapse: toggleStatusCollapse,
                        }}
                        onDeleteOrArchive={navigateToAdjacentIssue}
                        onClearSelectedIssue={handleClearSelectedIssue}
                        insightsIssues={filteredIssues}
                        insightsStatuses={initialStatuses}
                        insightsPriorities={initialPriorities}
                     />
                  ) : selectedIssue ? (
                     <div className="h-full">
                        <IssueDetail
                           issueId={selectedIssue.id}
                           initialIssue={selectedIssue}
                           onDelete={navigateToAdjacentIssue}
                           onArchive={navigateToAdjacentIssue}
                           onMobileBack={handleClearSelectedIssue}
                           mobileBack
                           onClose={handleClearSelectedIssue}
                        />
                     </div>
                  ) : (
                     <IssuesListPanel
                        issues={filteredIssues}
                        showEmptyStatuses={showEmptyStatuses}
                        initialStatuses={initialStatuses}
                        initialPriorities={initialPriorities}
                        display={activeDisplay}
                        isSearching={isSearching}
                        searchIssues={displayIssues}
                        selectedIssueIdentifier={activeSelectedIssueIdentifier}
                        selectedIssueIds={selectedIssueIds}
                        onSelectIssue={handleListSelectIssue}
                        onToggleIssueSelection={handleListToggleIssueSelection}
                        onMarkSelectedAsObjectives={markSelectedAsObjectives}
                        onClearIssueSelection={clearIssueSelection}
                        collapsedParentIds={collapsedParentIds}
                        collapsedStatusIds={collapsedStatusIds}
                        onToggleParentCollapse={toggleParentCollapse}
                        onToggleStatusCollapse={toggleStatusCollapse}
                     />
                  )}
               </div>
            </DndProvider>
         </IssuesStatusProvider>
      </IssuesDisplayProvider>
   );

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
            runSelectionChange(nextIssue.identifier, () => onSelectAdjacentIssue(nextIssue));
            return;
         }

         runSelectionChange(nextIssue.identifier, () =>
            navigate({
               to: '/issues/$issueIdentifier',
               params: { issueIdentifier: nextIssue.identifier },
               search: (prev) => ({
                  ...(projectFilterId ? { projectId: projectFilterId } : {}),
                  scope: prev.scope,
                  view: prev.view,
               }),
               replace: true,
            })
         );
         return;
      }

      if (onClearSelectedIssue) {
         runSelectionChange(undefined, onClearSelectedIssue);
         return;
      }

      runSelectionChange(undefined, () =>
         navigate({
            to: '/issues',
            search: (prev) => ({
               ...(projectFilterId ? { projectId: projectFilterId } : {}),
               scope: prev.scope,
               view: prev.view,
            }),
         })
      );
   }

   function handleSelectIssue(issue: Issue) {
      if (onSelectIssue) {
         runSelectionChange(issue.identifier, () => onSelectIssue(issue));
         return;
      }

      runSelectionChange(issue.identifier, () =>
         navigate({
            to: '/issues/$issueIdentifier',
            params: { issueIdentifier: issue.identifier },
            search: (prev) => ({
               ...(projectFilterId ? { projectId: projectFilterId } : {}),
               scope: prev.scope,
               view: prev.view,
            }),
         })
      );
   }

   function handleClearSelectedIssue() {
      if (onClearSelectedIssue) {
         runSelectionChange(undefined, onClearSelectedIssue);
         return;
      }

      runSelectionChange(undefined, () =>
         navigate({
            to: '/issues',
            search: (prev) => ({
               ...(projectFilterId ? { projectId: projectFilterId } : {}),
               scope: prev.scope,
               view: prev.view,
            }),
         })
      );
   }

   function runSelectionChange(identifier: string | undefined, change: () => void | Promise<void>) {
      const selectionChangeId = ++selectionChangeIdRef.current;
      setSelectionOverride({ identifier });

      try {
         void Promise.resolve(change())
            .catch((error) => {
               console.error('Issue selection navigation failed.', error);
            })
            .finally(() => {
               if (selectionChangeIdRef.current === selectionChangeId) {
                  setSelectionOverride(null);
               }
            });
      } catch (error) {
         console.error('Issue selection navigation failed.', error);
         if (selectionChangeIdRef.current === selectionChangeId) {
            setSelectionOverride(null);
         }
      }
   }
}

interface IssuesListPanelProps {
   issues: IssuesData['issues'];
   showEmptyStatuses: boolean;
   initialStatuses: ProjectOptionLike[];
   initialPriorities: ProjectOptionLike[];
   display: IssueDisplayConfig;
   isSearching: boolean;
   searchIssues: IssuesData['issues'];
   selectedIssueIdentifier?: string;
   selectedIssueIds: Set<string>;
   onSelectIssue: (issue: Issue) => void;
   onToggleIssueSelection: (issue: Issue) => void;
   onMarkSelectedAsObjectives: () => void;
   onClearIssueSelection: () => void;
   collapsedParentIds: ReadonlySet<string>;
   collapsedStatusIds: ReadonlySet<string>;
   onToggleParentCollapse: (issueId: string) => void;
   onToggleStatusCollapse: (statusId: string) => void;
}

function DesktopIssuesWorkspace({
   selectedIssue,
   listPanelProps,
   onDeleteOrArchive,
   onClearSelectedIssue,
   insightsIssues,
   insightsStatuses,
   insightsPriorities,
}: {
   selectedIssue?: Issue;
   listPanelProps: IssuesListPanelProps;
   onDeleteOrArchive: (issueId: string) => void;
   onClearSelectedIssue: () => void;
   insightsIssues: Issue[];
   insightsStatuses: ProjectOptionLike[];
   insightsPriorities: ProjectOptionLike[];
}) {
   const detailPanelRef = useRef<ImperativePanelHandle>(null);
   const isInsightsOpen = useIssueInsightsStore((state) => state.isOpen);

   useLayoutEffect(() => {
      const detailPanel = detailPanelRef.current;
      if (!detailPanel) return;

      if (selectedIssue) {
         detailPanel.expand(isInsightsOpen ? 28 : 40);
      } else {
         detailPanel.collapse();
      }
   }, [isInsightsOpen, selectedIssue]);

   return (
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
         <ResizablePanel
            defaultSize={selectedIssue ? (isInsightsOpen ? 52 : 60) : isInsightsOpen ? 76 : 100}
            minSize={30}
         >
            <IssuesListPanel {...listPanelProps} />
         </ResizablePanel>
         <ResizableHandle
            withHandle={Boolean(selectedIssue)}
            className={cn(!selectedIssue && 'pointer-events-none opacity-0')}
         />
         <ResizablePanel
            ref={detailPanelRef}
            defaultSize={selectedIssue ? (isInsightsOpen ? 28 : 40) : 0}
            minSize={28}
            collapsedSize={0}
            collapsible
         >
            {selectedIssue ? (
               <SelectedIssueDetail
                  key={selectedIssue.id}
                  selectedIssue={selectedIssue}
                  onDeleteOrArchive={onDeleteOrArchive}
                  onClearSelectedIssue={onClearSelectedIssue}
               />
            ) : null}
         </ResizablePanel>
         {isInsightsOpen ? (
            <>
               <ResizableHandle withHandle />
               <ResizablePanel
                  defaultSize={selectedIssue ? 20 : 24}
                  minSize={18}
                  className="min-w-0"
               >
                  <IssueInsightsPanel
                     issues={insightsIssues}
                     statuses={insightsStatuses}
                     priorities={insightsPriorities}
                  />
               </ResizablePanel>
            </>
         ) : null}
      </ResizablePanelGroup>
   );
}

function SelectedIssueDetail({
   selectedIssue,
   onDeleteOrArchive,
   onClearSelectedIssue,
}: {
   selectedIssue: Issue;
   onDeleteOrArchive: (issueId: string) => void;
   onClearSelectedIssue: () => void;
}) {
   const [isExpanded, setIsExpanded] = useState(false);

   return (
      <div className={cn('h-full', isExpanded && 'fixed inset-0 z-50')}>
         <IssueDetail
            issueId={selectedIssue.id}
            initialIssue={selectedIssue}
            onDelete={onDeleteOrArchive}
            onArchive={onDeleteOrArchive}
            onClose={onClearSelectedIssue}
            expanded={isExpanded}
            onExpandedChange={setIsExpanded}
         />
      </div>
   );
}

function IssuesListPanel({
   issues,
   showEmptyStatuses,
   initialStatuses,
   initialPriorities,
   display,
   isSearching,
   searchIssues,
   selectedIssueIdentifier,
   selectedIssueIds,
   onSelectIssue,
   onToggleIssueSelection,
   onMarkSelectedAsObjectives,
   onClearIssueSelection,
   collapsedParentIds,
   collapsedStatusIds,
   onToggleParentCollapse,
   onToggleStatusCollapse,
}: IssuesListPanelProps) {
   const { objectiveIssueIds } = useViewStore();
   const { viewType, hideCompletedIssues, showSubissues } = display;
   const isViewTypeGrid = viewType === 'grid';
   const statuses = useIssuesStatuses();
   const projects = useProjectOptions();
   const completedStatus = statuses.find((status) => status.id === 'completed');
   const completedIssuesCount = useMemo(
      () => issues.filter((issue) => issue.status.id === 'completed').length,
      [issues]
   );
   const displayIssues = useMemo(
      () =>
         (hideCompletedIssues
            ? issues.filter((issue) => issue.status.id !== 'completed')
            : issues
         ).filter((issue) => showSubissues || !issue.parentIssueId),
      [hideCompletedIssues, issues, showSubissues]
   );
   const displayGroups = useMemo(() => {
      const groupDisplay = {
         ...display,
         showEmptyGroups: display.showEmptyGroups && showEmptyStatuses,
         ...(isViewTypeGrid ? { groupBy: 'status' as const } : {}),
      };

      return buildIssueDisplayGroups(displayIssues, groupDisplay, {
         statuses: initialStatuses,
         priorities: initialPriorities,
         projects,
      });
   }, [
      displayIssues,
      display,
      initialPriorities,
      initialStatuses,
      isViewTypeGrid,
      projects,
      showEmptyStatuses,
   ]);
   const showCompletedSummary = hideCompletedIssues && completedIssuesCount > 0 && completedStatus;

   return (
      <div className="flex h-full w-full flex-col overflow-hidden border-r border-border/60 bg-container">
         {viewType === 'list' && selectedIssueIds.size > 0 && (
            <div
               className="flex shrink-0 items-center gap-3 border-b border-primary/15 bg-primary/[0.04] px-6 py-2"
               role="status"
               aria-live="polite"
            >
               <span className="text-xs font-medium">
                  {selectedIssueIds.size}{' '}
                  {selectedIssueIds.size === 1 ? 'issue seleccionado' : 'issues seleccionados'}
               </span>
               {objectiveIssueIds.some((issueId) => selectedIssueIds.has(issueId)) && (
                  <span className="hidden text-[11px] text-muted-foreground sm:inline">
                     Parte de la selección ya es objetivo
                  </span>
               )}
               <div className="ml-auto flex items-center gap-1.5">
                  <Button
                     type="button"
                     size="xs"
                     variant="secondary"
                     onClick={onMarkSelectedAsObjectives}
                  >
                     <Crosshair className="size-3.5 text-orange-500" />
                     Marcar como objetivos
                  </Button>
                  <Button type="button" size="xs" variant="ghost" onClick={onClearIssueSelection}>
                     Limpiar
                  </Button>
               </div>
            </div>
         )}
         <div className="min-h-0 flex-1">
            {isSearching ? (
               <div className="h-full overflow-y-auto px-6 pb-6">
                  <SearchIssues
                     issues={searchIssues}
                     selectedIssueIdentifier={selectedIssueIdentifier}
                     selectedIssueIds={selectedIssueIds}
                     onSelectIssue={onSelectIssue}
                     onToggleIssueSelection={onToggleIssueSelection}
                  />
               </div>
            ) : viewType === 'graph' ? (
               <IssueDependencyGraph
                  issues={displayIssues}
                  selectedIssueIdentifier={selectedIssueIdentifier}
                  onSelectIssue={onSelectIssue}
               />
            ) : (
               <div className={cn('h-full overflow-auto', isViewTypeGrid && 'overflow-x-auto')}>
                  <div className={cn(isViewTypeGrid && 'flex h-full gap-3 px-2 py-2 min-w-max')}>
                     {displayGroups.map((group) => {
                        const statusItem = statuses.find((status) => status.id === group.id) ?? {
                           id: group.id,
                           name: group.name,
                           color: group.color,
                           icon: () => null,
                        };
                        const statusIssues = group.issues;

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
                              collapsedParentIds={collapsedParentIds}
                              isCollapsed={collapsedStatusIds.has(statusItem.id)}
                              onToggleParentCollapse={onToggleParentCollapse}
                              onToggleStatusCollapse={() => onToggleStatusCollapse(statusItem.id)}
                              allowCreate={group.isStatusGroup}
                              priorities={initialPriorities}
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
