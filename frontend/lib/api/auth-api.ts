const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

type AuthResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string; status?: number };

async function authRequest<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<AuthResult<T>> {
  if (!API_URL) {
    return { ok: false, message: "Public API URL is not configured" };
  }
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const json = (await response.json()) as { ok?: boolean; data?: T; message?: string };
    if (!response.ok || !json.ok) {
      return {
        ok: false,
        message: json.message ?? "Authentication request failed",
        status: response.status,
      };
    }
    return { ok: true, data: json.data as T, message: json.message };
  } catch {
    return { ok: false, message: "Backend is unavailable" };
  }
}

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: "PATIENT" | "ADMIN";
  emailVerifiedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function registerUser(input: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}) {
  return authRequest<{ user: AuthUser }>("/api/auth/register", {
    method: "POST",
    body: input,
  });
}

export async function loginUser(input: { email: string; password: string }) {
  return authRequest<{ user: AuthUser }>("/api/auth/login", {
    method: "POST",
    body: input,
  });
}

export async function logoutUser() {
  return authRequest<{ loggedOut: true }>("/api/auth/logout", { method: "POST" });
}

export async function fetchCurrentUser() {
  return authRequest<{ user: AuthUser }>("/api/auth/me");
}

export async function requestPasswordReset(input: { email: string }) {
  return authRequest<{ accepted: true }>("/api/auth/forgot-password", {
    method: "POST",
    body: input,
  });
}
