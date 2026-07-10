import { skipTest } from '../lib/runner.mjs';

export const phase = {
  id: 7,
  title: 'Calendar Module',
  description: 'Google Calendar OAuth + write-only event creation for confirmed tasks.',
};

export async function run(_config) {
  return [
    await skipTest('Calendar OAuth flow completes', 'Not implemented yet'),
    await skipTest('Confirmed tasks create calendar events', 'Not implemented yet'),
    await skipTest('Calendar event id stored on daily_plan_tasks', 'Not implemented yet'),
  ];
}
