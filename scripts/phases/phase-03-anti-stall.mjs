import { skipTest } from '../lib/runner.mjs';

export const phase = {
  id: 3,
  title: 'Anti-Stall Engine',
  description: 'Deterministic urgency scoring per venture (unit tests + API if exposed).',
};

export async function run(_config) {
  return [
    await skipTest('Anti-stall unit tests pass', 'Run when apps/backend has anti-stall tests'),
    await skipTest('Urgency scores computed for active ventures', 'Not implemented yet'),
    await skipTest('Paused ventures excluded from scoring', 'Not implemented yet'),
  ];
}
