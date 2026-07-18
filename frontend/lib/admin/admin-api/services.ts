import { cache } from "react";
import { adminRequest } from "./core";
import type { AdminServiceFaqDto } from "@/lib/api/admin-service-faq-api";

export type AdminSpecialtyTranslationDto = {
  id: string;
  locale: string;
  name: string;
  cardSummary: string | null;
};

export type AdminSpecialtyOptionDto = {
  id: string;
  countryId: string;
  slug: string;
  name: string;
  cardSummary: string | null;
  cardThemeColor: string | null;
  sortOrder: number;
  primaryServiceId: string | null;
  active: boolean;
  /** Per-locale CMS content for the translation tabs. */
  translations: AdminSpecialtyTranslationDto[];
  createdAt: string;
  updatedAt: string;
  primaryService: {
    id: string;
    slug: string;
    name: string;
    isActive: boolean;
  } | null;
  assets: Array<{
    id: string;
    kind: string;
    key: string;
    path: string;
    altText: string | null;
    usageNote: string | null;
  }>;
};

export type AdminServiceKind =
  | "GENERAL"
  | "SPECIALIST"
  | "PRESCRIPTION"
  | "HEALTH_TEST"
  | "HOME_DELIVERY";

export type AdminServiceTranslationDto = {
  id: string;
  locale: string;
  name: string;
  summary: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  heroTitle: string | null;
  heroDescription: string | null;
  detailBody: string | null;
  ctaLabel: string | null;
};

export type AdminServiceDto = {
  id: string;
  countryId: string;
  kind: AdminServiceKind;
  slug: string;
  name: string;
  summary: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  heroTitle: string | null;
  heroDescription: string | null;
  detailBody: string | null;
  ctaLabel: string | null;
  legacyPath: string | null;
  sortOrder: number;
  durationMinutes: number | null;
  basePriceCents: number | null;
  currencyCode: string | null;
  isActive: boolean;
  /** Per-locale CMS content for the translation tabs. The default-locale
   *  row mirrors the base display columns above; absent rows fall back to
   *  base at read time. */
  translations: AdminServiceTranslationDto[];
  /** Shipping fee charged per item at checkout (cents). 0 = no
   *  shipping line (the default — online consultations don't ship). */
  shippingCents: number;
  /** Additional product images. Hero image lives on `assets[0]`. */
  galleryImagePaths: string[];
  /** Doctor join rows for the admin assignment multi-select. Empty
   *  array means no doctors are bookable for this service yet. */
  /** Insurers that cover this service AND have at least one in-network doctor
   *  among its active assignments (so every option here is bookable).
   *  `doctorIds` are that insurer's in-network doctors — the manual-booking
   *  form intersects them with the service's doctors. */
  insuranceOptions?: Array<{
    companyId: string;
    name: string;
    insurancePriceCents: number;
    doctorIds: string[];
  }>;
  assignedDoctors: Array<{
    id: string;
    serviceId: string;
    doctorId: string;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
    doctor: {
      id: string;
      slug: string;
      fullName: string;
      countryId: string;
      active: boolean;
    };
  }>;
  createdAt: string;
  updatedAt: string;
  country: { id: string; code: string; name: string };
  assets: Array<{
    id: string;
    kind: string;
    key: string;
    path: string;
    altText: string | null;
    usageNote: string | null;
  }>;
};

type AdminServicesListPayload = {
  items: AdminServiceDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type AdminServiceDetailPayload = {
  service: AdminServiceDto;
};

type AdminSpecialtiesPayload = {
  specialties: AdminSpecialtyOptionDto[];
};

export async function fetchAdminServices(query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        params.set(key, value);
      }
    }
  }
  const qs = params.toString();
  const path = qs ? `/api/admin/services?${qs}` : "/api/admin/services";
  return adminRequest<AdminServicesListPayload>(path);
}

export const fetchAdminServiceById = cache(async (id: string) => {
  return adminRequest<AdminServiceDetailPayload>(`/api/admin/services/${id}`);
});

export const fetchAdminSpecialties = cache(async (countryId: string) => {
  const params = new URLSearchParams({ countryId });
  return adminRequest<AdminSpecialtiesPayload>(`/api/admin/specialties?${params.toString()}`);
});

export const fetchAdminSpecialtyById = cache(async (id: string) => {
  return adminRequest<AdminSpecialtyDetailPayload>(`/api/admin/specialties/${id}`);
});

type AdminSpecialtyDetailPayload = {
  specialty: AdminSpecialtyOptionDto;
};

