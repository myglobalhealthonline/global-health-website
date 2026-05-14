import "server-only";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ADMIN_AUTH_COOKIE_NAME } from "@/lib/auth/admin-session-cookie";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import type { ApiError, ApiResponse, FieldErrors } from "@gh/shared";

/**
 * Server-side HTTP client for the admin API.
 *
 * Forwards the current admin session cookie as a Bearer token so the backend
 * can validate identity. Also applies any `revalidate` paths the backend
 * echoes back on mutations, so cache invalidation crosses the service boundary.
 *
 * Use from Server Actions and Server Components only. Never imported into
 * client components.
 */

export type AdminApiOk<T> = { ok: true; data: T };
export type AdminApiErr = { ok: false; error: ApiError };
export type AdminApiResult<T> = AdminApiOk<T> | AdminApiErr;

type Method = "GET" | "POST" | "PATCH" | "DELETE";

type AdminRequestInit = {
  method?: Method;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Cache strategy. Default no-store for admin (always fresh). */
  cache?: RequestCache;
  /** Optional Next.js cache tags. */
  tags?: string[];
};

async function readAdminToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ADMIN_AUTH_COOKIE_NAME)?.value ?? null;
}

function buildQuery(query?: AdminRequestInit["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    params.set(k, String(v));
  }
  const out = params.toString();
  return out ? `?${out}` : "";
}

export async function adminApi<T>(
  path: string,
  init: AdminRequestInit = {},
): Promise<AdminApiResult<T>> {
  const origin = getBackendOrigin();
  if (!origin) {
    return notConfigured();
  }
  const token = await readAdminToken();
  if (!token) {
    return {
      ok: false,
      error: { code: "UNAUTHENTICATED", message: "Not authenticated" },
    };
  }

  const url = `${origin}${path}${buildQuery(init.query)}`;
  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    accept: "application/json",
  };
  const body = init.body !== undefined ? JSON.stringify(init.body) : undefined;
  if (body !== undefined) headers["content-type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(url, {
      method: init.method ?? "GET",
      headers,
      body,
      cache: init.cache ?? "no-store",
      next: init.tags ? { tags: init.tags } : undefined,
    });
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: err instanceof Error ? err.message : "Backend unreachable",
      },
    };
  }

  // Parse the response envelope.
  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    // No JSON or malformed — fall through.
  }

  if (!payload) {
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: `Backend returned ${response.status} ${response.statusText}`,
      },
    };
  }

  if (payload.ok === false) {
    return { ok: false, error: payload.error };
  }

  // Apply revalidation hints from the backend.
  if ("revalidate" in payload && Array.isArray(payload.revalidate)) {
    for (const path of payload.revalidate) {
      try {
        revalidatePath(path);
      } catch {
        // ignore — revalidatePath is best-effort
      }
    }
  }

  return { ok: true, data: payload.data };
}

function notConfigured(): AdminApiErr {
  return {
    ok: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Backend API is not configured (set API_BASE_URL or NEXT_PUBLIC_API_URL).",
    },
  };
}

/** Helper: convert an error envelope into the legacy `ActionResult` shape used by forms. */
export function asActionResult<T>(
  result: AdminApiResult<T>,
): { ok: true; data: T } | { ok: false; message: string; fieldErrors?: FieldErrors } {
  if (result.ok) return { ok: true, data: result.data };
  return {
    ok: false,
    message: result.error.message,
    fieldErrors: result.error.fieldErrors,
  };
}
