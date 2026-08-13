import type { FastifyPluginAsync } from "fastify";
import { isValidCronSecret } from "../../utils/cron-auth.js";
import { env } from "../../config/env.js";

// A scheduler-only endpoint with no shared-secret check at all — reachable
// by anyone who finds the URL.
const unguardedCronRoute: FastifyPluginAsync = async (app) => {
  // ruleid: gh-cron-route-missing-secret
  app.post("/api/cron/send-reminders", async (request, reply) => {
    return reply.send({ ok: true });
  });
};
export default unguardedCronRoute;

// Same problem under the /api/internal/ prefix used by the payment-reminder
// and review-invite scheduled jobs.
const unguardedInternalRoute: FastifyPluginAsync = async (app) => {
  // ruleid: gh-cron-route-missing-secret
  app.post("/api/internal/run-something", async (request, reply) => {
    return reply.send({ ok: true });
  });
};

// Correctly gated: fails closed if CRON_SECRET is unset, then checks the
// header via isValidCronSecret's constant-time comparison.
const guardedCronRoute: FastifyPluginAsync = async (app) => {
  // ok: gh-cron-route-missing-secret
  app.post("/api/cron/abandoned-carts", async (request, reply) => {
    const expected = env.CRON_SECRET;
    const provided = request.headers["x-cron-token"];
    if (!expected) {
      return reply.status(503).send({ ok: false });
    }
    if (!isValidCronSecret(provided, expected)) {
      return reply.status(401).send({ ok: false });
    }
    return reply.send({ ok: true });
  });
};

// A file that mixes a genuinely public route with a gated internal route
// (review-invites.route.ts pattern) — the public route must not be flagged
// just because it shares a file with a gated /api/internal/ endpoint.
const mixedPublicAndInternalRoute: FastifyPluginAsync = async (app) => {
  // ok: gh-cron-route-missing-secret
  app.get("/api/public/reviews/rate", async (request, reply) => {
    return reply.send({ ok: true });
  });
  // ok: gh-cron-route-missing-secret
  app.post("/api/internal/send-review-invite", async (request, reply) => {
    const provided = request.headers["x-cron-secret"];
    if (!isValidCronSecret(provided, env.CRON_SECRET)) {
      return reply.status(401).send({ ok: false });
    }
    return reply.send({ ok: true });
  });
};
