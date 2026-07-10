import type {
  CreateGoalRequest,
  GoalResponse,
  UpdateGoalRequest,
} from '@squeaky-wheel/shared-types';
import { apiRequest } from './client';

export function listGoals(ventureId: string) {
  return apiRequest<GoalResponse[]>(`/ventures/${ventureId}/goals`);
}

export function createGoal(ventureId: string, body: CreateGoalRequest) {
  return apiRequest<GoalResponse>(`/ventures/${ventureId}/goals`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateGoal(id: string, body: UpdateGoalRequest) {
  return apiRequest<GoalResponse>(`/goals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteGoal(id: string) {
  return apiRequest<void>(`/goals/${id}`, { method: 'DELETE' });
}
