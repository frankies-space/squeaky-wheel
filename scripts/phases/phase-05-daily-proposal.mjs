import { assert, request, runTest } from '../lib/runner.mjs';

export const phase = {
  id: 5,
  title: 'Daily proposal flow',
  description: 'Anti-stall + calendar availability → propose_daily_tasks (exactly 3).',
};

export async function run(config) {
  const state = {
    ventureIds: [],
    traceId: null,
  };

  return [
    await runTest('Setup: create three active ventures', async () => {
      for (const name of ['Alpha Co', 'Beta Labs', 'Gamma Studio']) {
        const { response, json } = await request(config, 'POST', '/ventures', {
          body: { name: `${name} ${Date.now()}` },
        });
        assert(response.ok, `Expected 201/200, got ${response.status}`);
        state.ventureIds.push(json.id);
      }
      assert(state.ventureIds.length === 3, 'expected 3 ventures');
    }),

    await runTest('GET /checkin/today proposes exactly 3 tasks', async () => {
      const { response, json } = await request(config, 'GET', '/checkin/today');
      assert(response.ok, `Expected 200, got ${response.status}: ${JSON.stringify(json)}`);
      assert(json?.traceId, 'traceId missing — use it to debug via GET /orchestrator/traces/:id');
      assert(json?.proposedTasks?.length === 3, `expected 3 tasks, got ${json?.proposedTasks?.length}`);
      assert(json?.planId, 'planId missing');
      assert(json?.assistantMessage, 'assistantMessage missing');
      state.traceId = json.traceId;
    }),

    await runTest('Each task includes venture_id and rationale', async () => {
      const { json } = await request(config, 'GET', '/checkin/today');
      for (const task of json.proposedTasks) {
        assert(task.ventureId, `slot ${task.slot} missing ventureId`);
        assert(task.rationale, `slot ${task.slot} missing rationale`);
        assert(task.title, `slot ${task.slot} missing title`);
        assert([1, 2, 3].includes(task.slot), `invalid slot ${task.slot}`);
      }
    }),

    await runTest('Fourth task proposal is rejected', async () => {
      const { response, json } = await request(config, 'POST', '/checkin/validate-task-count', {
        body: { taskCount: 4 },
      });
      assert(response.ok, `Expected 200, got ${response.status}`);
      assert(json?.valid === false, 'fourth task should be rejected');
      assert(json?.message?.includes('3'), 'error should mention Rule of 3');
    }),

    await runTest('Orchestrator trace records daily proposal run', async () => {
      assert(state.traceId, 'traceId missing from proposal step');
      const { response, json } = await request(
        config,
        'GET',
        `/orchestrator/traces/${state.traceId}`,
      );
      assert(response.ok, `Expected 200, got ${response.status}`);
      assert(json?.flow === 'daily_proposal', 'trace flow mismatch');
      assert(json?.status === 'success', `trace should succeed, got ${json?.status}`);
      assert(json?.steps?.length >= 3, 'trace should include step timeline');
    }),

    await runTest('Cleanup: delete test ventures', async () => {
      for (const id of state.ventureIds) {
        const { response } = await request(config, 'DELETE', `/ventures/${id}`);
        assert(response.status === 204, `Expected 204 deleting ${id}`);
      }
    }),
  ];
}
