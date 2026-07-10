import type { VentureStatus } from '@squeaky-wheel/shared-types';

export const DEFAULT_ATTENTION_WINDOW_DAYS = 7;

export interface VentureAttentionInput {
  ventureId: string;
  ventureName: string;
  status: VentureStatus;
  priorityWeight: number;
  maxDaysWithoutAttention: number;
  lastAttendedAt: string | null;
  attentionCount7d: number;
  referenceDate: string;
}

export interface VentureUrgencyResult {
  ventureId: string;
  ventureName: string;
  status: VentureStatus;
  priorityWeight: number;
  maxDaysWithoutAttention: number;
  daysSinceLastAttention: number | null;
  attentionCount7d: number;
  urgencyScore: number;
  isEligible: boolean;
  isOverdue: boolean;
}

export function daysBetween(fromDate: string, toDate: string): number {
  const from = Date.parse(`${fromDate}T00:00:00Z`);
  const to = Date.parse(`${toDate}T00:00:00Z`);
  return Math.floor((to - from) / (1000 * 60 * 60 * 24));
}

/**
 * Deterministic urgency scoring for the anti-stall engine.
 *
 * stallRatio = daysSinceLastAttention / maxDaysWithoutAttention
 * recencyPenalty = max(0, 3 - attentionCount7d) * 0.25 * priorityWeight
 * urgencyScore = priorityWeight * stallRatio + recencyPenalty
 *
 * Never-attended ventures are treated as overdue (daysSince = max + 1).
 * Paused/archived ventures are ineligible with urgencyScore 0.
 */
export function scoreVenture(input: VentureAttentionInput): VentureUrgencyResult {
  const base = {
    ventureId: input.ventureId,
    ventureName: input.ventureName,
    status: input.status,
    priorityWeight: input.priorityWeight,
    maxDaysWithoutAttention: input.maxDaysWithoutAttention,
    attentionCount7d: input.attentionCount7d,
  };

  if (input.status !== 'active') {
    const daysSinceLastAttention = input.lastAttendedAt
      ? daysBetween(input.lastAttendedAt, input.referenceDate)
      : null;

    return {
      ...base,
      daysSinceLastAttention,
      urgencyScore: 0,
      isEligible: false,
      isOverdue: false,
    };
  }

  const daysSinceLastAttention = input.lastAttendedAt
    ? daysBetween(input.lastAttendedAt, input.referenceDate)
    : input.maxDaysWithoutAttention + 1;

  const stallRatio = daysSinceLastAttention / input.maxDaysWithoutAttention;
  const recencyPenalty =
    Math.max(0, 3 - input.attentionCount7d) * 0.25 * input.priorityWeight;
  const urgencyScore = roundScore(input.priorityWeight * stallRatio + recencyPenalty);
  const isOverdue = daysSinceLastAttention >= input.maxDaysWithoutAttention;

  return {
    ...base,
    daysSinceLastAttention,
    urgencyScore,
    isEligible: true,
    isOverdue,
  };
}

export function rankVenturesByUrgency(
  results: VentureUrgencyResult[],
): VentureUrgencyResult[] {
  return [...results].sort((a, b) => {
    if (a.isEligible !== b.isEligible) {
      return a.isEligible ? -1 : 1;
    }
    if (b.urgencyScore !== a.urgencyScore) {
      return b.urgencyScore - a.urgencyScore;
    }
    return a.ventureName.localeCompare(b.ventureName);
  });
}

function roundScore(value: number): number {
  return Math.round(value * 10000) / 10000;
}
