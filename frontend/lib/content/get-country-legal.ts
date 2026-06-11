import { apiRequest } from "@/lib/api/client";
import { PUBLIC_CONTENT_FETCH_TIMEOUT_MS } from "@/lib/content/public-content-source";

/**
 * Visitor-facing country legal content (CountryLegalProfile +
 * published CountryLegalDocument rows) from the public backend API.
 *
 * Cache tags:
 *   country:{code}:legal — bust from admin server actions after a legal edit.
 */

const REVALIDATE_SECONDS = 300;

export const countryLegalCacheTag = (code: string) => `country:${code}:legal`;

export type LegalDocumentType =
  | "TERMS_OF_SERVICE"
  | "PRIVACY_POLICY"
  | "COOKIE_POLICY"
  | "GDPR_NOTICE"
  | "DATA_PROCESSING_AGREEMENT"
  | "REFUND_POLICY"
  | "MEDICAL_DISCLAIMER"
  | "ACCESSIBILITY_STATEMENT";

export const LEGAL_TYPE_SLUGS: Record<LegalDocumentType, string> = {
  TERMS_OF_SERVICE: "terms-of-service",
  PRIVACY_POLICY: "privacy-policy",
  COOKIE_POLICY: "cookie-policy",
  GDPR_NOTICE: "gdpr-notice",
  DATA_PROCESSING_AGREEMENT: "data-processing-agreement",
  REFUND_POLICY: "refund-policy",
  MEDICAL_DISCLAIMER: "medical-disclaimer",
  ACCESSIBILITY_STATEMENT: "accessibility-statement",
};

export function legalTypeFromSlug(slug: string): LegalDocumentType | null {
  const entry = Object.entries(LEGAL_TYPE_SLUGS).find(([, s]) => s === slug);
  return entry ? (entry[0] as LegalDocumentType) : null;
}

export type PublicLegalProfile = {
  legalCompanyName: string | null;
  legalAddress: string | null;
  publicPhones: string[];
  publicEmails: string[];
  supportEmail: string | null;
  companyRegistrationNumber: string | null;
  taxVatNumber: string | null;
  medicalRegistrationNumber: string | null;
  healthcareLicenseDetails: string | null;
  regulatorName: string | null;
  regulatorWebsite: string | null;
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
};

export type PublicLegalDocumentSummary = {
  type: LegalDocumentType;
  title: string;
  locale: string;
  version: number;
  publishedAt: string | null;
  updatedAt: string;
  hasPdf: boolean;
};

export type PublicCountryLegal = {
  country: { code: string; name: string };
  profile: PublicLegalProfile | null;
  documents: PublicLegalDocumentSummary[];
};

export type PublicLegalDocument = {
  country: { code: string; name: string };
  document: {
    type: LegalDocumentType;
    title: string;
    content: string | null;
    locale: string;
    version: number;
    publishedAt: string | null;
    updatedAt: string;
    pdfUrl: string | null;
  };
};

export async function getCountryLegal(code: string): Promise<PublicCountryLegal | null> {
  const result = await apiRequest<PublicCountryLegal>(
    `/api/countries/${encodeURIComponent(code)}/legal`,
    {
      timeoutMs: PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
      revalidate: REVALIDATE_SECONDS,
      tags: [countryLegalCacheTag(code)],
    },
  );
  return result.ok ? result.data : null;
}

export async function getCountryLegalDocument(
  code: string,
  type: LegalDocumentType,
  locale: string,
): Promise<PublicLegalDocument | null> {
  const slug = LEGAL_TYPE_SLUGS[type];
  const result = await apiRequest<PublicLegalDocument>(
    `/api/countries/${encodeURIComponent(code)}/legal-documents/${slug}?locale=${encodeURIComponent(locale)}`,
    {
      timeoutMs: PUBLIC_CONTENT_FETCH_TIMEOUT_MS,
      revalidate: REVALIDATE_SECONDS,
      tags: [countryLegalCacheTag(code)],
    },
  );
  return result.ok ? result.data : null;
}
