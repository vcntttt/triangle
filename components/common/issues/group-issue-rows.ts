import type { Issue } from '@/lib/models';
import { sortIssuesByPriority } from '@/lib/ui-catalog';

export type IssueListRow = {
   issue: Issue;
   nestingLevel: number;
   childrenCount: number;
   completedChildrenCount: number;
};

export function getIssueListRows(issues: Issue[]): IssueListRow[] {
   const sortedIssues = sortIssuesByPriority(issues);
   const issueMap = new Map(sortedIssues.map((issue) => [issue.id, issue]));
   const rows: IssueListRow[] = [];
   const seen = new Set<string>();

   for (const issue of sortedIssues) {
      if (seen.has(issue.id)) {
         continue;
      }

      const visibleParent = issue.parentIssueId ? issueMap.get(issue.parentIssueId) : null;
      if (visibleParent) {
         continue;
      }

      const visibleChildren = sortedIssues.filter(
         (candidate) => candidate.parentIssueId === issue.id
      );

      rows.push({
         issue,
         nestingLevel: 0,
         childrenCount: visibleChildren.length,
         completedChildrenCount: visibleChildren.filter(
            (child) => child.status.id === 'completed' || child.status.id === 'archived'
         ).length,
      });
      seen.add(issue.id);

      for (const child of visibleChildren) {
         rows.push({
            issue: child,
            nestingLevel: 1,
            childrenCount: 0,
            completedChildrenCount: 0,
         });
         seen.add(child.id);
      }
   }

   for (const issue of sortedIssues) {
      if (seen.has(issue.id)) {
         continue;
      }

      rows.push({
         issue,
         nestingLevel: 0,
         childrenCount: 0,
         completedChildrenCount: 0,
      });
   }

   return rows;
}
