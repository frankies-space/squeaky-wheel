import type { TaskGeneratedBy, TaskLevel, TaskStatus } from '../db';

export interface TaskResponse {
  id: string;
  ventureId: string;
  goalId: string | null;
  parentTaskId: string | null;
  title: string;
  description: string | null;
  level: TaskLevel;
  estimatedMinutes: number | null;
  status: TaskStatus;
  generatedBy: TaskGeneratedBy;
  createdAt: string;
  updatedAt: string;
}

export type DecomposeOutputMethod = 'tool_call' | 'mock';

export interface DecomposeGoalResponse {
  traceId: string;
  goalId: string;
  ventureId: string;
  outputMethod: DecomposeOutputMethod;
  assistantMessage: string | null;
  tasks: TaskResponse[];
}
