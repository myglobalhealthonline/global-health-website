import { adminRequest } from "./core";

export type MarkupMode = "FIXED" | "PERCENT";

export type AdminExamTypeDto = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  offeringCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminTestCenterExamDto = {
  id: string;
  testCenterId: string;
  examTypeId: string;
  examTypeName: string;
  examTypeCategory: string | null;
  costCents: number;
  markupMode: MarkupMode;
  /** FIXED = cents added; PERCENT = basis points (100 = 1%). */
  markupValue: number;
  /** Server-computed patient price (cost + markup). */
  patientPriceCents: number;
  currencyCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminTestCenterDto = {
  id: string;
  countryId: string;
  name: string;
  slug: string;
  addressLine: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  isActive: boolean;
  sortOrder: number;
  country: { id: string; code: string; name: string };
  exams: AdminTestCenterExamDto[];
  createdAt: string;
  updatedAt: string;
};

// ─── Exam-type catalogue (global) ──────────────────────────────────────────

export async function fetchAdminExamTypes(query?: { isActive?: string; search?: string }) {
  const params = new URLSearchParams();
  if (query?.isActive) params.set("isActive", query.isActive);
  if (query?.search) params.set("search", query.search);
  const qs = params.toString();
  return adminRequest<{ examTypes: AdminExamTypeDto[] }>(
    qs ? `/api/admin/exam-types?${qs}` : "/api/admin/exam-types",
  );
}

export async function createAdminExamType(body: unknown) {
  return adminRequest<{ examType: AdminExamTypeDto }>("/api/admin/exam-types", {
    method: "POST",
    body,
  });
}

export async function updateAdminExamType(id: string, body: unknown) {
  return adminRequest<{ examType: AdminExamTypeDto }>(`/api/admin/exam-types/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteAdminExamType(id: string) {
  return adminRequest<{ examType: AdminExamTypeDto }>(`/api/admin/exam-types/${id}`, {
    method: "DELETE",
  });
}

// ─── Test centers (country-scoped) ─────────────────────────────────────────

export async function fetchAdminTestCenters(countryId: string) {
  const params = new URLSearchParams({ countryId });
  return adminRequest<{ testCenters: AdminTestCenterDto[] }>(
    `/api/admin/test-centers?${params.toString()}`,
  );
}

export async function fetchAdminTestCenterById(id: string) {
  return adminRequest<{ testCenter: AdminTestCenterDto }>(`/api/admin/test-centers/${id}`);
}

export async function createAdminTestCenter(body: unknown) {
  return adminRequest<{ testCenter: AdminTestCenterDto }>("/api/admin/test-centers", {
    method: "POST",
    body,
  });
}

export async function updateAdminTestCenter(id: string, body: unknown) {
  return adminRequest<{ testCenter: AdminTestCenterDto }>(`/api/admin/test-centers/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteAdminTestCenter(id: string) {
  return adminRequest<{ testCenter: AdminTestCenterDto }>(`/api/admin/test-centers/${id}`, {
    method: "DELETE",
  });
}

// ─── Exam offerings on a center ────────────────────────────────────────────

export async function fetchAdminTestCenterExams(testCenterId: string) {
  return adminRequest<{ exams: AdminTestCenterExamDto[] }>(
    `/api/admin/test-centers/${testCenterId}/exams`,
  );
}

export async function createAdminTestCenterExam(testCenterId: string, body: unknown) {
  return adminRequest<{ exam: AdminTestCenterExamDto }>(
    `/api/admin/test-centers/${testCenterId}/exams`,
    { method: "POST", body },
  );
}

export async function updateAdminTestCenterExam(
  testCenterId: string,
  offeringId: string,
  body: unknown,
) {
  return adminRequest<{ exam: AdminTestCenterExamDto }>(
    `/api/admin/test-centers/${testCenterId}/exams/${offeringId}`,
    { method: "PATCH", body },
  );
}

export async function deleteAdminTestCenterExam(testCenterId: string, offeringId: string) {
  return adminRequest<Record<string, never>>(
    `/api/admin/test-centers/${testCenterId}/exams/${offeringId}`,
    { method: "DELETE" },
  );
}
