import { cache } from "react";
import { adminRequest } from "./core";

/* ─────────────────────────────────────────────────────────────
   Corporate Plan admin API — typed wrappers over
   backend/src/routes/admin-corporate.route.ts
   ───────────────────────────────────────────────────────────── */

export type CorporateServiceKind =
  | "GENERAL"
  | "SPECIALIST"
  | "PRESCRIPTION"
  | "HEALTH_TEST"
  | "HOME_DELIVERY";

export type CorporateCompanyStatus = "ACTIVE" | "SUSPENDED" | "EXPIRED";

/** Full lifecycle for employees + beneficiaries (subset applies to each). */
export type CorporateMemberStatus =
  | "DRAFT"
  | "INVITED"
  | "INVITE_SENT"
  | "INVITE_FAILED"
  | "REGISTERED"
  | "PROFILE_INCOMPLETE"
  | "PROFILE_COMPLETE"
  | "PREASSESSMENT_PENDING"
  | "PREASSESSMENT_BOOKED"
  | "ACTIVE"
  | "SUSPENDED"
  | "REMOVED";

/** CorporateCoverage enum — how a rule prices the line it matches. There is no
 *  EXCLUDED member: no rule = full price. */
export type CorporateCoverage = "INCLUDED" | "COPAY" | "DISCOUNT";

export type CorporateBenefitRuleDto = {
  id: string;
  serviceKind: CorporateServiceKind | null;
  serviceId: string | null;
  coverage: CorporateCoverage;
  discountPercent: number;
  /** COPAY only — what the member pays, in the plan currency's minor units. */
  copayCents: number | null;
  /** Covered uses per contract year; null = unlimited. */
  annualLimit: number | null;
  /** Rules sharing a group share one counter (physio OR chiro, 5 total). */
  limitGroup: string | null;
  appliesToBeneficiaries: boolean;
  isActive: boolean;
};

export type CorporatePlanServiceRole =
  | "INCLUDED"
  | "PRE_ASSESSMENT"
  | "ILLNESS_BENEFIT"
  | "FIT_FOR_WORK";

/** A free, portal-only consultation a plan includes. Not a catalogue
 *  service — it has no slug and no price, and books against `doctor`'s
 *  ordinary availability. */
export type CorporatePlanServiceDto = {
  id: string;
  name: string;
  description: string | null;
  /** Null = every market the plan serves. */
  countryCode: string | null;
  durationMinutes: number;
  role: CorporatePlanServiceRole;
  isActive: boolean;
  sortOrder: number;
  doctorId: string;
  doctor: { id: string; fullName: string };
};

export type CorporateDoctorOptionDto = {
  id: string;
  fullName: string;
  country: { code: string; name: string };
  /** Extra market listings (DoctorCountry). Assignable alongside `country`. */
  additionalCountries: { country: { code: string } }[];
};

/** Every market a doctor may be pinned to, primary first, e.g. "PT, IE". */
export function corporateDoctorMarkets(opt: CorporateDoctorOptionDto): string {
  return [
    opt.country.code,
    ...opt.additionalCountries.map((row) => row.country.code),
  ]
    .map((code) => code.toUpperCase())
    .join(", ");
}

export type CorporateCountryOptionDto = {
  code: string;
  name: string;
};

export type CorporatePlanDto = {
  id: string;
  slug: string;
  name: string;
  annualPricePerEmployeeCents: number;
  currencyCode: string;
  maxBeneficiariesPerEmployee: number;
  isActive: boolean;
  /** Matrix grouping ("Basic" / "Standard" / "Premium") + column order. */
  tier: string | null;
  sortOrder: number;
  /** Footnote for a price that is not final. */
  priceNote: string | null;
  benefitRules: CorporateBenefitRuleDto[];
  includedServices: CorporatePlanServiceDto[];
  _count: { companies: number };
};

export type CorporateCompanyRowDto = {
  id: string;
  name: string;
  countryCode: string;
  status: CorporateCompanyStatus;
  planName: string;
  employeeCount: number;
  beneficiaryCount: number;
  hasAdminLogin: boolean;
  createdAt: string;
};

