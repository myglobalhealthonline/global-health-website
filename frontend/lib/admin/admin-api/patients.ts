import { cache } from "react";
import { adminRequest } from "./core";

export type VerificationStatus = "NOT_VERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";

export type AdminPatientProfileDto = {
  id: string;
  email: string;
  userId: string | null;
  fullName: string | null;
  globalHealthNumber: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  weightKg: number | null;
  heightM: number | null;
  bmi: number | null;
  bloodType: string | null;
  allergies: string[];
  chronicDiseases: string[];
  familyHistory: string[];
  socialHabits: string[];
  surgeries: string[];
  usualMedication: string[];
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  nationalIdNumber: string | null;
  taxIdNumber: string | null;
  passportNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressPostalCode: string | null;
  addressCountryCode: string | null;
  preferredPharmacy: string | null;
  statusAlert: string | null;
  clinicAlert: string | null;
  pricingPlanId: string | null;
  idVerificationStatus: VerificationStatus;
  phoneVerificationStatus: VerificationStatus;
  emailVerificationStatus: VerificationStatus;
  insuranceDocumentStatus: VerificationStatus;
  idDocumentKey: string | null;
  idDocumentType: string | null;
  insuranceProviderName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminPatientSearchItem = {
  id: string;
  email: string;
  fullName: string | null;
  globalHealthNumber: string | null;
  idVerificationStatus: VerificationStatus;
  emailVerificationStatus: VerificationStatus;
  phoneVerificationStatus: VerificationStatus;
  createdAt: string;
};

export type AdminPatientNationalityDoc = {
  id: string;
  slotNumber: 1 | 2;
  nationalityCountry: string;
  documentType: string;
  documentNumber: string | null;
  expiryDate: string | null;
  verificationStatus: VerificationStatus;
  adminNotes: string | null;
  createdAt: string;
};

export type AdminPatientConsentItem = {
  consentType: string;
  label: string;
  description: string;
  consentValue: boolean | null;
  consentVersion: string | null;
  lastUpdatedAt: string | null;
};

export type AdminPatientConsentHistoryItem = {
  id: string;
  consentType: string;
  consentValue: boolean;
  consentVersion: string | null;
  source: string | null;
  createdAt: string;
};

export type AdminPatientAccessLogItem = {
  id: string;
  accessedByName: string | null;
  accessedByRole: string;
  accessedResourceType: string;
  accessAction: string;
  accessReason: string | null;
  ipAddress: string | null;
  /** S-002/Task 6: true when this read would be denied under
   *  MEDICAL_ACCESS_ENFORCE (shadow mode logs it but never blocks). */
  isAbnormal: boolean;
  abnormalReason: string | null;
  createdAt: string;
};

export type AdminPatientPaymentItem = {
  id: string;
  appointmentId: string;
  serviceName: string | null;
  doctorName: string | null;
  status: string;
  amountCents: number;
  currencyCode: string;
  eventType: string;
  bookedAt: string;
  paidAt: string;
};

export const fetchAdminPatientProfile = cache(async (email: string) => {
  return adminRequest<{ profile: AdminPatientProfileDto | null }>(
    `/api/admin/patients/${encodeURIComponent(email)}/profile`,
  );
});

export async function patchAdminPatientProfile(
  email: string,
  body: Partial<
    Pick<
      AdminPatientProfileDto,
      | "fullName"
      | "phone"
      | "dateOfBirth"
      | "weightKg"
      | "heightM"
      | "bmi"
      | "bloodType"
      | "allergies"
      | "chronicDiseases"
      | "familyHistory"
      | "socialHabits"
      | "surgeries"
      | "usualMedication"
      | "bloodPressureSystolic"
      | "bloodPressureDiastolic"
      | "nationalIdNumber"
      | "taxIdNumber"
      | "passportNumber"
      | "addressLine1"
      | "addressLine2"
      | "addressCity"
      | "addressState"
      | "addressPostalCode"
      | "addressCountryCode"
      | "preferredPharmacy"
      | "statusAlert"
      | "clinicAlert"
      | "pricingPlanId"
    >
  >,
) {
  return adminRequest<{ profile: AdminPatientProfileDto | null }>(
    `/api/admin/patients/${encodeURIComponent(email)}/profile`,
    { method: "PATCH", body },
  );
}

export async function postAdminPatient(body: {
  email: string;
  fullName: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  nationalIdNumber?: string | null;
  taxIdNumber?: string | null;
  passportNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressPostalCode?: string | null;
  addressCountryCode?: string | null;
}) {
  return adminRequest<{ profile: AdminPatientProfileDto | null; inviteUrl: string }>(
    "/api/admin/patients",
    { method: "POST", body },
  );
}

export async function fetchAdminPatients(query: {
  ghn?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  name?: string;
  idNumber?: string;
  plan?: string;
  /// Country folder scope (from the admin country picker). Omit for all countries.
  countryCode?: string;
  page?: string;
  pageSize?: string;
}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== "") params.set(k, v);
  }
  return adminRequest<{
    items: AdminPatientSearchItem[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }>(`/api/admin/patients/search?${params.toString()}`);
}

export const fetchAdminPatientNationality = cache(async (email: string) => {
  return adminRequest<{ nationalityDocuments: AdminPatientNationalityDoc[] }>(
    `/api/admin/patients/${encodeURIComponent(email)}/nationality`,
  );
});

export const fetchAdminPatientConsents = cache(async (email: string) => {
  return adminRequest<{
    consents: AdminPatientConsentItem[];
    history: AdminPatientConsentHistoryItem[];
  }>(`/api/admin/patients/${encodeURIComponent(email)}/consents`);
});

export const fetchAdminPatientAccessLog = cache(async (email: string) => {
  return adminRequest<{ logs: AdminPatientAccessLogItem[]; pagination: { total: number } }>(
    `/api/admin/patients/${encodeURIComponent(email)}/access-log?limit=50`,
  );
});

export const fetchAdminPatientPayments = cache(async (email: string) => {
  return adminRequest<{ items: AdminPatientPaymentItem[]; total: number }>(
    `/api/admin/patients/${encodeURIComponent(email)}/payments`,
  );
});
