import type { AntiStallScoresResponse } from '@squeaky-wheel/shared-types';
import type { ProposeDailyTasksInput } from './tools/propose-daily-tasks';

export interface CalendarAvailabilitySlot {
  start: string;
  end: string;
  durationMinutes: number;
}

export function buildMockCalendarAvailability(
  planDate: string,
  taskDurations: number[],
): CalendarAvailabilitySlot[] {
  const slots: CalendarAvailabilitySlot[] = [];
  let hour = 9;

  for (const duration of taskDurations) {
    const start = `${planDate}T${String(hour).padStart(2, '0')}:00:00Z`;
    hour += Math.ceil(duration / 60) + 1;
    const end = `${planDate}T${String(hour).padStart(2, '0')}:00:00Z`;
    slots.push({ start, end, durationMinutes: duration });
  }

  return slots;
}

export function buildMockDailyProposal(
  scores: AntiStallScoresResponse,
  backlogByVenture: Map<string, { id: string; title: string; estimatedMinutes: number | null }[]>,
): ProposeDailyTasksInput {
  const eligible = scores.scores.filter((score) => score.isEligible);

  if (eligible.length === 0) {
    throw new Error('No eligible ventures available for a daily proposal');
  }

  const tasks: ProposeDailyTasksInput['tasks'] = [];

  for (let index = 0; index < 3; index++) {
    const venture = eligible[index % eligible.length];
    const backlog = backlogByVenture.get(venture.ventureId) ?? [];
    const backlogTask = backlog[index % Math.max(backlog.length, 1)];
    const title =
      backlogTask?.title ??
      `Take the next concrete step on ${venture.ventureName}`;

    tasks.push({
      title,
      ventureId: venture.ventureId,
      estimatedMinutes: backlogTask?.estimatedMinutes ?? 45,
      rationale: venture.isOverdue
        ? `${venture.ventureName} is due for attention (${venture.daysSinceLastAttention ?? 'never'} days).`
        : `Keeps momentum on ${venture.ventureName}.`,
    });
  }

  return {
    tasks,
    assistantMessage: "Good morning. Here's what I'm proposing for today:",
  };
}
