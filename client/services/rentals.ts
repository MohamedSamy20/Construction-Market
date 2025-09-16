import { api } from '@/lib/api';

export type RentalDto = {
  id: number;
  productId: number;
  productName?: string | null;
  customerId: string;
  startDate: string;
  endDate: string;
  rentalDays: number;
  dailyRate: number;
  totalAmount: number;
  status: string;
  createdAt: string;
};

export type CreateRentalInput = {
  productId: number;
  customerId: string;
  startDate: string; // ISO date
  endDate: string;   // ISO date
  dailyRate: number;
  securityDeposit?: number;
  currency?: string;
  deliveryAddress?: string;
  requiresDelivery?: boolean;
  deliveryFee?: number;
  requiresPickup?: boolean;
  pickupFee?: number;
  specialInstructions?: string;
  usageNotes?: string;
};

export async function listMyRentals() {
  return api.get<RentalDto[]>(`/api/Rentals/mine`, { auth: true });
}

export async function createRental(input: CreateRentalInput) {
  return api.post<{ id: number }>(`/api/Rentals`, input, { auth: true });
}

export async function listPublicRentals() {
  return api.get<RentalDto[]>(`/api/Rentals/public`);
}

export async function getRentalById(id: number) {
  return api.get<RentalDto>(`/api/Rentals/${id}`);
}

export async function deleteRental(id: number) {
  return api.del<void>(`/api/Rentals/${id}`, { auth: true });
}

export type UpdateRentalInput = {
  startDate: string;
  endDate: string;
  dailyRate: number;
  securityDeposit?: number | null;
  currency?: string | null;
  specialInstructions?: string | null;
  usageNotes?: string | null;
  productId?: number | null;
  customerId?: string | null;
};

export async function updateRental(id: number, input: UpdateRentalInput) {
  return api.put<void>(`/api/Rentals/${id}`, input, { auth: true });
}

export async function adjustRentalDays(id: number, days: number) {
  return api.post(`/api/Rentals/${id}/adjust-days`, { days }, { auth: true });
}

export type SendMessageInput = { name?: string; phone?: string; message: string };
export async function sendRentalMessage(id: number, input: SendMessageInput) {
  return api.post(`/api/Rentals/${id}/message`, input);
}

export async function listRentalMessages(id: number) {
  return api.get(`/api/Rentals/${id}/messages`, { auth: true });
}

export async function replyRentalMessage(id: number, message: string, toEmail?: string) {
  return api.post(`/api/Rentals/${id}/reply`, { message, toEmail }, { auth: true });
}

// Admin endpoints
export async function getPendingRentals() {
  return api.get(`/api/Rentals/pending`, { auth: true });
}

export async function approveRental(id: number) {
  return api.post(`/api/Rentals/${id}/approve`, {}, { auth: true });
}

export async function declineRental(id: number) {
  return api.post(`/api/Rentals/${id}/decline`, {}, { auth: true });
}

// Vendor utilities for notifications
export async function getVendorMessageCount() {
  return api.get(`/api/Rentals/message-count`, { auth: true });
}

export async function getRecentVendorMessages() {
  return api.get(`/api/Rentals/messages/recent`, { auth: true });
}

// Customer utilities for notifications
export async function getCustomerMessageCount() {
  return api.get(`/api/Rentals/customer/message-count`, { auth: true });
}

export async function getCustomerRecentMessages() {
  return api.get(`/api/Rentals/customer/messages/recent`, { auth: true });
}
