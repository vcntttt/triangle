import { convexQuery } from '@convex-dev/react-query';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';

export function labelOptionsQuery() {
   return convexQuery(api.labels.options, {});
}

export function useLabelCommands() {
   const createLabel = useMutation(api.labels.create);
   const updateLabel = useMutation(api.labels.update);
   const deleteLabel = useMutation(api.labels.remove);

   return {
      createLabel,
      updateLabel,
      deleteLabel,
   };
}
