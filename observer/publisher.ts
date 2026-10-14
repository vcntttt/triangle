import { type DevStateBatch, devStateResponse } from '../convex/devState/contract';
import type { ObserverStore } from './store';

export type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export type DeliveryOutcome =
   | { status: 'idle' }
   | { status: 'delivered'; acknowledgedThrough: number }
   | { status: 'retry'; reason: 'network' | 'server' | 'sequence_gap' }
   | { status: 'stopped'; reason: StopReason; detail?: string };

export type StopReason =
   | 'unauthorized'
   | 'superseded'
   | 'too_large'
   | 'environment_mismatch'
   | 'invalid_batch'
   | 'unsupported_version'
   | 'unexpected';

export type DeliverOptions = {
   store: ObserverStore;
   environmentId: string;
   url: string;
   token: string;
   fetch?: Fetch;
   now?: () => number;
};

// Sends one batch from the queue. The caller loops and waits with retryDelayMs on `retry`.
// Only what the receiver confirms leaves the queue; a `stopped` outcome keeps everything queued.
export async function deliver({
   store,
   environmentId,
   url,
   token,
   fetch = globalThis.fetch,
   now = Date.now,
}: DeliverOptions): Promise<DeliveryOutcome> {
   const pending = store.pending();
   if (pending === null) return { status: 'idle' };

   const batch: DevStateBatch = {
      version: 1,
      environmentId,
      streamId: pending.streamId,
      sentAt: new Date(now()).toISOString(),
      observations: pending.observations,
   };

   let response: Response;
   let text: string;
   try {
      response = await fetch(url, {
         method: 'POST',
         headers: { 'authorization': `Bearer ${token}`, 'content-type': 'application/json' },
         body: JSON.stringify(batch),
      });
      text = await response.text();
   } catch {
      return { status: 'retry', reason: 'network' };
   }

   const parsed = devStateResponse.safeParse(parseJson(text));

   if (response.status === 200) {
      if (!parsed.success || parsed.data.status !== 'accepted') return retryServer();
      store.acknowledge(parsed.data.acknowledgedThrough);
      return { status: 'delivered', acknowledgedThrough: parsed.data.acknowledgedThrough };
   }

   if (response.status === 409) {
      if (parsed.success && parsed.data.status === 'sequence_gap') {
         return handleSequenceGap(store, parsed.data.expectedSequence);
      }
      if (parsed.success && parsed.data.status === 'stream_superseded') {
         return { status: 'stopped', reason: 'superseded' };
      }
      return retryServer();
   }

   if (response.status === 401) return { status: 'stopped', reason: 'unauthorized' };
   if (response.status === 413) return { status: 'stopped', reason: 'too_large' };

   if (response.status === 400 || response.status === 403) {
      if (parsed.success && parsed.data.status === 'rejected') {
         return {
            status: 'stopped',
            reason: parsed.data.reason,
            detail: parsed.data.issues.join('; '),
         };
      }
      return { status: 'stopped', reason: 'unexpected' };
   }

   if (response.status === 429 || response.status >= 500) return retryServer();
   return { status: 'stopped', reason: 'unexpected' };
}

// Full jitter halves the ceiling at most, so observers that failed together do not retry in lockstep.
export function retryDelayMs(attempt: number, random: () => number = Math.random): number {
   const ceiling = Math.min(5 * 60_000, 1_000 * 2 ** Math.min(attempt, 30));
   return Math.round(ceiling * (0.5 + 0.5 * random()));
}

function retryServer(): DeliveryOutcome {
   return { status: 'retry', reason: 'server' };
}

// The receiver is missing everything before `expectedSequence`. Rows it still needs are kept;
// if they are gone, a new stream is the only way to resend the state.
function handleSequenceGap(store: ObserverStore, expectedSequence: number): DeliveryOutcome {
   store.acknowledge(expectedSequence - 1);
   const oldest = store.pending()?.observations[0]?.sequence;
   if (oldest === undefined || oldest > expectedSequence) store.resetStream();
   return { status: 'retry', reason: 'sequence_gap' };
}

function parseJson(text: string): unknown {
   try {
      return JSON.parse(text);
   } catch {
      return null;
   }
}
