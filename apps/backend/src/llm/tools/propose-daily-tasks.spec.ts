import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertExactlyThreeTasks } from './propose-daily-tasks';

describe('assertExactlyThreeTasks', () => {
  it('accepts exactly three tasks', () => {
    assert.doesNotThrow(() => assertExactlyThreeTasks(3));
  });

  it('rejects fewer than three tasks', () => {
    assert.throws(() => assertExactlyThreeTasks(2), /Rule of 3 violated/);
  });

  it('rejects more than three tasks', () => {
    assert.throws(() => assertExactlyThreeTasks(4), /Rule of 3 violated/);
  });
});
