import { skipTest } from '../lib/runner.mjs';

export const phase = {
  id: 4,
  title: 'LLM Orchestrator — decomposition',
  description: 'Goal → task tree via create_task_tree tool contract.',
};

export async function run(_config) {
  return [
    await skipTest('POST /goals/:id/decompose returns task tree', 'Not implemented yet'),
    await skipTest('Task tree persisted to tasks table', 'Not implemented yet'),
    await skipTest('LLM output uses tool calls only', 'Not implemented yet'),
  ];
}
