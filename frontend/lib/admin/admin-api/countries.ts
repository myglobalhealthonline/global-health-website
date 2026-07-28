import { cache } from "react";
import { adminRequest } from "./core";

export type AdminClinicDto = {
  id: string;
  countryId: string;
  countryCode: string;
  countryName: string;
  name: string;
  slug: string;
  city: string | null;
  active: boolean;
};

export type AdminCurrencyDto = {
  id: string;
  code: string;
  symbol: string;
  decimals: number;
};

export type AdminCountryLocaleDto = {
  id: string;
  locale: string;
  isDefault: boolean;
};

export type AdminCountryDomainDto = {
  id: string;
  domain: string;
  isPrimary: boolean;
};

export type AdminBookingSettingDto = {
  id: string;
  countryId: string;
  bookingEnabled: boolean;
  requirePhone: boolean;
  requireDateOfBirth: boolean;
  timezone: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminCountryDto = {
  id: string;
  code: string;
  name: string;
  slug: string;
  legacyHomePath: string;
  teamPath: string;
  generalConsultationPath: string;
  specialistConsultationPath: string;
  defaultLocale: string;
  currencyId: string;
  isActive: boolean;
  /** Country-scoped sidebar feature toggles. Each entry is a slug from
   *  the admin nav (`country-home`, `services`, `health-tests`, …). When
   *  absent (older row), treat as "all enabled" for backward-compat. */
  enabledFeatures?: string[];
  /** Access model controlling which doctors can access patient files in
   *  this country. CLINIC = same-country doctors with patient consent may
   *  access; PLATFORM = only the treating doctor. */
  accessModel: "CLINIC" | "PLATFORM";
  /** Billing model. When true this market issues a COMMISSION-ONLY receipt:
   *  the document total is Global Health's intermediation commission (price
   *  − doctor payout), not the amount charged to the card, and the doctor
   *  documents their own fee. Also disables Stripe's auto-invoice and makes
   *  a doctor unbookable until their per-service payout is set. */
  commissionReceiptEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  currency: AdminCurrencyDto;
  countryLocales: AdminCountryLocaleDto[];
  domains: AdminCountryDomainDto[];
  /** Per-country booking-intake settings. `null` if no row yet — admin
   *  upserts on first edit; schema defaults apply otherwise. */
  bookingSetting: AdminBookingSettingDto | null;
};

/** Canonical list of country-scoped sidebar features. Stays in lockstep
 *  with backend `COUNTRY_FEATURE_KEYS`. */
export const COUNTRY_FEATURE_KEYS = [
  "country-home",
  "country-content",
  "pages",
  "footer",
  "services",
  "general-consultations",
  "specialist-consultations",
  "online-prescriptions",
  "health-tests",
  "appointments",
  "subscriptions",
] as const;
export type CountryFeatureKey = (typeof COUNTRY_FEATURE_KEYS)[number];

type AdminCountriesListPayload = {
  countries: AdminCountryDto[];
};

type AdminCountryDetailPayload = {
  country: AdminCountryDto;
};

type AdminCurrenciesListPayload = {
  currencies: AdminCurrencyDto[];
};

export const fetchAdminClinicsByCountryCode = cache(async (countryCode: string) => {
  const code = countryCode.trim().toUpperCase();
  const path = code
    ? `/api/admin/clinics?countryCode=${encodeURIComponent(code)}`
    : "/api/admin/clinics";
  return adminRequest<{ clinics: AdminClinicDto[] }>(path);
});

// `cache()` deduplicates identical reads within a single SSR request.
// Many admin pages call `fetchAdminCountries()` (layout + page + ScopeBanner
// resolver), and previously each triggered a fresh round-trip to the backend.
// The wrapper collapses them to one fetch per request.
export const fetchAdminCountries = cache(async () => {
  return adminRequest<AdminCountriesListPayload>("/api/admin/countries");
});

export const fetchAdminCountryById = cache(async (id: string) => {
  return adminRequest<AdminCountryDetailPayload>(`/api/admin/countries/${id}`);
});

export const fetchAdminCurrencies = cache(async () => {
  return adminRequest<AdminCurrenciesListPayload>("/api/admin/currencies");
});

export async function postAdminCountry(body: unknown) {
  return adminRequest<AdminCountryDetailPayload>("/api/admin/countries", {
    method: "POST",
    body,
  });
}

export async function patchAdminCountry(id: string, body: unknown) {
  return adminRequest<AdminCountryDetailPayload>(`/api/admin/countries/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteAdminCountry(id: string) {
  return adminRequest<AdminCountryDetailPayload>(`/api/admin/countries/${id}`, {
    method: "DELETE",
  });
}

export async function purgeAdminCountry(id: string) {
  return adminRequest<Record<string, never>>(`/api/admin/countries/${id}/purge`, {
    method: "DELETE",
  });
}

// ── CountryLegalProfile ──────────────────────────────────────────────────────

export type CountryLegalProfileDto = {
  id: string;
  countryId: string;
  legalCompanyName: string | null;
  legalAddress: string | null;
  publicPhones: string[];
  publicEmails: string[];
  supportEmail: string | null;
  billingEmail: string | null;
  companyRegistrationNumber: string | null;
  taxVatNumber: string | null;
  medicalRegistrationNumber: string | null;
  healthcareLicenseDetails: string | null;
  regulatorName: string | null;
  regulatorWebsite: string | null;
  providerRegistrationLabel: string | null;
  providerRegistrationNumber: string | null;
  providerRegistrationUrl: string | null;
  emergencyNumber: string | null;
  emergencyNotice: string | null;
  nonEmergencyHealthLine: string | null;
  companyRegistryUrl: string | null;
  medicalRegulatorUrl: string | null;
  healthcareAuthorityUrl: string | null;
  dataProtectionAuthorityUrl: string | null;
  disputeResolutionUrl: string | null;
  consumerProtectionUrl: string | null;
  dataProtectionLawName: string | null;
  dataProtectionPolicyTitle: string | null;
  dpoName: string | null;
  dpoEmail: string | null;
  disputeBodyName: string | null;
  disputeEmail: string | null;
  disputePhone: string | null;
  disputeProcessText: string | null;
  legalJurisdictionText: string | null;
  consumerRightsText: string | null;
  shortDisclaimer: string | null;
  fullDisclaimer: string | null;
  disclaimerTranslations: Array<{
    locale: string;
    shortDisclaimer: string | null;
    fullDisclaimer: string | null;
  }>;
};

export async function fetchAdminCountryLegalProfile(countryId: string) {
  return adminRequest<{ legalProfile: CountryLegalProfileDto | null }>(
    `/api/admin/countries/${countryId}/legal`,
  );
}

export async function putAdminCountryLegalProfile(countryId: string, body: unknown) {
  return adminRequest<{ legalProfile: CountryLegalProfileDto }>(
    `/api/admin/countries/${countryId}/legal`,
    { method: "PUT", body },
  );
}

// ── CountryAuthorityLink ─────────────────────────────────────────────────────

export type AdminAuthorityLinkDto = {
  id: string;
  countryId: string;
  name: string;
  abbreviation: string | null;
  url: string;
  category: string;
  description: string | null;
  showInFooter: boolean;
  showInSchema: boolean;
  sortOrder: number;
  isActive: boolean;
};

export async function fetchAdminAuthorityLinks(countryId: string) {
  return adminRequest<{ authorityLinks: AdminAuthorityLinkDto[] }>(
    `/api/admin/countries/${countryId}/authority-links`,
  );
}

export async function createAdminAuthorityLink(countryId: string, body: unknown) {
  return adminRequest<{ authorityLink: AdminAuthorityLinkDto }>(
    `/api/admin/countries/${countryId}/authority-links`,
    { method: "POST", body },
  );
}

export async function updateAdminAuthorityLink(countryId: string, linkId: string, body: unknown) {
  return adminRequest<{ authorityLink: AdminAuthorityLinkDto }>(
    `/api/admin/countries/${countryId}/authority-links/${linkId}`,
    { method: "PATCH", body },
  );
}

export async function deleteAdminAuthorityLink(countryId: string, linkId: string) {
  return adminRequest<{ deleted: boolean }>(
    `/api/admin/countries/${countryId}/authority-links/${linkId}`,
    { method: "DELETE" },
  );
}

// ── InsuranceCompany ─────────────────────────────────────────────────────────

export type InsurancePricingMode = "FIXED" | "PERCENT";

export type AdminInsuranceCompanyDto = {
  id: string;
  countryId: string;
  name: string;
  pricingMode: InsurancePricingMode;
  discountPercent: number | null;
  isActive: boolean;
  sortOrder: number;
  /** Admin recipients notified when an insurance order needs card verification. */
  notifyEmails: string[];
  notifyWhatsappNumbers: string[];
  /** Number of services this company covers (present on the list endpoint). */
  _count?: { coverages: number };
};

export type AdminCoverageDoctorDto = {
  doctorId: string;
  name: string;
  amountCents: number | null;
};

export type AdminCoverageServiceDto = {
  serviceId: string;
  name: string;
  basePriceCents: number | null;
  currencyCode: string | null;
  covered: boolean;
  overridePriceCents: number | null;
  insurancePriceCents: number | null;
  doctors: AdminCoverageDoctorDto[];
};

export type AdminCoverageDto = {
  companyId: string;
  pricingMode: InsurancePricingMode;
  discountPercent: number | null;
  services: AdminCoverageServiceDto[];
};

export async function fetchAdminInsuranceCompanies(countryId: string) {
  return adminRequest<{ insuranceCompanies: AdminInsuranceCompanyDto[] }>(
    `/api/admin/countries/${countryId}/insurance-companies`,
  );
}

export async function createAdminInsuranceCompany(countryId: string, body: unknown) {
  return adminRequest<{ insuranceCompany: AdminInsuranceCompanyDto }>(
    `/api/admin/countries/${countryId}/insurance-companies`,
    { method: "POST", body },
  );
}

export async function updateAdminInsuranceCompany(countryId: string, companyId: string, body: unknown) {
  return adminRequest<{ insuranceCompany: AdminInsuranceCompanyDto }>(
    `/api/admin/countries/${countryId}/insurance-companies/${companyId}`,
    { method: "PATCH", body },
  );
}

export async function deleteAdminInsuranceCompany(countryId: string, companyId: string) {
  return adminRequest<{ deleted: boolean }>(
    `/api/admin/countries/${countryId}/insurance-companies/${companyId}`,
    { method: "DELETE" },
  );
}

export async function fetchAdminInsuranceCoverage(countryId: string, companyId: string) {
  return adminRequest<AdminCoverageDto>(
    `/api/admin/countries/${countryId}/insurance-companies/${companyId}/coverage`,
  );
}

export async function putAdminInsuranceCoverage(countryId: string, companyId: string, body: unknown) {
  return adminRequest<{ saved: boolean }>(
    `/api/admin/countries/${countryId}/insurance-companies/${companyId}/coverage`,
    { method: "PUT", body },
  );
}

// ── CountryLegalDocument ─────────────────────────────────────────────────────

export type LegalDocumentType =
  | "TERMS_OF_SERVICE"
  | "PRIVACY_POLICY"
  | "COOKIE_POLICY"
  | "GDPR_NOTICE"
  | "DATA_PROCESSING_AGREEMENT"
  | "REFUND_POLICY"
  | "MEDICAL_DISCLAIMER"
  | "ACCESSIBILITY_STATEMENT"
  | "COMPLAINTS_PROCEDURE";

export type CountryLegalDocumentDto = {
  id: string;
  countryId: string;
  type: LegalDocumentType;
  title: string;
  content: string | null;
  pdfPath: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  locale: string;
  version: number;
};

export async function fetchAdminCountryLegalDocuments(countryId: string) {
  return adminRequest<{ documents: CountryLegalDocumentDto[] }>(
    `/api/admin/countries/${countryId}/legal-documents`,
  );
}

export async function putAdminCountryLegalDocument(countryId: string, body: unknown) {
  return adminRequest<{ document: CountryLegalDocumentDto }>(
    `/api/admin/countries/${countryId}/legal-documents`,
    { method: "PUT", body },
  );
}

export async function deleteAdminCountryLegalDocument(countryId: string, docId: string) {
  return adminRequest<Record<string, never>>(
    `/api/admin/countries/${countryId}/legal-documents/${docId}`,
    { method: "DELETE" },
  );
}

// ── SEO landing pages ────────────────────────────────────────────────────────
export type AdminLandingTranslationDto = {
  id: string;
  locale: string;
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  bodyHtml: string | null;
  faq: Array<{ question: string; answer: string }> | null;
};

export type AdminLandingTemplateDto = {
  doctorLanguage?: string;
  doctorSlugs?: string[];
  ctaService?: string;
  related?: Array<{ label: string; href: string }>;
};

export type AdminLandingPageDto = {
  id: string;
  countryId: string;
  slug: string;
  isPublished: boolean;
  sortOrder: number;
  template: AdminLandingTemplateDto | null;
  translations: AdminLandingTranslationDto[];
};

export const fetchAdminCountryLandingPages = cache(async (countryId: string) => {
  return adminRequest<{ countryId: string; pages: AdminLandingPageDto[] }>(
    `/api/admin/countries/${countryId}/landing-pages`,
  );
});

export async function putAdminCountryLandingPage(countryId: string, body: unknown) {
  return adminRequest<{ page: AdminLandingPageDto }>(
    `/api/admin/countries/${countryId}/landing-pages`,
    { method: "PUT", body },
  );
}

export async function deleteAdminCountryLandingPage(countryId: string, pageId: string) {
  return adminRequest<Record<string, never>>(
    `/api/admin/countries/${countryId}/landing-pages/${pageId}`,
    { method: "DELETE" },
  );
}

/** Same-day GP quick-book config for a country (which GENERAL service the
 *  homepage timeslot-first flow books + the priority/Tiago GP). */
export type AdminGpSettingsPayload = {
  countryCode: string;
  sameDayServiceId: string | null;
  priorityDoctorId: string | null;
  resolvedService: { id: string; slug: string; name: string } | null;
  generalServices: Array<{ id: string; slug: string; name: string }>;
  gpDoctors: Array<{ id: string; fullName: string; languages: string[] }>;
};

export async function fetchAdminGpSettings(countryCode: string) {
  return adminRequest<AdminGpSettingsPayload>(
    `/api/admin/countries/${encodeURIComponent(countryCode)}/gp-settings`,
  );
}

/** Set/clear the same-day GP service and/or priority doctor. Pass `null` to
 *  clear a value; omit a field to leave it unchanged. */
export async function updateAdminGpSettings(
  countryCode: string,
  body: { sameDayServiceId?: string | null; priorityDoctorId?: string | null },
) {
  return adminRequest<{ countryCode: string }>(
    `/api/admin/countries/${encodeURIComponent(countryCode)}/gp-settings`,
    { method: "PUT", body },
  );
}

/* ─────────────────────────────────────────────────────────────
   Per-country footer (admin) — backed by /api/admin/countries/:id/footer
   ───────────────────────────────────────────────────────────── */

export type AdminFooterCustomColumn = {
  title: string;
  links: Array<{ label: string; href: string; external?: boolean }>;
};

export type AdminCountryFooterDto = {
  id: string;
  countryId: string;
  countryCode: string;
  countryName: string;
  tagline: string | null;
  contactAddress: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactHours: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  customColumns: AdminFooterCustomColumn[];
  copyrightLine: string | null;
  isActive: boolean;
  updatedAt: string;
};

export type AdminCountryFooterFetchPayload = {
  footer: AdminCountryFooterDto | null;
  country: { id: string; code: string; name: string };
};

export async function fetchAdminCountryFooter(countryId: string) {
  return adminRequest<AdminCountryFooterFetchPayload>(
    `/api/admin/countries/${countryId}/footer`,
  );
}

export async function putAdminCountryFooter(countryId: string, body: unknown) {
  return adminRequest<{ footer: AdminCountryFooterDto }>(
    `/api/admin/countries/${countryId}/footer`,
    { method: "PUT", body },
  );
}

export type NewsletterSubscriberDto = {
  id: string;
  email: string;
  countryCode: string | null;
  locale: string | null;
  source: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
};

export async function fetchNewsletterSubscribers() {
  return adminRequest<{ items: NewsletterSubscriberDto[] }>(
    "/api/admin/newsletter",
  );
}