export type CorporateCompanyDetailDto = {
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
  status: CorporateCompanyStatus;
  planId: string;
  plan: {
    id: string;
    slug: string;
    name: string;
    annualPricePerEmployeeCents: number;
    currencyCode: string;
    maxBeneficiariesPerEmployee: number;
  };
  adminLogin: { email: string; active: boolean } | null;
  contractStartAt: string;
  contractEndAt: string | null;
  billing: {
    employeeCount: number;
    pricePerEmployeeCents: number;
    totalAnnualCents: number;
    /** Contract currency (the plan row). */
    currencyCode: string;
    /** Currency a fiscal document for this company is minted in (its country). */
    documentCurrencyCode: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type CorporateEmployeeDto = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  department: string | null;
  jobTitle: string | null;
  status: CorporateMemberStatus;
  hasAccount: boolean;
  preAssessmentBooked: boolean;
  beneficiaryCount: number;
  createdAt: string;
};

export type CorporateBeneficiaryDto = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  relationship: string | null;
  status: CorporateMemberStatus;
  hasAccount: boolean;
  createdAt: string;
};

export type CorporateRequestType = "ILLNESS_BENEFIT" | "FIT_FOR_WORK";

export type CorporateRequestDto = {
  id: string;
  employeeId: string;
  employeeName?: string;
  type: CorporateRequestType;
  reason: string | null;
  status: string;
  hasAppointment: boolean;
  expiresAt: string | null;
  createdAt: string;
};

// ── Plans + rules ────────────────────────────────────────────────────────────

export const fetchCorporatePlans = cache(async () => {
  return adminRequest<{
    plans: CorporatePlanDto[];
    doctorOptions: CorporateDoctorOptionDto[];
    countryOptions: CorporateCountryOptionDto[];
  }>("/api/admin/corporate/plans");
});

export type CorporatePlanServiceInput = {
  name: string;
  description?: string | null;
  countryCode?: string | null;
  durationMinutes: number;
  doctorId: string;
  role: CorporatePlanServiceRole;
  isActive?: boolean;
  sortOrder?: number;
};

export async function postCorporatePlanService(
  planId: string,
  body: CorporatePlanServiceInput,
) {
  return adminRequest<{ id: string }>(`/api/admin/corporate/plans/${planId}/services`, {
    method: "POST",
    body,
  });
}

