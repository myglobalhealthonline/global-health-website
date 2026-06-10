export type VerificationStatus = "NOT_VERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";

export type InsuranceData = {
  insuranceProviderName: string | null;
  insurancePolicyNumber: string | null;
  hasDocument: boolean;
  insuranceDocumentStatus: VerificationStatus;
};

export type VerificationData = {
  idVerificationStatus: VerificationStatus;
  idDocumentType: string | null;
  idVerificationAdminNotes: string | null;
  idVerificationReviewedAt: string | null;
  phoneVerificationStatus: VerificationStatus;
  phoneVerifiedAt: string | null;
  emailVerificationStatus: VerificationStatus;
  emailVerifiedAt: string | null;
  insuranceDocumentStatus: VerificationStatus;
};

export type NationalityDoc = {
  id: string;
  slotNumber: 1 | 2;
  nationalityCountry: string;
  documentType: string;
  documentNumber: string | null;
  expiryDate: string | null;
  frontFileKey: string | null;
  backFileKey: string | null;
  verificationStatus: VerificationStatus;
  adminNotes: string | null;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

const BASE = "/api/account/profile";

async function get<T>(path: string): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, { credentials: "include" });
    const json = (await res.json()) as { ok?: boolean; data?: T; message?: string };
    if (!json.ok) return { ok: false, message: json.message ?? "Request failed" };
    return { ok: true, data: json.data as T };
  } catch {
    return { ok: false, message: "Network error" };
  }
}

async function mutateJson<T>(
  path: string,
  method: "PATCH" | "PUT" | "DELETE",
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method,
      credentials: "include",
      headers: body !== undefined ? { "content-type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json()) as { ok?: boolean; data?: T; message?: string };
    if (!json.ok) return { ok: false, message: json.message ?? "Request failed" };
    return { ok: true, data: json.data as T };
  } catch {
    return { ok: false, message: "Network error" };
  }
}

async function postForm<T>(path: string, form: FormData): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, { method: "POST", credentials: "include", body: form });
    const json = (await res.json()) as { ok?: boolean; data?: T; message?: string };
    if (!json.ok) return { ok: false, message: json.message ?? "Upload failed" };
    return { ok: true, data: json.data as T };
  } catch {
    return { ok: false, message: "Upload failed" };
  }
}

export function fetchInsurance() {
  return get<{ insurance: InsuranceData }>(`${BASE}/insurance`);
}

export function patchInsurance(data: {
  insuranceProviderName?: string | null;
  insurancePolicyNumber?: string | null;
}) {
  return mutateJson<Record<string, never>>(`${BASE}/insurance`, "PATCH", data);
}

export function uploadInsuranceDocument(file: File) {
  const form = new FormData();
  form.append("file", file);
  return postForm<{ uploaded: boolean }>(`${BASE}/insurance/document`, form);
}

export function fetchVerification() {
  return get<{ verification: VerificationData }>(`${BASE}/verification`);
}

export function uploadIdDocument(file: File, side: "front" | "back", documentType: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("side", side);
  form.append("documentType", documentType);
  return postForm<{ uploaded: boolean; side: string }>(`${BASE}/id-document`, form);
}

export function fetchNationality() {
  return get<{ nationalityDocuments: NationalityDoc[] }>(`${BASE}/nationality`);
}

export function upsertNationality(
  slot: 1 | 2,
  data: {
    nationalityCountry: string;
    documentType: string;
    documentNumber?: string | null;
    expiryDate?: string | null;
  },
) {
  return mutateJson<{ nationalityDocument: NationalityDoc }>(
    `${BASE}/nationality/${slot}`,
    "PUT",
    data,
  );
}

export function deleteNationality(slot: 1 | 2) {
  return mutateJson<Record<string, never>>(`${BASE}/nationality/${slot}`, "DELETE");
}

export function uploadNationalityDocument(slot: 1 | 2, file: File, side: "front" | "back") {
  const form = new FormData();
  form.append("file", file);
  form.append("side", side);
  return postForm<{ uploaded: boolean; side: string; slot: number }>(
    `${BASE}/nationality/${slot}/upload`,
    form,
  );
}
