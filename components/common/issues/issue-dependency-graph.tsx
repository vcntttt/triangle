'use client';

import { Link } from '@tanstack/react-router';
import {
   ArrowRight,
   Check,
   ChevronDown,
   CircleDashed,
   Crosshair,
   GitFork,
   Hand,
   LockKeyhole,
   Route,
   Sparkles,
   X,
} from 'lucide-react';
import {
   type MouseEvent as ReactMouseEvent,
   type PointerEvent as ReactPointerEvent,
   useCallback,
   useEffect,
   useMemo,
   useRef,
   useState,
} from 'react';
import type { Issue } from '@/lib/models';
import { sortIssuesByPriority } from '@/lib/ui-catalog';
import { cn } from '@/lib/utils';
import { useViewStore } from '@/store/view-store';
import { Button } from '@/components/ui/button';
import {
   Command,
   CommandEmpty,
   CommandGroup,
   CommandInput,
   CommandItem,
   CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
   hasOpenKeyboardBlockingLayer,
   isEditableTarget,
} from '@/components/common/shortcuts/keyboard-utils';
import { StatusSelector } from './status-selector';

type RelationSummary = Issue['blockedBy'][number];

type GraphNode = {
   id: string;
   identifier: string;
   title: string;
   status: string;
   issue?: Issue;
};

type GraphEdge = {
   source: string;
   target: string;
};

type NodeState = 'completed' | 'active' | 'ready' | 'blocked';

const CARD_WIDTH = 260;
const CARD_HEIGHT = 136;
const COLUMN_GAP = 104;
const ROW_GAP = 28;
const CANVAS_PADDING = 28;
const HEADING_HEIGHT = 44;

function useGraphPan() {
   const viewportRef = useRef<HTMLDivElement>(null);
   const pointerInsideRef = useRef(false);
   const spacePressedRef = useRef(false);
   const suppressClickRef = useRef(false);
   const gestureRef = useRef<{
      pointerId: number;
      startX: number;
      startY: number;
      startScrollLeft: number;
      startScrollTop: number;
   } | null>(null);
   const [spacePressed, setSpacePressed] = useState(false);
   const [panning, setPanning] = useState(false);

   const finishPan = useCallback(() => {
      const gesture = gestureRef.current;
      const viewport = viewportRef.current;

      if (gesture && viewport?.hasPointerCapture(gesture.pointerId)) {
         viewport.releasePointerCapture(gesture.pointerId);
      }

      gestureRef.current = null;
      setPanning(false);
   }, []);

   useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
         if (event.code !== 'Space' && event.key !== ' ') return;

         if (spacePressedRef.current) {
            event.preventDefault();
            return;
         }

         if (
            !pointerInsideRef.current ||
            isEditableTarget(event.target) ||
            hasOpenKeyboardBlockingLayer()
         ) {
            return;
         }

         event.preventDefault();
         spacePressedRef.current = true;
         setSpacePressed(true);
      };

      const releaseSpace = (event?: KeyboardEvent) => {
         if (event && event.code !== 'Space' && event.key !== ' ') return;
         if (!spacePressedRef.current) return;

         event?.preventDefault();
         spacePressedRef.current = false;
         setSpacePressed(false);
         finishPan();
      };
      const handleWindowBlur = () => {
         releaseSpace();
         suppressClickRef.current = false;
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', releaseSpace);
      window.addEventListener('blur', handleWindowBlur);

      return () => {
         window.removeEventListener('keydown', handleKeyDown);
         window.removeEventListener('keyup', releaseSpace);
         window.removeEventListener('blur', handleWindowBlur);
      };
   }, [finishPan]);

   const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!spacePressedRef.current || event.button !== 0) return;

      event.preventDefault();
      event.stopPropagation();
      try {
         event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
         // Synthetic pointers and older browsers can reject capture; in-canvas panning still works.
      }
      suppressClickRef.current = true;
      gestureRef.current = {
         pointerId: event.pointerId,
         startX: event.clientX,
         startY: event.clientY,
         startScrollLeft: event.currentTarget.scrollLeft,
         startScrollTop: event.currentTarget.scrollTop,
      };
      setPanning(true);
   };

   const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;

      event.preventDefault();
      event.currentTarget.scrollLeft = gesture.startScrollLeft - (event.clientX - gesture.startX);
      event.currentTarget.scrollTop = gesture.startScrollTop - (event.clientY - gesture.startY);
   };

   const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (gestureRef.current?.pointerId !== event.pointerId) return;

      const wasCancelled = event.type === 'pointercancel';
      event.preventDefault();
      event.stopPropagation();
      finishPan();
      if (wasCancelled) suppressClickRef.current = false;
      pointerInsideRef.current = event.currentTarget.matches(':hover');
   };

   const handleClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!suppressClickRef.current) return;

      event.preventDefault();
      event.stopPropagation();
      suppressClickRef.current = false;
   };

   return {
      viewportRef,
      spacePressed,
      panning,
      handlePointerDown,
      handlePointerMove,
      handlePointerEnd,
      handleClickCapture,
      handlePointerEnter: () => {
         pointerInsideRef.current = true;
      },
      handlePointerLeave: () => {
         if (!gestureRef.current) pointerInsideRef.current = false;
      },
   };
}

