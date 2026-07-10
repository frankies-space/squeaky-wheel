const DEFAULT_BASE_URL = 'http://localhost:3000';
const DEFAULT_AUTH_TOKEN = 'dev';

export function loadConfig() {
  return {
    baseUrl: (process.env.API_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, ''),
    authToken: process.env.AUTH_TOKEN ?? DEFAULT_AUTH_TOKEN,
    verbose: process.env.VERBOSE === '1' || process.env.VERBOSE === 'true',
  };
}

export async function request(config, method, path, options = {}) {
  const url = `${config.baseUrl}${path}`;
  const headers = {
  ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.auth === false ? {} : { Authorization: `Bearer ${config.authToken}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }

  return { response, json, text };
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export async function runTest(name, fn) {
  try {
    await fn();
    return { name, status: 'pass' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { name, status: 'fail', message };
  }
}

export async function skipTest(name, reason) {
  return { name, status: 'skip', message: reason };
}

export function printPhaseHeader(phase) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Phase ${phase.id}: ${phase.title}`);
  console.log(phase.description);
  console.log('='.repeat(60));
}

export function printResults(results) {
  for (const result of results) {
    const icon =
      result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '○';
    const suffix = result.message ? ` — ${result.message}` : '';
    console.log(`  ${icon} ${result.name}${suffix}`);
  }

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const skipped = results.filter((r) => r.status === 'skip').length;

  console.log(`\n  ${passed} passed, ${failed} failed, ${skipped} skipped`);
  return { passed, failed, skipped };
}
