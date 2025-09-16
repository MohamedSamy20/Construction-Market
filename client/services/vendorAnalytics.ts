import { api } from '@/lib/api';

export type PerformanceSummary = {
  salesThisMonth: number;
  salesLastMonth: number;
  ordersThisMonth: number;
  avgOrderValue: number;
  ordersByStatus: {
    pending: number;
    shipped: number;
    delivered: number;
    processing: number;
    cancelled: number;
  };
};

export type PerformanceSeriesPoint = { key: string; sales: number; orders: number };

export type CustomersSummary = {
  totalCustomers: number;
  newCustomersThisMonth: number;
  returningCustomersThisMonth: number;
  repeatRate: number; // 0..1
  avgOrdersPerCustomer: number;
};

export type CustomersSeriesPoint = { key: string; new: number; returning: number; total: number };

export async function getPerformanceSummary() {
  return api.get<PerformanceSummary>(`/api/VendorAnalytics/performance/summary`, { auth: true });
}

export async function getPerformanceSeries(months = 6) {
  return api.get<PerformanceSeriesPoint[]>(`/api/VendorAnalytics/performance/series?months=${months}`, { auth: true });
}

export async function getCustomersSummary() {
  return api.get<CustomersSummary>(`/api/VendorAnalytics/customers/summary`, { auth: true });
}

export async function getCustomersSeries(months = 6) {
  return api.get<CustomersSeriesPoint[]>(`/api/VendorAnalytics/customers/series?months=${months}`, { auth: true });
}
