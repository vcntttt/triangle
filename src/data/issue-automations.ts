import { convexQuery } from '@convex-dev/react-query';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';

export function issueAutomationsQuery() {
   return convexQuery(api.issueAutomations.list, {});
}

export function issueStatusOptionsQuery() {
   return convexQuery(api.issueStatuses.list, {});
}

export function useIssueAutomationCommands() {
   const createAutomation = useMutation(api.issueAutomations.create);
   const updateAutomation = useMutation(api.issueAutomations.update);
   const setAutomationEnabled = useMutation(api.issueAutomations.setEnabled);
   const deleteAutomation = useMutation(api.issueAutomations.remove);

   return {
      createAutomation,
      updateAutomation,
      setAutomationEnabled,
      deleteAutomation,
   };
}
