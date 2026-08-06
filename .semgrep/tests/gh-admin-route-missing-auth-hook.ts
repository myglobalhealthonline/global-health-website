import type { FastifyPluginAsync } from "fastify";
import { verifyAdminAccess } from "../../utils/admin-auth.js";
import { verifyGlobalAdminAccess } from "../../utils/admin-auth.js";
import { requireManageSubscriptions } from "../../utils/manage-subscriptions-auth.js";
import { requireManageMemberships } from "../../utils/manage-memberships-auth.js";

// An admin route with no recognized admin gate anywhere in the file.
const unguardedAdminRoute: FastifyPluginAsync = async (app) => {
  // ruleid: gh-admin-route-missing-auth-hook
  app.get("/api/admin/reports/x", async (request, reply) => {
    return reply.send({ ok: true });
  });
};
export default unguardedAdminRoute;

// Standard plugin-scoped onRequest hook shape.
const hookGuardedRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send({ ok: false });
  });
  // ok: gh-admin-route-missing-auth-hook
  app.get("/api/admin/reports/y", async (request, reply) => {
    return reply.send({ ok: true });
  });
};

// Stricter verifyGlobalAdminAccess variant.
const globalAdminGuardedRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyGlobalAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send({ ok: false });
  });
  // ok: gh-admin-route-missing-auth-hook
  app.get("/api/admin/settings", async (request, reply) => {
    return reply.send({ ok: true });
  });
};

// Subscription-specific admin gate, called inline per-handler rather than
// via a plugin hook (admin-plans.route.ts pattern).
const manageSubscriptionsGuardedRoute: FastifyPluginAsync = async (app) => {
  // ok: gh-admin-route-missing-auth-hook
  app.get("/api/admin/subscriptions/plans", async (request, reply) => {
    if (!(await requireManageSubscriptions(request, reply))) return;
    return reply.send({ ok: true });
  });
};

// Membership-specific admin gate, called inline per-handler
// (admin-membership-plans.route.ts pattern).
const manageMembershipsGuardedRoute: FastifyPluginAsync = async (app) => {
  // ok: gh-admin-route-missing-auth-hook
  app.get("/api/admin/membership-plans", async (request, reply) => {
    if (!(await requireManageMemberships(request, reply))) return;
    return reply.send({ ok: true });
  });
};

// A membership admin route that imports the gate but never calls it — the case
// the rule has to keep catching now that the gate is on the allowlist.
const unguardedMembershipRoute: FastifyPluginAsync = async (app) => {
  // ruleid: gh-admin-route-missing-auth-hook
  app.post("/api/admin/membership-plans/:planId/levels", async (request, reply) => {
    return reply.send({ ok: true });
  });
};

// Dependency-injected verifyAdminAccess, called as dependencies.verifyAdminAccess
// (admin-seo-landing.route.ts / admin-doctor-time-slots.route.ts factory pattern).
type Dependencies = { verifyAdminAccess: typeof verifyAdminAccess };
const defaultDependencies: Dependencies = { verifyAdminAccess };

export function createDiGuardedRoute(
  overrides: Partial<Dependencies> = {},
): FastifyPluginAsync {
  const dependencies = { ...defaultDependencies, ...overrides };
  return async (app) => {
    app.addHook("onRequest", async (request, reply) => {
      const auth = await dependencies.verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send({ ok: false });
    });
    // ok: gh-admin-route-missing-auth-hook
    app.get("/api/admin/seo-landing/:id", async (request, reply) => {
      return reply.send({ ok: true });
    });
  };
}
