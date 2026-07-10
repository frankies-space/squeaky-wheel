import type { Goal, GoalStatus } from '../db';

export interface GoalResponse extends Goal {}

export interface CreateGoalRequest {
  title: string;
  description?: string | null;
  deadline?: string | null;
  status?: GoalStatus;
}

export interface UpdateGoalRequest {
  title?: string;
  description?: string | null;
  deadline?: string | null;
  status?: GoalStatus;
}
