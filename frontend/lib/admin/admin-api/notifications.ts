import { adminRequest } from "./core";

// ── Admin notifications (bell) ─────────────────────────────────────────
export type AdminNotificationPayload = {
  appointmentId?: string;
  /** SupportThread id for SUPPORT_MESSAGE / SUPPORT_REPLY — those bells are
   *  doctor-scoped and carry no appointmentId. */
  threadId?: string;
  snippet?: string;
  byUserName?: string;
  byRole?: string;
  channel?: "clinic" | "doctor";
  title?: string;
  body?: string;
  href?: string;
};

export type AdminNotificationDto = {
  id: string;
  type: string;
  payload: AdminNotificationPayload | null;
  readAt: string | null;
  createdAt: string;
};

export async function fetchAdminNotifications(onlyUnread = false) {
  const qs = onlyUnread ? "?onlyUnread=1" : "";
  return adminRequest<{ items: AdminNotificationDto[]; unreadCount: number }>(
    `/api/admin/notifications${qs}`,
  );
}

export async function markAdminNotificationRead(id: string) {
  return adminRequest<{ updated: number }>(
    `/api/admin/notifications/${id}/read`,
    { method: "PATCH" },
  );
}

export async function markAllAdminNotificationsRead() {
  return adminRequest<{ updated: number }>(
    "/api/admin/notifications/read-all",
    { method: "POST" },
  );
}

// ── Admin message inbox (patient ↔ admin threads) ──────────────────────
export type AdminMessageThread = {
  appointmentId: string;
  orderNumber: string | null;
  patientName: string;
  patientEmail: string | null;
  consultationType: string;
  countryCode: string;
  lastMessage: {
    body: string;
    authorRole: "PATIENT" | "ADMIN";
    createdAt: string;
  } | null;
  unreadCount: number;
};

export async function fetchAdminMessageThreads() {
  return adminRequest<{ items: AdminMessageThread[] }>(
    "/api/admin/message-threads",
  );
}

/** Per-appointment doctor ↔ admin notes (NOT patient-visible). */
export type AdminInternalMessage = {
  id: string;
  authorRole: "DOCTOR" | "ADMIN";
  authorName: string;
  body: string;
  createdAt: string;
};

export async function fetchAdminInternalMessages(appointmentId: string) {
  return adminRequest<{ items: AdminInternalMessage[] }>(
    `/api/admin/appointments/${appointmentId}/internal-messages`,
  );
}

// ── Admin internal inbox (doctor ↔ admin threads) ──────────────────────
export type AdminInternalMessageThread = {
  appointmentId: string;
  orderNumber: string | null;
  patientName: string;
  patientEmail: string | null;
  doctorName: string | null;
  consultationType: string;
  countryCode: string;
  lastMessage: {
    body: string;
    authorRole: "DOCTOR" | "ADMIN";
    authorName: string;
    createdAt: string;
  } | null;
  unreadCount: number;
};

export async function fetchAdminInternalMessageThreads() {
  return adminRequest<{ items: AdminInternalMessageThread[] }>(
    "/api/admin/internal-message-threads",
  );
}
