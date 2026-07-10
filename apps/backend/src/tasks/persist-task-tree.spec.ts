import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { TaskTreeNodeInput } from '../llm/tools/create-task-tree';
import { flattenTaskTree, validateTaskTree } from './persist-task-tree';

const validTree: TaskTreeNodeInput = {
  title: 'Launch newsletter',
  level: 'project',
  children: [
    {
      title: 'Audience research',
      level: 'epic',
      children: [
        {
          title: 'List 10 competitor newsletters',
          level: 'micro_task',
          estimatedMinutes: 30,
        },
      ],
    },
  ],
};

describe('flattenTaskTree', () => {
  it('produces parent indexes in depth-first order', () => {
    const flat = flattenTaskTree(validTree);
    assert.equal(flat.length, 3);
    assert.equal(flat[0].level, 'project');
    assert.equal(flat[0].parentIndex, null);
    assert.equal(flat[1].parentIndex, 0);
    assert.equal(flat[2].parentIndex, 1);
  });
});

describe('validateTaskTree', () => {
  it('accepts a valid tree', () => {
    assert.doesNotThrow(() => validateTaskTree(validTree));
  });

  it('requires project root', () => {
    assert.throws(
      () =>
        validateTaskTree({
          title: 'Bad root',
          level: 'epic',
          children: [],
        }),
      /root must be level project/,
    );
  });

  it('requires micro_task leaves with estimates', () => {
    assert.throws(
      () =>
        validateTaskTree({
          title: 'Launch',
          level: 'project',
          children: [
            {
              title: 'Do work',
              level: 'epic',
              children: [
                {
                  title: 'Missing estimate',
                  level: 'micro_task',
                },
              ],
            },
          ],
        }),
      /must include estimatedMinutes/,
    );
  });

  it('rejects micro_tasks with children', () => {
    assert.throws(
      () =>
        validateTaskTree({
          title: 'Launch',
          level: 'project',
          children: [
            {
              title: 'Invalid leaf',
              level: 'micro_task',
              estimatedMinutes: 30,
              children: [
                {
                  title: 'Child',
                  level: 'micro_task',
                  estimatedMinutes: 15,
                },
              ],
            },
          ],
        }),
      /cannot have children/,
    );
  });
});
