'use client';

import { Link } from '@tanstack/react-router';
import {
   ArrowDown,
   Check,
   CheckCircle2,
   CircleDashed,
   GitBranch,
   LockKeyhole,
   Plus,
   Unlock,
   X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Issue } from '@/lib/models';
import { cn } from '@/lib/utils';
import { isResolvedIssueStatus } from '@/lib/issue-status';

type IssueRelation = Issue['blockedBy'][number];

const isRelationComplete = (relation: IssueRelation) => isResolvedIssueStatus(relation.status);

const isReadyToStartStatus = (statusId: string) => statusId === 'backlog' || statusId === 'to-do';

export function IssueDependencyIndicator({ issue }: { issue: Issue }) {
   if (isResolvedIssueStatus(issue.status.id)) {
      return null;
   }

   const pendingBlockers = issue.blockedBy.filter((relation) => !isRelationComplete(relation));
   const pendingBlocks = issue.blocks.filter((relation) => !isRelationComplete(relation));
   const hasResolvedPath = issue.blockedBy.length > 0 && pendingBlockers.length === 0;

   if (pendingBlockers.length > 0) {
      const blockerNames = pendingBlockers
         .map((relation) => `${relation.identifier} ${relation.title}`)
         .join(', ');

      return (
         <span
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/8 px-2.5 text-[13px] font-medium text-amber-700 dark:text-amber-300"
            title={`Primero: ${blockerNames}`}
            aria-label={`Bloqueada por ${pendingBlockers.length} ${pendingBlockers.length === 1 ? 'tarea' : 'tareas'}`}
         >
            <LockKeyhole className="size-3.5" />
            {pendingBlockers.length} {pendingBlockers.length === 1 ? 'previa' : 'previas'}
         </span>
      );
   }

   if (hasResolvedPath) {
      return (
         <span
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/8 px-2.5 text-[13px] font-medium text-emerald-700 dark:text-emerald-300"
            title={
               pendingBlocks.length > 0
                  ? `Lista para empezar; libera ${pendingBlocks.length} ${pendingBlocks.length === 1 ? 'tarea' : 'tareas'}`
                  : 'Todos sus bloqueos están resueltos'
            }
         >
            <Unlock className="size-3.5" />
            Lista{pendingBlocks.length > 0 ? ` · libera ${pendingBlocks.length}` : ''}
         </span>
      );
   }

   if (pendingBlocks.length > 0) {
      return (
         <span
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-sky-500/20 bg-sky-500/8 px-2.5 text-[13px] font-medium text-sky-700 dark:text-sky-300"
            title={`Completar esta tarea libera ${pendingBlocks.length} ${pendingBlocks.length === 1 ? 'tarea' : 'tareas'}`}
         >
            <GitBranch className="size-3.5" />
            Libera {pendingBlocks.length}
         </span>
      );
   }

   return null;
}

function RelationCard({
   relation,
   direction,
   onRemove,
}: {
   relation: IssueRelation;
   direction: 'before' | 'after';
   onRemove: () => void;
}) {
   const complete = isRelationComplete(relation);

   return (
      <div
         className={cn(
            'group flex min-w-0 items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
            complete
               ? 'border-border/50 bg-muted/20 text-muted-foreground'
               : direction === 'before'
                 ? 'border-amber-500/20 bg-amber-500/[0.04]'
                 : 'border-border/60 bg-card hover:border-sky-500/25'
         )}
      >
         <span
            className={cn(
               'flex size-7 shrink-0 items-center justify-center rounded-full border',
               complete
                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : direction === 'before'
                    ? 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    : 'border-border bg-background text-muted-foreground'
            )}
         >
            {complete ? (
               <Check className="size-3.5" />
            ) : direction === 'before' ? (
               <LockKeyhole className="size-3.5" />
            ) : (
               <CircleDashed className="size-3.5" />
            )}
         </span>
         <Link
            to="/issues/$issueIdentifier"
            params={{ issueIdentifier: relation.identifier }}
            className="min-w-0 flex-1"
         >
            <span className="block truncate text-xs font-medium text-muted-foreground">
               {relation.identifier}
            </span>
            <span className="block truncate text-sm font-medium text-foreground hover:underline">
               {relation.title}
            </span>
         </Link>
         {(complete || direction === 'before') && (
            <span className="shrink-0 text-[11px] text-muted-foreground">
               {complete ? 'Hecha' : 'Pendiente'}
            </span>
         )}
         <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            onClick={onRemove}
            aria-label={`Quitar relación con ${relation.identifier}`}
         >
            <X className="size-3.5" />
         </Button>
      </div>
   );
}

function FlowConnector({ complete = false }: { complete?: boolean }) {
   return (
      <div className="ml-[26px] flex h-7 items-center" aria-hidden="true">
         <div className={cn('h-full w-px', complete ? 'bg-emerald-500/35' : 'bg-border')} />
         <ArrowDown
            className={cn(
               '-ml-[6.5px] mt-5 size-3.5',
               complete ? 'text-emerald-500/70' : 'text-muted-foreground/60'
            )}
         />
      </div>
   );
}