export async function postAdminSpecialty(body: unknown) {
  return adminRequest<AdminSpecialtyDetailPayload>("/api/admin/specialties", {
    method: "POST",
    body,
  });
}

export async function patchAdminSpecialty(id: string, body: unknown) {
  return adminRequest<AdminSpecialtyDetailPayload>(`/api/admin/specialties/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteAdminSpecialty(id: string) {
  return adminRequest<AdminSpecialtyDetailPayload>(`/api/admin/specialties/${id}`, {
    method: "DELETE",
  });
}

export async function purgeAdminSpecialty(id: string) {
  return adminRequest<Record<string, never>>(`/api/admin/specialties/${id}/purge`, {
    method: "DELETE",
  });
}

export async function patchAdminServicesReorder(
  items: Array<{ id: string; sortOrder: number }>,
) {
  return adminRequest<Record<string, never>>("/api/admin/services/reorder", {
    method: "PATCH",
    body: { items },
  });
}

export async function patchAdminSpecialtiesReorder(
  items: Array<{ id: string; sortOrder: number }>,
) {
  return adminRequest<Record<string, never>>("/api/admin/specialties/reorder", {
    method: "PATCH",
    body: { items },
  });
}

export async function postAdminService(body: unknown) {
  return adminRequest<AdminServiceDetailPayload>("/api/admin/services", {
    method: "POST",
    body,
  });
}

export async function patchAdminService(id: string, body: unknown) {
  return adminRequest<AdminServiceDetailPayload>(`/api/admin/services/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteAdminService(id: string) {
  return adminRequest<AdminServiceDetailPayload>(`/api/admin/services/${id}`, {
    method: "DELETE",
  });
}

export type AdminPeakPricingDto = {
  id: string;
  serviceId: string;
  enabled: boolean;
  /** Legacy single-window columns (nullable, superseded by `windows`). */
  peakStartMinute: number | null;
  peakEndMinute: number | null;
  peakPriceCents: number;
  offPeakPriceCents: number;
  currencyCode: string;
  /** One or more peak windows (clinic-local minute-of-day). A window may
   *  carry its own price; null → the shared peakPriceCents. */
  windows: Array<{ startMinute: number; endMinute: number; priceCents: number | null }>;
};

export async function fetchAdminServicePeakPricing(id: string) {
  return adminRequest<{ config: AdminPeakPricingDto | null }>(
    `/api/admin/services/${id}/peak-pricing`,
  );
}

export async function putAdminServicePeakPricing(id: string, body: unknown) {
  return adminRequest<{ config: AdminPeakPricingDto }>(
    `/api/admin/services/${id}/peak-pricing`,
    { method: "PUT", body },
  );
}

export async function purgeAdminService(id: string) {
  return adminRequest<Record<string, never>>(`/api/admin/services/${id}/purge`, {
    method: "DELETE",
  });
}

// ─── Service FAQ admin API ────────────────────────────────────────────────────

/** FAQ mutations (create/update/delete/reorder) live in
 *  lib/api/admin-service-faq-api.ts — those run client-side via apiRequest
 *  against the same-origin proxy route. This module only needs the
 *  server-side (RSC) list fetch. */
export async function fetchAdminServiceFaqs(serviceId: string) {
  return adminRequest<{ faqs: AdminServiceFaqDto[] }>(
    `/api/admin/services/${serviceId}/faqs`,
  );
}

// ── Service internal-link callouts ───────────────────────────────────────────
export type AdminServiceLinkType = "UPGRADE" | "ENTRY" | "REFERRAL" | "COMPLEMENTARY";

export type AdminServiceLinkTranslationDto = {
  id: string;
  locale: string;
  heading: string;
  body: string | null;
  ctaLabel: string;
};

export type AdminServiceLinkDto = {
  id: string;
  type: AdminServiceLinkType;
  targetServiceId: string | null;
  targetHref: string | null;
  targetSlug: string | null;
  targetName: string | null;
  priority: number;
  isActive: boolean;
  anchorSlot: string | null;
  translations: AdminServiceLinkTranslationDto[];
};

export const fetchAdminServiceLinks = cache(async (serviceId: string) => {
  return adminRequest<{ serviceId: string; links: AdminServiceLinkDto[] }>(
    `/api/admin/services/${serviceId}/links`,
  );
});

export async function putAdminServiceLinks(serviceId: string, body: unknown) {
  return adminRequest<{ links: AdminServiceLinkDto[] }>(
    `/api/admin/services/${serviceId}/links`,
    { method: "PUT", body },
  );
}
