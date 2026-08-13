import { cache } from "react";
import { adminRequest } from "./core";

/* ─────────────────────────────────────────────────────────────
   Blog posts (admin) — backed by /api/admin/blog
   ───────────────────────────────────────────────────────────── */

export type AdminBlogStatus = "DRAFT" | "PUBLISHED";
export type AdminBlogLocale = "EN" | "PT" | "ES" | "CS" | "RO" | "DE";

export const ADMIN_BLOG_LOCALES: AdminBlogLocale[] = ["EN", "PT", "ES", "CS", "RO", "DE"];

export type BlogTranslationDto = {
  id: string;
  postId: string;
  locale: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  seoTitle: string | null;
  seoDesc: string | null;
  /** Alt text for the shared cover image, written in this locale. */
  coverImageAlt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BlogPostCountryDto = {
  id: string;
  postId: string;
  countryId: string;
  country: { id: string; code: string; name: string };
  createdAt: string;
};

export type AdminBlogDto = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  status: AdminBlogStatus;
  locale: AdminBlogLocale;
  category: string | null;
  authorDisplayName: string | null;
  reviewerDisplayName: string | null;
  authorDoctorId: string | null;
  reviewerDoctorId: string | null;
  ctaServiceId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  countryId: string | null;
  publishedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  country: { id: string; code: string; slug: string; name: string } | null;
  coverAsset: { id: string; path: string; altText: string | null } | null;
  translations: BlogTranslationDto[];
  countries: BlogPostCountryDto[];
};

type AdminBlogListPayload = {
  items: AdminBlogDto[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

type AdminBlogDetailPayload = { post: AdminBlogDto };

export async function fetchAdminBlogPosts(query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        params.set(key, value);
      }
    }
  }
  const qs = params.toString();
  const path = qs ? `/api/admin/blog?${qs}` : "/api/admin/blog";
  return adminRequest<AdminBlogListPayload>(path);
}

export const fetchAdminBlogPostById = cache(async (id: string) => {
  return adminRequest<AdminBlogDetailPayload>(`/api/admin/blog/${id}`);
});

export async function postAdminBlogPost(body: unknown) {
  return adminRequest<AdminBlogDetailPayload>("/api/admin/blog", {
    method: "POST",
    body,
  });
}

export async function patchAdminBlogPost(id: string, body: unknown) {
  return adminRequest<AdminBlogDetailPayload>(`/api/admin/blog/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function purgeAdminBlogPost(id: string) {
  return adminRequest<{ deleted: true }>(`/api/admin/blog/${id}/purge`, {
    method: "DELETE",
  });
}

export async function fetchAdminBlogTranslations(postId: string) {
  return adminRequest<{ translations: BlogTranslationDto[] }>(
    `/api/admin/blog/${postId}/translations`,
  );
}

export async function putAdminBlogTranslation(postId: string, locale: string, body: unknown) {
  return adminRequest<{ translation: BlogTranslationDto }>(
    `/api/admin/blog/${postId}/translations/${locale}`,
    { method: "PUT", body },
  );
}

export async function deleteAdminBlogTranslation(postId: string, locale: string) {
  return adminRequest<Record<string, never>>(
    `/api/admin/blog/${postId}/translations/${locale}`,
    { method: "DELETE" },
  );
}

export async function putAdminBlogPostCountries(postId: string, countryIds: string[]) {
  return adminRequest<Record<string, never>>(
    `/api/admin/blog/${postId}/countries`,
    { method: "PUT", body: { countryIds } },
  );
}
