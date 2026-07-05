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

export type CorporateBenefitRuleDto = {
  id: string;
  serviceKind: CorporateServiceKind | null;
  serviceId: string | null;
  discountPercent: number;
  appliesToBeneficiaries: boolean;
  isActive: boolean;
};

export type CorporatePlanDto = {
  id: string;
  slug: string;
  name: string;
  annualPricePerEmployeeCents: number;
  currencyCode: string;
  maxBeneficiariesPerEmployee: number;
  isActive: boolean;
  benefitRules: CorporateBenefitRuleDto[];
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
  preAssessmentDoctorId: string | null;
  preAssessmentDoctor: { id: string; fullName: string } | null;
  contractStartAt: string;
  contractEndAt: string | null;
  billing: {
    employeeCount: number;
    pricePerEmployeeCents: number;
    totalAnnualCents: number;
    currencyCode: string;
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
  return adminRequest<{ plans: CorporatePlanDto[] }>("/api/admin/corporate/plans");
});

export async function patchCorporatePlan(
  id: string,
  body: {
    name?: string;
    annualPricePerEmployeeCents?: number;
    maxBeneficiariesPerEmployee?: number;
    isActive?: boolean;
  },
) {
  return adminRequest<{ id: string }>(`/api/admin/corporate/plans/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function postCorporatePlanRule(
  planId: string,
  body: {
    serviceKind?: CorporateServiceKind | null;
    serviceId?: string | null;
    discountPercent: number;
    appliesToBeneficiaries: boolean;
    isActive: boolean;
  },
) {
  return adminRequest<{ id: string }>(`/api/admin/corporate/plans/${planId}/rules`, {
    method: "POST",
    body,
  });
}

export async function patchCorporateRule(
  ruleId: string,
  body: { discountPercent?: number; appliesToBeneficiaries?: boolean; isActive?: boolean },
) {
  return adminRequest<{ id: string }>(`/api/admin/corporate/rules/${ruleId}`, {
    method: "PATCH",
    body,
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
