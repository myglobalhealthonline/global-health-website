import "server-only";
import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/server/backend-origin";

const DEFAULT_ADMIN_API_BASE_URL = "http://localhost:4000";

function getAdminApiBaseUrl() {
  return getBackendOrigin() || DEFAULT_ADMIN_API_BASE_URL;
}

function getAdminApiToken() {
  return process.env.ADMIN_API_TOKEN ?? "";
}

function isAdminTokenFallbackEnabled() {
  const raw = process.env.ADMIN_TOKEN_FALLBACK_ENABLED;
  // Default ON only in local development — matches the backend rule in
  // backend/src/config/env.ts. Staging/preview (NODE_ENV !== "development")
  // must opt in explicitly so the Bearer-token admin bypass never ships
  // silently to an internet-reachable non-prod environment.
  if (raw === undefined) return process.env.NODE_ENV === "development";
  return raw === "true";
}

export type AdminApiResponse<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string; status?: number };

type AdminErrorDetails = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
};

function formatAdminErrorMessage(message: string | undefined, details: unknown) {
  const fallback = message ?? "Admin request failed";
  if (!details || typeof details !== "object") return fallback;

  const typed = details as AdminErrorDetails;
  const formError = typed.formErrors?.find(Boolean);
  if (formError) {
    return `${fallback}: ${formError}`;
  }

  const fieldEntry = Object.entries(typed.fieldErrors ?? {}).find(([, errors]) => Array.isArray(errors) && errors.length > 0);
  if (!fieldEntry) return fallback;

  const [field, errors] = fieldEntry;
  return `${fallback}: ${field} ${errors![0]}`;
}

// RFC 6265 token rule for cookie names: no control chars, separators, or
// whitespace. Earlier we shipped a bug that briefly stored a stub function
// body as a cookie name (whitespace + braces). If that cookie is still in a
// user's browser, forwarding it via the `Cookie` header corrupts the request
// and the backend rejects it. We filter defensively so the bad cookie can't
// poison any future admin save.
const VALID_COOKIE_NAME = /^[!#$%&'*+\-.0-9A-Z^_`a-z|~]+$/;

export async function adminRequest<T>(
  path: string,
  init?: {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    body?: unknown;
  },
): Promise<AdminApiResponse<T>> {
  try {
    const allCookies = (await cookies()).getAll();
    const validCookies = allCookies.filter((entry) => VALID_COOKIE_NAME.test(entry.name));
    if (validCookies.length !== allCookies.length && process.env.NODE_ENV !== "production") {
      // Dev-only diagnostic — this is a stale-localhost-cookie hint, not a
      // production concern, so don't spam prod logs on every request.
      const dropped = allCookies
        .filter((entry) => !VALID_COOKIE_NAME.test(entry.name))
        .map((entry) => entry.name.slice(0, 40));

      console.warn(
        `[admin-api] Dropped ${dropped.length} malformed cookie(s) before forwarding to backend. ` +
          "Clear localhost cookies in DevTools to remove them from your browser.",
      );
    }
    const cookieHeader = validCookies
      .map((entry) => `${entry.name}=${entry.value}`)
      .join("; ");
    const token = getAdminApiToken();
    const tokenFallbackEnabled = isAdminTokenFallbackEnabled();

    const headers: Record<string, string> = {};
    if (init?.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (cookieHeader) {
      headers.cookie = cookieHeader;
    }
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
      details?: unknown;
    };

    if (!response.ok || !json.ok) {
      return {
        ok: false,
        message: formatAdminErrorMessage(json.message, json.details),
        status: response.status,
      };
    }

    return {
      ok: true,
      data: json.data as T,
      message: json.message,
    };
  } catch {
    return { ok: false, message: "Admin backend is unavailable" };
  }
}

/**
 * POST multipart/form-data to the admin API with the same cookie/token
 * forwarding as `adminRequest`. `Content-Type` is deliberately left unset so
 * fetch writes the multipart boundary itself.
 */
export async function adminPostMultipart<T>(
  path: string,
  body: FormData,
): Promise<AdminApiResponse<T>> {
  try {
    const allCookies = (await cookies()).getAll();
    const validCookies = allCookies.filter((entry) => VALID_COOKIE_NAME.test(entry.name));
    const cookieHeader = validCookies.map((e) => `${e.name}=${e.value}`).join("; ");
    const token = getAdminApiToken();
    const tokenFallbackEnabled = isAdminTokenFallbackEnabled();

    const headers: Record<string, string> = {};
    if (cookieHeader) headers.cookie = cookieHeader;
    if (!cookieHeader && tokenFallbackEnabled && token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${getAdminApiBaseUrl()}${path}`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });
    const json = (await response.json()) as {
      ok?: boolean;
      message?: string;
      data?: T;
      details?: unknown;
    };
    if (!response.ok || !json.ok) {
      return {
        ok: false,
        message: formatAdminErrorMessage(json.message ?? "Upload failed", json.details),
        status: response.status,
      };
    }
    return { ok: true, data: json.data as T, message: json.message };
  } catch {
    return { ok: false, message: "Admin backend is unavailable" };
  }
}

export async function adminUploadFile(
  file: File,
): Promise<AdminApiResponse<{ key: string; publicUrl: string }>> {
  const body = new FormData();
  body.append("file", file);
  return adminPostMultipart<{ key: string; publicUrl: string }>("/api/admin/media/upload", body);
}
