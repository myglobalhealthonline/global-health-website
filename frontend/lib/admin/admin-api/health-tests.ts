import { cache } from "react";
import { adminRequest } from "./core";

export type AdminHealthTestExtraSectionDto = {
  heading: string;
  body: string;
};

export type AdminHealthTestTranslationDto = {
  id: string;
  locale: string;
  title: string;
  shortDescription: string | null;
  sampleType: string | null;
  resultsTimeline: string | null;
  heroButtonLabel: string | null;
  detailIntro: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type AdminHealthTestDto = {
  id: string;
  countryId: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  priceCents: number;
  currencyCode: string;
  productImagePath: string;
  galleryImagePaths: string[];
  sampleType: string | null;
  resultsTimeline: string | null;
  heroButtonLabel: string | null;
  detailIntro: string | null;
  whatThisTestCovers: string[];
  whyGetTested: string[];
  extraSections: AdminHealthTestExtraSectionDto[] | null;
  sortOrder: number;
  isActive: boolean;
  /** null = unlimited inventory; 0 = sold out; 1–5 surfaces a
   *  "Only N left" badge on the public card. */
  stock: number | null;
  /** Shipping fee charged per kit at checkout (cents). 0 = free. */
  shippingCents: number;
  seoTitle: string | null;
  seoDescription: string | null;
  legacyPath: string | null;
  /** Per-locale CMS content for the translation tabs. */
  translations: AdminHealthTestTranslationDto[];
  createdAt: string;
  updatedAt: string;
  country: { id: string; code: string; name: string };
};

type AdminHealthTestsListPayload = {
  items: AdminHealthTestDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type AdminHealthTestDetailPayload = {
  healthTest: AdminHealthTestDto;
};

export async function fetchAdminHealthTests(query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") params.set(key, value);
    }
  }
  const qs = params.toString();
  const path = qs ? `/api/admin/health-tests?${qs}` : "/api/admin/health-tests";
  return adminRequest<AdminHealthTestsListPayload>(path);
}

export const fetchAdminHealthTestById = cache(async (id: string) => {
  return adminRequest<AdminHealthTestDetailPayload>(`/api/admin/health-tests/${id}`);
});

export async function postAdminHealthTest(body: unknown) {
  return adminRequest<AdminHealthTestDetailPayload>("/api/admin/health-tests", {
    method: "POST",
    body,
  });
}

export async function patchAdminHealthTest(id: string, body: unknown) {
  return adminRequest<AdminHealthTestDetailPayload>(`/api/admin/health-tests/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteAdminHealthTest(id: string) {
  return adminRequest<AdminHealthTestDetailPayload>(`/api/admin/health-tests/${id}`, {
    method: "DELETE",
  });
}

export async function purgeAdminHealthTest(id: string) {
  return adminRequest<Record<string, never>>(`/api/admin/health-tests/${id}/purge`, {
    method: "DELETE",
  });
}

export type AdminHealthTestFaqDto = {
  id: string;
  healthTestId: string;
  question: string;
  answer: string;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  translations?: Array<{
    locale: string;
    question: string;
    answer: string;
  }>;
};

export async function fetchAdminHealthTestFaqs(healthTestId: string) {
  return adminRequest<{ faqs: AdminHealthTestFaqDto[] }>(
    `/api/admin/health-tests/${healthTestId}/faqs`,
  );
}
