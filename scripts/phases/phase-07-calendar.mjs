import { assert, request, runTest } from '../lib/runner.mjs';

export const phase = {
  id: 7,
  title: 'Calendar Module',
  description: 'Google Calendar OAuth + write-only event creation for confirmed tasks.',
};

export async function run(config) {
  const state = { ventureIds: [], planId: null };

  return [
    await runTest('Calendar OAuth flow completes', async () => {
      const start = await request(config, 'GET', '/calendar/oauth/start');
      assert(start.response.ok, `Expected 200, got ${start.response.status}`);
      assert(start.json?.authUrl, 'authUrl missing');

      const complete = await request(config, 'POST', '/calendar/oauth/complete', {
        body: { code: 'mock' },
      });
      assert(complete.response.ok, `Expected 200, got ${complete.response.status}`);
      assert(complete.json?.connected === true, 'calendar should be connected');

      const status = await request(config, 'GET', '/calendar/status');
      assert(status.json?.connected === true, 'status should show connected');
    }),

    await runTest('Setup: ventures and proposed plan', async () => {
      for (const name of ['Cal A', 'Cal B', 'Cal C']) {
        const { response, json } = await request(config, 'POST', '/ventures', {
          body: { name: `${name} ${Date.now()}` },
        });
        assert(response.ok, `Expected 201/200, got ${response.status}`);
        state.ventureIds.push(json.id);
      }

      const { response, json } = await request(config, 'GET', '/checkin/today');
      assert(response.ok, `Expected 200, got ${response.status}`);
      assert(json?.proposedTasks?.length === 3, 'need 3 proposed tasks');
      const replan = await request(config, 'POST', '/checkin/today/replan', { body: {} });
      assert(replan.response.ok, `Expected 200 replan, got ${replan.response.status}`);
      assert(replan.json?.status === 'proposed', 'replan should return proposed status');
      state.planId = replan.json.planId;
    }),

    await runTest('Confirmed tasks create calendar events', async () => {
      const { response, json } = await request(config, 'POST', '/checkin/today/confirm', {
        body: {},
      });
      assert(response.ok, `Expected 200, got ${response.status}: ${JSON.stringify(json)}`);
      assert(json?.status === 'confirmed', 'plan should be confirmed');
      assert(
        json.proposedTasks.every((task) => task.calendarEventId),
        'each task should have a calendar event id',
      );
    }),

    await runTest('Calendar event id stored on daily_plan_tasks', async () => {
      const { json } = await request(config, 'GET', '/checkin/today');
      assert(json?.status === 'confirmed', 'plan should remain confirmed');
      for (const task of json.proposedTasks) {
        assert(task.calendarEventId?.startsWith('mock-event-'), `unexpected event id ${task.calendarEventId}`);
      }
    }),

    await runTest('Cleanup: delete test ventures', async () => {
      for (const id of state.ventureIds) {
        const { response } = await request(config, 'DELETE', `/ventures/${id}`);
        assert(response.status === 204, `Expected 204 deleting ${id}`);
      }
    }),
  ];
}
