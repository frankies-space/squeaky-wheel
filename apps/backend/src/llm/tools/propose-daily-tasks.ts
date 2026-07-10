import { z } from 'zod';

export const proposedDailyTaskSchema = z.object({
  title: z.string().min(1).max(500),
  ventureId: z.string().uuid(),
  estimatedMinutes: z.number().int().min(5).max(90),
  rationale: z.string().min(1).max(500),
});

export const proposeDailyTasksInputSchema = z.object({
  tasks: z.array(proposedDailyTaskSchema).length(3),
  assistantMessage: z.string().max(1000).optional(),
});

export type ProposeDailyTasksInput = z.infer<typeof proposeDailyTasksInputSchema>;
export type ProposedDailyTaskInput = z.infer<typeof proposedDailyTaskSchema>;

export const PROPOSE_DAILY_TASKS_TOOL_DESCRIPTION =
  'Propose exactly three primary tasks for today. Each task must include title, venture_id, estimated_minutes (5-90), and a one-line rationale. Never propose more or fewer than three.';

export const MAX_DAILY_TASKS = 3;

export function assertExactlyThreeTasks(taskCount: number): void {
  if (taskCount !== MAX_DAILY_TASKS) {
    throw new Error(
      `Rule of 3 violated: expected exactly ${MAX_DAILY_TASKS} tasks, got ${taskCount}`,
    );
  }
}
