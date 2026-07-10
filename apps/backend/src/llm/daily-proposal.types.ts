import type {
  AntiStallScoresResponse,
  DailyPlanStatus,
  ProposedDailyTask,
  TodayCheckinResponse,
} from '@squeaky-wheel/shared-types';
import type { ProposeDailyTasksInput } from './tools/propose-daily-tasks';

export interface PersistedDailyProposal {
  planId: string;
  planDate: string;
  status: DailyPlanStatus;
  outputMethod: TodayCheckinResponse['outputMethod'];
  assistantMessage: string;
  antiStall: AntiStallScoresResponse;
  calendarSlots: { start: string; end: string; durationMinutes: number }[];
  proposedTasks: ProposedDailyTask[];
}

export function toTodayCheckinResponse(
  traceId: string,
  proposal: PersistedDailyProposal,
): TodayCheckinResponse {
  return {
    traceId,
    planId: proposal.planId,
    planDate: proposal.planDate,
    status: proposal.status,
    outputMethod: proposal.outputMethod,
    assistantMessage: proposal.assistantMessage,
    antiStall: proposal.antiStall,
    calendarAvailability: proposal.calendarSlots,
    proposedTasks: proposal.proposedTasks,
  };
}

export function summarizeProposalOutput(
  proposal: PersistedDailyProposal,
): Record<string, unknown> {
  return {
    planId: proposal.planId,
    planDate: proposal.planDate,
    taskCount: proposal.proposedTasks.length,
    ventures: proposal.proposedTasks.map((task) => task.ventureId),
    outputMethod: proposal.outputMethod,
  };
}

export type { ProposeDailyTasksInput };
