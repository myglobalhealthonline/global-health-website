import { timingSafeEqual } from "node:crypto";

export type AdminAccessResult =
  | { ok: true; method: "session" | "token_fallback" }
  | { ok: false; status: 401 | 403 | 503; message: string };

export type EvaluateAdminAccessInput = {
  sessionRole: "PATIENT" | "ADMIN" | "DOCTOR" | "LOCAL_ADMIN" | "SUPER_ADMIN" | "CORPORATE_ADMIN" | null;
  authorizationHeader: string | undefined;
  expectedToken: string | undefined;
  tokenFallbackEnabled: boolean;
};

export function evaluateAdminAccess(input: EvaluateAdminAccessInput): AdminAccessResult {
  if (input.sessionRole === "ADMIN" || input.sessionRole === "SUPER_ADMIN" || input.sessionRole === "LOCAL_ADMIN") {
    return { ok: true, method: "session" };
  }
  if (
    input.sessionRole === "PATIENT" ||
    input.sessionRole === "DOCTOR" ||
    input.sessionRole === "CORPORATE_ADMIN"
  ) {
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
  if (providedToken.length === 0 || !constantTimeEqual(providedToken, input.expectedToken)) {
    return { ok: false, status: 401, message: "Invalid admin token" };
  }

  return { ok: true, method: "token_fallback" };
}

/** Length-agnostic constant-time string compare. `timingSafeEqual`
 *  throws on unequal lengths; we equalise via the longer of the two so
 *  the comparison itself doesn't short-circuit on length mismatch. */
function constantTimeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) {
    // Still touch both buffers to keep the timing flat.
    const pad = Buffer.alloc(Math.max(aBuf.length, bBuf.length));
    timingSafeEqual(pad.subarray(0, aBuf.length), aBuf);
    timingSafeEqual(pad.subarray(0, bBuf.length), bBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

