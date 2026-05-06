const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

type ApiClientOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  cache?: RequestCache;
  credentials?: RequestCredentials;
  /** Abort the request after this many milliseconds (public content reads). */
  timeoutMs?: number;
};

export type ApiResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string; status?: number };

export function hasPublicApiBaseUrl() {
  return Boolean(API_URL);
}

export async function apiRequest<T>(
  path: string,
  options: ApiClientOptions = {},
): Promise<ApiResult<T>> {
  if (!API_URL) {
    return {
      ok: false,
      message: "Public API URL is not configured",
    };
  }

  const controller = options.timeoutMs ? new AbortController() : undefined;
  const timeout =
    controller && options.timeoutMs
      ? setTimeout(() => controller.abort(), options.timeoutMs)
      : undefined;

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      credentials: options.credentials,
      headers: {
        "Content-Type": "application/json",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: options.cache ?? "no-store",
      signal: controller?.signal,
    });

    const json = (await response.json()) as {
      ok?: boolean;
      data?: T;
      message?: string;
      details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
    };

    if (!response.ok || !json.ok) {
      let message = json.message ?? "API request failed";
      const fieldErrors = json.details?.fieldErrors;
      if (fieldErrors && typeof fieldErrors === "object") {
        const firstFieldMessage = Object.values(fieldErrors)
          .flat()
          .find((entry): entry is string => typeof entry === "string" && entry.length > 0);
        if (firstFieldMessage) {
          message = firstFieldMessage;
        }
      }
      return {
        ok: false,
        status: response.status,
        message,
      };
    }

    return {
      ok: true,
      data: json.data as T,
      message: json.message,
    };
  } catch {
    return {
      ok: false,
      message: "Backend is unavailable",
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
