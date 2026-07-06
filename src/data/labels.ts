import { convexQuery } from '@convex-dev/react-query';
import { api } from '@convex/_generated/api';

export function labelOptionsQuery() {
   return convexQuery(api.labels.options, {});
}
