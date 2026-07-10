import { skipTest } from '../lib/runner.mjs';

export const phase = {
  id: 5,
  title: 'Daily proposal flow',
  description: 'Anti-stall + calendar availability → propose_daily_tasks (exactly 3).',
};

export async function run(_config) {
  return [
    await skipTest('GET /checkin/today proposes exactly 3 tasks', 'Not implemented yet'),
    await skipTest('Fourth task proposal is rejected', 'Not implemented yet'),
    await skipTest('Each task includes venture_id and rationale', 'Not implemented yet'),
  ];
}
