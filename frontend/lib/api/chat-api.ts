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
 * Patient-side chat fetchers. Server-side reads use the auth proxy
 * `credentials: include` so the session cookie travels. Polling lives on
 * the component side — these are stateless.
 */
export async function fetchPatientMessages(
  appointmentId: string,
): Promise<ApiResult<{ items: ChatMessage[] }>> {
  return apiRequest<{ items: ChatMessage[] }>(
    `/api/account/appointments/${appointmentId}/messages`,
    { credentials: "include", sameOrigin: false },
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
      sameOrigin: false,
    },
  );
}

export async function fetchAdminMessages(
  appointmentId: string,
): Promise<ApiResult<{ items: ChatMessage[] }>> {
  return apiRequest<{ items: ChatMessage[] }>(
    `/api/admin/appointments/${appointmentId}/messages`,
    { credentials: "include", sameOrigin: false },
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
      sameOrigin: false,
    },
  );
}
