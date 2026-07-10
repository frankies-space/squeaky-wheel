import { assert, request, runTest } from '../lib/runner.mjs';

export const phase = {
  id: 3,
  title: 'Anti-Stall Engine',
  description: 'Deterministic urgency scoring per venture (unit tests + API).',
};

export async function run(config) {
  const state = {
    activeVentureId: null,
    pausedVentureId: null,
    highPriorityVentureId: null,
  };

  return [
    await runTest('Anti-stall unit tests pass', async () => {
      const { execSync } = await import('node:child_process');
      execSync('pnpm --filter @squeaky-wheel/backend test', {
        cwd: process.cwd(),
        stdio: 'pipe',
      });
    }),

    await runTest('Setup: create ventures for scoring', async () => {
      const active = await request(config, 'POST', '/ventures', {
        body: { name: `Anti-Stall Active ${Date.now()}`, priorityWeight: 1 },
      });
      assert(active.response.ok, `Expected 201/200, got ${active.response.status}`);
      state.activeVentureId = active.json?.id;

      const paused = await request(config, 'POST', '/ventures', {
        body: {
          name: `Anti-Stall Paused ${Date.now()}`,
          status: 'paused',
        },
      });
      assert(paused.response.ok, `Expected 201/200, got ${paused.response.status}`);
      state.pausedVentureId = paused.json?.id;

      const high = await request(config, 'POST', '/ventures', {
        body: {
          name: `Anti-Stall High Priority ${Date.now()}`,
          priorityWeight: 2.5,
        },
      });
      assert(high.response.ok, `Expected 201/200, got ${high.response.status}`);
      state.highPriorityVentureId = high.json?.id;
    }),

    await runTest('GET /anti-stall/scores returns urgency scores', async () => {
      const { response, json } = await request(config, 'GET', '/anti-stall/scores');
      assert(response.ok, `Expected 200, got ${response.status}`);
      assert(json?.referenceDate, 'referenceDate missing');
      assert(json?.attentionWindowDays === 7, 'attentionWindowDays should be 7');
      assert(Array.isArray(json?.scores), 'scores should be an array');
      assert(json.scores.length >= 3, 'should include setup ventures');
    }),

    await runTest('Paused ventures are ineligible with zero urgency', async () => {
      assert(state.pausedVentureId, 'paused venture missing from setup');
      const { json } = await request(config, 'GET', '/anti-stall/scores');
      const paused = json.scores.find((s) => s.ventureId === state.pausedVentureId);
      assert(paused, 'paused venture should appear in scores');
      assert(paused.isEligible === false, 'paused venture should be ineligible');
      assert(paused.urgencyScore === 0, 'paused venture urgency should be 0');
    }),

    await runTest('Never-attended active ventures are marked overdue', async () => {
      assert(state.activeVentureId, 'active venture missing from setup');
      const { json } = await request(config, 'GET', '/anti-stall/scores');
      const active = json.scores.find((s) => s.ventureId === state.activeVentureId);
      assert(active?.isEligible === true, 'active venture should be eligible');
      assert(active?.isOverdue === true, 'never-attended venture should be overdue');
      assert(active?.urgencyScore > 0, 'urgency should be positive');
    }),

    await runTest('Higher priority weight increases urgency score', async () => {
      assert(state.activeVentureId, 'active venture missing');
      assert(state.highPriorityVentureId, 'high priority venture missing');
      const { json } = await request(config, 'GET', '/anti-stall/scores');
      const normal = json.scores.find((s) => s.ventureId === state.activeVentureId);
      const high = json.scores.find((s) => s.ventureId === state.highPriorityVentureId);
      assert(high.urgencyScore > normal.urgencyScore, 'higher weight should score higher');
    }),

    await runTest('Cleanup: delete test ventures', async () => {
      for (const id of [
        state.activeVentureId,
        state.pausedVentureId,
        state.highPriorityVentureId,
      ]) {
        if (!id) continue;
        const { response } = await request(config, 'DELETE', `/ventures/${id}`);
        assert(response.status === 204, `Expected 204 deleting ${id}`);
      }
    }),
  ];
}
