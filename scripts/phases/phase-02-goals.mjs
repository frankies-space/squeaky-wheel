import { skipTest } from '../lib/runner.mjs';

export const phase = {
  id: 2,
  title: 'Venture + Goal management',
  description: 'Goal CRUD endpoints and mobile screens (backend API tests).',
};

export async function run(_config) {
  return [
    await skipTest('POST /ventures/:id/goals creates goal', 'Not implemented yet'),
    await skipTest('GET /ventures/:id/goals lists goals', 'Not implemented yet'),
    await skipTest('PATCH /goals/:id updates goal', 'Not implemented yet'),
    await skipTest('DELETE /goals/:id removes goal', 'Not implemented yet'),
  ];
}
