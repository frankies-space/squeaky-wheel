import type { CreateTaskTreeInput } from '../llm/tools/create-task-tree';

export function buildMockTaskTree(goalTitle: string): CreateTaskTreeInput {
  return {
    root: {
      title: goalTitle,
      level: 'project',
      children: [
        {
          title: 'Research and planning',
          level: 'epic',
          children: [
            {
              title: `List 5 concrete milestones for "${goalTitle}"`,
              level: 'micro_task',
              estimatedMinutes: 30,
            },
            {
              title: `Draft a one-page plan outline for "${goalTitle}"`,
              level: 'micro_task',
              estimatedMinutes: 45,
            },
          ],
        },
        {
          title: 'First execution sprint',
          level: 'epic',
          children: [
            {
              title: `Complete the smallest next action toward "${goalTitle}"`,
              level: 'micro_task',
              estimatedMinutes: 60,
            },
          ],
        },
      ],
    },
  };
}
