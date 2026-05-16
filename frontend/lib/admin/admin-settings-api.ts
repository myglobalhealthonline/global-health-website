import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { ReviewConfig } from "@/lib/api/reviews-config";

const DEFAULT_ADMIN_API_BASE_URL = "http://localhost:4000";

function getAdminApiBaseUrl() {
  return (
    process.env.ADMIN_API_BASE_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
    DEFAULT_ADMIN_API_BASE_URL
  );
}

function getAdminApiToken() {
  return process.env.ADMIN_API_TOKEN ?? "";
}

function isAdminTokenFallbackEnabled() {
  const raw = process.env.ADMIN_TOKEN_FALLBACK_ENABLED;
  if (raw === undefined) return process.env.NODE_ENV !== "production";
  return raw === "true";
}

// RFC 6265 cookie-name token rule. Mirrors admin-api.ts — see the comment
// there for why we filter defensively.
const VALID_COOKIE_NAME = /^[!#$%&'*+\-.0-9A-Z^_`a-z|~]+$/;

type AdminApiResponse<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string; status?: number };

async function adminRequest<T>(
  path: string,
  init?: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown },
): Promise<AdminApiResponse<T>> {
  const allCookies = (await cookies()).getAll();
  const validCookies = allCookies.filter((entry) => VALID_COOKIE_NAME.test(entry.name));
  const cookieHeader = validCookies
    .map((entry) => `${entry.name}=${entry.value}`)
    .join("; ");
  const token = getAdminApiToken();
  const tokenFallbackEnabled = isAdminTokenFallbackEnabled();

  try {
    const headers: Record<string, string> = {};
    if (init?.body !== undefined) headers["Content-Type"] = "application/json";
    if (cookieHeader) headers.cookie = cookieHeader;
    if (!cookieHeader && tokenFallbackEnabled && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${getAdminApiBaseUrl()}${path}`, {
      method: init?.method ?? "GET",
      headers,
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });

    const json = (await response.json()) as {
      ok?: boolean;
      message?: string;
      data?: T;
    };

    if (!response.ok || !json.ok) {
      return {
        ok: false,
        message: json.message ?? "Admin request failed",
        status: response.status,
      };
    }
    return { ok: true, data: json.data as T, message: json.message };
  } catch {
    return { ok: false, message: "Admin backend is unavailable" };
  }
}

/** Admin fetcher for the review-provider config. Returns the same shape
 *  the public endpoint does — keeps the form types identical. */
export const fetchAdminReviewSettings = cache(async () => {
  return adminRequest<ReviewConfig>("/api/admin/settings/reviews");
});

export type ReviewSettingsPatchBody = {
  trustpilot?: {
    businessUnitId?: string | null;
    aggregate?: { rating: number; count: number } | null;
  };
  google?: {
    placeId?: string | null;
    aggregate?: { rating: number; count: number } | null;
  };
  doctify?: {
    clinicId?: string | null;
    aggregate?: { rating: number; count: number } | null;
  };
  primaryProvider?: "TRUSTPILOT" | "GOOGLE" | "DOCTIFY" | null;
};

export async function patchAdminReviewSettings(body: ReviewSettingsPatchBody) {
  return adminRequest<ReviewConfig>("/api/admin/settings/reviews", {
    method: "PATCH",
    body,
  });
}
