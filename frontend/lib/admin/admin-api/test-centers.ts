import { adminRequest } from "./core";

export type MarkupMode = "FIXED" | "PERCENT";

export type AdminPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AdminExamTypeDto = {
  id: string;
  /** Our catalogue reference, e.g. "GH1-0001". Null on legacy/ad-hoc rows. */
  code: string | null;
  name: string;
  slug: string;
  category: string | null;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  offeringCount?: number;

  /** ── Public "Book a Test" content ──
   *  `isBookable` publishes the exam to the patient catalogue and is separate
   *  from `isActive`, which gates admin/referral usability. Price and available
   *  times are NOT here — they come from the centres offering the exam. */
  isBookable: boolean;
  summary: string | null;
  imagePath: string | null;
  galleryImagePaths: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  heroTitle: string | null;
  heroDescription: string | null;
  detailBody: string | null;
  preparationBody: string | null;
  ctaLabel: string | null;
  /** Wall-clock time a centre blocks for this exam. */
  durationMinutes: number;
  translations: AdminExamTypeTranslationDto[];

  createdAt: string;
  updatedAt: string;
};

/** Per-locale public copy. Every LocaleCode is valid — an ExamType is one
 *  global catalogue row, so no country gates which languages it may carry. */
export type AdminExamTypeTranslationDto = {
  locale: string;
  name: string;
  summary: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  heroTitle: string | null;
  heroDescription: string | null;
  detailBody: string | null;
  preparationBody: string | null;
  ctaLabel: string | null;
};

export type AdminTestCenterExamDto = {
  id: string;
  testCenterId: string;
  examTypeId: string;
  examTypeCode: string | null;
  examTypeName: string;
  examTypeCategory: string | null;
  /** The center's own code for this exam (e.g. Synlab "Código"). */
  supplierCode: string | null;
  /** Result turnaround the center quotes, in business days. */
  turnaroundDays: number | null;
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
  /** Offerings are paginated separately — a center can carry a whole supplier
   *  catalogue, so the center payload only reports the count. */
  examCount: number;
  createdAt: string;
  updatedAt: string;
};

// ─── Exam-type catalogue (global) ──────────────────────────────────────────

export async function fetchAdminExamTypes(query?: {
  page?: number;
  pageSize?: number;
  isActive?: string;
  category?: string;
  /** Exclude exam types already priced at this center (the "add exam" picker). */
  notOnCenterId?: string;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (query?.page) params.set("page", String(query.page));
  if (query?.pageSize) params.set("pageSize", String(query.pageSize));
  if (query?.isActive) params.set("isActive", query.isActive);
  if (query?.category) params.set("category", query.category);
  if (query?.notOnCenterId) params.set("notOnCenterId", query.notOnCenterId);
  if (query?.search) params.set("search", query.search);
  const qs = params.toString();
  return adminRequest<{ examTypes: AdminExamTypeDto[]; pagination: AdminPagination }>(
    qs ? `/api/admin/exam-types?${qs}` : "/api/admin/exam-types",
  );
}

export async function fetchAdminExamTypeCategories() {
  return adminRequest<{ categories: string[] }>("/api/admin/exam-types/categories");
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

export async function fetchAdminTestCenterExams(
  testCenterId: string,
  query?: { page?: number; pageSize?: number; isActive?: string; category?: string; search?: string },
) {
  const params = new URLSearchParams();
  if (query?.page) params.set("page", String(query.page));
  if (query?.pageSize) params.set("pageSize", String(query.pageSize));
  if (query?.isActive) params.set("isActive", query.isActive);
  if (query?.category) params.set("category", query.category);
  if (query?.search) params.set("search", query.search);
  const qs = params.toString();
  return adminRequest<{ exams: AdminTestCenterExamDto[]; pagination: AdminPagination }>(
    qs
      ? `/api/admin/test-centers/${testCenterId}/exams?${qs}`
      : `/api/admin/test-centers/${testCenterId}/exams`,
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

// ─── Availability ("Book a Test" booking inventory) ────────────────────────

/**
 * One recurring weekly opening-hours window. Same shape the doctor availability
 * API returns, deliberately: the admin week grid renders either owner from this.
 *
 * Minutes are center-LOCAL wall clock, resolved against the center's country
 * timezone — which is why the list endpoint returns `timeZone` alongside.
 */
export type AdminTestCenterAvailabilityDto = {
  id: string;
  /** 0 = Sunday … 6 = Saturday. Matches `Date#getDay()`. */
  weekday: number;
  startMinute: number;
  endMinute: number;
  slotDurationMinutes: number;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  isActive: boolean;
};

export type AdminTestCenterSlotDto = {
  id: string;
  startAt: string;
  endAt: string;
  status: "OPEN" | "HELD" | "BOOKED" | "BLOCKED";
  blockReason: string | null;
  isAdHoc: boolean;
};

export async function fetchAdminTestCenterAvailability(testCenterId: string) {
  return adminRequest<{
    availability: AdminTestCenterAvailabilityDto[];
    timeZone: string;
  }>(`/api/admin/test-centers/${testCenterId}/availability`);
}

export async function createAdminTestCenterAvailability(
  testCenterId: string,
  body: unknown,
) {
  return adminRequest<{ availability: AdminTestCenterAvailabilityDto }>(
    `/api/admin/test-centers/${testCenterId}/availability`,
    { method: "POST", body },
  );
}

export async function patchAdminTestCenterAvailability(
  testCenterId: string,
  availabilityId: string,
  body: unknown,
) {
  return adminRequest<{ availability: AdminTestCenterAvailabilityDto }>(
    `/api/admin/test-centers/${testCenterId}/availability/${availabilityId}`,
    { method: "PATCH", body },
  );
}

export async function deleteAdminTestCenterAvailability(
  testCenterId: string,
  availabilityId: string,
) {
  return adminRequest<{ deleted: boolean }>(
    `/api/admin/test-centers/${testCenterId}/availability/${availabilityId}`,
    { method: "DELETE" },
  );
}

/** Every slot in a UTC range, whatever its status — the week grid's read. */
export async function fetchAdminTestCenterSlots(
  testCenterId: string,
  fromUtc: string,
  toUtc: string,
) {
  const params = new URLSearchParams({ fromUtc, toUtc });
  return adminRequest<{ slots: AdminTestCenterSlotDto[] }>(
    `/api/admin/test-centers/${testCenterId}/time-slots?${params.toString()}`,
  );
}
