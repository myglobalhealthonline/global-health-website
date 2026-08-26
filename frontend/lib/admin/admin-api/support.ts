import { adminRequest } from "./core";
import type {
  AdminSupportThreadSummary,
  AdminSupportThreadPayload,
} from "@/lib/api/support-chat-api";

/**
 * Doctor ↔ support (admin team) chat, admin side. Global admins only — the
 * backend gate rejects LOCAL_ADMIN, since a country-scoped admin must not read
 * every doctor's support thread.
 */

export type { AdminSupportThreadSummary, AdminSupportThreadPayload };

/** Inbox roll-up: one row per doctor thread, with this admin's unread count. */
export async function fetchAdminSupportThreads() {
  return adminRequest<{
    items: AdminSupportThreadSummary[];
    /** The viewing admin's user id, so their own bubbles can read "Me". */
    viewerUserId: string | null;
  }>("/api/admin/support/threads");
}

/** One row of the "start a conversation" doctor picker. */
export type AdminSupportDoctorOption = {
  doctorId: string;
  fullName: string;
  countryCode: string | null;
  /** Non-null when this doctor already has a thread — the UI reuses it. */
  threadId: string | null;
};

/**
 * Every active doctor, for the admin-initiated conversation picker. Separate
 * from `fetchAdminDoctors`: this list must include doctors who have never
 * written in (so have no thread row), and needs three fields, not the full
 * AdminDoctorDto.
 */
export async function fetchAdminSupportDoctors() {
  return adminRequest<{ items: AdminSupportDoctorOption[] }>(
    "/api/admin/support/doctors",
  );
}
