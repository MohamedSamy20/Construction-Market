import { api } from '@/lib/api';

export type OfferDto = {
  id: number;
  technicianId: string;
  targetType: 'service' | 'project';
  serviceId?: number;
  projectId?: number;
  price: number;
  days: number;
  message?: string;
  status: string;
  createdAt?: string;
};

export async function createOffer(payload: { targetType: 'service' | 'project'; serviceId?: number; projectId?: number; price: number; days: number; message?: string; }) {
  // Backend expects PascalCase or exact property names from OffersController. It uses OfferInput with same casing.
  const body = {
    TargetType: payload.targetType,
    ServiceId: payload.serviceId,
    ProjectId: payload.projectId,
    Price: payload.price,
    Days: payload.days,
    Message: payload.message ?? null,
  } as any;
  return api.post<OfferDto>('/api/Offers', body, { auth: true });
}

export async function updateOffer(id: number, payload: { targetType: 'service' | 'project'; serviceId?: number; projectId?: number; price: number; days: number; message?: string; }) {
  const body = {
    TargetType: payload.targetType,
    ServiceId: payload.serviceId,
    ProjectId: payload.projectId,
    Price: payload.price,
    Days: payload.days,
    Message: payload.message ?? null,
  } as any;
  return api.put<OfferDto>(`/api/Offers/${id}`, body, { auth: true });
}

export async function deleteOffer(id: number) {
  return api.del<void>(`/api/Offers/${id}`, { auth: true });
}

export async function getTechnicianOffers(technicianId: string) {
  return api.get<OfferDto[]>(`/api/Technicians/${technicianId}/offers`, { auth: true });
}

export async function listOffersForService(serviceId: number) {
  return api.get<OfferDto[]>(`/api/Offers/service/${serviceId}`, { auth: true });
}

export async function listOffersForProject(projectId: number) {
  return api.get<OfferDto[]>(`/api/Offers/project/${projectId}`, { auth: true });
}

export async function updateOfferStatus(id: number, status: 'accepted' | 'rejected' | 'pending') {
  return api.post<OfferDto>(`/api/Offers/${id}/status`, { Status: status }, { auth: true });
}
