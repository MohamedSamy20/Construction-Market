import { api } from '@/lib/api';

export type ServiceDto = {
  id: string | number;
  type: string;
  dailyWage: number;
  days: number;
  total: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  vendorId?: string | number;
  isApproved?: boolean;
  status?: string;
  startDate?: string;
  endDate?: string | null;
};

export async function listVendorServices(params?: { vendorId?: 'me' | string | number }) {
  const qs = new URLSearchParams();
  if (params?.vendorId) qs.set('vendorId', String(params.vendorId));
  const query = qs.toString();
  return api.get<ServiceDto[]>(`/api/Services${query?`?${query}`:''}`, { auth: true });
}

export async function getServiceById(id: string | number) {
  return api.get<ServiceDto>(`/api/Services/${id}`, { auth: true });
}

export async function createService(payload: Partial<ServiceDto>) {
  return api.post<ServiceDto>('/api/Services', payload, { auth: true });
}

export async function updateService(id: string | number, payload: Partial<ServiceDto>) {
  return api.put<ServiceDto>(`/api/Services/${id}`, payload, { auth: true });
}

export async function deleteService(id: string | number) {
  return api.del<unknown>(`/api/Services/${id}`, { auth: true });
}

// Public services (approved only)
export async function listPublicServices() {
  return api.get<ServiceDto[]>(`/api/Services/public`);
}

// Complete a service (merchant only)
export async function completeService(id: number | string) {
  return api.post(`/api/Services/${id}/complete`, null, { auth: true });
}

// Admin endpoints for service approvals
export async function adminListPendingServices() {
  return api.get<{ success: boolean; items: any[] }>(`/api/Admin/services/pending`, { auth: true });
}

export async function adminApproveService(id: number | string) {
  return api.post(`/api/Admin/services/${id}/approve`, null, { auth: true });
}

export async function adminRejectService(id: number | string, reason?: string) {
  return api.post(`/api/Admin/services/${id}/reject`, reason ?? '', { auth: true });
}

// Dynamic technician types from backend
export type ServiceTypeItem = { id: string; ar: string; en: string };
export async function listServiceTypes() {
  return api.get<ServiceTypeItem[]>(`/api/Services/types`);
}
