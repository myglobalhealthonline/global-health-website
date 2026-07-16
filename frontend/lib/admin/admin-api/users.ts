import { cache } from "react";
import { adminRequest } from "./core";

// ── Admin users (patients + admin accounts) ─────────────────────────────

export type AdminUserRole = "PATIENT" | "ADMIN" | "DOCTOR";

export type AdminUserDto = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  dateOfBirth: string | null;
  role: AdminUserRole;
  isActive: boolean;
  /** When set, this user logs in as a clinician and sees /doctor/*
   *  scoped to this Doctor profile id. Set role=DOCTOR + assign
   *  doctorId via the admin user detail page. */
  doctorId: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type AdminUsersListPayload = {
  items: AdminUserDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type AdminUserDetailPayload = {
  user: AdminUserDto;
  stats: { appointmentCount: number };
};

export async function fetchAdminUsers(query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") params.set(key, value);
    }
  }
  const qs = params.toString();
  const path = qs ? `/api/admin/users?${qs}` : "/api/admin/users";
  return adminRequest<AdminUsersListPayload>(path);
}

export const fetchAdminUserById = cache(async (id: string) => {
  return adminRequest<AdminUserDetailPayload>(`/api/admin/users/${id}`);
});

/**
 * `email` is SUPER_ADMIN-only server-side (it is the login identifier and the
 * password-reset destination); a plain ADMIN sending it gets a 403. Changing
 * it also clears email verification and signs the user out of every device.
 */
export async function patchAdminUser(
  id: string,
  body: {
    isActive?: boolean;
    role?: AdminUserRole;
    doctorId?: string | null;
    email?: string;
    fullName?: string;
    phone?: string | null;
    dateOfBirth?: string | null;
  },
) {
  return adminRequest<{ user: AdminUserDto }>(`/api/admin/users/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function resetAdminUserPassword(id: string, password: string) {
  return adminRequest<{ reset: true }>(
    `/api/admin/users/${id}/reset-password`,
    { method: "POST", body: { password } },
  );
}
