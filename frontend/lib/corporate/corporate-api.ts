import "server-only";
import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";

/* ─────────────────────────────────────────────────────────────
   Corporate portal API — typed wrappers over
   backend/src/routes/corporate.route.ts (role CORPORATE_ADMIN).
   Same envelope + cookie-forward pattern as admin-api/core.ts,
   minus the admin Bearer-token fallback (corporate has none).
   ───────────────────────────────────────────────────────────── */

const DEFAULT_API_BASE_URL = "http://localhost:4000";

function getApiBaseUrl() {
  return getBackendOrigin() || DEFAULT_API_BASE_URL;
}

export type CorporateApiResponse<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string; status?: number };

type ErrorDetails = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
};

function formatErrorMessage(message: string | undefined, details: unknown) {
  const fallback = message ?? "Request failed";
  if (!details || typeof details !== "object") return fallback;
  const typed = details as ErrorDetails;
  const formError = typed.formErrors?.find(Boolean);
  if (formError) return `${fallback}: ${formError}`;
  const fieldEntry = Object.entries(typed.fieldErrors ?? {}).find(
    ([, errors]) => Array.isArray(errors) && errors.length > 0,
  );
  if (!fieldEntry) return fallback;
  const [field, errors] = fieldEntry;
  return `${fallback}: ${field} ${errors![0]}`;
}

const VALID_COOKIE_NAME = /^[!#$%&'*+\-.0-9A-Z^_`a-z|~]+$/;

export async function corporateRequest<T>(
  path: string,
  init?: { method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; body?: unknown },
): Promise<CorporateApiResponse<T>> {
  try {
    const cookieHeader = (await cookies())
      .getAll()
      .filter((entry) => VALID_COOKIE_NAME.test(entry.name))
      .map((entry) => `${entry.name}=${entry.value}`)
      .join("; ");

    const headers: Record<string, string> = {};
    if (init?.body !== undefined) headers["Content-Type"] = "application/json";
    if (cookieHeader) headers.cookie = cookieHeader;

    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: init?.method ?? "GET",
      headers,
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
    const json = (await response.json()) as {
      ok?: boolean;
      message?: string;
      data?: T;
      details?: unknown;
    };
    if (!response.ok || !json.ok) {
      return {
        ok: false,
        message: formatErrorMessage(json.message, json.details),
        status: response.status,
      };
    }
    return { ok: true, data: json.data as T, message: json.message };
  } catch {
    return { ok: false, message: "Backend is unavailable" };
  }
}

// ── DTOs ─────────────────────────────────────────────────────────────────────

export type CorporateBillingSummary = {
  employeeCount: number;
  pricePerEmployeeCents: number;
  totalAnnualCents: number;
  /** Contract currency (the plan row). */
  currencyCode: string;
  /** Currency a fiscal document for this company is minted in (its country). */
  documentCurrencyCode: string;
};

export type CorporateCompanyDto = {
  id: string;
  name: string;
  registrationNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  countryCode: string;
  billingEmail: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  status: "ACTIVE" | "SUSPENDED" | "EXPIRED";
  contractStartAt: string;
  contractEndAt: string | null;
  plan: {
    name: string;
    slug: string;
    annualPricePerEmployeeCents: number;
    currencyCode: string;
    maxBeneficiariesPerEmployee: number;
  };
  billing: CorporateBillingSummary;
};

export type CorporateOverviewDto = {
  companyName: string;
  companyStatus: "ACTIVE" | "SUSPENDED" | "EXPIRED";
  planName: string;
  employeeTotal: number;
  statusCounts: Record<string, number>;
  openRequests: number;
  billing: CorporateBillingSummary;
};

export type CorporatePortalEmployeeDto = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  dateOfBirth: string | null;
  employeeCode: string | null;
  department: string | null;
  jobTitle: string | null;
  status: string;
  hasAccount: boolean;
  preAssessmentBooked: boolean;
  beneficiaryCount: number;
  createdAt: string;
};

export type CorporatePortalRequestDto = {
  id: string;
  employeeId: string;
  employeeName?: string;
  type: "ILLNESS_BENEFIT" | "FIT_FOR_WORK";
  reason: string | null;
  status: string;
  hasAppointment: boolean;
  expiresAt: string | null;
  createdAt: string;
};

export type CorporateEmployeeDetailDto = CorporatePortalEmployeeDto & {
  preAssessment: { booked: boolean; completed: boolean; scheduledAt: string | null };
  invites: {
    createdAt: string;
    emailSentAt: string | null;
    whatsappSentAt: string | null;
    usedAt: string | null;
    lastSendError: string | null;
  }[];
  requests: CorporatePortalRequestDto[];
};

