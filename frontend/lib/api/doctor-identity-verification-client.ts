"use client";

export type VerificationStatus = "NOT_VERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";

export type IdentityVerificationEventSummary = {
  id: string;
  referenceId: string;
  status: VerificationStatus;
  method: string;
  /** Similarity 0-100, or null when no automated opinion could be formed. */
  faceMatchScore: number | null;
  faceMatchProvider: string | null;
  reviewedAt: string | null;
  reviewedByRole: string | null;
  reviewNotes: string | null;
  createdAt: string;
};

export type DoctorIdentityVerification = {
  /**
   * Whether a prescription may actually cite this patient's identity — i.e. a
   * reviewed face-match cycle exists. Distinct from `status`, which the admin
   * ID-document screen can set to VERIFIED after checking a document without
   * ever looking at a face. Always key prescription-facing copy off this.
   */
  verifiedForPrescription: boolean;
  status: VerificationStatus;
  verifiedAt: string | null;
  hasIdDocument: boolean;
  /**
   * How to render the ID document. "image" only for known image extensions;
   * anything else (PDF, unknown, legacy) is "embed", which can display far
   * more than an <img> can. Optional so a stale backend that omits it falls
   * through to the embed rather than to a broken image.
   */
  idDocumentRenderAs?: "image" | "embed";
  hasSelfie: boolean;
  selfieUploadedAt: string | null;
  requestedAt: string | null;
  requestedByDoctorId: string | null;
  automatedCheckAvailable: boolean;
  latestEvent: IdentityVerificationEventSummary | null;
  awaitingReview: boolean;
};

type Result<T> = { ok: true; data: T; message?: string } | { ok: false; message: string };

function base(email: string): string {
  return `/api/doctor/patients/${encodeURIComponent(email)}/identity-verification`;
}

async function unwrap<T>(res: Response, fallback: string): Promise<Result<T>> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, message: json?.message ?? fallback };
  }
  return { ok: true, data: json.data as T, message: json.message };
}

export async function fetchIdentityVerification(
  email: string,
): Promise<Result<{ identityVerification: DoctorIdentityVerification }>> {
  const res = await fetch(base(email), { cache: "no-store" });
  return unwrap(res, "Could not load identity verification");
}

/**
 * URL for the ID photo or selfie. Not fetched here on purpose — it goes
 * straight into an <img src>, so the browser streams it and it is never held
 * in JS memory. Every hit is logged server-side as a medical-record access.
 */
export function identityImageUrl(email: string, type: "id" | "selfie"): string {
  return `${base(email)}/image?type=${type}`;
}

export async function requestIdentityVerification(
  email: string,
): Promise<Result<{ requestedAt: string; sent: string[]; failed: string[] }>> {
  const res = await fetch(`${base(email)}/request`, { method: "POST" });
  return unwrap(res, "Could not request verification");
}

export async function reviewIdentityVerification(
  email: string,
  input: { eventId: string; status: "VERIFIED" | "REJECTED"; reviewNotes?: string | null },
): Promise<Result<{ status: VerificationStatus; referenceId: string; reviewedAt: string }>> {
  const res = await fetch(`${base(email)}/review`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return unwrap(res, "Could not record review");
}