export function IssueDependencyFlow({
   issue,
   onAddBlocker,
   onRemoveBlocker,
   compact = false,
}: {
   issue: Issue;
   onAddBlocker: () => void;
   onRemoveBlocker: (blockedIssueId: string, blockerIssueId: string) => void;
   compact?: boolean;
}) {
   const pendingBlockers = issue.blockedBy.filter((relation) => !isRelationComplete(relation));
   const pendingBlocks = issue.blocks.filter((relation) => !isRelationComplete(relation));
   const isBlocked = pendingBlockers.length > 0;
   const allPrerequisitesComplete = issue.blockedBy.length > 0 && !isBlocked;

   return (
      <section
         className={cn(
            'overflow-hidden rounded-xl border border-border/70 bg-card/40',
            compact && 'rounded-none border-0 bg-transparent'
         )}
      >
         <div
            className={cn(
               'flex items-start justify-between gap-4 border-b border-border/60 px-4 py-3.5',
               compact && 'flex-col border-b-0 px-0 pt-0 pb-4'
            )}
         >
            <div className="min-w-0">
               <div className="flex items-center gap-2">
                  <GitBranch className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Ruta de desbloqueo</h2>
               </div>
               <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {isBlocked
                     ? `Completa ${pendingBlockers.length} ${pendingBlockers.length === 1 ? 'tarea previa' : 'tareas previas'} para poder empezar.`
                     : pendingBlocks.length > 0
                       ? `Lista para avanzar; al completarla liberarás ${pendingBlocks.length} ${pendingBlocks.length === 1 ? 'tarea' : 'tareas'}.`
                       : 'Sin bloqueos pendientes. Esta tarea puede avanzar.'}
               </p>
            </div>
            <Button
               type="button"
               variant="outline"
               size="sm"
               className={cn(compact && 'w-full justify-center')}
               onClick={onAddBlocker}
            >
               <Plus className="size-3.5" />
               Añadir bloqueador
            </Button>
         </div>

         <div className={cn('p-4', compact && 'px-0 pb-0 pt-4')}>
            {issue.blockedBy.length > 0 && (
               <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                     <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        1 · Primero
                     </span>
                     <span className="text-[11px] text-muted-foreground">
                        {issue.blockedBy.length - pendingBlockers.length}/{issue.blockedBy.length}{' '}
                        completadas
                     </span>
                  </div>
                  <div className="space-y-2">
                     {issue.blockedBy.map((relation) => (
                        <RelationCard
                           key={relation.id}
                           relation={relation}
                           direction="before"
                           onRemove={() => onRemoveBlocker(issue.id, relation.id)}
                        />
                     ))}
                  </div>
                  <FlowConnector complete={allPrerequisitesComplete} />
               </div>
            )}

            <div>
               <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {issue.blockedBy.length > 0 ? '2 · Luego' : 'Ahora'}
               </div>
               <div
                  className={cn(
                     'relative flex items-center gap-3 overflow-hidden rounded-lg border px-3 py-3',
                     isBlocked
                        ? 'border-amber-500/25 bg-amber-500/[0.05]'
                        : 'border-emerald-500/25 bg-emerald-500/[0.05]'
                  )}
               >
                  <div
                     className={cn(
                        'absolute inset-y-0 left-0 w-0.5',
                        isBlocked ? 'bg-amber-500' : 'bg-emerald-500'
                     )}
                  />
                  <span
                     className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-full border',
                        isBlocked
                           ? 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                           : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                     )}
                  >
                     {isBlocked ? (
                        <LockKeyhole className="size-4" />
                     ) : (
                        <CheckCircle2 className="size-4" />
                     )}
                  </span>
                  <div className="min-w-0 flex-1">
                     <span className="block text-xs font-medium text-muted-foreground">
                        {issue.identifier} · Esta tarea
                     </span>
                     <span className="block truncate text-sm font-semibold">{issue.title}</span>
                  </div>
                  <span
                     className={cn(
                        'shrink-0 rounded-full px-2 py-1 text-[11px] font-medium',
                        isBlocked
                           ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                           : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                     )}
                  >
                     {isBlocked
                        ? 'Bloqueada'
                        : isReadyToStartStatus(issue.status.id)
                          ? 'Lista'
                          : issue.status.name}
                  </span>
               </div>
            </div>

            {issue.blocks.length > 0 && (
               <div>
                  <FlowConnector />
                  <div className="mb-2 flex items-center justify-between gap-3">
                     <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {issue.blockedBy.length > 0 ? '3 · Después' : 'Después'}
                     </span>
                     {pendingBlocks.length > 0 && (
                        <span className="text-[11px] text-sky-700 dark:text-sky-300">
                           Libera {pendingBlocks.length}
                        </span>
                     )}
                  </div>
                  <div className="space-y-2">
                     {issue.blocks.map((relation) => (
                        <RelationCard
                           key={relation.id}
                           relation={relation}
                           direction="after"
                           onRemove={() => onRemoveBlocker(relation.id, issue.id)}
                        />
                     ))}
                  </div>
               </div>
            )}
         </div>
      </section>
   );
}
