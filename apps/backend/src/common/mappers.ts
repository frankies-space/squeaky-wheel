import type { DbGoal, DbTask, DbUser, DbVenture } from '../db/schema';
import type {
  GoalResponse,
  TaskResponse,
  UserResponse,
  VentureResponse,
} from '@squeaky-wheel/shared-types';

export function toUserResponse(user: DbUser): UserResponse {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    timezone: user.timezone,
    checkinTime: user.checkinTime,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toGoalResponse(goal: DbGoal): GoalResponse {
  return {
    id: goal.id,
    ventureId: goal.ventureId,
    title: goal.title,
    description: goal.description,
    deadline: goal.deadline,
    status: goal.status as GoalResponse['status'],
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  };
}

export function toTaskResponse(task: DbTask): TaskResponse {
  return {
    id: task.id,
    ventureId: task.ventureId,
    goalId: task.goalId,
    parentTaskId: task.parentTaskId,
    title: task.title,
    description: task.description,
    level: task.level as TaskResponse['level'],
    estimatedMinutes: task.estimatedMinutes,
    status: task.status as TaskResponse['status'],
    generatedBy: task.generatedBy as TaskResponse['generatedBy'],
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export function toVentureResponse(venture: DbVenture): VentureResponse {
  return {
    id: venture.id,
    userId: venture.userId,
    name: venture.name,
    description: venture.description,
    priorityWeight: venture.priorityWeight,
    status: venture.status as VentureResponse['status'],
    maxDaysWithoutAttention: venture.maxDaysWithoutAttention,
    createdAt: venture.createdAt.toISOString(),
    updatedAt: venture.updatedAt.toISOString(),
  };
}