export async function patchCorporatePlanService(
  id: string,
  body: Partial<CorporatePlanServiceInput>,
) {
  return adminRequest<{ id: string }>(`/api/admin/corporate/plan-services/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteCorporatePlanService(id: string) {
  return adminRequest<{ id: string }>(`/api/admin/corporate/plan-services/${id}`, {
    method: "DELETE",
  });
}

export async function patchCorporatePlan(
  id: string,
  body: {
    name?: string;
    annualPricePerEmployeeCents?: number;
    maxBeneficiariesPerEmployee?: number;
    isActive?: boolean;
    tier?: string | null;
    sortOrder?: number;
    priceNote?: string | null;
  },
) {
  return adminRequest<{ id: string }>(`/api/admin/corporate/plans/${id}`, {
    method: "PATCH",
    body,
  });
}

/** Coverage fields are shared by create + edit. `discountPercent` is always
 *  sent (the column is required); it is only READ for DISCOUNT coverage. */
export type CorporateRuleInput = {
  coverage: CorporateCoverage;
  discountPercent: number;
  copayCents?: number | null;
  annualLimit?: number | null;
  limitGroup?: string | null;
  appliesToBeneficiaries: boolean;
  isActive: boolean;
};

export async function postCorporatePlanRule(
  planId: string,
  body: CorporateRuleInput & {
    serviceKind?: CorporateServiceKind | null;
    serviceId?: string | null;
  },
) {
  return adminRequest<{ id: string }>(`/api/admin/corporate/plans/${planId}/rules`, {
    method: "POST",
    body,
  });
}

export async function patchCorporateRule(ruleId: string, body: Partial<CorporateRuleInput>) {
  return adminRequest<{ id: string }>(`/api/admin/corporate/rules/${ruleId}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteCorporateRule(ruleId: string) {
  return adminRequest<{ id: string }>(`/api/admin/corporate/rules/${ruleId}`, {
    method: "DELETE",
  });
}

// ── Companies ────────────────────────────────────────────────────────────────

export async function fetchCorporateCompanies(query?: { query?: string; status?: string }) {
  const params = new URLSearchParams();
  if (query?.query) params.set("query", query.query);
  if (query?.status) params.set("status", query.status);
  const qs = params.toString();
  return adminRequest<{ companies: CorporateCompanyRowDto[] }>(
    `/api/admin/corporate/companies${qs ? `?${qs}` : ""}`,
  );
}

export async function postCorporateCompany(body: unknown) {
  return adminRequest<{ id: string; adminInviteError?: string }>(
    "/api/admin/corporate/companies",
    { method: "POST", body },
  );
}

export const fetchCorporateCompanyById = cache(async (id: string) => {
  return adminRequest<CorporateCompanyDetailDto>(`/api/admin/corporate/companies/${id}`);
});

export async function patchCorporateCompany(id: string, body: unknown) {
  return adminRequest<{ id: string }>(`/api/admin/corporate/companies/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function postCorporateAdminInvite(companyId: string, email: string) {
  return adminRequest<{ id: string }>(
    `/api/admin/corporate/companies/${companyId}/admin-invite`,
    { method: "POST", body: { email } },
  );
}

// ── Employees ────────────────────────────────────────────────────────────────

export async function fetchCorporateEmployees(companyId: string) {
  return adminRequest<{ employees: CorporateEmployeeDto[] }>(
    `/api/admin/corporate/companies/${companyId}/employees`,
  );
}

export async function postCorporateEmployee(
  companyId: string,
  body: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    department?: string;
    jobTitle?: string;
  },
) {
  return adminRequest<{ id: string; status: string }>(
    `/api/admin/corporate/companies/${companyId}/employees`,
    { method: "POST", body },
  );
}

export type CorporateEmployeeAction = "SUSPEND" | "REACTIVATE" | "REMOVE" | "FORCE_ACTIVATE";

export async function patchCorporateEmployee(id: string, action: CorporateEmployeeAction) {
  return adminRequest<{ id: string }>(`/api/admin/corporate/employees/${id}`, {
    method: "PATCH",
    body: { action },
  });
}

export async function resendCorporateEmployeeInvite(id: string) {
  return adminRequest<{ id: string; status: string }>(
    `/api/admin/corporate/employees/${id}/resend-invite`,
    { method: "POST" },
  );
}

// ── Beneficiaries ────────────────────────────────────────────────────────────

export async function fetchCorporateBeneficiaries(companyId: string) {
  return adminRequest<{ beneficiaries: CorporateBeneficiaryDto[] }>(
    `/api/admin/corporate/companies/${companyId}/beneficiaries`,
  );
}

export type CorporateBeneficiaryAction = "SUSPEND" | "REACTIVATE" | "REMOVE";

export async function patchCorporateBeneficiary(id: string, action: CorporateBeneficiaryAction) {
  return adminRequest<{ id: string }>(`/api/admin/corporate/beneficiaries/${id}`, {
    method: "PATCH",
    body: { action },
  });
}

export async function resendCorporateBeneficiaryInvite(id: string) {
  return adminRequest<{ id: string; status: string }>(
    `/api/admin/corporate/beneficiaries/${id}/resend-invite`,
    { method: "POST" },
  );
}

// ── Requests ─────────────────────────────────────────────────────────────────

export async function fetchCorporateRequests(companyId: string) {
  return adminRequest<{ requests: CorporateRequestDto[] }>(
    `/api/admin/corporate/companies/${companyId}/requests`,
  );
}

export async function postCorporateRequest(
  companyId: string,
  body: { employeeId: string; type: CorporateRequestType; reason?: string },
) {
  return adminRequest<{ requestId: string; status: string }>(
    `/api/admin/corporate/companies/${companyId}/requests`,
    { method: "POST", body },
  );
}

export async function cancelCorporateRequest(requestId: string) {
  return adminRequest<{ id: string }>(`/api/admin/corporate/requests/${requestId}`, {
    method: "PATCH",
    body: {},
  });
}

// ── Invoices ─────────────────────────────────────────────────────────────────

export type CorporateInvoiceDocumentType =
  | "INVOICE"
  | "RECEIPT"
  | "INVOICE_RECEIPT"
  | "CREDIT_NOTE";

export type CorporateInvoiceDocument = {
  id: string;
  invoiceNumber: string;
  countryCode: string;
  documentType: CorporateInvoiceDocumentType;
  generatedAt: string;
  emailSentAt: string | null;
  emailSentTo: string | null;
  orderId: string;
  orderNumber: string | null;
  fullName: string;
  email: string;
  totalCents: number;
  currencyCode: string;
};

/** Read-only. Corporate subscription billing is invoiced offline under
 *  contract — the platform issues no fiscal document for it. */
export async function fetchCorporateInvoices(companyId: string) {
  return adminRequest<{ consultations: CorporateInvoiceDocument[] }>(
    `/api/admin/corporate/companies/${companyId}/invoices`,
  );
}
