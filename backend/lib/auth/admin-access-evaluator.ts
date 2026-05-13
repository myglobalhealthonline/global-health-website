export type AdminAccessResult =
  | { ok: true; method: "session" | "token_fallback" }
  | { ok: false; status: 401 | 403 | 503; message: string };

export type EvaluateAdminAccessInput = {
  sessionRole: "PATIENT" | "ADMIN" | null;
  authorizationHeader: string | undefined;
  expectedToken: string | undefined;
  tokenFallbackEnabled: boolean;
};

export function evaluateAdminAccess(input: EvaluateAdminAccessInput): AdminAccessResult {
  if (input.sessionRole === "ADMIN") {
    return { ok: true, method: "session" };
  }
  if (input.sessionRole === "PATIENT") {
    return { ok: false, status: 403, message: "Admin role required" };
  }

  if (!input.tokenFallbackEnabled) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }

  if (!input.expectedToken) {
    return { ok: false, status: 503, message: "Admin token fallback is not configured" };
  }
  if (!input.authorizationHeader?.startsWith("Bearer ")) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }

  const providedToken = input.authorizationHeader.slice("Bearer ".length).trim();
  if (providedToken.length === 0 || providedToken !== input.expectedToken) {
    return { ok: false, status: 401, message: "Invalid admin token" };
  }

  return { ok: true, method: "token_fallback" };
}

