import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';

export const options = query({
   args: {},
   handler: async (ctx) => {
      const labels = await ctx.db.query('labels').collect();

      return labels
         .map((label) => ({
            id: label._id,
            name: label.name,
            color: label.color,
         }))
         .toSorted((left, right) => left.name.localeCompare(right.name));
   },
});

export const create = mutation({
   args: { name: v.string(), color: v.string() },
   handler: async (ctx, input) => {
      const name = input.name.trim();
      if (!name) throw new Error('Label name is required.');
      if (
         await ctx.db
            .query('labels')
            .withIndex('by_name', (q) => q.eq('name', name))
            .unique()
      )
         throw new Error('A label with this name already exists.');
      const id = await ctx.db.insert('labels', { name, color: input.color, createdAt: Date.now() });
      return { id, name, color: input.color };
   },
});

export const update = mutation({
   args: { labelId: v.string(), name: v.optional(v.string()), color: v.optional(v.string()) },
   handler: async (ctx, input) => {
      const id = input.labelId as Id<'labels'>;
      const label = await ctx.db.get(id);
      if (!label) throw new Error('Label not found.');
      await ctx.db.patch(id, {
         ...(input.name ? { name: input.name.trim() } : {}),
         ...(input.color ? { color: input.color } : {}),
      });
      return { id, name: input.name?.trim() ?? label.name, color: input.color ?? label.color };
   },
});

export const remove = mutation({
   args: { labelId: v.string() },
   handler: async (ctx, { labelId }) => {
      const id = labelId as Id<'labels'>;
      if (!(await ctx.db.get(id))) return { ok: true };
      const issues = await ctx.db.query('issues').collect();
      const updatedAt = Date.now();
      const issueUpdates = [];
      for (const issue of issues) {
         if (issue.labelIds.includes(id)) {
            issueUpdates.push(
               ctx.db.patch(issue._id, {
                  labelIds: issue.labelIds.filter((value) => value !== id),
                  updatedAt,
               })
            );
         }
      }
      await Promise.all(issueUpdates);
      const automations = await ctx.db.query('issueAutomations').collect();
      await Promise.all(
         automations.flatMap((automation) => {
            const actions = automation.actions.filter((action) => action.labelId !== id);
            if (actions.length === automation.actions.length) return [];
            return [
               ctx.db.patch(automation._id, {
                  actions,
                  enabled: actions.length > 0 ? automation.enabled : false,
                  updatedAt,
               }),
            ];
         })
      );
      await ctx.db.delete(id);
      return { ok: true };
   },
});
