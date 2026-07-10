import {
  assert,
  request,
  runTest,
  skipTest,
} from '../lib/runner.mjs';

export const phase = {
  id: 1,
  title: 'Backend skeleton + auth + venture CRUD',
  description:
    'Database migrations, Supabase/dev auth, user provisioning, and venture endpoints.',
};

export async function run(config) {
  const state = { ventureId: null };

  return [
    await runTest('API is reachable', async () => {
      const { response } = await request(config, 'GET', '/users/me');
      assert(response.ok, `Expected 200, got ${response.status}`);
    }),

    await runTest('Missing auth token is rejected', async () => {
      const { response } = await request(config, 'GET', '/users/me', { auth: false });
      assert(response.status === 401, `Expected 401, got ${response.status}`);
    }),

    await runTest('GET /users/me provisions user', async () => {
      const { response, json } = await request(config, 'GET', '/users/me');
      assert(response.ok, `Expected 200, got ${response.status}`);
      assert(json?.id, 'Response should include user id');
      assert(json?.email, 'Response should include email');
      assert(typeof json?.timezone === 'string', 'Response should include timezone');
    }),

    await runTest('PATCH /users/me updates profile', async () => {
      const { response, json } = await request(config, 'PATCH', '/users/me', {
        body: {
          displayName: 'Phase 1 Tester',
          timezone: 'Europe/Amsterdam',
          checkinTime: '09:30',
        },
      });
      assert(response.ok, `Expected 200, got ${response.status}`);
      assert(json?.displayName === 'Phase 1 Tester', 'displayName not updated');
      assert(json?.timezone === 'Europe/Amsterdam', 'timezone not updated');
      assert(json?.checkinTime?.startsWith('09:30'), 'checkinTime not updated');
    }),

    await runTest('POST /ventures creates venture', async () => {
      const { response, json } = await request(config, 'POST', '/ventures', {
        body: {
          name: `Test Venture ${Date.now()}`,
          description: 'Created by phase-1 test script',
          priorityWeight: 1.5,
          maxDaysWithoutAttention: 4,
        },
      });
      assert(response.status === 201 || response.ok, `Expected 201/200, got ${response.status}`);
      assert(json?.id, 'Response should include venture id');
      assert(json?.name, 'Response should include venture name');
      assert(json?.priorityWeight === '1.50' || json?.priorityWeight === '1.5', 'priorityWeight mismatch');
      state.ventureId = json.id;
    }),

    await runTest('GET /ventures lists ventures', async () => {
      const { response, json } = await request(config, 'GET', '/ventures');
      assert(response.ok, `Expected 200, got ${response.status}`);
      assert(Array.isArray(json), 'Response should be an array');
      assert(
        json.some((v) => v.id === state.ventureId),
        'Created venture should appear in list',
      );
    }),

    await runTest('GET /ventures/:id returns venture', async () => {
      assert(state.ventureId, 'Venture id missing from create step');
      const { response, json } = await request(config, 'GET', `/ventures/${state.ventureId}`);
      assert(response.ok, `Expected 200, got ${response.status}`);
      assert(json?.id === state.ventureId, 'Venture id mismatch');
    }),

    await runTest('PATCH /ventures/:id updates venture', async () => {
      assert(state.ventureId, 'Venture id missing from create step');
      const { response, json } = await request(config, 'PATCH', `/ventures/${state.ventureId}`, {
        body: {
          name: 'Updated Test Venture',
          status: 'paused',
        },
      });
      assert(response.ok, `Expected 200, got ${response.status}`);
      assert(json?.name === 'Updated Test Venture', 'name not updated');
      assert(json?.status === 'paused', 'status not updated');
    }),

    await runTest('DELETE /ventures/:id removes venture', async () => {
      assert(state.ventureId, 'Venture id missing from create step');
      const { response } = await request(config, 'DELETE', `/ventures/${state.ventureId}`);
      assert(response.status === 204, `Expected 204, got ${response.status}`);
    }),

    await runTest('GET /ventures/:id returns 404 after delete', async () => {
      assert(state.ventureId, 'Venture id missing from create step');
      const { response } = await request(config, 'GET', `/ventures/${state.ventureId}`);
      assert(response.status === 404, `Expected 404, got ${response.status}`);
    }),
  ];
}
