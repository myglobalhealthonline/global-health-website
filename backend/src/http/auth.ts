import type { IncomingMessage, ServerResponse } from "node:http";
import { verifyAdminSession, type AdminSessionPayload } from "../../lib/auth/session.js";
import { sendUnauthenticated } from "./envelope.js";

const SESSION_COOKIE = process.env.AUTH_COOKIE_NAME?.trim() || "gh_admin_session";

function readBearerToken(req: IncomingMessage): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function readCookieToken(req: IncomingMessage): string | null {
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

/**
 * Resolves the session from the request, accepting either:
 *   1. Authorization: Bearer <jwt>  (canonical — mobile path)
 *   2. Cookie: gh_admin_session=<jwt>  (web convenience)
 */
export async function resolveSession(req: IncomingMessage): Promise<AdminSessionPayload | null> {
  const token = readBearerToken(req) ?? readCookieToken(req);
  if (!token) return null;
  return verifyAdminSession(token);
}

/**
 * Use at the top of any protected handler. Sends a 401 envelope and returns null
 * when there's no valid session, so the caller can early-return.
 *
 *   const session = await requireAdmin(req, res);
 *   if (!session) return;
 */
export async function requireAdmin(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<AdminSessionPayload | null> {
  const session = await resolveSession(req);
  if (!session) {
    sendUnauthenticated(res);
    return null;
  }
  return session;
}

/** Sub-flavour: require SUPER_ADMIN specifically. Sends 403 if only ADMIN. */
export async function requireSuperAdmin(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<AdminSessionPayload | null> {
  const session = await requireAdmin(req, res);
  if (!session) return null;
  if (session.role !== "SUPER_ADMIN") {
    res.statusCode = 403;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: false, error: { code: "FORBIDDEN", message: "Super admin required" } }));
    return null;
  }
  return session;
}