const isCompletedStatus = (status: string) => status === 'completed' || status === 'archived';
const isActiveStatus = (status: string) =>
   status === 'in-progress' || status === 'technical-review';

const priorityRank = (node: GraphNode) => {
   const order: Record<string, number> = {
      'urgent': 0,
      'high': 1,
      'medium': 2,
      'low': 3,
      'no-priority': 4,
   };

   return node.issue ? (order[node.issue.priority.id] ?? 4) : 5;
};

function relationNode(relation: RelationSummary): GraphNode {
   return {
      id: relation.id,
      identifier: relation.identifier,
      title: relation.title,
      status: relation.status,
   };
}

function buildGraph(issues: Issue[]) {
   const nodes = new Map<string, GraphNode>();
   const edgeKeys = new Set<string>();
   const edges: GraphEdge[] = [];

   for (const issue of issues) {
      nodes.set(issue.id, {
         id: issue.id,
         identifier: issue.identifier,
         title: issue.title,
         status: issue.status.id,
         issue,
      });
   }

   const addEdge = (source: GraphNode, target: GraphNode) => {
      nodes.set(source.id, nodes.get(source.id) ?? source);
      nodes.set(target.id, nodes.get(target.id) ?? target);
      const key = `${source.id}:${target.id}`;

      if (!edgeKeys.has(key)) {
         edgeKeys.add(key);
         edges.push({ source: source.id, target: target.id });
      }
   };

   for (const issue of issues) {
      const current = nodes.get(issue.id)!;

      for (const blocker of issue.blockedBy) {
         addEdge(nodes.get(blocker.id) ?? relationNode(blocker), current);
      }

      for (const blocked of issue.blocks) {
         addEdge(current, nodes.get(blocked.id) ?? relationNode(blocked));
      }
   }

   const connectedIds = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
   const connectedNodes = [...nodes.values()].filter((node) => connectedIds.has(node.id));
   const independentIssues = sortIssuesByPriority(
      issues.filter((issue) => !connectedIds.has(issue.id) && !isCompletedStatus(issue.status.id))
   );

   const incoming = new Map<string, string[]>();
   const outgoing = new Map<string, string[]>();

   for (const node of connectedNodes) {
      incoming.set(node.id, []);
      outgoing.set(node.id, []);
   }

   for (const edge of edges) {
      incoming.get(edge.target)?.push(edge.source);
      outgoing.get(edge.source)?.push(edge.target);
   }

   return { nodes, connectedNodes, independentIssues, edges, incoming, outgoing };
}

function getNodeState(
   node: GraphNode,
   blockers: string[],
   nodes: Map<string, GraphNode>
): NodeState {
   if (isCompletedStatus(node.status)) {
      return 'completed';
   }

   if (isActiveStatus(node.status)) {
      return 'active';
   }

   return blockers.every((blockerId) => isCompletedStatus(nodes.get(blockerId)?.status ?? ''))
      ? 'ready'
      : 'blocked';
}

function visitConnected(
   startIds: string[],
   adjacency: Map<string, string[]>,
   visited: Set<string>
) {
   const queue = [...startIds];

   while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      queue.push(...(adjacency.get(current) ?? []));
   }
}

