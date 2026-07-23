import { assert, request, runTest } from '../lib/runner.mjs';

export const phase = {
  id: 8,
  title: 'Evening check-in (v1.1)',
  description: 'End-of-day review with outcome capture and replanning.',
};

export async function run(config) {
  const state = {
    ventureIds: [],
    tasks: [],
    attentionBefore: new Map(),
  };

  return [
    await runTest('Setup: confirm morning plan', async () => {
      for (const name of ['Eve A', 'Eve B', 'Eve C']) {
        const { response, json } = await request(config, 'POST', '/ventures', {
          body: { name: `${name} ${Date.now()}` },
        });
        assert(response.ok, `Expected 201/200, got ${response.status}`);
        state.ventureIds.push(json.id);
      }

      const replan = await request(config, 'POST', '/checkin/today/replan', { body: {} });
      assert(replan.response.ok, `Expected 200 replan, got ${replan.response.status}`);

      const confirm = await request(config, 'POST', '/checkin/today/confirm', { body: {} });
      assert(confirm.response.ok, `Expected 200 confirm, got ${confirm.response.status}`);
      assert(confirm.json?.status === 'confirmed', 'morning plan must be confirmed');
      state.tasks = confirm.json.proposedTasks;
    }),

    await runTest('Evening check-in session starts', async () => {
      const scores = await request(config, 'GET', '/anti-stall/scores');
      assert(scores.response.ok, 'anti-stall scores should load');
      for (const score of scores.json.scores ?? []) {
        if (state.ventureIds.includes(score.ventureId)) {
          state.attentionBefore.set(score.ventureId, score.attentionCount7d);
        }
      }

      const { response, json } = await request(config, 'GET', '/checkin/evening');
      assert(response.ok, `Expected 200, got ${response.status}: ${JSON.stringify(json)}`);
      assert(json?.checkinId, 'checkinId missing');
      assert(json?.status === 'in_progress', `expected in_progress, got ${json?.status}`);
      assert(json?.tasks?.length === 3, 'evening should return 3 tasks');
      assert(
        json.assistantMessage?.toLowerCase().includes('evening'),
        'assistant should introduce evening review',
      );
    }),

    await runTest('Task outcomes recorded (done/not_done/partial)', async () => {
      const [a, b, c] = state.tasks;
      const { response, json } = await request(config, 'POST', '/checkin/evening/complete', {
        body: {
          outcomes: [
            { taskId: a.taskId, outcome: 'done' },
            { taskId: b.taskId, outcome: 'partial', disposition: 'backlog' },
            { taskId: c.taskId, outcome: 'not_done', disposition: 'tomorrow' },
          ],
        },
      });
      assert(response.ok, `Expected 200, got ${response.status}: ${JSON.stringify(json)}`);
      assert(json?.status === 'completed', `expected completed, got ${json?.status}`);

      const byId = new Map(json.tasks.map((task) => [task.taskId, task]));
      assert(byId.get(a.taskId)?.outcome === 'done', 'first task should be done');
      assert(byId.get(b.taskId)?.outcome === 'partial', 'second task should be partial');
      assert(byId.get(c.taskId)?.outcome === 'not_done', 'third task should be not_done');

      const today = await request(config, 'GET', '/checkin/today');
      assert(today.json?.status === 'completed', 'daily plan should be completed');
    }),

    await runTest('Outcomes feed anti-stall attention log', async () => {
      const scores = await request(config, 'GET', '/anti-stall/scores');
      assert(scores.response.ok, 'anti-stall scores should load');

      const doneVentureId = state.tasks[0].ventureId;
      const partialVentureId = state.tasks[1].ventureId;
      const notDoneVentureId = state.tasks[2].ventureId;

      const after = new Map(
        (scores.json.scores ?? []).map((score) => [score.ventureId, score.attentionCount7d]),
      );

      const doneBefore = state.attentionBefore.get(doneVentureId) ?? 0;
      const partialBefore = state.attentionBefore.get(partialVentureId) ?? 0;
      const notDoneBefore = state.attentionBefore.get(notDoneVentureId) ?? 0;

      assert(
        (after.get(doneVentureId) ?? 0) >= doneBefore + 1,
        'done venture should gain attention',
      );
      assert(
        (after.get(partialVentureId) ?? 0) >= partialBefore + 1,
        'partial venture should gain attention',
      );
      assert(
        (after.get(notDoneVentureId) ?? 0) === notDoneBefore,
        'not_done venture should not gain attention',
      );
    }),

    await runTest('Cleanup: delete test ventures', async () => {
      for (const id of state.ventureIds) {
        const { response } = await request(config, 'DELETE', `/ventures/${id}`);
        assert(response.status === 204, `Expected 204 deleting ${id}`);
      }
    }),
  ];
}