export type CorporateEmployeeInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  dateOfBirth?: string;
  employeeCode?: string;
  department?: string;
  jobTitle?: string;
};

// ── Wrappers ─────────────────────────────────────────────────────────────────

export async function fetchCorporateOverview() {
  return corporateRequest<CorporateOverviewDto>("/api/corporate/overview");
}

export async function fetchCorporateCompany() {
  return corporateRequest<CorporateCompanyDto>("/api/corporate/company");
}

export async function patchCorporateCompany(body: unknown) {
  return corporateRequest<{ id: string }>("/api/corporate/company", {
    method: "PATCH",
    body,
  });
}

export async function fetchCorporateEmployees(query?: { status?: string; query?: string }) {
  const params = new URLSearchParams();
  if (query?.status) params.set("status", query.status);
  if (query?.query) params.set("query", query.query);
  const qs = params.toString();
  return corporateRequest<{
    employees: CorporatePortalEmployeeDto[];
    statusCounts: Record<string, number>;
  }>(`/api/corporate/employees${qs ? `?${qs}` : ""}`);
}

export async function fetchCorporateEmployeeById(id: string) {
  return corporateRequest<CorporateEmployeeDetailDto>(`/api/corporate/employees/${id}`);
}

export async function postCorporateEmployee(body: CorporateEmployeeInput) {
  return corporateRequest<{ id: string; status: string }>("/api/corporate/employees", {
    method: "POST",
    body,
  });
}

export async function postCorporateEmployeesBulk(employees: CorporateEmployeeInput[]) {
  return corporateRequest<{
    results: { email: string; ok: boolean; status?: string; message?: string }[];
  }>("/api/corporate/employees/bulk", { method: "POST", body: { employees } });
}

