import type { Issue } from '@/lib/models';
import {
   sortIssuesByConfiguredPriority,
   sortIssuesForDisplay,
   type IssueDisplayConfig,
   type IssueOrderOption,
} from '@/lib/issue-view';

export type IssueListRow = {
   issue: Issue;
   nestingLevel: number;
   childrenCount: number;
   completedChildrenCount: number;
};

export type IssueOrderConfig =
   | { kind: 'priority'; priorities: IssueOrderOption[] }
   | { kind: 'display'; display: IssueDisplayConfig; priorities: IssueOrderOption[] };

export function getIssueListRows(
   issues: Issue[],
   listMode: 'hierarchy' | 'flat' = 'hierarchy',
   collapsedParentIds: ReadonlySet<string> = new Set(),
   order: IssueOrderConfig = { kind: 'priority', priorities: [] }
): IssueListRow[] {
   const sortedIssues =
      order.kind === 'display'
         ? sortIssuesForDisplay(issues, order.display, order.priorities)
         : sortIssuesByConfiguredPriority(issues, order.priorities);

   if (listMode === 'flat') {
      return sortedIssues.map((issue) => ({
         issue,
         nestingLevel: 0,
         childrenCount: 0,
         completedChildrenCount: 0,
      }));
   }
   const issueIds = new Set(sortedIssues.map((issue) => issue.id));
   const childrenOf = new Map<string, Issue[]>();
   const roots: Issue[] = [];

   for (const issue of sortedIssues) {
      if (issue.parentIssueId && issueIds.has(issue.parentIssueId)) {
         const siblings = childrenOf.get(issue.parentIssueId);
         if (siblings) siblings.push(issue);
         else childrenOf.set(issue.parentIssueId, [issue]);
      } else {
         roots.push(issue);
      }
   }

   const rows: IssueListRow[] = [];
   const emitted = new Set<string>();
   const done = (issue: Issue) => issue.status.id === 'completed' || issue.status.id === 'archived';

   // Depth-first walk: emits each issue once with its direct-children counts,
   // recursing into subtrees unless the parent is collapsed.
   const emit = (issue: Issue, level: number) => {
      if (emitted.has(issue.id)) return;
      emitted.add(issue.id);

      const kids = childrenOf.get(issue.id) ?? [];
      rows.push({
         issue,
         nestingLevel: level,
         childrenCount: kids.length,
         completedChildrenCount: kids.filter(done).length,
      });

      if (!collapsedParentIds.has(issue.id)) {
         for (const kid of kids) emit(kid, level + 1);
      }
   };

   for (const root of roots) emit(root, 0);

   return rows;
}