function createGraphLayout(issues: Issue[], objectiveIssueIds: string[]) {
   const graph = buildGraph(issues);
   const { incoming: allIncoming, nodes } = graph;
   const objectiveIds = objectiveIssueIds.filter((issueId) => nodes.has(issueId));
   const requiredIds = new Set<string>();

   if (objectiveIds.length > 0) {
      visitConnected(objectiveIds, allIncoming, requiredIds);
   }

   const connectedNodes =
      objectiveIds.length > 0
         ? [...nodes.values()].filter((node) => requiredIds.has(node.id))
         : graph.connectedNodes;
   const scopedIds = new Set(connectedNodes.map((node) => node.id));
   const edges = graph.edges.filter(
      (edge) => scopedIds.has(edge.source) && scopedIds.has(edge.target)
   );
   const incoming = new Map(connectedNodes.map((node) => [node.id, [] as string[]]));
   const outgoing = new Map(connectedNodes.map((node) => [node.id, [] as string[]]));

   for (const edge of edges) {
      incoming.get(edge.target)?.push(edge.source);
      outgoing.get(edge.source)?.push(edge.target);
   }

   const indegree = new Map(
      connectedNodes.map((node) => [node.id, incoming.get(node.id)?.length ?? 0])
   );
   const depth = new Map(connectedNodes.map((node) => [node.id, 0]));
   const queue = connectedNodes
      .filter((node) => indegree.get(node.id) === 0)
      .sort((a, b) => a.identifier.localeCompare(b.identifier));
   const processed = new Set<string>();

   while (queue.length > 0) {
      const current = queue.shift()!;
      processed.add(current.id);

      for (const targetId of outgoing.get(current.id) ?? []) {
         depth.set(targetId, Math.max(depth.get(targetId) ?? 0, (depth.get(current.id) ?? 0) + 1));
         const remaining = (indegree.get(targetId) ?? 0) - 1;
         indegree.set(targetId, remaining);
         if (remaining === 0) queue.push(nodes.get(targetId)!);
      }
   }

   // Cycles are rejected when relations are created, but keeping them visible is safer than
   // dropping legacy data if one ever reaches the client.
   for (const node of connectedNodes) {
      if (!processed.has(node.id)) depth.set(node.id, 0);
   }

   const stateById = new Map(
      connectedNodes.map((node) => [
         node.id,
         getNodeState(node, incoming.get(node.id) ?? [], nodes),
      ])
   );
   const activeIds = connectedNodes
      .filter((node) => stateById.get(node.id) === 'active')
      .map((node) => node.id);
   const activePath = new Set<string>();

   if (activeIds.length > 0) {
      const ancestors = new Set<string>();
      const descendants = new Set<string>();
      visitConnected(activeIds, incoming, ancestors);
      visitConnected(activeIds, outgoing, descendants);
      for (const nodeId of [...ancestors, ...descendants]) activePath.add(nodeId);
   }

   const layers = new Map<number, GraphNode[]>();
   for (const node of connectedNodes) {
      const nodeDepth = depth.get(node.id) ?? 0;
      layers.set(nodeDepth, [...(layers.get(nodeDepth) ?? []), node]);
   }

   const stateOrder: Record<NodeState, number> = {
      active: 0,
      ready: 1,
      blocked: 2,
      completed: 3,
   };
   const orderedLayers = [...layers.entries()]
      .sort(([a], [b]) => a - b)
      .map(([layerDepth, layerNodes]) => ({
         depth: layerDepth,
         nodes: layerNodes.sort((a, b) => {
            const stateDifference =
               stateOrder[stateById.get(a.id)!] - stateOrder[stateById.get(b.id)!];
            return (
               stateDifference ||
               priorityRank(a) - priorityRank(b) ||
               a.identifier.localeCompare(b.identifier)
            );
         }),
      }));
   const maxRows = Math.max(1, ...orderedLayers.map((layer) => layer.nodes.length));
   const positions = new Map<string, { x: number; y: number }>();

   orderedLayers.forEach((layer, columnIndex) => {
      const layerHeight =
         layer.nodes.length * CARD_HEIGHT + Math.max(0, layer.nodes.length - 1) * ROW_GAP;
      const maxHeight = maxRows * CARD_HEIGHT + Math.max(0, maxRows - 1) * ROW_GAP;
      const topOffset = (maxHeight - layerHeight) / 2;

      layer.nodes.forEach((node, rowIndex) => {
         positions.set(node.id, {
            x: CANVAS_PADDING + columnIndex * (CARD_WIDTH + COLUMN_GAP),
            y: HEADING_HEIGHT + CANVAS_PADDING + topOffset + rowIndex * (CARD_HEIGHT + ROW_GAP),
         });
      });
   });

   return {
      ...graph,
      connectedNodes,
      edges,
      incoming,
      outgoing,
      independentIssues: objectiveIds.length > 0 ? [] : graph.independentIssues,
      objectiveIds,
      orderedLayers,
      positions,
      stateById,
      activeIds,
      activePath,
      readyCount: [...stateById.values()].filter((state) => state === 'ready').length,
      width:
         CANVAS_PADDING * 2 +
         Math.max(1, orderedLayers.length) * CARD_WIDTH +
         Math.max(0, orderedLayers.length - 1) * COLUMN_GAP,
      height:
         HEADING_HEIGHT +
         CANVAS_PADDING * 2 +
         maxRows * CARD_HEIGHT +
         Math.max(0, maxRows - 1) * ROW_GAP,
   };
}

