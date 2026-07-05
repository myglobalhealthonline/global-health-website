import { cache } from "react";
import { adminRequest } from "./core";

export type AdminAssetKind = "IMAGE" | "ICON" | "LOGO" | "BADGE" | "SOCIAL";

export type AdminAssetDto = {
  id: string;
  countryId: string | null;
  doctorId: string | null;
  kind: AdminAssetKind;
  key: string;
  path: string;
  altText: string | null;
  title: string | null;
  caption: string | null;
  description: string | null;
  usageNote: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  country: { id: string; code: string; name: string } | null;
  doctor: { id: string; fullName: string; slug: string } | null;
};

type AdminAssetsListPayload = {
  items: AdminAssetDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type AdminAssetDetailPayload = {
  asset: AdminAssetDto;
};

export async function fetchAdminAssets(query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        params.set(key, value);
      }
    }
  }
  const qs = params.toString();
  const path = qs ? `/api/admin/assets?${qs}` : "/api/admin/assets";
  return adminRequest<AdminAssetsListPayload>(path);
}

export const fetchAdminAssetById = cache(async (id: string) => {
  return adminRequest<AdminAssetDetailPayload>(`/api/admin/assets/${id}`);
});

export async function postAdminAsset(body: unknown) {
  return adminRequest<AdminAssetDetailPayload>("/api/admin/assets", {
    method: "POST",
    body,
  });
}

export async function patchAdminAsset(id: string, body: unknown) {
  return adminRequest<AdminAssetDetailPayload>(`/api/admin/assets/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteAdminAsset(id: string) {
  return adminRequest<AdminAssetDetailPayload>(`/api/admin/assets/${id}`, {
    method: "DELETE",
  });
}

export async function purgeAdminAsset(id: string) {
  return adminRequest<Record<string, never>>(`/api/admin/assets/${id}/purge`, {
    method: "DELETE",
  });
}

export function adminAssetPreviewable(kind: AdminAssetKind, path: string): boolean {
  if (kind !== "IMAGE" && kind !== "LOGO") return false;
  return path.startsWith("/") || path.startsWith("https://");
}
