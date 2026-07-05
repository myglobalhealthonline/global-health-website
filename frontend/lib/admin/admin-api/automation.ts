import { adminRequest } from "./core";

export type AdminAutomationOrderRow = {
  orderId: string;
  orderNumber: string;
  email: string | null;
  fullName: string | null;
  paymentStatus: string | null;
  orderStatus: string | null;
  totalRuns: number;
  failedRuns: number;
  lastRunAt: string | null;
};

export type AdminAutomationCatalogItem = {
  key: string;
  name: string;
  flow: string;
  description: string;
  channels: string[];
  maxStages: number;
};

export type AdminAutomationRunRow = {
  id: string;
  automationKey: string;
  automationName: string;
  flow: string;
  orderId: string | null;
  orderNumber: string | null;
  orderEmail: string | null;
  orderPaymentStatus: string | null;
  orderStatus: string | null;
  appointmentId: string | null;
  status: string;
  channel: string | null;
  recipient: string | null;
  summary: string | null;
  error: string | null;
  scheduledFor: string | null;
  executedAt: string | null;
  createdAt: string;
};

export async function fetchAdminAutomationCatalog() {
  return adminRequest<{ items: AdminAutomationCatalogItem[] }>("/api/admin/automation/catalog");
}

export async function fetchAdminAutomationOrders(query?: { page?: number; pageSize?: number }) {
  const params = new URLSearchParams();
  if (query?.page) params.set("page", String(query.page));
  if (query?.pageSize) params.set("pageSize", String(query.pageSize));
  const qs = params.toString();
  return adminRequest<{
    items: AdminAutomationOrderRow[];
    total: number;
    page: number;
    pageSize: number;
  }>(qs ? `/api/admin/automation/orders?${qs}` : "/api/admin/automation/orders");
}

export async function fetchAdminAutomationRuns(query?: {
  page?: number;
  pageSize?: number;
  automationKey?: string;
  orderId?: string;
}) {
  const params = new URLSearchParams();
  if (query?.page) params.set("page", String(query.page));
  if (query?.pageSize) params.set("pageSize", String(query.pageSize));
  if (query?.automationKey) params.set("automationKey", query.automationKey);
  if (query?.orderId) params.set("orderId", query.orderId);
  const qs = params.toString();
  return adminRequest<{
    items: AdminAutomationRunRow[];
    total: number;
    page: number;
    pageSize: number;
  }>(qs ? `/api/admin/automation/runs?${qs}` : "/api/admin/automation/runs");
}
