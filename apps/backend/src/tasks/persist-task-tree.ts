import type { TaskLevel } from '@squeaky-wheel/shared-types';
import type { TaskTreeNodeInput } from '../llm/tools/create-task-tree';

const LEVEL_RANK: Record<TaskLevel, number> = {
  project: 0,
  epic: 1,
  task: 2,
  micro_task: 3,
};

export interface FlatTaskInsert {
  title: string;
  description: string | null;
  level: TaskLevel;
  estimatedMinutes: number | null;
  parentIndex: number | null;
}

export function flattenTaskTree(root: TaskTreeNodeInput): FlatTaskInsert[] {
  const rows: FlatTaskInsert[] = [];

  function walk(node: TaskTreeNodeInput, parentIndex: number | null) {
    const index = rows.length;
    rows.push({
      title: node.title,
      description: node.description ?? null,
      level: node.level,
      estimatedMinutes: node.estimatedMinutes ?? null,
      parentIndex,
    });

    for (const child of node.children ?? []) {
      walk(child, index);
    }
  }

  walk(root, null);
  return rows;
}

export function validateTaskTree(root: TaskTreeNodeInput): void {
  function walk(node: TaskTreeNodeInput, depth: number, parentLevel: TaskLevel | null) {
    if (parentLevel !== null && LEVEL_RANK[node.level] <= LEVEL_RANK[parentLevel]) {
      throw new Error(
        `Invalid task tree: child level "${node.level}" must be deeper than parent "${parentLevel}"`,
      );
    }

    const children = node.children ?? [];
    const isLeaf = children.length === 0;

    if (isLeaf && node.level !== 'micro_task') {
      throw new Error(
        `Invalid task tree: leaf node "${node.title}" must be level micro_task`,
      );
    }

    if (!isLeaf && node.level === 'micro_task') {
      throw new Error(
        `Invalid task tree: micro_task "${node.title}" cannot have children`,
      );
    }

    if (isLeaf && node.estimatedMinutes === undefined) {
      throw new Error(
        `Invalid task tree: leaf "${node.title}" must include estimatedMinutes`,
      );
    }

    if (depth > 8) {
      throw new Error('Invalid task tree: maximum depth exceeded');
    }

    for (const child of children) {
      walk(child, depth + 1, node.level);
    }
  }

  if (root.level !== 'project') {
    throw new Error('Invalid task tree: root must be level project');
  }

  walk(root, 0, null);
}
