import { skipTest } from '../lib/runner.mjs';

export const phase = {
  id: 6,
  title: 'Daily Check-In screen',
  description: 'Mobile chat UI with approve/adjust/confirm flow.',
};

export async function run(_config) {
  return [
    await skipTest('Mobile app builds successfully', 'Not implemented yet'),
    await skipTest('Check-in screen renders 3 task cards', 'Not implemented yet'),
    await skipTest('Confirm locks daily plan', 'Not implemented yet'),
  ];
}
