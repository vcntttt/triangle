import { v } from 'convex/values';
import { mutation, query, type MutationCtx } from './_generated/server';

const statusType = v.union(v.literal('unstarted'), v.literal('started'), v.literal('completed'));
export const defaultIssueStatuses = [
   { id: 'backlog', name: 'Backlog', color: '#ec4899', type: 'unstarted' as const },
   { id: 'to-do', name: 'Todo', color: '#f97316', type: 'unstarted' as const },
   { id: 'in-progress', name: 'In Progress', color: '#facc15', type: 'started' as const },
   { id: 'technical-review', name: 'Technical Review', color: '#22c55e', type: 'started' as const },
   { id: 'paused', name: 'Paused', color: '#0ea5e9', type: 'unstarted' as const },
   { id: 'completed', name: 'Completed', color: '#8b5cf6', type: 'completed' as const },
];
const slug = (value: string) =>
   value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

async function ensureDefaults(ctx: MutationCtx) {
   const existing = new Set((await ctx.db.query('issueStatuses').collect()).map((row) => row.id));
   const now = Date.now();
   await Promise.all(
      defaultIssueStatuses.flatMap((item, position) =>
         existing.has(item.id)
            ? []
            : [
                 ctx.db.insert('issueStatuses', {
                    ...item,
                    position,
                    createdAt: now,
                    updatedAt: now,
                 }),
              ]
      )
   );
}

export const seedDefaults = mutation({
   args: {},
   handler: async (ctx) => {
      await ensureDefaults(ctx);
      return { ok: true };
   },
});

export const list = query({
   args: {},
   handler: async (ctx) => {
      const rows = await ctx.db.query('issueStatuses').withIndex('by_position').collect();
      const values = new Map(
         defaultIssueStatuses.map((item, position) => [item.id, { ...item, position }])
      );
      rows.forEach((row) => values.set(row.id, row));
      return Array.from(values.values())
         .map(({ id, name, color, position, type }) => ({ id, name, color, position, type }))
         .toSorted((a, b) => a.position - b.position);
   },
});

export const create = mutation({
   args: { name: v.string(), color: v.string(), type: statusType },
   handler: async (ctx, input) => {
      await ensureDefaults(ctx);
      const name = input.name.trim();
      const id = slug(name);
      if (!id) throw new Error('Status name is required.');
      if (
         await ctx.db
            .query('issueStatuses')
            .withIndex('by_option_id', (q) => q.eq('id', id))
            .unique()
      )
         throw new Error('A status with this name already exists.');
      const position = (await ctx.db.query('issueStatuses').collect()).length;
      const now = Date.now();
      await ctx.db.insert('issueStatuses', {
         id,
         name,
         color: input.color,
         type: input.type,
         position,
         createdAt: now,
         updatedAt: now,
      });
      return { id, name, color: input.color, type: input.type, position };
   },
});

export const update = mutation({
   args: {
      id: v.string(),
      name: v.optional(v.string()),
      color: v.optional(v.string()),
      type: v.optional(statusType),
   },
   handler: async (ctx, input) => {
      await ensureDefaults(ctx);
      const row = await ctx.db
         .query('issueStatuses')
         .withIndex('by_option_id', (q) => q.eq('id', input.id))
         .unique();
      if (!row) throw new Error('Status not found.');
      await ctx.db.patch(row._id, {
         ...(input.name ? { name: input.name.trim() } : {}),
         ...(input.color ? { color: input.color } : {}),
         ...(input.type ? { type: input.type } : {}),
         updatedAt: Date.now(),
      });
      return {
         id: row.id,
         name: input.name?.trim() ?? row.name,
         color: input.color ?? row.color,
         type: input.type ?? row.type,
         position: row.position,
      };
   },
});

export const remove = mutation({
   args: { id: v.string() },
   handler: async (ctx, { id }) => {
      await ensureDefaults(ctx);
      if (id === 'completed')
         throw new Error('The completed status is required by blocking relations.');
      const row = await ctx.db
         .query('issueStatuses')
         .withIndex('by_option_id', (q) => q.eq('id', id))
         .unique();
      if (!row) return { ok: true };
      if ((await ctx.db.query('issues').collect()).some((issue) => issue.status === id))
         throw new Error('Cannot delete a status used by issues.');
      await ctx.db.delete(row._id);
      return { ok: true };
   },
});
