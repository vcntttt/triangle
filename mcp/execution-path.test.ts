import assert from 'node:assert/strict';
import test from 'node:test';

import { createExecutionPath, type ExecutionPathIssue } from './execution-path';

const statuses = [
   { id: 'todo', type: 'unstarted' as const },
   { id: 'doing', type: 'started' as const },
   { id: 'shipped', type: 'completed' as const },
];

function issue(
   identifier: string,
   status = 'todo',
   blockedBy: ExecutionPathIssue['blockedBy'] = []
): ExecutionPathIssue {
   return {
      id: identifier.toLowerCase(),
      identifier,
      title: `Title ${identifier}`,
      description: `Description ${identifier}`,
      status,
      priority: 'medium',
      assigneeId: 'me',
      estimatedHours: null,
      dueDate: null,
      project: null,
      area: null,
      labels: [],
      parentIssue: null,
      subissues: [],
      blockedBy,
      blocks: [],
   };
}

function connect(blocker: ExecutionPathIssue, blocked: ExecutionPathIssue) {
   blocker.blocks.push({
      id: blocked.id,
      identifier: blocked.identifier,
      title: blocked.title,
      status: blocked.status,
   });
   blocked.blockedBy.push({
      id: blocker.id,
      identifier: blocker.identifier,
      title: blocker.title,
      status: blocker.status,
   });
}

test('returns transitive prerequisites in parallel execution stages', () => {
   const first = issue('CIR-1');
   const parallel = issue('CIR-2');
   const middle = issue('CIR-3');
   const objective = issue('CIR-4');
   connect(first, middle);
   connect(parallel, middle);
   connect(middle, objective);

   const path = createExecutionPath([first, parallel, middle, objective], statuses, ['cir-4']);

   assert.deepEqual(path.recommendedStages, [['CIR-1', 'CIR-2'], ['CIR-3'], ['CIR-4']]);
   assert.deepEqual(
      path.readyNow.map((item) => item.identifier),
      ['CIR-1', 'CIR-2']
   );
   assert.equal(path.issues.find((item) => item.identifier === 'CIR-3')?.state, 'blocked');
   assert.equal(path.diagnostics, null);
});

test('treats custom completed statuses as satisfied and hides them by default', () => {
   const completed = issue('CIR-1', 'shipped');
   const objective = issue('CIR-2');
   connect(completed, objective);

   const path = createExecutionPath([completed, objective], statuses, ['CIR-2']);

   assert.deepEqual(path.recommendedStages, [['CIR-2']]);
   assert.deepEqual(
      path.issues.map((item) => item.identifier),
      ['CIR-2']
   );
   assert.match(path.summary, /1 completados y 1 pendientes/);
});

test('unions the paths for multiple ephemeral objectives', () => {
   const first = issue('CIR-1');
   const firstObjective = issue('CIR-2');
   const second = issue('APP-1');
   const secondObjective = issue('APP-2');
   connect(first, firstObjective);
   connect(second, secondObjective);

   const path = createExecutionPath([first, firstObjective, second, secondObjective], statuses, [
      'CIR-2',
      'APP-2',
   ]);

   assert.deepEqual(path.recommendedStages, [
      ['CIR-1', 'APP-1'],
      ['CIR-2', 'APP-2'],
   ]);
   assert.equal(path.objectives.length, 2);
});

test('reports every unknown objective identifier', () => {
   assert.throws(
      () => createExecutionPath([], statuses, ['CIR-404', 'APP-404']),
      /Unknown objective identifiers: CIR-404, APP-404/
   );
});
