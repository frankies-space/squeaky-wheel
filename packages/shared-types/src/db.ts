export type VentureStatus = 'active' | 'paused' | 'archived';
export type GoalStatus = 'active' | 'done' | 'abandoned';
export type TaskLevel = 'project' | 'epic' | 'task' | 'micro_task';
export type TaskStatus =
  | 'backlog'
  | 'proposed'
  | 'scheduled'
  | 'done'
  | 'skipped'
  | 'rescheduled';
export type TaskGeneratedBy = 'ai' | 'user';
export type DailyPlanStatus = 'proposed' | 'confirmed' | 'completed';
export type DailyPlanTaskOutcome = 'done' | 'not_done' | 'partial';
export type CheckinType = 'morning' | 'evening';
export type CheckinStatus = 'in_progress' | 'completed' | 'abandoned';
export type CheckinMessageRole = 'user' | 'assistant';
export type VentureContextSourceType =
  | 'goal'
  | 'note'
  | 'checkin_summary'
  | 'manual_input';
export type CalendarProvider = 'google' | 'apple';

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  timezone: string;
  checkinTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface Venture {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  priorityWeight: string;
  status: VentureStatus;
  maxDaysWithoutAttention: number;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  ventureId: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}
