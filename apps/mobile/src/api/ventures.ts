import type {
  CreateVentureRequest,
  UpdateVentureRequest,
  VentureResponse,
} from '@squeaky-wheel/shared-types';
import { apiRequest } from './client';

export function listVentures() {
  return apiRequest<VentureResponse[]>('/ventures');
}

export function getVenture(id: string) {
  return apiRequest<VentureResponse>(`/ventures/${id}`);
}

export function createVenture(body: CreateVentureRequest) {
  return apiRequest<VentureResponse>('/ventures', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateVenture(id: string, body: UpdateVentureRequest) {
  return apiRequest<VentureResponse>(`/ventures/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteVenture(id: string) {
  return apiRequest<void>(`/ventures/${id}`, { method: 'DELETE' });
}
