import type {
  CompleteEveningCheckinRequest,
  EveningCheckinResponse,
  TodayCheckinResponse,
} from '@squeaky-wheel/shared-types';
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

export function getEveningCheckin(): Promise<EveningCheckinResponse> {
  return apiRequest<EveningCheckinResponse>('/checkin/evening');
}

export function completeEveningCheckin(
  body: CompleteEveningCheckinRequest,
): Promise<EveningCheckinResponse> {
  return apiRequest<EveningCheckinResponse>('/checkin/evening/complete', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
