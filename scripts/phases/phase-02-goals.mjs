import {
  assert,
  request,
  runTest,
} from '../lib/runner.mjs';

export const phase = {
  id: 2,
  title: 'Venture + Goal management',
  description: 'Goal CRUD endpoints scoped to owned ventures.',
};

export async function run(config) {
  const state = { ventureId: null, goalId: null };

  return [
    await runTest('Setup: create venture for goals', async () => {
      const { response, json } = await request(config, 'POST', '/ventures', {
        body: {
          name: `Goals Test Venture ${Date.now()}`,
          description: 'Phase 2 test venture',
        },
      });
      assert(response.ok, `Expected 200/201, got ${response.status}`);
      assert(json?.id, 'Venture id missing');
      state.ventureId = json.id;
    }),

    await runTest('POST /ventures/:id/goals creates goal', async () => {
      assert(state.ventureId, 'Venture id missing from setup');
      const { response, json } = await request(
        config,
        'POST',
        `/ventures/${state.ventureId}/goals`,
        {
          body: {
            title: 'Grow newsletter to 5k subscribers',
            description: 'Primary growth goal for Q3',
            deadline: '2026-12-31',
          },
        },
      );
      assert(response.ok, `Expected 200/201, got ${response.status}`);
      assert(json?.id, 'Goal id missing');
      assert(json?.ventureId === state.ventureId, 'ventureId mismatch');
      assert(json?.title.includes('newsletter'), 'title mismatch');
      assert(json?.deadline === '2026-12-31', 'deadline mismatch');
      assert(json?.status === 'active', 'default status should be active');
      state.goalId = json.id;
    }),

    await runTest('GET /ventures/:id/goals lists goals', async () => {
      assert(state.ventureId, 'Venture id missing from setup');
      const { response, json } = await request(
        config,
        'GET',
        `/ventures/${state.ventureId}/goals`,
      );
      assert(response.ok, `Expected 200, got ${response.status}`);
      assert(Array.isArray(json), 'Response should be an array');
      assert(
        json.some((g) => g.id === state.goalId),
        'Created goal should appear in list',
      );
    }),

    await runTest('PATCH /goals/:id updates goal', async () => {
      assert(state.goalId, 'Goal id missing from create step');
      const { response, json } = await request(config, 'PATCH', `/goals/${state.goalId}`, {
        body: {
          title: 'Grow newsletter to 10k subscribers',
          status: 'done',
        },
      });
      assert(response.ok, `Expected 200, got ${response.status}`);
      assert(json?.title.includes('10k'), 'title not updated');
      assert(json?.status === 'done', 'status not updated');
    }),

    await runTest('GET /ventures/:id/goals returns 404 for unknown venture', async () => {
      const { response } = await request(
        config,
        'GET',
        '/ventures/00000000-0000-4000-8000-000000000099/goals',
      );
      assert(response.status === 404, `Expected 404, got ${response.status}`);
    }),

    await runTest('DELETE /goals/:id removes goal', async () => {
      assert(state.goalId, 'Goal id missing from create step');
      const { response } = await request(config, 'DELETE', `/goals/${state.goalId}`);
      assert(response.status === 204, `Expected 204, got ${response.status}`);
    }),

    await runTest('PATCH /goals/:id returns 404 after delete', async () => {
      assert(state.goalId, 'Goal id missing from create step');
      const { response } = await request(config, 'PATCH', `/goals/${state.goalId}`, {
        body: { title: 'Should not work' },
      });
      assert(response.status === 404, `Expected 404, got ${response.status}`);
    }),

    await runTest('Cleanup: delete test venture', async () => {
      assert(state.ventureId, 'Venture id missing from setup');
      const { response } = await request(config, 'DELETE', `/ventures/${state.ventureId}`);
      assert(response.status === 204, `Expected 204, got ${response.status}`);
    }),
  ];
}
