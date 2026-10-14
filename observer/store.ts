import { Database } from 'bun:sqlite';
import { randomUUID } from 'node:crypto';
import { closeSync, mkdirSync, openSync } from 'node:fs';
import path from 'node:path';

import {
   type DevStateObservation,
   type DevStateObservationDraft,
   MAX_BATCH_BYTES,
   MAX_OBSERVATIONS_PER_BATCH,
} from '../convex/devState/contract';

const DEFAULT_MAX_QUEUED = 10_000;
const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
// Worst case for the envelope: a 1000-character environmentId at 4 UTF-8 bytes per character.
const ENVELOPE_RESERVE_BYTES = 8 * 1024;

const SCHEMA = `
   CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS queue (
      sequence INTEGER PRIMARY KEY,
      observation TEXT NOT NULL,
      enqueuedAt INTEGER NOT NULL
   );
   CREATE TABLE IF NOT EXISTS snapshots (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

export type ObserverStoreOptions = {
   now?: () => number;
   maxQueued?: number;
   maxAgeMs?: number;
};

export type SnapshotEntry = { key: string; draft: DevStateObservationDraft };

export type PendingBatch = { streamId: string; observations: DevStateObservation[] };

// Opens (and creates) the store file. The file may hold credentials, so it is owner-only.
export function openObserverStore(file: string, options: ObserverStoreOptions = {}): ObserverStore {
   mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
   // Opening an existing file with 'a' leaves its contents and permissions alone.
   closeSync(openSync(file, 'a', 0o600));
   const db = new Database(file);
   db.exec('PRAGMA journal_mode = WAL');
   db.exec(SCHEMA);
   return new ObserverStore(db, options);
}

// Every public mutation runs in one transaction; private helpers never open their own,
// so the overflow path can run inside the caller's transaction.
export class ObserverStore {
   readonly #db: Database;
   readonly #now: () => number;
   readonly #maxQueued: number;
   readonly #maxAgeMs: number;

   constructor(
      db: Database,
      {
         now = Date.now,
         maxQueued = DEFAULT_MAX_QUEUED,
         maxAgeMs = DEFAULT_MAX_AGE_MS,
      }: ObserverStoreOptions
   ) {
      this.#db = db;
      this.#now = now;
      this.#maxQueued = maxQueued;
      this.#maxAgeMs = maxAgeMs;
      this.#transaction(() => {
         if (this.#findMeta('streamId') !== null) return;
         this.#setMeta('streamId', randomUUID());
         this.#setMeta('nextSequence', '1');
         this.#setMeta('needsFullResend', '0');
      });
   }

   get streamId(): string {
      return this.#getMeta('streamId');
   }

   get needsFullResend(): boolean {
      return this.#getMeta('needsFullResend') === '1';
   }

   enqueue(drafts: DevStateObservationDraft[]): void {
      this.#transaction(() => {
         this.#append(drafts);
         this.#enforceLimits();
      });
   }

   // Compares states without observedAt, so a re-observed entity with the same state is not a change.
   enqueueChanged(entries: SnapshotEntry[], options: { force?: boolean } = {}): number {
      return this.#transaction(() => {
         const changed: DevStateObservationDraft[] = [];
         for (const { key, draft } of entries) {
            const previous = this.#snapshotDraft(key);
            if (options.force || previous === null || stateOf(previous) !== stateOf(draft)) {
               changed.push(draft);
            }
            // Snapshots always hold the latest observation, so last-known state keeps its date fresh.
            this.#db
               .query('INSERT OR REPLACE INTO snapshots (key, value) VALUES (?, ?)')
               .run(key, JSON.stringify(draft));
         }
         this.#append(changed);
         this.#enforceLimits();
         return changed.length;
      });
   }

   // Only a key we were tracking is a removal; an unknown key means nothing was there to remove.
   enqueueRemoval(key: string, draft: DevStateObservationDraft): void {
      this.#transaction(() => {
         if (this.#snapshotDraft(key) === null) return;
         this.#append([draft]);
         this.#db.query('DELETE FROM snapshots WHERE key = ?').run(key);
         this.#enforceLimits();
      });
   }

   snapshotKeys(prefix: string): string[] {
      return this.#db
         .query<{ key: string }, [string, string]>(
            'SELECT key FROM snapshots WHERE substr(key, 1, length(?)) = ? ORDER BY key'
         )
         .all(prefix, prefix)
         .map((row) => row.key);
   }

   snapshotEntries(prefix: string): SnapshotEntry[] {
      return this.#db
         .query<{ key: string; value: string }, [string, string]>(
            'SELECT key, value FROM snapshots WHERE substr(key, 1, length(?)) = ? ORDER BY key'
         )
         .all(prefix, prefix)
         .map((row) => ({
            key: row.key,
            draft: JSON.parse(row.value) as DevStateObservationDraft,
         }));
   }

   // Oldest observations first. Each batch stays under MAX_BATCH_BYTES once wrapped in its envelope.
   pending(): PendingBatch | null {
      const rows = this.#db
         .query<{ sequence: number; observation: string }, [number]>(
            'SELECT sequence, observation FROM queue ORDER BY sequence LIMIT ?'
         )
         .all(MAX_OBSERVATIONS_PER_BATCH);
      if (rows.length === 0) return null;

      const budget = MAX_BATCH_BYTES - ENVELOPE_RESERVE_BYTES;
      const observations: DevStateObservation[] = [];
      let bytes = 0;
      for (const row of rows) {
         const draft = JSON.parse(row.observation) as DevStateObservationDraft;
         const observation = { ...draft, sequence: row.sequence } as DevStateObservation;
         // The extra byte is the comma that separates observations in the array.
         const size = Buffer.byteLength(JSON.stringify(observation)) + 1;
         if (observations.length > 0 && bytes + size > budget) break;
         observations.push(observation);
         bytes += size;
      }
      return { streamId: this.streamId, observations };
   }

   acknowledge(through: number): void {
      this.#transaction(() => {
         this.#db.query('DELETE FROM queue WHERE sequence <= ?').run(through);
      });
   }

   resetStream(): void {
      this.#transaction(() => {
         this.#startNewStream();
      });
   }

   queuedCount(): number {
      const row = this.#db
         .query<{ count: number }, []>('SELECT COUNT(*) AS count FROM queue')
         .get();
      return row?.count ?? 0;
   }

   markFullResendDone(): void {
      this.#transaction(() => {
         this.#setMeta('needsFullResend', '0');
      });
   }

   close(): void {
      this.#db.close();
   }

   #transaction<T>(work: () => T): T {
      return this.#db.transaction(work)();
   }

   #append(drafts: DevStateObservationDraft[]): void {
      if (drafts.length === 0) return;
      const insert = this.#db.query(
         'INSERT INTO queue (sequence, observation, enqueuedAt) VALUES (?, ?, ?)'
      );
      const enqueuedAt = this.#now();
      let sequence = Number(this.#getMeta('nextSequence'));
      for (const draft of drafts) {
         insert.run(sequence, JSON.stringify(draft), enqueuedAt);
         sequence += 1;
      }
      this.#setMeta('nextSequence', String(sequence));
   }

   // Over the limits, the whole queue goes: dropping only the oldest rows would break the
   // contiguous sequences the receiver needs. The receiver records the reset via the history_gap.
   #enforceLimits(): void {
      const oldest = this.#db
         .query<{ observation: string; enqueuedAt: number }, []>(
            'SELECT observation, enqueuedAt FROM queue ORDER BY sequence LIMIT 1'
         )
         .get();
      if (!oldest) return;
      const count = this.queuedCount();
      const tooOld = oldest.enqueuedAt < this.#now() - this.#maxAgeMs;
      if (count <= this.#maxQueued && !tooOld) return;

      const now = this.#now();
      // The receiver rejects a gap whose `from` is after `until`, which a clock step can cause.
      const from = new Date(
         Math.min(
            Date.parse((JSON.parse(oldest.observation) as DevStateObservationDraft).observedAt),
            now
         )
      ).toISOString();
      this.#db.run('DELETE FROM queue');
      this.#startNewStream();
      this.#append([
         {
            kind: 'history_gap',
            observedAt: new Date(now).toISOString(),
            from,
            until: new Date(now).toISOString(),
            droppedObservations: count,
         },
      ]);
   }

   // A new stream has no receiver state, so the rows still queued restart from sequence 1.
   #startNewStream(): void {
      this.#setMeta('streamId', randomUUID());
      const rows = this.#db
         .query<{ sequence: number }, []>('SELECT sequence FROM queue ORDER BY sequence')
         .all();
      const renumber = this.#db.query('UPDATE queue SET sequence = ? WHERE sequence = ?');
      // Ascending order only ever moves a row into a slot that is already free.
      rows.forEach((row, index) => renumber.run(index + 1, row.sequence));
      this.#setMeta('nextSequence', String(rows.length + 1));
      this.#setMeta('needsFullResend', '1');
   }

   #snapshotDraft(key: string): DevStateObservationDraft | null {
      const row = this.#db
         .query<{ value: string }, [string]>('SELECT value FROM snapshots WHERE key = ?')
         .get(key);
      return row ? (JSON.parse(row.value) as DevStateObservationDraft) : null;
   }

   #findMeta(key: string): string | null {
      const row = this.#db
         .query<{ value: string }, [string]>('SELECT value FROM meta WHERE key = ?')
         .get(key);
      return row?.value ?? null;
   }

   #getMeta(key: string): string {
      const value = this.#findMeta(key);
      if (value === null) throw new Error(`Observer store has no ${key}`);
      return value;
   }

   #setMeta(key: string, value: string): void {
      this.#db
         .query(
            'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
         )
         .run(key, value);
   }
}

// The state of an entity, ignoring when it was observed. Object keys are sorted at every depth,
// so equal states always serialize to the same text.
function stateOf(draft: DevStateObservationDraft): string {
   return JSON.stringify(draft, (key, nested: unknown) => {
      if (key === 'observedAt') return undefined;
      return nested !== null && typeof nested === 'object' && !Array.isArray(nested)
         ? Object.fromEntries(
              Object.entries(nested).sort(([left], [right]) => (left < right ? -1 : 1))
           )
         : nested;
   });
}
