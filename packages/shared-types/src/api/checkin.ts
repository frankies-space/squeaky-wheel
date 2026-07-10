import type { DailyPlanStatus } from '../db';
import type { AntiStallScoresResponse } from './anti-stall';

export interface CalendarAvailabilitySlot {
  start: string;
  end: string;
  durationMinutes: number;
}

export interface ProposedDailyTask {
  slot: 1 | 2 | 3;
  taskId: string;
  title: string;
  ventureId: string;
  ventureName: string;
  estimatedMinutes: number;
  rationale: string;
  proposedStartTime: string | null;
  proposedEndTime: string | null;
}

export interface TodayCheckinResponse {
  traceId: string;
  planId: string;
  planDate: string;
  status: DailyPlanStatus;
  outputMethod: 'tool_call' | 'mock';
  assistantMessage: string;
  antiStall: AntiStallScoresResponse;
  calendarAvailability: CalendarAvailabilitySlot[];
  proposedTasks: ProposedDailyTask[];
}
