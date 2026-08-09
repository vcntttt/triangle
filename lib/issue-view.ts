import type { Issue } from '@/lib/ui-catalog';

export interface IssueDisplayGroup {
   id: string;
   name: string;
   color: string;
   issues: Issue[];
   isStatusGroup: boolean;
}

export type IssueScope = 'active' | 'backlog' | 'all';
export type IssueGroupBy = 'status' | 'priority' | 'project' | 'assignee' | 'none';
export type IssueOrderBy = 'priority' | 'created' | 'title';
export type IssueOrderDirection = 'ascending' | 'descending';
export type IssueViewType = 'list' | 'grid' | 'graph';
export type IssueListMode = 'hierarchy' | 'flat';

export type IssueDisplayProperty =
   'identifier' | 'labels' | 'project' | 'area' | 'dependencies' | 'assignee' | 'createdAt';

export interface IssueFilters {
   status: string[];
   assignee: string[];
   priority: string[];
   labels: string[];
   project: string[];
   area: string[];
}

export interface IssueDisplayConfig {
   viewType: IssueViewType;
   listMode: IssueListMode;
   groupBy: IssueGroupBy;
   orderBy: IssueOrderBy;
   orderDirection: IssueOrderDirection;
   showEmptyGroups: boolean;
   hideCompletedIssues: boolean;
   showSubissues: boolean;
   visibleProperties: Record<IssueDisplayProperty, boolean>;
}

export const defaultIssueFilters: IssueFilters = {
   status: [],
   assignee: [],
   priority: [],
   labels: [],
   project: [],
   area: [],
};

export const defaultIssueDisplay: IssueDisplayConfig = {
   viewType: 'list',
   listMode: 'hierarchy',
   groupBy: 'status',
   orderBy: 'priority',
   orderDirection: 'ascending',
   showEmptyGroups: true,
   hideCompletedIssues: false,
   showSubissues: true,
   visibleProperties: {
      identifier: true,
      labels: true,
      project: true,
      area: true,
      dependencies: true,
      assignee: true,
      createdAt: true,
   },
};

const priorityOrder: Record<string, number> = {
   'urgent': 0,
   'high': 1,
   'medium': 2,
   'low': 3,
   'no-priority': 4,
};

export function sortIssuesForDisplay(issues: Issue[], display: IssueDisplayConfig): Issue[] {
   return issues.slice().sort((left, right) => {
      let comparison = 0;

      if (display.orderBy === 'title') {
         comparison = left.title.localeCompare(right.title);
      } else if (display.orderBy === 'created') {
         comparison = left.createdAt.localeCompare(right.createdAt);
      } else {
         comparison =
            (priorityOrder[left.priority.id] ?? Number.MAX_SAFE_INTEGER) -
            (priorityOrder[right.priority.id] ?? Number.MAX_SAFE_INTEGER);
      }

      if (comparison === 0) {
         comparison = left.rank.localeCompare(right.rank);
      }

      if (comparison === 0) {
         comparison = left.identifier.localeCompare(right.identifier);
      }

      return display.orderDirection === 'descending' ? -comparison : comparison;
   });
}

export function filterIssuesByScope(
   issues: Issue[],
   scope: IssueScope,
   statusTypes: Map<string, 'unstarted' | 'started' | 'completed'>
) {
   if (scope === 'all') {
      return issues.filter((issue) => issue.status.id !== 'archived');
   }

   const expectedType = scope === 'active' ? 'started' : 'unstarted';
   return issues.filter((issue) => statusTypes.get(issue.status.id) === expectedType);
}

export function buildIssueDisplayGroups(
   issues: Issue[],
   display: IssueDisplayConfig,
   options: {
      statuses: Array<{ id: string; name: string; color: string }>;
      priorities: Array<{ id: string; name: string; color?: string }>;
      projects: Array<{ id: string; name: string }>;
   }
): IssueDisplayGroup[] {
   const sortedIssues = sortIssuesForDisplay(issues, display);
   const grouped = new Map<string, Issue[]>();
   const addIssue = (key: string, issue: Issue) => {
      grouped.set(key, [...(grouped.get(key) ?? []), issue]);
   };

   for (const issue of sortedIssues) {
      const key =
         display.groupBy === 'priority'
            ? issue.priority.id
            : display.groupBy === 'project'
              ? (issue.project?.id ?? 'no-project')
              : display.groupBy === 'assignee'
                ? (issue.assignee?.id ?? 'unassigned')
                : display.groupBy === 'none'
                  ? 'all'
                  : issue.status.id;
      addIssue(key, issue);
   }

   if (display.groupBy === 'none') {
      return [
         {
            id: 'all',
            name: 'All issues',
            color: '#71717a',
            issues: grouped.get('all') ?? [],
            isStatusGroup: false,
         },
      ];
   }

   if (display.groupBy === 'status') {
      return options.statuses
         .filter((status) => display.showEmptyGroups || (grouped.get(status.id)?.length ?? 0) > 0)
         .map((status) => ({
            ...status,
            issues: grouped.get(status.id) ?? [],
            isStatusGroup: true,
         }));
   }

   if (display.groupBy === 'priority') {
      return options.priorities
         .filter(
            (priority) => display.showEmptyGroups || (grouped.get(priority.id)?.length ?? 0) > 0
         )
         .map((priority) => ({
            id: priority.id,
            name: priority.name,
            color: priority.color ?? '#71717a',
            issues: grouped.get(priority.id) ?? [],
            isStatusGroup: false,
         }));
   }

   if (display.groupBy === 'project') {
      const projects = new Map(options.projects.map((project) => [project.id, project]));
      return Array.from(grouped.keys())
         .map((id) => ({
            id,
            name: id === 'no-project' ? 'No project' : (projects.get(id)?.name ?? 'Project'),
            color: '#71717a',
            issues: grouped.get(id) ?? [],
            isStatusGroup: false,
         }))
         .sort((left, right) => left.name.localeCompare(right.name));
   }

   const assigneeNames = new Map<string, string>([['unassigned', 'Unassigned']]);
   for (const issue of issues) {
      if (issue.assignee) assigneeNames.set(issue.assignee.id, issue.assignee.name);
   }

   return Array.from(grouped.keys())
      .map((id) => ({
         id,
         name: assigneeNames.get(id) ?? 'Assignee',
         color: '#71717a',
         issues: grouped.get(id) ?? [],
         isStatusGroup: false,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
}
