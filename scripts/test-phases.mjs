#!/usr/bin/env node

import { loadConfig, printPhaseHeader, printResults } from './lib/runner.mjs';
import * as phase01 from './phases/phase-01-backend.mjs';
import * as phase02 from './phases/phase-02-goals.mjs';
import * as phase03 from './phases/phase-03-anti-stall.mjs';
import * as phase04 from './phases/phase-04-llm-decompose.mjs';
import * as phase05 from './phases/phase-05-daily-proposal.mjs';
import * as phase06 from './phases/phase-06-checkin-ui.mjs';
import * as phase07 from './phases/phase-07-calendar.mjs';
import * as phase08 from './phases/phase-08-evening.mjs';

const PHASES = [
  phase01,
  phase02,
  phase03,
  phase04,
  phase05,
  phase06,
  phase07,
  phase08,
];

function printUsage() {
  console.log(`Usage: pnpm test:phase [phase...]

Run integration tests per build phase (see AGENTS.md build order).

Examples:
  pnpm test:phase          Run all phases
  pnpm test:phase 1        Run phase 1 only
  pnpm test:phase 1 2      Run phases 1 and 2
  pnpm test:phase --list   List available phases

Environment:
  API_BASE_URL   API base URL (default: http://localhost:3000)
  AUTH_TOKEN     Bearer token (default: dev)
  VERBOSE=1      Show extra output
`);
}

function parseArgs(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  if (argv.includes('--list')) {
    for (const p of PHASES) {
      console.log(`  ${p.phase.id}. ${p.phase.title}`);
    }
    process.exit(0);
  }

  const numeric = argv
    .filter((arg) => /^\d+$/.test(arg))
    .map((arg) => Number(arg));

  if (numeric.length === 0) {
    return PHASES.map((p) => p.phase.id);
  }

  return numeric;
}

async function main() {
  const selectedIds = parseArgs(process.argv.slice(2));
  const config = loadConfig();

  console.log(`API: ${config.baseUrl}`);
  console.log(`Auth: ${config.authToken ? 'Bearer ***' : 'none'}`);

  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  const failedPhases = [];

  for (const module of PHASES) {
    if (!selectedIds.includes(module.phase.id)) {
      continue;
    }

    printPhaseHeader(module.phase);
    const results = await module.run(config);
    const summary = printResults(results);

    totalPassed += summary.passed;
    totalFailed += summary.failed;
    totalSkipped += summary.skipped;

    if (summary.failed > 0) {
      failedPhases.push(module.phase.id);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(
    `Total: ${totalPassed} passed, ${totalFailed} failed, ${totalSkipped} skipped`,
  );

  if (totalFailed > 0) {
    console.log(`Failed phases: ${failedPhases.join(', ')}`);
    process.exit(1);
  }

  if (totalPassed === 0 && totalSkipped > 0) {
    console.log('No tests ran yet — implement phase tests as features land.');
  }
}

main().catch((error) => {
  console.error('\nTest runner crashed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
