import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { defaultIssueStatuses } from './issueStatuses';

const actionValidator = v.object({
   type: v.literal('removeLabel'),
   labelId: v.id('labels'),
});

const defaultTemplateKey = 'remove-ready-labels-on-completion';
const defaultLabelNames = ['ready-for-agent', 'ready-for-human'];

async function statusExists(ctx: QueryCtx | MutationCtx, status: string) {
   if (status === 'archived' || defaultIssueStatuses.some((item) => item.id === status))
      return true;
   return Boolean(
      await ctx.db
         .query('issueStatuses')
         .withIndex('by_option_id', (q) => q.eq('id', status))
         .unique()
   );
}

async function validateInput(
   ctx: MutationCtx,
   input: {
      name: string;
      fromStatus?: string;
      toStatus: string;
      actions: Array<{ type: 'removeLabel'; labelId: Id<'labels'> }>;
   }
) {
   const name = input.name.trim();
   if (!name) throw new Error('Automation name is required.');
   if (input.fromStatus === input.toStatus) {
      throw new Error('Source and destination statuses must be different.');
   }
   if (!(await statusExists(ctx, input.toStatus))) throw new Error('Destination status not found.');
   if (input.fromStatus && !(await statusExists(ctx, input.fromStatus))) {
      throw new Error('Source status not found.');
   }
   if (input.actions.length === 0) throw new Error('At least one action is required.');

   const labelIds = [...new Set(input.actions.map((action) => action.labelId))];
   const labels = await Promise.all(labelIds.map((id) => ctx.db.get(id)));
   if (labels.some((label) => label === null))
      throw new Error('One or more labels were not found.');

   return {
      name,
      actions: labelIds.map((labelId) => ({
         type: 'removeLabel' as const,
         labelId,
      })),
   };
}

function serializeAutomation(automation: Doc<'issueAutomations'>) {
   return {
      id: automation._id,
      name: automation.name,
      enabled: automation.enabled,
      fromStatus: automation.fromStatus ?? null,
      toStatus: automation.toStatus,
      actions: automation.actions,
      createdAt: automation.createdAt,
      updatedAt: automation.updatedAt,
   };
}

async function ensureDefaultAutomation(ctx: MutationCtx) {
   const existing = await ctx.db
      .query('issueAutomations')
      .withIndex('by_template_key', (q) => q.eq('templateKey', defaultTemplateKey))
      .unique();
   if (existing) return existing._id;

   const labels = await ctx.db.query('labels').collect();
   const labelLookup = new Map(labels.map((label) => [label.name.toLowerCase(), label]));
   const readyLabels = defaultLabelNames.map((name) => labelLookup.get(name));
   if (readyLabels.some((label) => !label)) return null;

   const now = Date.now();
   return ctx.db.insert('issueAutomations', {
      name: 'Remove readiness labels when completed',
      enabled: true,
      toStatus: 'completed',
      actions: readyLabels.map((label) => ({ type: 'removeLabel' as const, labelId: label!._id })),
      templateKey: defaultTemplateKey,
      createdAt: now,
      updatedAt: now,
   });
}

export async function applyIssueStatusAutomations(
   ctx: MutationCtx,
   issue: Doc<'issues'>,
   fromStatus: string,
   toStatus: string,
   updatedAt: number
) {
   if (fromStatus === toStatus) return;
   await ensureDefaultAutomation(ctx);
   const automations = await ctx.db
      .query('issueAutomations')
      .withIndex('by_enabled', (q) => q.eq('enabled', true))
      .collect();
   const matching = automations.filter(
      (automation) =>
         automation.deletedAt === undefined &&
         automation.toStatus === toStatus &&
         (automation.fromStatus === undefined || automation.fromStatus === fromStatus)
   );
   if (matching.length === 0) return;

   const removedLabelIds = new Set(
      matching.flatMap((automation) => automation.actions.map((action) => action.labelId))
   );
   const labelIds = issue.labelIds.filter((labelId) => !removedLabelIds.has(labelId));
   if (labelIds.length !== issue.labelIds.length) {
      await ctx.db.patch(issue._id, { labelIds, updatedAt });
   }
}

export const list = query({
   args: {},
   handler: async (ctx) =>
      (await ctx.db.query('issueAutomations').collect())
         .filter((automation) => automation.deletedAt === undefined)
         .toSorted((left, right) => left.createdAt - right.createdAt)
         .map(serializeAutomation),
});

export const ensureDefaults = mutation({
   args: {},
   handler: async (ctx) => {
      await ensureDefaultAutomation(ctx);
      return { ok: true };
   },
});

export const create = mutation({
   args: {
      name: v.string(),
      enabled: v.boolean(),
      fromStatus: v.optional(v.string()),
      toStatus: v.string(),
      actions: v.array(actionValidator),
   },
   handler: async (ctx, input) => {
      const validated = await validateInput(ctx, input);
      const now = Date.now();
      const id = await ctx.db.insert('issueAutomations', {
         ...input,
         ...validated,
         createdAt: now,
         updatedAt: now,
      });
      return serializeAutomation((await ctx.db.get(id))!);
   },
});

export const update = mutation({
   args: {
      automationId: v.id('issueAutomations'),
      name: v.string(),
      enabled: v.boolean(),
      fromStatus: v.optional(v.string()),
      toStatus: v.string(),
      actions: v.array(actionValidator),
   },
   handler: async (ctx, { automationId, ...input }) => {
      const id = automationId;
      const automation = await ctx.db.get(id);
      if (!automation || automation.deletedAt !== undefined) {
         throw new Error('Automation not found.');
      }
      const validated = await validateInput(ctx, input);
      await ctx.db.patch(id, { ...input, ...validated, updatedAt: Date.now() });
      return serializeAutomation((await ctx.db.get(id))!);
   },
});

export const setEnabled = mutation({
   args: { automationId: v.id('issueAutomations'), enabled: v.boolean() },
   handler: async (ctx, { automationId, enabled }) => {
      const id = automationId;
      const automation = await ctx.db.get(id);
      if (!automation || automation.deletedAt !== undefined) {
         throw new Error('Automation not found.');
      }
      if (enabled && automation.actions.length === 0) {
         throw new Error('An automation without actions cannot be enabled.');
      }
      await ctx.db.patch(id, { enabled, updatedAt: Date.now() });
      return { ok: true };
   },
});

export const remove = mutation({
   args: { automationId: v.id('issueAutomations') },
   handler: async (ctx, { automationId }) => {
      const id = automationId;
      const automation = await ctx.db.get(id);
      if (automation?.templateKey) {
         const now = Date.now();
         await ctx.db.patch(id, { enabled: false, deletedAt: now, updatedAt: now });
      } else if (automation) {
         await ctx.db.delete(id);
      }
      return { ok: true };
   },
});
