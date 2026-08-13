import type { FastifyPluginAsync } from "fastify";
import { verifyAuthToken } from "../../utils/auth-session.js";
import { verifyAdminAccess } from "../../utils/admin-auth.js";
import { resolveOptionalAuthUser } from "../../utils/request-auth.js";

// verifyAuthToken is the ONLY identity check — a stale/revoked session (role
// change, deactivation, "sign out of all devices") still passes until the
// JWT naturally expires, since verifyAuthToken never re-checks tokenVersion.
const rawTokenOnlyRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/services/:slug", async (request, reply) => {
    const token = request.cookies["gh_auth"];
    // ruleid: gh-route-raw-token-verify
    const payload = token ? verifyAuthToken(token) : null;
    return reply.send({ userId: payload?.sub ?? null });
  });
};
export default rawTokenOnlyRoute;

// A real authz gate (verifyAdminAccess) already ran; verifyAuthToken here is
// only resolving an actor id for audit attribution afterward.
const gatedThenAttributedRoute: FastifyPluginAsync = async (app) => {
  app.post("/api/admin/patient-anonymize", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send({ ok: false });
    const cookieToken = request.cookies["gh_auth"];
    // ok: gh-route-raw-token-verify
    const payload = cookieToken ? verifyAuthToken(cookieToken) : null;
    const adminId = payload?.sub ?? "token-fallback-admin";
    return reply.send({ adminId });
  });
};

// resolveOptionalAuthUser already ran (which itself re-checks tokenVersion
// and DB user state) before the raw verifyAuthToken attribution call.
const optionalAuthThenAttributedRoute: FastifyPluginAsync = async (app) => {
  app.post("/api/account/something", async (request, reply) => {
    const user = await resolveOptionalAuthUser(request);
    if (!user) return reply.status(401).send({ ok: false });
    const cookieToken = request.cookies["gh_auth"];
    // ok: gh-route-raw-token-verify
    const payload = cookieToken ? verifyAuthToken(cookieToken) : null;
    return reply.send({ actorId: payload?.sub });
  });
};
