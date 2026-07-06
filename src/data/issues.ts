import { convexQuery } from '@convex-dev/react-query';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';

export interface IssuesPageArgs {
   projectId?: Id<'projects'> | string | null;
}

export function issuesPageQuery(args: IssuesPageArgs = {}) {
   return convexQuery(api.issues.page, {
      projectId: args.projectId ?? undefined,
   });
}

export function issueDetailQuery(issueIdentifier: string) {
   return convexQuery(api.issues.detail, { issueIdentifier });
}

export function useIssueCommands() {
   const createIssue = useMutation(api.issues.create);
   const createIssueWithSubissues = useMutation(api.issues.createWithSubissues);
   const updateIssue = useMutation(api.issues.update);
   const setIssueStatus = useMutation(api.issues.setStatus);
   const archiveIssue = useMutation(api.issues.archive);
   const deleteIssue = useMutation(api.issues.remove);
   const setIssueParent = useMutation(api.issues.setParent);

   return {
      createIssue,
      createIssueWithSubissues,
      updateIssue,
      setIssueStatus,
      archiveIssue,
      deleteIssue,
      setIssueParent,
   };
}