export async function patchCorporateEmployee(
  id: string,
  body: { action?: "SUSPEND" | "REACTIVATE" | "REMOVE"; details?: Partial<CorporateEmployeeInput> },
) {
  return corporateRequest<{ id: string }>(`/api/corporate/employees/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function resendCorporateEmployeeInvite(id: string) {
  return corporateRequest<{ id: string; status: string }>(
    `/api/corporate/employees/${id}/resend-invite`,
    { method: "POST" },
  );
}

export async function fetchCorporatePortalRequests(status?: string) {
  return corporateRequest<{ requests: CorporatePortalRequestDto[] }>(
    `/api/corporate/requests${status ? `?status=${encodeURIComponent(status)}` : ""}`,
  );
}

export async function postCorporatePortalRequest(body: {
  employeeId: string;
  type: "ILLNESS_BENEFIT" | "FIT_FOR_WORK";
  reason?: string;
}) {
  return corporateRequest<{ requestId: string; status: string }>("/api/corporate/requests", {
    method: "POST",
    body,
  });
}

export async function cancelCorporatePortalRequest(id: string) {
  return corporateRequest<{ id: string }>(`/api/corporate/requests/${id}`, {
    method: "PATCH",
    body: { action: "CANCEL" },
  });
}

/* ─────────────────────────────────────────────────────────────
   Corporate service resolution for the public booking wizard.

   `/api/services/:slug` answers differently for a signed-in corporate
   member than for everyone else, so it CANNOT go through the cached
   `fetchServiceDetail` path (Next data cache + tags — an auth-dependent
   entry there would serve one member's response to the next visitor).
   This is the separate per-request, cookie-forwarded, no-store path:
   the backend runs the eligibility gate and 404s everyone else.
   ───────────────────────────────────────────────────────────── */

/** Corporate consultation resolved for the booking wizard, shaped like the
 *  public country-services cards it gets merged into. */
export type CorporateBookableService = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  kind: "GENERAL" | "SPECIALIST" | "PRESCRIPTION" | "HEALTH_TEST" | "HOME_DELIVERY";
  durationMinutes: number | null;
  basePriceCents: number | null;
  currencyCode: string | null;
  assignedDoctorIds: string[];
  insuranceOptions: never[];
};

export async function fetchCorporateBookableService(
  countryCode: string,
  slug: string,
  locale?: string,
): Promise<CorporateBookableService | null> {
  const params = new URLSearchParams({ countryCode });
  if (locale) params.set("locale", locale.toUpperCase());
  const res = await corporateRequest<{ service: Record<string, unknown> }>(
    `/api/services/${encodeURIComponent(slug)}?${params.toString()}`,
  );
  if (!res.ok) return null;
  const r = res.data?.service;
  if (!r || typeof r !== "object") return null;
  if (typeof r.id !== "string" || typeof r.slug !== "string" || typeof r.name !== "string") {
    return null;
  }
  // PUBLIC rows already come from the cached list — only corporate rows are
  // this path's business, so anything else is treated as "not found" and the
  // wizard falls back to its normal unavailable notice.
  if (r.visibility !== "CORPORATE_ONLY" && r.visibility !== "CORPORATE_REQUEST_ONLY") {
    return null;
  }
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    summary: typeof r.summary === "string" ? r.summary : "",
    kind: r.kind === "SPECIALIST" ? "SPECIALIST" : "GENERAL",
    durationMinutes: typeof r.durationMinutes === "number" ? r.durationMinutes : null,
    basePriceCents: typeof r.basePriceCents === "number" ? r.basePriceCents : null,
    currencyCode: typeof r.currencyCode === "string" ? r.currencyCode : null,
    assignedDoctorIds: Array.isArray(r.assignedDoctorIds)
      ? r.assignedDoctorIds.filter((id): id is string => typeof id === "string")
      : [],
    // Corporate consultations are never sold through an insurer.
    insuranceOptions: [],
  };
}

/* ─────────────────────────────────────────────────────────────
   Patient-portal membership — /api/me/corporate (role PATIENT).
   Same cookie-forward transport, member-scoped on the backend.
   ───────────────────────────────────────────────────────────── */

export type CorporateCardDto = {
  cardNumber: string;
  memberType: "EMPLOYEE" | "BENEFICIARY";
  status: "ACTIVE" | "SUSPENDED" | "EXPIRED";
  validFrom: string;
  validUntil: string;
};

export type MeCorporateBeneficiaryDto = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  relationship: string;
  dateOfBirth: string | null;
  status: string;
  hasAccount: boolean;
  createdAt: string;
};

export type MeCorporateBenefitsDto = {
  discounts: { label: string; discountPercent: number }[];
  includedServices: {
    slug: string;
    name: string;
    role: "INCLUDED" | "PRE_ASSESSMENT" | "ILLNESS_BENEFIT" | "FIT_FOR_WORK";
    visibility: "PUBLIC" | "CORPORATE_ONLY" | "CORPORATE_REQUEST_ONLY" | "ADMIN_ONLY";
    bookPath: string | null;
  }[];
};

export type MeCorporateMembershipDto = {
  memberType: "EMPLOYEE" | "BENEFICIARY";
  companyName: string;
  companyLive: boolean;
  /** Company's market — the country segment of every portal booking link.
   *  Optional so the portal survives a frontend deploy that lands before the
   *  backend one. */
  countryCode?: string;
  locale?: string;
  planName: string;
  benefits?: MeCorporateBenefitsDto;
  maxBeneficiaries?: number;
  status: string;
  onboarding?: {
    profileComplete: boolean;
    preAssessment: {
      required: boolean;
      booked: boolean;
      completed: boolean;
      bookPath: string | null;
    };
  };
  /** The member's own membership-row profile (prefills the completion form). */
  profile?: {
    phone: string | null;
    dateOfBirth: string | null;
    addressLine1: string | null;
    city: string | null;
    postalCode: string | null;
  };
  card: CorporateCardDto | null;
  beneficiaries?: MeCorporateBeneficiaryDto[];
  openRequests?: {
    id: string;
    type: "ILLNESS_BENEFIT" | "FIT_FOR_WORK";
    label: string;
    status: string;
    bookPath: string | null;
    createdAt: string;
  }[];
} | null;

export async function fetchMeCorporate() {
  return corporateRequest<MeCorporateMembershipDto>("/api/me/corporate");
}

export async function postMeCorporateBeneficiary(body: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  relationship: string;
  addressLine1?: string;
  city?: string;
  postalCode?: string;
  dateOfBirth?: string;
  notes?: string;
}) {
  return corporateRequest<{ id: string; status: string }>("/api/me/corporate/beneficiaries", {
    method: "POST",
    body,
  });
}

export async function patchMeCorporateProfile(body: {
  phone?: string;
  dateOfBirth?: string;
  addressLine1?: string;
  city?: string;
  postalCode?: string;
}) {
  return corporateRequest<{ status: string }>("/api/me/corporate/profile", {
    method: "PATCH",
    body,
  });
}

export async function removeMeCorporateBeneficiary(id: string) {
  return corporateRequest<{ id: string }>(`/api/me/corporate/beneficiaries/${id}`, {
    method: "PATCH",
    body: { action: "REMOVE" },
  });
}

export async function resendMeCorporateBeneficiaryInvite(id: string) {
  return corporateRequest<{ id: string; status: string }>(
    `/api/me/corporate/beneficiaries/${id}/resend-invite`,
    { method: "POST" },
  );
}
