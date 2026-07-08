'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Issue, LabelInterface, Priority, Project, Status, User } from '@/lib/models';
import { archivedStatus } from '@/lib/ui-catalog';
import { useIssueCommands } from '@/src/data/issues';

interface FilterOptions {
   status?: string[];
   assignee?: string[];
   priority?: string[];
   labels?: string[];
   project?: string[];
   area?: string[];
}

interface IssuesDataContextValue {
   issues: Issue[];
   getAllIssues: () => Issue[];
   getIssueById: (id: string) => Issue | undefined;
   getRootIssues: () => Issue[];
   getSubissues: (parentIssueId: string) => Issue[];
   getIssueChildrenCount: (issueId: string) => number;
   filterByStatus: (statusId: string) => Issue[];
   filterByPriority: (priorityId: string) => Issue[];
   filterByAssignee: (userId: string | null) => Issue[];
   filterByLabel: (labelId: string) => Issue[];
   filterByProject: (projectId: string) => Issue[];
   filterByArea: (areaId: string) => Issue[];
   searchIssues: (query: string) => Issue[];
   filterIssues: (filters: FilterOptions) => Issue[];
   updateIssueContent: (
      issueId: string,
      content: { title?: string; description?: string; estimatedHours?: number | null }
   ) => void;
   updateIssueStatus: (issueId: string, newStatus: Status) => void;
   updateIssuePriority: (issueId: string, newPriority: Priority) => void;
   updateIssueAssignee: (issueId: string, newAssignee: User | null) => void;
   addIssueLabel: (issueId: string, label: LabelInterface) => void;
   removeIssueLabel: (issueId: string, labelId: string) => void;
   updateIssueProject: (issueId: string, newProject: Project | undefined) => void;
   updateIssueArea: (issueId: string, areaId: string | null) => void;
   updateIssueDueDate: (issueId: string, dueDate: string | undefined) => void;
   updateIssueEstimatedHours: (issueId: string, estimatedHours: number | undefined) => void;
   updateIssueParent: (issueId: string, parent: NonNullable<Issue['parent']> | null) => void;
   archiveIssue: (issueId: string) => void;
   deleteIssue: (issueId: string) => void;
}

const IssuesDataContext = createContext<IssuesDataContextValue | null>(null);

const isArchivedIssue = (issue: Issue) => issue.status.id === archivedStatus.id;
const isDoneStatusId = (statusId: string) => statusId === 'completed' || statusId === 'archived';
const sortByRankDesc = (issues: Issue[]) => issues.toSorted((a, b) => b.rank.localeCompare(a.rank));

