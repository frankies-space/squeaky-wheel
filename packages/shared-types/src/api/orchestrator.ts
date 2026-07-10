import type { DecomposeOutputMethod } from './tasks';

export type OrchestratorFlow = 'decomposition' | 'daily_proposal';

export type OrchestratorTraceStatus = 'running' | 'success' | 'error';

export interface OrchestratorTraceStep {
  name: string;
  at: string;
  detail?: Record<string, unknown>;
}

export interface OrchestratorTraceError {
  message: string;
  name?: string;
}

export interface OrchestratorTrace {
  id: string;
  flow: OrchestratorFlow;
  status: OrchestratorTraceStatus;
  outputMethod?: DecomposeOutputMethod;
  userId?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: OrchestratorTraceError;
  steps: OrchestratorTraceStep[];
}

export interface OrchestratorTracesResponse {
  traces: OrchestratorTrace[];
  total: number;
}