const stateCopy: Record<NodeState, string> = {
   completed: 'Resuelta',
   active: 'En curso',
   ready: 'Disponible',
   blocked: 'Bloqueada',
};

function GraphCard({
   node,
   state,
   objective,
   highlighted,
   selected,
   blockerCount,
   unlockCount,
   onSelectIssue,
}: {
   node: GraphNode;
   state: NodeState;
   objective: boolean;
   highlighted: boolean;
   selected: boolean;
   blockerCount: number;
   unlockCount: number;
   onSelectIssue: (issue: Issue) => void;
}) {
   const StateIcon =
      state === 'completed'
         ? Check
         : state === 'active'
           ? Route
           : state === 'ready'
             ? Sparkles
             : LockKeyhole;

   return (
      <article
         data-graph-node={node.identifier}
         className={cn(
            'relative flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card p-3 shadow-sm transition-all',
            state === 'active' &&
               'border-emerald-500/55 bg-emerald-500/[0.07] shadow-emerald-500/10',
            state === 'ready' && 'border-sky-500/35 bg-sky-500/[0.045]',
            state === 'blocked' && 'border-border/70',
            state === 'completed' && 'border-border/40 bg-muted/20',
            objective && 'border-orange-500/55 bg-orange-500/[0.055] ring-1 ring-orange-500/15',
            selected && 'ring-2 ring-primary/45',
            !highlighted && 'opacity-50 grayscale-[0.25]'
         )}
         style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
      >
         <div className="flex h-7 shrink-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
               <span
                  className={cn(
                     'inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium',
                     state === 'active' && 'text-emerald-600 dark:text-emerald-400',
                     state === 'ready' && 'text-sky-600 dark:text-sky-400',
                     (state === 'blocked' || state === 'completed') && 'text-muted-foreground'
                  )}
               >
                  <StateIcon className="size-3.5" />
                  {stateCopy[state]}
               </span>
               {objective && (
                  <span className="inline-flex h-5 min-w-0 items-center gap-1 rounded-md border border-orange-500/25 bg-orange-500/[0.08] px-1.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-orange-500">
                     <Crosshair className="size-2.5 shrink-0" />
                     Objetivo
                  </span>
               )}
            </div>
            {node.issue ? (
               <div className="shrink-0" onMouseDownCapture={(event) => event.stopPropagation()}>
                  <StatusSelector status={node.issue.status} issueId={node.issue.id} />
               </div>
            ) : (
               <span className="rounded-full border border-dashed px-2 py-0.5 text-[10px] text-muted-foreground">
                  Contexto
               </span>
            )}
         </div>
         {node.issue ? (
            <button
               type="button"
               className="mt-1.5 block min-h-0 w-full flex-1 text-left"
               onClick={() => onSelectIssue(node.issue!)}
            >
               <span className="block text-[11px] font-medium leading-4 text-muted-foreground">
                  {node.identifier}
               </span>
               <span
                  data-graph-title
                  className="mt-0.5 line-clamp-2 text-sm font-medium leading-5 hover:underline"
               >
                  {node.title}
               </span>
            </button>
         ) : (
            <Link
               to="/issues/$issueIdentifier"
               params={{ issueIdentifier: node.identifier }}
               className="mt-1.5 block min-h-0 flex-1"
            >
               <span className="block text-[11px] font-medium leading-4 text-muted-foreground">
                  {node.identifier}
               </span>
               <span
                  data-graph-title
                  className="mt-0.5 line-clamp-2 text-sm font-medium leading-5 hover:underline"
               >
                  {node.title}
               </span>
            </Link>
         )}
         <div
            data-graph-footer
            className="mt-1 flex h-4 shrink-0 items-center gap-2 overflow-hidden text-[10px] text-muted-foreground"
         >
            {blockerCount > 0 && (
               <span className="shrink-0">
                  {blockerCount} {blockerCount === 1 ? 'previa' : 'previas'}
               </span>
            )}
            {unlockCount > 0 && <span className="shrink-0">Libera {unlockCount}</span>}
            {!node.issue && <span className="truncate">Fuera de este proyecto</span>}
         </div>
      </article>
   );
}

