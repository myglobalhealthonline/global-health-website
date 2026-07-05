import { cache } from "react";
import { adminRequest } from "./core";

export type AdminPageKey =
  | "HOME"
  | "DOCTORS_INDEX"
  | "GENERAL_CONSULTATION"
  | "SPECIALIST_CONSULTATION"
  | "PRESCRIPTIONS"
  | "HEALTH_TESTS";

export type AdminPageLocale = "EN" | "PT" | "ES" | "CS" | "RO" | "DE";

export type AdminPageStatus = "DRAFT" | "PUBLISHED";

export type AdminPageDto = {
  id: string;
  countryId: string;
  pageKey: AdminPageKey;
  locale: AdminPageLocale;
  status: AdminPageStatus;
  title: string;
  body: string;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageAssetId: string | null;
  heroImagePath: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  ogImageAssetId: string | null;
  ogImagePath: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  lastReviewedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  country: { id: string; code: string; slug: string; name: string; defaultLocale: AdminPageLocale } | null;
  heroImage: { id: string; kind: string; key: string; path: string; altText: string | null } | null;
  ogImage: { id: string; kind: string; key: string; path: string; altText: string | null } | null;
};

type AdminPagesListPayload = {
  items: AdminPageDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type AdminPageDetailPayload = {
  page: AdminPageDto;
};

export const ADMIN_PAGE_KEY_LABELS: Record<AdminPageKey, string> = {
  HOME: "Home",
  DOCTORS_INDEX: "Doctors index",
  GENERAL_CONSULTATION: "GP consultation",
  SPECIALIST_CONSULTATION: "Specialist consultation",
  PRESCRIPTIONS: "Prescriptions",
  HEALTH_TESTS: "Health tests",
};

export const ADMIN_PAGE_KEYS: AdminPageKey[] = [
  "HOME",
  "DOCTORS_INDEX",
  "GENERAL_CONSULTATION",
  "SPECIALIST_CONSULTATION",
  "PRESCRIPTIONS",
  "HEALTH_TESTS",
];

export async function fetchAdminPages(query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        params.set(key, value);
      }
    }
  }
  const qs = params.toString();
  const path = qs ? `/api/admin/pages?${qs}` : "/api/admin/pages";
  return adminRequest<AdminPagesListPayload>(path);
}

export const fetchAdminPageById = cache(async (id: string) => {
  return adminRequest<AdminPageDetailPayload>(`/api/admin/pages/${id}`);
});

export async function postAdminPage(body: unknown) {
  return adminRequest<AdminPageDetailPayload>("/api/admin/pages", {
    method: "POST",
    body,
  });
}

export async function patchAdminPage(id: string, body: unknown) {
  return adminRequest<AdminPageDetailPayload>(`/api/admin/pages/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteAdminPage(id: string) {
  return adminRequest<AdminPageDetailPayload>(`/api/admin/pages/${id}`, {
    method: "DELETE",
  });
}

export async function purgeAdminPage(id: string) {
  return adminRequest<{ deleted: true }>(`/api/admin/pages/${id}/purge`, {
    method: "DELETE",
  });
}
