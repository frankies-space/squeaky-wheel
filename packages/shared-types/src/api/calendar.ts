import type { CalendarProvider } from '../db';

export interface CalendarConnectionStatus {
  connected: boolean;
  provider: CalendarProvider | null;
  externalCalendarId: string | null;
}

export interface CalendarOAuthStartResponse {
  authUrl: string;
  provider: CalendarProvider;
  mock?: boolean;
}

export interface CalendarConnectMockResponse {
  connected: true;
  provider: 'google';
  connectionId: string;
}

export interface CalendarEventBlockResult {
  dailyPlanTaskId: string;
  taskId: string;
  slot: number;
  calendarEventId: string;
  start: string;
  end: string;
}

export interface BlockDailyPlanCalendarResponse {
  planId: string;
  events: CalendarEventBlockResult[];
}
