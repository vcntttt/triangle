import type { ProjectStatusOption } from './projects';

export interface IssueSummary {
   id: string;
   identifier: string;
   title: string;
}

export interface IssueSubissueSummary extends IssueSummary {
   status: string;
   priority: string;
   assigneeId: string | null;
   rank: string;
}

export interface IssueListItem {
   id: string;
   identifier: string;
   title: string;
   description: string | null;
   status: string;
   priority: string;
   assigneeId: string | null;
   rank: string;
   estimatedHours: string | null;
   dueDate: string | null;
   createdAt: string;
   updatedAt: string;
   parentIssueId: string | null;
   parentIssue: IssueSummary | null;
   subissues: IssueSubissueSummary[];
   project: {
      id: string;
      name: string;
      slug: string;
      key: string;
      iconType: string;
      iconValue: string;
      status: string;
      description: string | null;
      createdAt: string;
      updatedAt: string;
   } | null;
   labels: Array<{
      id: string;
      name: string;
      color: string;
   }>;
}

export interface IssuesPageData {
   issues: IssueListItem[];
   statusOptions: ProjectStatusOption[];
   databaseError: string | null;
   isConnected: boolean;
}

export interface CreateIssueInput {
   title: string;
   description?: string;
   status: string;
   priority: string;
   assigneeId?: string | null;
   rank: string;
   estimatedHours?: number | null;
   dueDate?: string | null;
   parentIssueId?: string | null;
   projectName?: string | null;
   labelNames?: string[];
}

export interface UpdateIssueInput {
   title?: string;
   description?: string | null;
   status?: string;
   priority?: string;
   assigneeId?: string | null;
   estimatedHours?: number | null;
   dueDate?: string | null;
   parentIssueId?: string | null;
   projectName?: string | null;
   labelNames?: string[];
}
