export interface ExecutionPathIssue {
   id: string;
   identifier: string;
   title: string;
   description: string | null;
   status: string;
   priority: string;
   assigneeId: string | null;
   estimatedHours: number | null;
   dueDate: string | null;
   project: { id: string; name: string; slug: string } | null;
   area: { id: string; name: string } | null;
   labels: Array<{ id: string; name: string }>;
   parentIssue: { id: string; identifier: string; title: string } | null;
   subissues: Array<{ id: string; identifier: string; title: string; status: string }>;
   blockedBy: Array<{ id: string; identifier: string; title: string; status: string }>;
   blocks: Array<{ id: string; identifier: string; title: string; status: string }>;
}

interface StatusOption {
   id: string;
   type: 'unstarted' | 'started' | 'completed';
}

function executionReason(
   issue: ExecutionPathIssue,
   pendingBlockers: ExecutionPathIssue[],
   objective: boolean,
   unlocks: ExecutionPathIssue[]
) {
   if (pendingBlockers.length > 0) {
      return `Esperando a ${pendingBlockers.map((blocker) => blocker.identifier).join(', ')}.`;
   }
   if (objective) return 'Objetivo solicitado y listo para ejecutar.';
   return unlocks.length > 0
      ? `Listo; desbloquea ${unlocks.map((blocked) => blocked.identifier).join(', ')}.`
      : `Listo para ejecutar ${issue.identifier}.`;
}

export function createExecutionPath(
   issues: ExecutionPathIssue[],
   statusOptions: StatusOption[],
   objectiveIdentifiers: string[],
   includeCompleted = false
) {
   const byId = new Map(issues.map((issue) => [issue.id, issue]));
   const byIdentifier = new Map(
      issues.map((issue) => [issue.identifier.toLocaleUpperCase(), issue] as const)
   );
   const normalizedObjectives = Array.from(
      new Set(objectiveIdentifiers.map((identifier) => identifier.trim().toLocaleUpperCase()))
   ).filter(Boolean);
   const missingObjectives = normalizedObjectives.filter(
      (identifier) => !byIdentifier.has(identifier)
   );

   if (missingObjectives.length > 0) {
      throw new Error(`Unknown objective identifiers: ${missingObjectives.join(', ')}.`);
   }

   const objectives = normalizedObjectives.map((identifier) => byIdentifier.get(identifier)!);
   const requiredIds = new Set<string>();
   const stack = objectives.map((issue) => issue.id);

   while (stack.length > 0) {
      const issueId = stack.pop()!;
      if (requiredIds.has(issueId)) continue;
      requiredIds.add(issueId);
      const issue = byId.get(issueId);
      if (issue) stack.push(...issue.blockedBy.map((blocker) => blocker.id));
   }

   const completedStatuses = new Set(
      statusOptions.flatMap((status) => (status.type === 'completed' ? [status.id] : []))
   );
   const isCompleted = (issue: ExecutionPathIssue) => completedStatuses.has(issue.status);
   const required = issues.filter((issue) => requiredIds.has(issue.id));
   const remaining = new Set(required.flatMap((issue) => (!isCompleted(issue) ? [issue.id] : [])));
   const stages: string[][] = [];

   while (remaining.size > 0) {
      const stage = required.flatMap((issue) =>
         remaining.has(issue.id) && issue.blockedBy.every((blocker) => !remaining.has(blocker.id))
            ? [issue.identifier]
            : []
      );

      if (stage.length === 0) break;
      stages.push(stage);
      for (const identifier of stage) remaining.delete(byIdentifier.get(identifier)!.id);
   }

   const objectiveIds = new Set(objectives.map((issue) => issue.id));
   const visibleIssues = includeCompleted
      ? required
      : required.filter((issue) => !isCompleted(issue));
   const issueContexts = visibleIssues.map((issue) => {
      const pendingBlockers = issue.blockedBy.flatMap((blocker) => {
         const blockerIssue = byId.get(blocker.id);
         return blockerIssue && !isCompleted(blockerIssue) ? [blockerIssue] : [];
      });
      const unlocks = issue.blocks.flatMap((blocked) => {
         const blockedIssue = byId.get(blocked.id);
         return blockedIssue && requiredIds.has(blockedIssue.id) ? [blockedIssue] : [];
      });
      const objective = objectiveIds.has(issue.id);

      return {
         id: issue.id,
         identifier: issue.identifier,
         title: issue.title,
         description: issue.description,
         status: issue.status,
         priority: issue.priority,
         assigneeId: issue.assigneeId,
         estimatedHours: issue.estimatedHours,
         dueDate: issue.dueDate,
         project: issue.project,
         area: issue.area,
         labels: issue.labels,
         parentIssue: issue.parentIssue,
         subissues: issue.subissues,
         objective,
         state: isCompleted(issue)
            ? 'completed'
            : pendingBlockers.length === 0
              ? 'ready'
              : 'blocked',
         reason: isCompleted(issue)
            ? 'Completado; se incluye como contexto histórico.'
            : executionReason(issue, pendingBlockers, objective, unlocks),
         pendingBlockers: pendingBlockers.map(({ id, identifier, title, status }) => ({
            id,
            identifier,
            title,
            status,
         })),
         unlocks: unlocks.map(({ id, identifier, title, status }) => ({
            id,
            identifier,
            title,
            status,
         })),
      };
   });
   const readyNow = issueContexts.flatMap(({ id, identifier, title, priority, state }) =>
      state === 'ready' ? [{ id, identifier, title, priority }] : []
   );
   const completedCount = required.filter(isCompleted).length;

   return {
      objectives: objectives.map(({ id, identifier, title, status }) => ({
         id,
         identifier,
         title,
         status,
      })),
      summary: `${required.length} issues conducen al objetivo: ${completedCount} completados y ${required.length - completedCount} pendientes. ${readyNow.length} se pueden ejecutar ahora.`,
      readyNow,
      recommendedStages: stages,
      issues: issueContexts,
      diagnostics:
         remaining.size > 0
            ? {
                 warning: 'The dependency graph contains an unresolved cycle.',
                 issueIds: [...remaining],
              }
            : null,
   };
}
