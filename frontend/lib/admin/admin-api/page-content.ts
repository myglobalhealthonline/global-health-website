import { cache } from "react";
import { adminRequest } from "./core";

export type AdminPageContentKey =
  | "HOME"
  | "DOCTORS_INDEX"
  | "GENERAL_CONSULTATION"
  | "SPECIALIST_CONSULTATION"
  | "PRESCRIPTIONS"
  | "HEALTH_TESTS";

export type AdminPageContentLocale = "EN" | "PT" | "ES" | "CS" | "RO" | "DE";

export type AdminPageContentStatus = "DRAFT" | "PUBLISHED";

export const ADMIN_PAGE_CONTENT_KEY_LABELS: Record<AdminPageContentKey, string> = {
  HOME: "Home",
  GENERAL_CONSULTATION: "GP hub",
  SPECIALIST_CONSULTATION: "Specialist hub",
  DOCTORS_INDEX: "Doctors index",
  PRESCRIPTIONS: "Prescriptions",
  HEALTH_TESTS: "Health tests",
};

export const ADMIN_PAGE_CONTENT_KEYS: AdminPageContentKey[] = [
  "HOME",
  "GENERAL_CONSULTATION",
  "SPECIALIST_CONSULTATION",
  "DOCTORS_INDEX",
  "PRESCRIPTIONS",
  "HEALTH_TESTS",
];

export type AdminPageContentListItem = {
  countryId: string;
  countryCode: string;
  countryName: string;
  pageKey: AdminPageContentKey;
  status: AdminPageContentStatus | null;
  isActive: boolean | null;
  configured: boolean;
  enabledSectionCount: number;
};

export type AdminPageContentFaqItem = { question: string; answer: string };

export type AdminPageContentTranslationDto = {
  id: string;
  pageContentId: string;
  locale: AdminPageContentLocale;
  heroTitle: string | null;
  heroTitleLead: string | null;
  heroTitleAccent: string | null;
  heroSubtitle: string | null;
  ctaLabel: string | null;
  intro: string | null;
  whoForTitle: string | null;
  whoForIntro: string | null;
  whoForItems: string[] | null;
  whyChooseTitle: string | null;
  whyChooseItems: string[] | null;
  faq: AdminPageContentFaqItem[] | null;
  disclaimerParagraphs: string[] | null;
  disclaimerShort: string | null;
  body: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminPageContentDto = {
  id: string;
  countryId: string;
  pageKey: AdminPageContentKey;
  status: AdminPageContentStatus;
  isActive: boolean;
  heroImagePath: string | null;
  ogImagePath: string | null;
  ctaHref: string | null;
  showIntro: boolean;
  showWhoFor: boolean;
  showWhyChoose: boolean;
  showFaq: boolean;
  showDisclaimer: boolean;
  showBody: boolean;
  translations: AdminPageContentTranslationDto[];
  createdAt: string;
  updatedAt: string;
};

export type AdminPageContentTranslationInput = {
  locale: string;
  heroTitle?: string | null;
  heroTitleLead?: string | null;
  heroTitleAccent?: string | null;
  heroSubtitle?: string | null;
  ctaLabel?: string | null;
  intro?: string | null;
  whoForTitle?: string | null;
  whoForIntro?: string | null;
  whoForItems?: string[];
  whyChooseTitle?: string | null;
  whyChooseItems?: string[];
  faq?: AdminPageContentFaqItem[];
  disclaimerParagraphs?: string[];
  disclaimerShort?: string | null;
  body?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export type AdminPageContentUpsertBody = {
  status?: AdminPageContentStatus;
  isActive?: boolean;
  heroImagePath?: string | null;
  ogImagePath?: string | null;
  ctaHref?: string | null;
  showIntro?: boolean;
  showWhoFor?: boolean;
  showWhyChoose?: boolean;
  showFaq?: boolean;
  showDisclaimer?: boolean;
  showBody?: boolean;
  translations: AdminPageContentTranslationInput[];
};

export async function fetchAdminPageContentList() {
  return adminRequest<{ items: AdminPageContentListItem[] }>("/api/admin/page-content");
}

export const fetchAdminPageContent = cache(
  async (countryId: string, pageKey: AdminPageContentKey) => {
    return adminRequest<{ record: AdminPageContentDto | null }>(
      `/api/admin/page-content/${encodeURIComponent(countryId)}/${encodeURIComponent(pageKey)}`,
    );
  },
);

export async function putAdminPageContent(
  countryId: string,
  pageKey: AdminPageContentKey,
  body: AdminPageContentUpsertBody,
) {
  return adminRequest<{ record: AdminPageContentDto }>(
    `/api/admin/page-content/${encodeURIComponent(countryId)}/${encodeURIComponent(pageKey)}`,
    { method: "PUT", body },
  );
}
