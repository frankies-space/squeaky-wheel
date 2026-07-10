import type { Venture, VentureStatus } from '../db';

export interface VentureResponse extends Venture {}

export interface CreateVentureRequest {
  name: string;
  description?: string | null;
  priorityWeight?: number;
  status?: VentureStatus;
  maxDaysWithoutAttention?: number;
}

export interface UpdateVentureRequest {
  name?: string;
  description?: string | null;
  priorityWeight?: number;
  status?: VentureStatus;
  maxDaysWithoutAttention?: number;
}
