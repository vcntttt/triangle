import type { QueryCtx } from './_generated/server';
import { defaultIssueStatuses } from './issueStatuses';

export async function listIssueStatusOptions(ctx: QueryCtx) {
   const rows = await ctx.db.query('issueStatuses').withIndex('by_position').collect();
   const values = new Map(
      defaultIssueStatuses.map((item, position) => [item.id, { ...item, position }])
   );

   rows.forEach((row) => values.set(row.id, row));

   return Array.from(values.values()).toSorted((left, right) => left.position - right.position);
}
