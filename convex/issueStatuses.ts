import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

const defaults = [
   { id: 'backlog', name: 'Backlog', color: '#ec4899' },
   { id: 'to-do', name: 'Todo', color: '#f97316' },
   { id: 'in-progress', name: 'In Progress', color: '#facc15' },
   { id: 'technical-review', name: 'Technical Review', color: '#22c55e' },
   { id: 'paused', name: 'Paused', color: '#0ea5e9' },
   { id: 'completed', name: 'Completed', color: '#8b5cf6' },
];

const slug = (value: string) =>
   value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

export const list = query({
   args: {},
   handler: async (ctx) => {
      const rows = await ctx.db.query('issueStatuses').withIndex('by_position').collect();
      return (rows.length ? rows : defaults.map((item, position) => ({ ...item, position }))).map(
         ({ id, name, color, position }) => ({ id, name, color, position })
      );
   },
});

export const create = mutation({
   args: { name: v.string(), color: v.string() },
   handler: async (ctx, input) => {
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
      const rows = await ctx.db.query('issueStatuses').collect();
      const now = Date.now();
      await ctx.db.insert('issueStatuses', {
         id,
         name,
         color: input.color,
         position: rows.length,
         createdAt: now,
         updatedAt: now,
      });
      return { id, name, color: input.color, position: rows.length };
   },
});

export const update = mutation({
   args: { id: v.string(), name: v.optional(v.string()), color: v.optional(v.string()) },
   handler: async (ctx, input) => {
      const row = await ctx.db
         .query('issueStatuses')
         .withIndex('by_option_id', (q) => q.eq('id', input.id))
         .unique();
      if (!row) throw new Error('Status not found.');
      await ctx.db.patch(row._id, {
         ...(input.name ? { name: input.name.trim() } : {}),
         ...(input.color ? { color: input.color } : {}),
         updatedAt: Date.now(),
      });
      return {
         id: row.id,
         name: input.name?.trim() ?? row.name,
         color: input.color ?? row.color,
         position: row.position,
      };
   },
});

export const remove = mutation({
   args: { id: v.string() },
   handler: async (ctx, { id }) => {
      if (id === 'completed')
         throw new Error('The completed status is required by blocking relations.');
      const row = await ctx.db
         .query('issueStatuses')
         .withIndex('by_option_id', (q) => q.eq('id', id))
         .unique();
      if (!row) return { ok: true };
      const inUse = (await ctx.db.query('issues').collect()).some((issue) => issue.status === id);
      if (inUse) throw new Error('Cannot delete a status used by issues.');
      await ctx.db.delete(row._id);
      return { ok: true };
   },
});
