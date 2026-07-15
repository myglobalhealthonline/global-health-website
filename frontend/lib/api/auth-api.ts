const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

/** Wire-format locale code (Prisma `LocaleCode` enum) — uppercase, unlike
 *  the frontend's lowercase `LocaleCode` (`lib/i18n/types.ts`) used in URLs
 *  and the `gh_locale` cookie. Convert with `.toLowerCase()` at the
 *  boundary (see the login flow seeding `gh_locale` from this field). */
export type UserPreferredLocale = "EN" | "PT" | "ES" | "CS" | "RO" | "DE";

// Explicit allowlist of non-/api/auth paths this module is permitted to
// call — same reasoning as the /api/auth/[...path] proxy's ROUTE_TABLE:
// keep this file from silently growing into a general-purpose fetch helper.
const EXTRA_ALLOWED_PATHS = new Set(["/api/account/security/sign-out-all"]);

function resolveAuthFetchUrl(path: string): string | null {
  if (!path.startsWith("/api/auth") && !EXTRA_ALLOWED_PATHS.has(path)) return null;
  // Browser: same-origin Route Handler proxies to Fastify so the session cookie is scoped to the site host.
  if (typeof window !== "undefined") return path;
  if (!API_URL) return null;
  return `${API_URL}${path}`;
}

type AuthResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string; status?: number };

async function authRequest<T>(
  path: string,
  options: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown } = {},
): Promise<AuthResult<T>> {
  const url = resolveAuthFetchUrl(path);
  if (!url) {
    return { ok: false, message: "Public API URL is not configured" };
  }
  try {
    const hasBody = options.body !== undefined;
    const response = await fetch(url, {
      method: options.method ?? "GET",
      credentials: "include",
      headers: hasBody ? { "Content-Type": "application/json" } : undefined,
      body: hasBody ? JSON.stringify(options.body) : undefined,
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
  /** Canonical patient DOB. ISO date string (YYYY-MM-DD…) or null.
   *  Checkout / fallback intake prefill from this so the patient
   *  doesn't retype it every booking. */
  dateOfBirth: string | null;
  role: "PATIENT" | "ADMIN" | "DOCTOR" | "LOCAL_ADMIN" | "SUPER_ADMIN" | "CORPORATE_ADMIN";
  emailVerifiedAt: string | null;
  isActive: boolean;
  /** Set when a GDPR deletion request is pending (30-day grace period).
   *  ISO datetime or null. */
  deletionScheduledAt: string | null;
  /** Last language explicitly chosen while authenticated, or null if never
   *  set. Uppercase wire format — see `UserPreferredLocale`. */
  preferredLocale: UserPreferredLocale | null;
  createdAt: string;
  updatedAt: string;
};

export async function registerUser(input: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  acceptTerms: boolean;
}) {
  // user is null when the email was already registered — the backend
  // returns the same shape/status either way (S-024, account-enumeration
  // defense) and emails the existing account instead.
  return authRequest<{ user: AuthUser | null }>("/api/auth/register", {
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

export async function patchCurrentUser(input: {
  fullName?: string;
  phone?: string | null;
  /** Pass YYYY-MM-DD to set the DOB, null to clear. */
  dateOfBirth?: string | null;
  /** Pass an uppercase LocaleCode to record the explicit language choice,
   *  null to clear it. */
  preferredLocale?: UserPreferredLocale | null;
}) {
  return authRequest<{ user: AuthUser }>("/api/auth/me", {
    method: "PATCH",
    body: input,
  });
}

export async function requestPasswordReset(input: { email: string }) {
  return authRequest<{ accepted: true }>("/api/auth/forgot-password", {
    method: "POST",
    body: input,
  });
}

export async function changeCurrentPassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  return authRequest<{ user: AuthUser }>("/api/auth/change-password", {
    method: "POST",
    body: input,
  });
}

export async function resendVerificationEmail() {
  return authRequest<{ accepted?: true; alreadyVerified?: true }>(
    "/api/auth/resend-verification",
    { method: "POST" },
  );
}

export async function confirmEmailWithToken(token: string) {
  return authRequest<{ verified: true }>("/api/auth/verify-email", {
    method: "POST",
    body: { token },
  });
}

/** GDPR: schedule the signed-in user's account for deletion after a 30-day
 *  grace period. The account stays functional until then. */
export async function deleteOwnAccount() {
  return authRequest<{ deletionScheduledAt: string }>("/api/auth/me", { method: "DELETE" });
}

/** Cancel a pending grace-period account deletion. */
export async function cancelAccountDeletion() {
  return authRequest<{ cancelled: true }>("/api/auth/me/cancel-deletion", { method: "POST" });
}

/** Sign out of all devices — bumps tokenVersion server-side and clears the
 *  current session cookie, so the caller (this device included) is logged
 *  out immediately. */
export async function signOutAllDevices() {
  return authRequest<{ signedOut: true }>("/api/account/security/sign-out-all", { method: "POST" });
}

// ─── Two-factor authentication (TOTP) ────────────────────────────────────

export async function fetchTwoFactorStatus() {
  return authRequest<{ twoFactorEnabled: boolean; twoFactorEnabledAt: string | null }>(
    "/api/auth/2fa/status",
  );
}

/** Step 1: generate a TOTP secret + otpauth URI + backup codes. Nothing is
 *  persisted server-side until `confirmTwoFactor` succeeds. */
export async function setupTwoFactor() {
  return authRequest<{ secret: string; qrUri: string; backupCodes: string[] }>(
    "/api/auth/2fa/setup",
    { method: "POST" },
  );
}

/** Step 2: verify a code from the authenticator app and enable 2FA. The
 *  secret + backup codes round-trip from the setup response. Requires the
 *  account's current password (S-007a) — an already-authenticated session
 *  alone can't silently enroll a new 2FA secret. */
export async function confirmTwoFactor(input: {
  token: string;
  secret: string;
  backupCodes: string[];
  currentPassword: string;
}) {
  return authRequest<{ enabled: true }>("/api/auth/2fa/confirm", {
    method: "POST",
    body: input,
  });
}

export async function disableTwoFactor(input: { currentPassword: string }) {
  return authRequest<{ disabled: true }>("/api/auth/2fa/disable", {
    method: "POST",
    body: input,
  });
}

/** GDPR: trigger a JSON download of everything we hold on the user. */
export function downloadOwnDataUrl(): string {
  // Same-origin Route Handler proxy honours the session cookie so the
  // browser's native download flow works without extra plumbing.
  return "/api/auth/me/export";
}
