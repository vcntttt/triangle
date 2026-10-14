import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { internalAction, internalMutation } from '../_generated/server';
import { hashObserverToken } from './token';

// Run from the CLI with the deployment's admin key, e.g.
// `bunx convex run devState/credentials:create '{"environmentId":"…","label":"caburgua"}'`.
// The token is printed once; only its hash is kept.
export const create = internalAction({
   args: { environmentId: v.string(), label: v.string() },
   handler: async (ctx, { environmentId, label }): Promise<string> => {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      const token = `t3obs_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
      await ctx.runMutation(internal.devState.credentials.store, {
         environmentId,
         label,
         tokenHash: await hashObserverToken(token),
      });
      return token;
   },
});

export const store = internalMutation({
   args: { environmentId: v.string(), label: v.string(), tokenHash: v.string() },
   handler: async (ctx, args) => {
      await ctx.db.insert('devStateCredentials', { ...args, createdAt: Date.now() });
   },
});

// Revokes every active credential of the environment; its observer stops on the next 401.
export const revoke = internalMutation({
   args: { environmentId: v.string() },
   handler: async (ctx, { environmentId }): Promise<number> => {
      const credentials = await ctx.db
         .query('devStateCredentials')
         .withIndex('by_environment', (q) => q.eq('environmentId', environmentId))
         .collect();
      const active = credentials.filter((credential) => credential.revokedAt === undefined);
      const revokedAt = Date.now();
      for (const credential of active) await ctx.db.patch(credential._id, { revokedAt });
      return active.length;
   },
});
