import type { DbUser, DbVenture } from '../db/schema';
import type { UserResponse, VentureResponse } from '@squeaky-wheel/shared-types';

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
