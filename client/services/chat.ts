import { api } from '@/lib/api';

export type ConversationDto = {
  id: number;
  serviceRequestId: number;
  vendorId: string;
  technicianId: string;
};

export type MessageDto = {
  id: number;
  from: string; // senderId
  text: string;
  createdAt: string;
};

export async function createConversation(serviceRequestId: number, technicianId: string) {
  return api.post<{ id: number }>(`/api/Chat/conversations`, { serviceRequestId, technicianId }, { auth: true });
}

export async function getConversation(id: number) {
  return api.get<ConversationDto>(`/api/Chat/conversations/${id}`, { auth: true });
}

export async function getConversationByKeys(serviceRequestId: number, technicianId: string) {
  return api.get<{ id: number }>(`/api/Chat/conversations/by?serviceRequestId=${serviceRequestId}&technicianId=${encodeURIComponent(technicianId)}`, { auth: true });
}

export async function listMessages(conversationId: number) {
  return api.get<MessageDto[]>(`/api/Chat/conversations/${conversationId}/messages`, { auth: true });
}

export async function sendMessage(conversationId: number, text: string) {
  return api.post<{ id: number }>(`/api/Chat/conversations/${conversationId}/messages`, { text }, { auth: true });
}

export async function getMyConversations() {
  return api.get<Array<{ id: number; serviceRequestId: number; vendorId: string; technicianId: string; updatedAt?: string; createdAt: string }>>(`/api/Chat/mine`, { auth: true });
}

export async function getConversationByService(serviceRequestId: number) {
  return api.get<{ id: number; serviceRequestId: number }>(`/api/Chat/by-service/${serviceRequestId}`, { auth: true });
}
