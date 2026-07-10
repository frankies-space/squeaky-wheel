import type { TodayCheckinResponse } from '@squeaky-wheel/shared-types';
import { apiRequest } from './client';

export function getTodayCheckin(): Promise<TodayCheckinResponse> {
  return apiRequest<TodayCheckinResponse>('/checkin/today');
}

export function confirmTodayCheckin(): Promise<TodayCheckinResponse> {
  return apiRequest<TodayCheckinResponse>('/checkin/today/confirm', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
