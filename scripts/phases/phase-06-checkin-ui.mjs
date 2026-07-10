import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assert, request, runTest } from '../lib/runner.mjs';

export const phase = {
  id: 6,
  title: 'Daily Check-In screen',
  description: 'Mobile chat UI with approve/adjust/confirm flow.',
};

const MOBILE_ROOT = join(process.cwd(), 'apps/mobile');

export async function run(config) {
  const state = {
    ventureIds: [],
    planId: null,
  };

  return [
    await runTest('Mobile app builds successfully', async () => {
      execSync('pnpm --filter @squeaky-wheel/mobile typecheck', {
        cwd: process.cwd(),
        stdio: 'pipe',
      });
    }),

    await runTest('Check-in screen renders 3 task cards', async () => {
      const indexSrc = readFileSync(join(MOBILE_ROOT, 'app/index.tsx'), 'utf8');
      const taskCardSrc = readFileSync(
        join(MOBILE_ROOT, 'src/components/TaskCard.tsx'),
        'utf8',
      );
      const checkinLib = readFileSync(join(MOBILE_ROOT, 'src/lib/checkin.ts'), 'utf8');

      assert(indexSrc.includes('TaskCard'), 'Today screen must render TaskCard');
      assert(indexSrc.includes('MAX_DAILY_TASKS'), 'Today screen must enforce max tasks');
      assert(indexSrc.includes('.slice(0, MAX_DAILY_TASKS)'), 'Must slice to max 3 cards');
      assert(taskCardSrc.includes('rationale'), 'TaskCard must show rationale');
      assert(checkinLib.includes('MAX_DAILY_TASKS = 3'), 'MAX_DAILY_TASKS must be 3');
    }),

    await runTest('Setup: ventures for confirm flow', async () => {
      for (const name of ['Checkin A', 'Checkin B', 'Checkin C']) {
        const { response, json } = await request(config, 'POST', '/ventures', {
          body: { name: `${name} ${Date.now()}` },
        });
        assert(response.ok, `Expected 201/200, got ${response.status}`);
        state.ventureIds.push(json.id);
      }
    }),

    await runTest('Confirm locks daily plan', async () => {
      const replan = await request(config, 'POST', '/checkin/today/replan', { body: {} });
      assert(replan.response.ok, `Expected 200 replan, got ${replan.response.status}`);

      const { response: getRes, json: proposal } = await request(config, 'GET', '/checkin/today');
      assert(getRes.ok, `Expected 200, got ${getRes.status}`);
      assert(proposal?.proposedTasks?.length === 3, 'need 3 proposed tasks');
      assert(proposal?.status === 'proposed', 'plan should start proposed');
      state.planId = proposal.planId;

      const { response: confirmRes, json: confirmed } = await request(
        config,
        'POST',
        '/checkin/today/confirm',
        { body: {} },
      );
      assert(confirmRes.ok, `Expected 200, got ${confirmRes.status}`);
      assert(confirmed?.status === 'confirmed', `expected confirmed, got ${confirmed?.status}`);
      assert(
        confirmed?.assistantMessage?.includes('Locked in'),
        'confirm should return closing message',
      );

      const { json: reload } = await request(config, 'GET', '/checkin/today');
      assert(reload?.status === 'confirmed', 'GET today should return locked plan');
      assert(reload?.planId === state.planId, 'plan id should be stable after confirm');
    }),

    await runTest('Cleanup: delete test ventures', async () => {
      for (const id of state.ventureIds) {
        const { response } = await request(config, 'DELETE', `/ventures/${id}`);
        assert(response.status === 204, `Expected 204 deleting ${id}`);
      }
    }),
  ];
}
