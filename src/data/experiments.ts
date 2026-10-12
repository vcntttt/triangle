import { convexQuery } from '@convex-dev/react-query';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';

export function experimentsPageQuery() {
   return convexQuery(api.experiments.page, {});
}

export function useExperimentCommands() {
   const createExperiment = useMutation(api.experiments.create);
   const updateExperiment = useMutation(api.experiments.update);
   const setExperimentStatus = useMutation(api.experiments.setStatus);
   const promoteExperimentToIssue = useMutation(api.experiments.promoteToIssue);

   return {
      createExperiment,
      updateExperiment,
      setExperimentStatus,
      promoteExperimentToIssue,
   };
}
