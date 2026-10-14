import assert from 'node:assert/strict';
import test from 'node:test';

import { convexTest } from 'convex-test';

import * as api from '../_generated/api';
import { internal } from '../_generated/api';
import * as server from '../_generated/server';
import * as http from '../http';
import schema from '../schema';
import { DEV_STATE_OBSERVATIONS_PATH, MAX_BATCH_BYTES, type DevStateBatch } from './contract';
import { followUpBatch, validBatch } from './contract.fixtures';
import * as credentials from './credentials';
import * as ingest from './ingest';

const modules = {
   '../_generated/api.ts': async () => api,
   '../_generated/server.ts': async () => server,
   '../http.ts': async () => http,
   '../devState/credentials.ts': async () => credentials,
   '../devState/ingest.ts': async () => ingest,
};

const { environmentId, streamId } = validBatch;

// A receiver with one active credential for the fixtures' environment.
async function setup() {
   const t = convexTest(schema, modules);
   const token = await t.action(internal.devState.credentials.create, {
      environmentId,
      label: 'caburgua',
   });
   // Fixtures are sent "now" unless a test is about clock skew.
   const send = async (batch: unknown, init: { token?: string } = {}) => {
      const body = typeof batch === 'string' ? batch : JSON.stringify(withSentAt(batch));
      const response = await t.fetch(DEV_STATE_OBSERVATIONS_PATH, {
         method: 'POST',
         headers: { authorization: `Bearer ${init.token ?? token}` },
         body,
      });
      const text = await response.text();
      return { status: response.status, body: text ? JSON.parse(text) : null };
   };
   const history = () => t.run((ctx) => ctx.db.query('devStateHistory').collect());
   return { t, token, send, history };
}

function withSentAt(batch: unknown) {
   if (typeof batch !== 'object' || batch === null || 'sentAt' in batch === false) return batch;
   return { ...batch, sentAt: new Date().toISOString() };
}

const nextBatch = (observations: DevStateBatch['observations']): DevStateBatch => ({
   ...validBatch,
   observations,
});

test('stores a first batch as baselines and treats a retry as harmless', async () => {
   const { t, send, history } = await setup();

   assert.deepEqual(await send(validBatch), {
      status: 200,
      body: { status: 'accepted', acknowledgedThrough: 9 },
   });
   const baselines = (await history()).filter((row) => row.change === 'baseline');
   assert.equal(baselines.length, 7);

   const rowsBefore = (await history()).length;
   assert.deepEqual((await send(validBatch)).body, { status: 'accepted', acknowledgedThrough: 9 });
   assert.equal((await history()).length, rowsBefore);

   const locations = await t.run((ctx) => ctx.db.query('devStateLocations').collect());
   assert.deepEqual(locations.map((location) => location.locationId).sort(), [
      'loc-ponderapp-bisect',
      'loc-ponderapp-feed',
      'loc-ponderapp-main',
   ]);
   const environment = await t.run((ctx) => ctx.db.query('devStateEnvironments').unique());
   assert.equal(environment?.label, 'caburgua');
});

test('asks for the missing sequences without storing a late batch', async () => {
   const { t, send } = await setup();

   assert.deepEqual(await send(followUpBatch), {
      status: 409,
      body: { status: 'sequence_gap', expectedSequence: 1 },
   });
   const streams = await t.run((ctx) => ctx.db.query('devStateStreams').collect());
   assert.equal(streams.length, 0);
});

test('records only the fields that changed and keeps the server launch branch', async () => {
   const { t, send, history } = await setup();
   await send(validBatch);

   const [, , main] = validBatch.observations;
   const [server] = validBatch.observations.slice(-1);
   assert.equal(main.kind, 'location');
   assert.equal(server.kind, 'server');
   if (main.kind !== 'location' || server.kind !== 'server') return;
   await send(
      nextBatch([
         {
            ...main,
            sequence: 10,
            git: { ...main.git, branch: 'feat/other', changes: { ...main.git.changes, staged: 2 } },
         },
         { ...server, sequence: 11, branch: { name: 'feat/other', evidence: 'detection' } },
      ])
   );

   const changes = (await history()).filter((row) => row.change === 'changed');
   const locationChange = changes.find((row) => row.entityId === 'loc-ponderapp-main');
   assert.deepEqual(
      locationChange?.fields.map((field) => field.field),
      ['git']
   );
   assert.ok(!changes.some((row) => row.entityKind === 'server'));
   const stored = await t.run((ctx) => ctx.db.query('devStateServers').unique());
   assert.equal(stored?.branch.name, 'main');
});

test('ends entities only through explicit removals and records the gap', async () => {
   const { t, send, history } = await setup();
   await send(validBatch);
   assert.deepEqual((await send(followUpBatch)).body, {
      status: 'accepted',
      acknowledgedThrough: 12,
   });

   const server = await t.run((ctx) => ctx.db.query('devStateServers').unique());
   assert.notEqual(server?.stoppedAt, undefined);
   const changes = (await history()).map((row) => `${row.entityKind}:${row.change}`);
   assert.ok(changes.includes('location:removed'));
   assert.ok(changes.includes('server:stopped'));
   assert.ok(changes.includes('environment:gap'));
});

test('a new stream supersedes the previous one and marks the reset', async () => {
   const { send, history } = await setup();
   await send(validBatch);

   const reset = { ...validBatch, streamId: '7d1e5a2b-9c4f-4b8e-a6d3-2f1c0b9e8a76' };
   assert.equal((await send(reset)).status, 200);
   assert.deepEqual(await send({ ...followUpBatch, streamId }), {
      status: 409,
      body: { status: 'stream_superseded' },
   });
   assert.ok((await history()).some((row) => row.change === 'stream_reset'));
});

test('corrects the timestamps of an observer with a skewed clock', async () => {
   const { t, token } = await setup();
   const skewMs = 60 * 60_000;
   const sentAt = new Date(Date.now() - skewMs).toISOString();

   const response = await t.fetch(DEV_STATE_OBSERVATIONS_PATH, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...validBatch, sentAt }),
   });
   assert.equal(response.status, 200);

   const environment = await t.run((ctx) => ctx.db.query('devStateEnvironments').unique());
   assert.ok(Math.abs((environment?.clockSkewMs ?? 0) - skewMs) < 60_000);
   const server = await t.run((ctx) => ctx.db.query('devStateServers').unique());
   const observedAt = Date.parse(validBatch.observations[0].observedAt);
   assert.ok(Math.abs((server?.firstObservedAt ?? 0) - (observedAt + skewMs)) < 60_000);
});

test('refuses credentials, environments and bodies it must not accept', async () => {
   const { t, send } = await setup();

   assert.equal((await send(validBatch, { token: 't3obs_unknown' })).status, 401);
   assert.deepEqual((await send({ ...validBatch, environmentId: 'other-environment' })).body, {
      status: 'rejected',
      reason: 'environment_mismatch',
      supportedVersions: [1],
      issues: [],
   });
   assert.equal((await send('{not json')).status, 400);
   assert.equal((await send({ ...validBatch, version: 2 })).body.reason, 'unsupported_version');
   assert.equal((await send('x'.repeat(MAX_BATCH_BYTES + 1))).status, 413);

   const revoked = await t.mutation(internal.devState.credentials.revoke, { environmentId });
   assert.equal(revoked, 1);
   assert.equal((await send(validBatch)).status, 401);
   const streams = await t.run((ctx) => ctx.db.query('devStateStreams').collect());
   assert.equal(streams.length, 0);
});
