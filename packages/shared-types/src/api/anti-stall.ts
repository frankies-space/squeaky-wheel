import type { VentureStatus } from '../db';

export interface VentureUrgencyScore {
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

export interface AntiStallScoresResponse {
  referenceDate: string;
  attentionWindowDays: number;
  scores: VentureUrgencyScore[];
}
