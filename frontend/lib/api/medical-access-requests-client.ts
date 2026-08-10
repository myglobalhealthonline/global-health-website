"use client";

/**
 * Client-side fetchers for the doctor-portal "request access" flow — the
 * resolution path for MedicalAccessGrant when a doctor is denied a patient
 * read for a reason only the patient can fix (DOCTOR_NO_VALID_ACCESS_PATH).
 * Same relative-path + credentials-cookie pattern as
 * doctor-prescriptions-client.ts; the backend contract is
 * backend/src/routes/medical-access-requests.route.ts (unchanged endpoints,
 * `appointmentId` accepted as an alternative to `patientProfileId` on create).
 */

export type MedicalAccessRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "DENIED"
  | "EXPIRED"
  | "REVOKED";

export type MedicalAccessRequestRow = {
  id: string;
  patientProfileId: string;
  status: MedicalAccessRequestStatus;
  createdAt: string;
};

type Result<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string };

/** Submit a cross-country access request for the appointment currently
 *  being viewed. The backend resolves appointmentId → patientProfileId
 *  server-side (never trust a client-supplied profile id). */
export async function submitMedicalAccessRequest(
  appointmentId: string,
  reason: string,
): Promise<Result<{ requestId: string; status: "PENDING" }>> {
  const res = await fetch("/api/medical-access-requests", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ appointmentId, reason }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, message: json?.message ?? "Could not submit access request" };
  }
  return { ok: true, data: json.data };
}

/** List every access request this doctor has ever sent, most recent first —
 *  used to reflect PENDING/APPROVED/DENIED state for the patient currently
 *  being viewed without a dedicated per-patient endpoint. */
export async function fetchMyMedicalAccessRequests(): Promise<
  Result<{ requests: MedicalAccessRequestRow[] }>
> {
  const res = await fetch("/api/doctor/medical-access-requests");
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, message: json?.message ?? "Could not load access requests" };
  }
  return { ok: true, data: json.data };
}
