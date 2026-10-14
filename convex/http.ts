import { httpRouter } from 'convex/server';
import { internal } from './_generated/api';
import { httpAction } from './_generated/server';
import { DEV_STATE_OBSERVATIONS_PATH, MAX_BATCH_BYTES } from './devState/contract';
import { hashObserverToken } from './devState/token';

const http = httpRouter();

// Receiver for the local observers (docs/integrations/t3-observations-v1.md).
http.route({
   path: DEV_STATE_OBSERVATIONS_PATH,
   method: 'POST',
   handler: httpAction(async (ctx, request) => {
      const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
      if (!token) return new Response(null, { status: 401 });
      const body = await request.text();
      if (new TextEncoder().encode(body).byteLength > MAX_BATCH_BYTES) {
         return new Response(null, { status: 413 });
      }
      const result = await ctx.runMutation(internal.devState.ingest.applyBatch, {
         tokenHash: await hashObserverToken(token),
         body,
      });
      if (!result.body) return new Response(null, { status: result.httpStatus });
      return Response.json(result.body, { status: result.httpStatus });
   }),
});

export default http;
