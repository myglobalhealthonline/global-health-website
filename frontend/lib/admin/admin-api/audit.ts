import { adminRequest } from "./core";

/** Audit-log row (append-only). */
export type AdminAuditLogRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  ipAddress: string | null;
  actorUserId: string | null;
  actorRole: string | null;
  actor: { fullName: string; email: string; role: string } | null;
  createdAt: string;
};

export async function fetchAdminAuditLog(query?: {
  page?: number;
  pageSize?: number;
  action?: string;
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  /** Inclusive date-range filter on createdAt, `YYYY-MM-DD`. */
  fromDate?: string;
  toDate?: string;
}) {
  const params = new URLSearchParams();
  if (query?.page) params.set("page", String(query.page));
  if (query?.pageSize) params.set("pageSize", String(query.pageSize));
  if (query?.action) params.set("action", query.action);
  if (query?.entityType) params.set("entityType", query.entityType);
  if (query?.entityId) params.set("entityId", query.entityId);
  if (query?.actorUserId) params.set("actorUserId", query.actorUserId);
  if (query?.fromDate) params.set("fromDate", query.fromDate);
  if (query?.toDate) params.set("toDate", query.toDate);
  const qs = params.toString();
  return adminRequest<{
    items: AdminAuditLogRow[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }>(qs ? `/api/admin/audit-log?${qs}` : "/api/admin/audit-log");
}
