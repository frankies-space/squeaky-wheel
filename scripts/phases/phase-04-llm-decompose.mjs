import { assert, request, runTest } from '../lib/runner.mjs';

export const phase = {
  id: 4,
  title: 'LLM Orchestrator — decomposition',
  description: 'Goal → task tree via create_task_tree tool contract.',
};

export async function run(config) {
  const state = {
    ventureId: null,
    goalId: null,
    rootTaskId: null,
  };

  return [
    await runTest('Setup: create venture and goal for decomposition', async () => {
      const venture = await request(config, 'POST', '/ventures', {
        body: { name: `Decompose Venture ${Date.now()}` },
      });
      assert(venture.response.ok, `Expected 201/200, got ${venture.response.status}`);
      state.ventureId = venture.json?.id;

      const goal = await request(config, 'POST', `/ventures/${state.ventureId}/goals`, {
        body: {
          title: 'Launch a weekly founder newsletter',
          description: 'Grow audience to 1k subscribers',
        },
      });
      assert(goal.response.ok, `Expected 201/200, got ${goal.response.status}`);
      state.goalId = goal.json?.id;
    }),

    await runTest('POST /goals/:id/decompose returns task tree', async () => {
      assert(state.goalId, 'goal id missing from setup');
      const { response, json } = await request(config, 'POST', `/goals/${state.goalId}/decompose`, {
        body: {},
      });
      assert(response.ok, `Expected 200/201, got ${response.status}: ${JSON.stringify(json)}`);
      assert(json?.goalId === state.goalId, 'goalId mismatch');
      assert(json?.ventureId === state.ventureId, 'ventureId mismatch');
      assert(Array.isArray(json?.tasks), 'tasks should be an array');
      assert(json.tasks.length >= 3, 'expected at least project + epic + micro_task');
      assert(json.tasks.some((t) => t.level === 'project'), 'missing project root');
      assert(json.tasks.some((t) => t.level === 'micro_task'), 'missing micro_task leaf');
      state.rootTaskId = json.tasks.find((t) => t.level === 'project')?.id ?? null;
    }),

    await runTest('Task tree persisted to tasks table', async () => {
      assert(state.goalId, 'goal id missing from setup');
      const { response, json } = await request(config, 'GET', `/goals/${state.goalId}/tasks`);
      assert(response.ok, `Expected 200, got ${response.status}`);
      assert(Array.isArray(json), 'tasks list should be an array');
      assert(json.length >= 3, 'persisted tasks missing');
      const root = json.find((t) => t.id === state.rootTaskId);
      assert(root?.parentTaskId === null, 'project root should have null parent');
      assert(json.some((t) => t.parentTaskId === root?.id), 'expected child of project root');
      assert(json.every((t) => t.generatedBy === 'ai'), 'decomposed tasks should be ai-generated');
      assert(json.every((t) => t.status === 'backlog'), 'decomposed tasks should start in backlog');
    }),

    await runTest('LLM output uses tool calls only', async () => {
      assert(state.goalId, 'goal id missing from setup');
      const { json } = await request(config, 'POST', `/goals/${state.goalId}/decompose`, {
        body: { additionalContext: 'Focus on first 100 subscribers' },
      });
      assert(
        json?.outputMethod === 'tool_call' || json?.outputMethod === 'mock',
        `expected structured output method, got ${json?.outputMethod}`,
      );
      assert(json?.outputMethod !== 'free_text', 'must not parse free-form text');
    }),

    await runTest('Cleanup: delete test venture', async () => {
      assert(state.ventureId, 'venture id missing from setup');
      const { response } = await request(config, 'DELETE', `/ventures/${state.ventureId}`);
      assert(response.status === 204, `Expected 204, got ${response.status}`);
    }),
  ];
}
