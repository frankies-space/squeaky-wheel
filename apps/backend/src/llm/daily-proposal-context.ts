import type { AntiStallScoresResponse } from '@squeaky-wheel/shared-types';
import { buildDecompositionContext, SYSTEM_PROMPT } from './system-prompt';

export function buildDailyProposalContext(input: {
  planDate: string;
  antiStall: AntiStallScoresResponse;
  calendarSlots: { start: string; end: string; durationMinutes: number }[];
  backlogSummary: { ventureId: string; ventureName: string; tasks: string[] }[];
}): string {
  const lines = [
    '--- DAILY PROPOSAL CONTEXT ---',
    `Plan date: ${input.planDate}`,
    '',
    'Anti-stall urgency scores (higher = more urgent):',
  ];

  for (const score of input.antiStall.scores) {
    lines.push(
      `- ${score.ventureName} (${score.ventureId}): urgency=${score.urgencyScore}, eligible=${score.isEligible}, overdue=${score.isOverdue}`,
    );
  }

  lines.push('', 'Calendar availability (UTC):');
  for (const slot of input.calendarSlots) {
    lines.push(`- ${slot.start} → ${slot.end} (${slot.durationMinutes} min)`);
  }

  lines.push('', 'Backlog micro-tasks by venture:');
  for (const venture of input.backlogSummary) {
    lines.push(`- ${venture.ventureName}: ${venture.tasks.join('; ') || '(none)'}`);
  }

  return lines.join('\n');
}

export function getDailyProposalSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

export { buildDecompositionContext };
