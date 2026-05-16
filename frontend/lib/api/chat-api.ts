import { apiRequest } from "./client";

export type ChatMessage = {
  id: string;
  authorRole: "PATIENT" | "ADMIN";
  body: string;
  createdAt: string;
  readByPatient: boolean;
  readByAdmin: boolean;
};

type ApiResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string; status?: number };

/**
 * Patient + admin chat fetchers. Goes through same-origin Next Route
 * Handlers (`/api/account/appointments/[id]/messages`,
 * `/api/admin/appointments/[id]/messages`) which forward the session
 * cookie server-to-server. The proxies are required because the auth
 * cookie can't be sent cross-origin on Railway subdomains.
 *
 * Polling lives on the component side — these are stateless.
 */
export async function fetchPatientMessages(
  appointmentId: string,
): Promise<ApiResult<{ items: ChatMessage[] }>> {
  return apiRequest<{ items: ChatMessage[] }>(
    `/api/account/appointments/${appointmentId}/messages`,
    { credentials: "include", sameOrigin: true },
  );
}

export async function postPatientMessage(
  appointmentId: string,
  body: string,
): Promise<ApiResult<{ items: ChatMessage[] }>> {
  return apiRequest<{ items: ChatMessage[] }>(
    `/api/account/appointments/${appointmentId}/messages`,
    {
      method: "POST",
      credentials: "include",
      body: { body },
      sameOrigin: true,
    },
  );
}

export async function fetchAdminMessages(
  appointmentId: string,
): Promise<ApiResult<{ items: ChatMessage[] }>> {
  return apiRequest<{ items: ChatMessage[] }>(
    `/api/admin/appointments/${appointmentId}/messages`,
    { credentials: "include", sameOrigin: true },
  );
}

export async function postAdminMessage(
  appointmentId: string,
  body: string,
): Promise<ApiResult<{ items: ChatMessage[] }>> {
  return apiRequest<{ items: ChatMessage[] }>(
    `/api/admin/appointments/${appointmentId}/messages`,
    {
      method: "POST",
      credentials: "include",
      body: { body },
      sameOrigin: true,
    },
  );
}
