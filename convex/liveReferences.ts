import type { TableNames } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';

// Filters and preferences store ids as plain strings, so deleting a record leaves them dangling.
// Readers drop those ids instead of letting a deleted label or project silently empty a view.
export async function keepLiveIds<T extends string>(
   ctx: QueryCtx,
   table: TableNames,
   ids: readonly T[]
): Promise<T[]> {
   const isLive = await Promise.all(
      ids.map(async (id) => {
         const normalized = ctx.db.normalizeId(table, id);
         return normalized !== null && (await ctx.db.get(normalized)) !== null;
      })
   );
   return ids.filter((_, index) => isLive[index]);
}

export async function keepLiveIssueFilters<
   Filters extends { labels: string[]; project: string[]; area?: string[] },
>(ctx: QueryCtx, filters: Filters): Promise<Filters> {
   const [labels, project, area] = await Promise.all([
      keepLiveIds(ctx, 'labels', filters.labels),
      keepLiveIds(ctx, 'projects', filters.project),
      filters.area ? keepLiveIds(ctx, 'projectAreas', filters.area) : undefined,
   ]);
   return { ...filters, labels, project, ...(area ? { area } : {}) };
}