function ObjectivePicker({
   issues,
   selectedIds,
   onChange,
}: {
   issues: Issue[];
   selectedIds: string[];
   onChange: (issueIds: string[]) => void;
}) {
   const [open, setOpen] = useState(false);
   const [draftIds, setDraftIds] = useState<string[]>(selectedIds);
   const selectedSet = new Set(draftIds);
   const orderedIssues = useMemo(
      () =>
         [...issues].sort((a, b) =>
            a.identifier.localeCompare(b.identifier, undefined, { numeric: true })
         ),
      [issues]
   );

   const toggleIssue = (issueId: string) => {
      setDraftIds(
         selectedSet.has(issueId)
            ? draftIds.filter((selectedId) => selectedId !== issueId)
            : [...draftIds, issueId]
      );
   };

   const handleOpenChange = (nextOpen: boolean) => {
      if (nextOpen) {
         setDraftIds(selectedIds);
      } else if (draftIds.join(':') !== selectedIds.join(':')) {
         onChange(draftIds);
      }

      setOpen(nextOpen);
   };

   return (
      <Popover open={open} onOpenChange={handleOpenChange}>
         <PopoverTrigger asChild>
            <Button
               type="button"
               variant={selectedIds.length > 0 ? 'secondary' : 'outline'}
               size="sm"
               className="h-8 gap-1.5"
            >
               <Crosshair className="size-3.5 text-orange-500" />
               {selectedIds.length > 0
                  ? `${selectedIds.length} ${selectedIds.length === 1 ? 'objetivo' : 'objetivos'}`
                  : 'Definir objetivo'}
               <ChevronDown className="size-3 text-muted-foreground" />
            </Button>
         </PopoverTrigger>
         <PopoverContent
            align="end"
            className="w-[min(380px,calc(100vw-2rem))] overflow-hidden p-0"
         >
            <Command>
               <CommandInput placeholder="Buscar por ID o título…" />
               <CommandList className="max-h-[360px]">
                  <CommandEmpty>No encontramos ese issue.</CommandEmpty>
                  <CommandGroup heading="Elige uno o varios objetivos">
                     {orderedIssues.map((issue) => {
                        const selected = selectedSet.has(issue.id);
                        return (
                           <CommandItem
                              key={issue.id}
                              value={`${issue.identifier} ${issue.title}`}
                              onSelect={() => toggleIssue(issue.id)}
                              className="gap-2.5 py-2"
                           >
                              <span
                                 className={cn(
                                    'flex size-4 shrink-0 items-center justify-center rounded border',
                                    selected
                                       ? 'border-orange-500/60 bg-orange-500/15 text-orange-500'
                                       : 'border-border text-transparent'
                                 )}
                              >
                                 <Check className="size-3" />
                              </span>
                              <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">
                                 {issue.identifier}
                              </span>
                              <span className="truncate text-xs">{issue.title}</span>
                           </CommandItem>
                        );
                     })}
                  </CommandGroup>
               </CommandList>
               <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
                  <span>
                     {draftIds.length === 0
                        ? 'El grafo mostrará solo lo necesario.'
                        : `${draftIds.length} seleccionados`}
                  </span>
                  {draftIds.length > 0 && (
                     <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => setDraftIds([])}
                     >
                        Limpiar
                     </Button>
                  )}
               </div>
            </Command>
         </PopoverContent>
      </Popover>
   );
}

