#!/usr/bin/env node
import { loadConfig, request } from './lib/runner.mjs';

const INTERVAL_MS = Number(process.env.MONITOR_INTERVAL_MS ?? 2000);
const STATUS_FILTER = process.env.MONITOR_STATUS ?? '';
const FLOW_FILTER = process.env.MONITOR_FLOW ?? '';

function formatTrace(trace) {
  const icon =
    trace.status === 'success' ? '✓' : trace.status === 'error' ? '✗' : '…';
  const duration = trace.durationMs != null ? `${trace.durationMs}ms` : 'running';
  const error = trace.error ? ` — ${trace.error.message}` : '';
  return `${icon} [${trace.flow}] ${trace.id.slice(0, 8)} ${trace.status} (${duration})${error}`;
}

function printTraceDetail(trace) {
  console.log('\n--- Trace detail ---');
  console.log(`id:       ${trace.id}`);
  console.log(`flow:     ${trace.flow}`);
  console.log(`status:   ${trace.status}`);
  console.log(`user:     ${trace.userId ?? 'n/a'}`);
  console.log(`started:  ${trace.startedAt}`);
  console.log(`duration: ${trace.durationMs ?? 'n/a'}ms`);
  if (trace.error) {
    console.log(`error:    ${trace.error.message}`);
  }
  if (trace.steps?.length) {
    console.log('steps:');
    for (const step of trace.steps) {
      const detail = step.detail ? ` ${JSON.stringify(step.detail)}` : '';
      console.log(`  - ${step.name} @ ${step.at}${detail}`);
    }
  }
  if (trace.output) {
    console.log(`output:   ${JSON.stringify(trace.output)}`);
  }
  console.log('--------------------\n');
}

async function poll(config) {
  const query = new URLSearchParams({ limit: '20' });
  if (STATUS_FILTER) query.set('status', STATUS_FILTER);
  if (FLOW_FILTER) query.set('flow', FLOW_FILTER);

  const { response, json } = await request(
    config,
    'GET',
    `/orchestrator/traces?${query.toString()}`,
  );

  if (!response.ok) {
    console.error(`[monitor] API error ${response.status}:`, json);
    return;
  }

  const traces = json?.traces ?? [];
  const errors = traces.filter((trace) => trace.status === 'error');
  const running = traces.filter((trace) => trace.status === 'running');

  console.clear();
  console.log(`Orchestrator monitor — ${new Date().toISOString()}`);
  console.log(`API: ${config.baseUrl} | traces: ${traces.length} | running: ${running.length} | errors: ${errors.length}`);
  console.log('');

  if (traces.length === 0) {
    console.log('No traces yet. Trigger a flow:');
    console.log('  GET  /checkin/today');
    console.log('  POST /goals/:id/decompose');
    return;
  }

  for (const trace of traces) {
    console.log(formatTrace(trace));
  }

  if (errors.length > 0) {
    printTraceDetail(errors[0]);
  }
}

const config = loadConfig();
console.log(`Watching ${config.baseUrl}/orchestrator/traces every ${INTERVAL_MS}ms`);
console.log('Filters: MONITOR_STATUS=error MONITOR_FLOW=daily_proposal');
console.log('Press Ctrl+C to stop.\n');

await poll(config);
setInterval(() => {
  poll(config).catch((error) => {
    console.error('[monitor] poll failed:', error instanceof Error ? error.message : error);
  });
}, INTERVAL_MS);
