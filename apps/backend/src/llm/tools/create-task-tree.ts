import { z } from 'zod';
import type { TaskLevel } from '@squeaky-wheel/shared-types';

export const TASK_LEVELS = ['project', 'epic', 'task', 'micro_task'] as const satisfies readonly TaskLevel[];

export type TaskTreeNodeInput = {
  title: string;
  description?: string;
  level: TaskLevel;
  estimatedMinutes?: number;
  children?: TaskTreeNodeInput[];
};

export const taskTreeNodeSchema: z.ZodType<TaskTreeNodeInput> = z.lazy(() =>
  z.object({
    title: z.string().min(1).max(500),
    description: z.string().max(2000).optional(),
    level: z.enum(TASK_LEVELS),
    estimatedMinutes: z.number().int().min(5).max(90).optional(),
    children: z.array(taskTreeNodeSchema).optional(),
  }),
);

export const createTaskTreeInputSchema = z.object({
  root: taskTreeNodeSchema,
});

export type CreateTaskTreeInput = z.infer<typeof createTaskTreeInputSchema>;

export const CREATE_TASK_TREE_TOOL_DESCRIPTION =
  'Create a hierarchical task tree for a goal. Use project at the root, epics for major phases, tasks for work units, and micro_tasks as immediately startable leaf actions (each <= 90 minutes).';
