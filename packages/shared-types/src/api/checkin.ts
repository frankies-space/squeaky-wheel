import type {
  CheckinStatus,
  DailyPlanStatus,
  DailyPlanTaskOutcome,
} from '../db';
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
  calendarEventId: string | null;
  outcome?: DailyPlanTaskOutcome | null;
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

/** Where a not-done / partial task goes after evening review. */
export type EveningTaskDisposition = 'tomorrow' | 'backlog';

export interface EveningTaskReviewItem {
  slot: 1 | 2 | 3;
  taskId: string;
  title: string;
  ventureId: string;
  ventureName: string;
  estimatedMinutes: number;
  rationale: string;
  calendarEventId: string | null;
  outcome: DailyPlanTaskOutcome | null;
}

export interface EveningCheckinResponse {
  checkinId: string;
  planId: string;
  planDate: string;
  status: CheckinStatus;
  assistantMessage: string;
  tasks: EveningTaskReviewItem[];
}

export interface EveningOutcomeInput {
  taskId: string;
  outcome: DailyPlanTaskOutcome;
  /** Required when outcome is `not_done`; optional for `partial`. */
  disposition?: EveningTaskDisposition;
}

export interface CompleteEveningCheckinRequest {
  outcomes: EveningOutcomeInput[];
}