export function IssuesDataProvider({ issues, children }: { issues: Issue[]; children: ReactNode }) {
   const commands = useIssueCommands();

   const value = useMemo<IssuesDataContextValue>(() => {
      const getIssueById = (id: string) => issues.find((issue) => issue.id === id);
      const getAllIssues = () => issues;
      const getSubissues = (parentIssueId: string) =>
         sortByRankDesc(issues.filter((issue) => issue.parentIssueId === parentIssueId));

      const persistIssuePatch = (
         issueId: string,
         payload: Parameters<typeof commands.updateIssue>[0]
      ) => {
         void commands.updateIssue({ issueId, ...payload }).catch((error) => {
            console.error('Failed to persist issue update.', error);
         });
      };

      return {
         issues,
         getAllIssues,
         getIssueById,
         getRootIssues: () => issues.filter((issue) => !issue.parentIssueId),
         getSubissues,
         getIssueChildrenCount: (issueId: string) =>
            issues.filter((issue) => issue.parentIssueId === issueId).length,
         filterByStatus: (statusId: string) =>
            issues.filter((issue) => issue.status.id === statusId),
         filterByPriority: (priorityId: string) =>
            issues.filter((issue) => issue.priority.id === priorityId),
         filterByAssignee: (userId: string | null) =>
            userId === null
               ? issues.filter((issue) => issue.assignee === null)
               : issues.filter((issue) => issue.assignee?.id === userId),
         filterByLabel: (labelId: string) =>
            issues.filter((issue) => issue.labels.some((label) => label.id === labelId)),
         filterByProject: (projectId: string) =>
            issues.filter((issue) => issue.project?.id === projectId),
         filterByArea: (areaId: string) => issues.filter((issue) => issue.area?.id === areaId),
         searchIssues: (query: string) => {
            const normalizedQuery = query.toLowerCase();
            return issues.filter(
               (issue) =>
                  !isArchivedIssue(issue) &&
                  (issue.title.toLowerCase().includes(normalizedQuery) ||
                     issue.identifier.toLowerCase().includes(normalizedQuery))
            );
         },
         filterIssues: (filters: FilterOptions) => {
            let filteredIssues = issues.filter((issue) => !isArchivedIssue(issue));

            if (filters.status && filters.status.length > 0) {
               const statusFilter = new Set(filters.status);
               filteredIssues = filteredIssues.filter((issue) => statusFilter.has(issue.status.id));
            }

            if (filters.assignee && filters.assignee.length > 0) {
               const assigneeFilter = new Set(filters.assignee);
               filteredIssues = filteredIssues.filter((issue) => {
                  if (assigneeFilter.has('unassigned') && issue.assignee === null) {
                     return true;
                  }

                  return issue.assignee ? assigneeFilter.has(issue.assignee.id) : false;
               });
            }

            if (filters.priority && filters.priority.length > 0) {
               const priorityFilter = new Set(filters.priority);
               filteredIssues = filteredIssues.filter((issue) =>
                  priorityFilter.has(issue.priority.id)
               );
            }

            if (filters.labels && filters.labels.length > 0) {
               const labelFilter = new Set(filters.labels);
               filteredIssues = filteredIssues.filter((issue) =>
                  issue.labels.some((label) => labelFilter.has(label.id))
               );
            }

            if (filters.project && filters.project.length > 0) {
               const projectFilter = new Set(filters.project);
               filteredIssues = filteredIssues.filter(
                  (issue) => issue.project && projectFilter.has(issue.project.id)
               );
            }

            if (filters.area && filters.area.length > 0) {
               const areaFilter = new Set(filters.area);
               filteredIssues = filteredIssues.filter(
                  (issue) => issue.area && areaFilter.has(issue.area.id)
               );
            }

            return filteredIssues;
         },
         updateIssueContent: (issueId, content) => {
            persistIssuePatch(issueId, content);
         },
         updateIssueStatus: (issueId, newStatus) => {
            const targetIssue = getIssueById(issueId);
            if (!targetIssue) {
               return;
            }

            let cascadeChildren = false;
            const advanceParent =
               Boolean(targetIssue.parentIssueId) &&
               (newStatus.id === 'in-progress' || newStatus.id === 'completed');

            if (!targetIssue.parentIssueId && newStatus.id === 'completed') {
               const pendingChildren = getSubissues(targetIssue.id).filter(
                  (child) => !isDoneStatusId(child.status.id)
               );

               if (pendingChildren.length > 0) {
                  cascadeChildren = window.confirm(
                     `Completing ${targetIssue.identifier} will also complete ${pendingChildren.length} sub-issue${pendingChildren.length > 1 ? 's' : ''}. Continue?`
                  );

                  if (!cascadeChildren) {
                     return;
                  }
               }
            }

            void commands
               .setIssueStatus({
                  issueId,
                  status: newStatus.id,
                  cascadeChildren,
                  advanceParent,
               })
               .catch((error) => {
                  console.error('Failed to persist issue status.', error);
               });
         },
         updateIssuePriority: (issueId, newPriority) => {
            persistIssuePatch(issueId, { priority: newPriority.id });
         },
         updateIssueAssignee: (issueId, newAssignee) => {
            persistIssuePatch(issueId, { assigneeId: newAssignee?.id ?? null });
         },
         addIssueLabel: (issueId, label) => {
            const issue = getIssueById(issueId);
            if (!issue) {
               return;
            }

            const labelIds = Array.from(
               new Set([...issue.labels.map((item) => item.id), label.id])
            );
            persistIssuePatch(issueId, { labelIds });
         },
         removeIssueLabel: (issueId, labelId) => {
            const issue = getIssueById(issueId);
            if (!issue) {
               return;
            }

            const labelIds = [];
            for (const label of issue.labels) {
               if (label.id !== labelId) {
                  labelIds.push(label.id);
               }
            }

            persistIssuePatch(issueId, {
               labelIds,
            });
         },
         updateIssueProject: (issueId, newProject) => {
            persistIssuePatch(issueId, { projectId: newProject?.id ?? null });
         },
         updateIssueArea: (issueId, areaId) => {
            persistIssuePatch(issueId, { areaId });
         },
         updateIssueDueDate: (issueId, dueDate) => {
            persistIssuePatch(issueId, { dueDate: dueDate ?? null });
         },
         updateIssueEstimatedHours: (issueId, estimatedHours) => {
            persistIssuePatch(issueId, { estimatedHours: estimatedHours ?? null });
         },
         updateIssueParent: (issueId, parent) => {
            void commands
               .setIssueParent({ issueId, parentIssueId: parent?.id ?? null })
               .catch((error) => {
                  console.error('Failed to persist issue parent.', error);
               });
         },
         archiveIssue: (issueId) => {
            void commands.archiveIssue({ issueId }).catch((error) => {
               console.error('Failed to archive issue.', error);
            });
         },
         deleteIssue: (issueId) => {
            void commands.deleteIssue({ issueId }).catch((error) => {
               console.error('Failed to delete issue.', error);
            });
         },
      };
   }, [commands, issues]);

   return <IssuesDataContext.Provider value={value}>{children}</IssuesDataContext.Provider>;
}

export function useIssuesData() {
   const context = useContext(IssuesDataContext);

   if (!context) {
      throw new Error('useIssuesData must be used within IssuesDataProvider.');
   }

   return context;
}

export type IssuesData = IssuesDataContextValue;