export function IssueDependencyGraph({
   issues,
   selectedIssueIdentifier,
   onSelectIssue,
}: {
   issues: Issue[];
   selectedIssueIdentifier?: string;
   onSelectIssue: (issue: Issue) => void;
}) {
   const { objectiveIssueIds, setObjectiveIssueIds } = useViewStore();
   const pan = useGraphPan();
   const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
   const availableIssueIds = useMemo(() => new Set(issues.map((issue) => issue.id)), [issues]);
   const selectedObjectiveIds = useMemo(
      () => objectiveIssueIds.filter((issueId) => availableIssueIds.has(issueId)),
      [availableIssueIds, objectiveIssueIds]
   );
   const objectiveIssues = useMemo(
      () => issues.filter((issue) => selectedObjectiveIds.includes(issue.id)),
      [issues, selectedObjectiveIds]
   );
   const layout = useMemo(
      () => createGraphLayout(issues, selectedObjectiveIds),
      [issues, selectedObjectiveIds]
   );
   const hasActivePath = layout.activeIds.length > 0;
   const isObjectiveMode = layout.objectiveIds.length > 0;
   const hoveredPath = useMemo(() => {
      const path = new Set<string>();
      if (!hoveredNodeId) return path;

      const ancestors = new Set<string>();
      const descendants = new Set<string>();
      visitConnected([hoveredNodeId], layout.incoming, ancestors);
      visitConnected([hoveredNodeId], layout.outgoing, descendants);
      for (const nodeId of [...ancestors, ...descendants]) path.add(nodeId);
      return path;
   }, [hoveredNodeId, layout.incoming, layout.outgoing]);
   const pendingPrerequisiteCount = layout.connectedNodes.filter(
      (node) =>
         !layout.objectiveIds.includes(node.id) && layout.stateById.get(node.id) !== 'completed'
   ).length;

   if (layout.connectedNodes.length === 0) {
      return (
         <div className="flex h-full items-center justify-center p-8">
            <div className="max-w-md rounded-2xl border border-dashed bg-card/40 p-8 text-center">
               <GitFork className="mx-auto size-6 text-muted-foreground" />
               <h2 className="mt-3 text-sm font-semibold">Aún no hay una ruta que dibujar</h2>
               <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Añade relaciones de bloqueo entre issues y aquí aparecerá el orden de ejecución.
               </p>
            </div>
         </div>
      );
   }

   return (
      <div className="flex h-full min-w-0 flex-col bg-container">
         <header className="shrink-0 border-b border-border/60 bg-container/95 px-5 py-4 backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
               <div>
                  <div className="flex items-center gap-2">
                     <span
                        className={cn(
                           'flex size-7 items-center justify-center rounded-lg border',
                           isObjectiveMode
                              ? 'border-orange-500/25 bg-orange-500/10 text-orange-500'
                              : 'border-sky-500/20 bg-sky-500/10 text-sky-500'
                        )}
                     >
                        {isObjectiveMode ? (
                           <Crosshair className="size-4" />
                        ) : (
                           <Route className="size-4" />
                        )}
                     </span>
                     <div>
                        <h2 className="text-sm font-semibold">
                           {isObjectiveMode ? 'Ruta hacia tus objetivos' : 'Camino de ejecución'}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                           {isObjectiveMode
                              ? `${pendingPrerequisiteCount} ${pendingPrerequisiteCount === 1 ? 'tarea previa pendiente' : 'tareas previas pendientes'} · ${layout.readyCount} ${layout.readyCount === 1 ? 'disponible ahora' : 'disponibles ahora'}.`
                              : hasActivePath
                                ? `${layout.activeIds.length} ${layout.activeIds.length === 1 ? 'rama activa detectada' : 'ramas activas detectadas'} por su estado.`
                                : `Elige entre ${layout.readyCount} ${layout.readyCount === 1 ? 'inicio disponible' : 'inicios disponibles'} y muévelo a In Progress.`}
                        </p>
                     </div>
                  </div>
               </div>
               <div className="flex flex-wrap items-center justify-end gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                     <span className="size-2 rounded-full bg-emerald-500" /> Activa
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                     <span className="size-2 rounded-full bg-sky-500" /> Disponible
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                     <span className="size-2 rounded-full bg-muted-foreground/40" /> Alternativa
                  </span>
                  <ObjectivePicker
                     issues={issues}
                     selectedIds={selectedObjectiveIds}
                     onChange={setObjectiveIssueIds}
                  />
               </div>
            </div>
            {isObjectiveMode && (
               <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-3">
                  <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                     Objetivos
                  </span>
                  {objectiveIssues.map((issue) => (
                     <button
                        key={issue.id}
                        type="button"
                        onClick={() =>
                           setObjectiveIssueIds(
                              selectedObjectiveIds.filter((issueId) => issueId !== issue.id)
                           )
                        }
                        className="inline-flex h-6 items-center gap-1.5 rounded-md border border-orange-500/20 bg-orange-500/[0.06] px-2 text-[11px] text-orange-600 transition-colors hover:bg-orange-500/10 dark:text-orange-400"
                        title={`Quitar ${issue.identifier} de los objetivos`}
                     >
                        {issue.identifier}
                        <X className="size-3" />
                     </button>
                  ))}
               </div>
            )}
         </header>

         <div className="relative min-h-0 flex-1 overflow-hidden">
            <div
               ref={pan.viewportRef}
               data-graph-viewport
               data-pan-state={pan.panning ? 'panning' : pan.spacePressed ? 'ready' : 'idle'}
               className={cn(
                  'h-full overflow-auto overscroll-contain',
                  pan.spacePressed &&
                     (pan.panning
                        ? 'cursor-grabbing select-none [&_*]:cursor-grabbing'
                        : 'cursor-grab [&_*]:cursor-grab')
               )}
               onPointerEnter={pan.handlePointerEnter}
               onPointerLeave={pan.handlePointerLeave}
               onPointerDownCapture={pan.handlePointerDown}
               onPointerMove={pan.handlePointerMove}
               onPointerUp={pan.handlePointerEnd}
               onPointerCancel={pan.handlePointerEnd}
               onClickCapture={pan.handleClickCapture}
            >
               <div className="relative" style={{ width: layout.width, height: layout.height }}>
                  {layout.orderedLayers.map((layer, index) => {
                     const firstNode = layer.nodes[0];
                     const position = firstNode ? layout.positions.get(firstNode.id) : undefined;
                     return (
                        <div
                           key={layer.depth}
                           className="absolute top-4 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground"
                           style={{ left: position?.x ?? CANVAS_PADDING }}
                        >
                           {index === 0
                              ? 'Inicio'
                              : index === layout.orderedLayers.length - 1
                                ? 'Resultado'
                                : `Paso ${index + 1}`}
                           {index < layout.orderedLayers.length - 1 && (
                              <ArrowRight className="size-3" />
                           )}
                        </div>
                     );
                  })}

                  <svg
                     className="pointer-events-none absolute inset-0"
                     width={layout.width}
                     height={layout.height}
                     aria-hidden="true"
                  >
                     {layout.edges.map((edge) => {
                        const source = layout.positions.get(edge.source);
                        const target = layout.positions.get(edge.target);
                        if (!source || !target) return null;
                        const startX = source.x + CARD_WIDTH;
                        const startY = source.y + CARD_HEIGHT / 2;
                        const endX = target.x;
                        const endY = target.y + CARD_HEIGHT / 2;
                        const control = Math.max(36, (endX - startX) / 2);
                        const highlighted =
                           isObjectiveMode ||
                           (hasActivePath &&
                              layout.activePath.has(edge.source) &&
                              layout.activePath.has(edge.target));
                        const hoverHighlighted =
                           hoveredNodeId !== null &&
                           hoveredPath.has(edge.source) &&
                           hoveredPath.has(edge.target);

                        return (
                           <path
                              key={`${edge.source}:${edge.target}`}
                              d={`M ${startX} ${startY} C ${startX + control} ${startY}, ${endX - control} ${endY}, ${endX} ${endY}`}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={hoverHighlighted ? 2 : highlighted ? 1.75 : 0.9}
                              className={
                                 hoverHighlighted
                                    ? 'text-sky-400/70'
                                    : hoveredNodeId
                                      ? 'text-border/15'
                                      : isObjectiveMode
                                        ? 'text-orange-500/35'
                                        : highlighted
                                          ? 'text-emerald-500/55'
                                          : 'text-border/45'
                              }
                           />
                        );
                     })}
                  </svg>

                  {layout.connectedNodes.map((node) => {
                     const position = layout.positions.get(node.id);
                     if (!position) return null;
                     const state = layout.stateById.get(node.id)!;
                     const highlighted =
                        hoveredNodeId !== null
                           ? hoveredPath.has(node.id)
                           : isObjectiveMode ||
                             !hasActivePath ||
                             layout.activePath.has(node.id) ||
                             state === 'ready';

                     return (
                        <div
                           key={node.id}
                           style={{
                              position: 'absolute',
                              width: CARD_WIDTH,
                              height: CARD_HEIGHT,
                              left: position.x,
                              top: position.y,
                           }}
                           onMouseEnter={() => setHoveredNodeId(node.id)}
                           onMouseLeave={() => setHoveredNodeId(null)}
                           onFocusCapture={() => setHoveredNodeId(node.id)}
                           onBlurCapture={() => setHoveredNodeId(null)}
                        >
                           <GraphCard
                              node={node}
                              state={state}
                              objective={layout.objectiveIds.includes(node.id)}
                              highlighted={highlighted}
                              selected={selectedIssueIdentifier === node.identifier}
                              blockerCount={layout.incoming.get(node.id)?.length ?? 0}
                              unlockCount={layout.outgoing.get(node.id)?.length ?? 0}
                              onSelectIssue={onSelectIssue}
                           />
                        </div>
                     );
                  })}
               </div>

               {layout.independentIssues.length > 0 && (
                  <section className="border-t border-border/60 px-5 py-4">
                     <div className="flex items-center gap-2 text-xs font-medium">
                        <CircleDashed className="size-3.5 text-muted-foreground" />
                        Disponibles fuera de la ruta
                        <span className="text-muted-foreground">
                           {layout.independentIssues.length}
                        </span>
                     </div>
                     <div className="mt-3 flex flex-wrap gap-2">
                        {layout.independentIssues.map((issue) => (
                           <button
                              key={issue.id}
                              type="button"
                              onClick={() => onSelectIssue(issue)}
                              className="inline-flex max-w-[320px] items-center gap-2 rounded-lg border bg-card px-3 py-2 text-left text-xs transition-colors hover:bg-accent"
                           >
                              <span className="shrink-0 text-muted-foreground">
                                 {issue.identifier}
                              </span>
                              <span className="truncate">{issue.title}</span>
                           </button>
                        ))}
                     </div>
                  </section>
               )}
            </div>

            <div
               className={cn(
                  'pointer-events-none absolute bottom-5 left-5 z-20 inline-flex h-7 items-center gap-1.5 rounded-lg border bg-container/90 px-2.5 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur transition-colors',
                  pan.spacePressed &&
                     'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-300'
               )}
               aria-hidden="true"
            >
               <Hand className={cn('size-3.5', pan.panning && 'fill-current')} />
               {pan.spacePressed ? (
                  pan.panning ? (
                     'Moviendo mapa'
                  ) : (
                     'Arrastra para mover'
                  )
               ) : (
                  <>
                     <kbd className="rounded border border-border/70 bg-muted/70 px-1 py-0.5 font-mono text-[9px] leading-none">
                        Espacio
                     </kbd>
                     + arrastrar
                  </>
               )}
            </div>
         </div>
      </div>
   );
}
