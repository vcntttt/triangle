import assert from 'node:assert/strict';
import test from 'node:test';

import { devStateResponse, MAX_BATCH_BYTES, parseDevStateBatch } from './contract';
import {
   followUpBatch,
   invalidBatches,
   unsupportedVersionBatch,
   validBatch,
} from './contract.fixtures';

test('accepts the shared fixtures as the observer would send them', () => {
   for (const batch of [validBatch, followUpBatch]) {
      const result = parseDevStateBatch(JSON.parse(JSON.stringify(batch)));
      assert.deepEqual(result, { ok: true, batch });
   }
});

test('keeps the representative batch within the delivery size limit', () => {
   assert.ok(new TextEncoder().encode(JSON.stringify(validBatch)).byteLength < MAX_BATCH_BYTES);
});

for (const [name, batch] of Object.entries(invalidBatches)) {
   test(`rejects ${name}`, () => {
      const result = parseDevStateBatch(batch);
      assert.equal(result.ok, false);
      assert.equal(!result.ok && result.reason, 'invalid_batch');
   });
}

test('reports an unknown version separately from a malformed batch', () => {
   const result = parseDevStateBatch(unsupportedVersionBatch);
   assert.equal(!result.ok && result.reason, 'unsupported_version');
});

test('parses every receiver answer the observer must handle', () => {
   const answers = [
      { status: 'accepted', acknowledgedThrough: 9 },
      { status: 'sequence_gap', expectedSequence: 10 },
      { status: 'stream_superseded' },
      { status: 'rejected', reason: 'unsupported_version', supportedVersions: [1], issues: [] },
   ];
   for (const answer of answers) assert.deepEqual(devStateResponse.parse(answer), answer);
   assert.throws(() => devStateResponse.parse({ status: 'accepted' }));
});
