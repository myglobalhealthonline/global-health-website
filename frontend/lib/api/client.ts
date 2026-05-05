const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

type ApiClientOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  cache?: RequestCache;
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

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: options.cache ?? "no-store",
    });

    const json = (await response.json()) as {
      ok?: boolean;
      data?: T;
      message?: string;
    };

    if (!response.ok || !json.ok) {
      return {
        ok: false,
        status: response.status,
        message: json.message ?? "API request failed",
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
  }
}
