import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { after, before, describe, it } from "node:test";
import cookie from "@fastify/cookie";
import Fastify, { type FastifyInstance, type FastifyPluginAsync } from "fastify";

loadEnv({ path: join(__dirname, "../..", ".env.test") });

describe("recruitment admin routes authorize global admins only", () => {
  let app: FastifyInstance;
  let localAdminCookie: Record<string, string> = {};

  before(async () => {
    const [adminJobsModule, adminApplicationsModule, auth, config] = await Promise.all([
        import("./admin-jobs.route.js"),
        import("./admin-job-applications.route.js"),
        import("../utils/auth-session.js"),
        import("../config/env.js"),
      ]);
    const adminJobsRoute = adminJobsModule.default as unknown as FastifyPluginAsync;
    const adminApplicationsRoute =
      adminApplicationsModule.default as unknown as FastifyPluginAsync;
    localAdminCookie = {
      [config.env.AUTH_COOKIE_NAME]: auth.signAuthToken({
        sub: "local-admin-test",
        role: "LOCAL_ADMIN",
        email: "local-admin@test.local",
      }),
    };
    app = Fastify({ logger: false });
    await app.register(cookie);
    await app.register(adminJobsRoute);
    await app.register(adminApplicationsRoute);
    await app.ready();
  });

  after(async () => {
    await app?.close();
  });

  const routes = [
    "/api/admin/jobs",
    "/api/admin/recruitment/health",
    "/api/admin/job-applications",
    "/api/admin/job-applications/application-test",
    "/api/admin/job-applications/application-test/cv",
  ];

  it("rejects unauthenticated requests before route handlers run", async () => {
    for (const url of routes) {
      const response = await app.inject({ method: "GET", url });
      assert.equal(response.statusCode, 401, `${url}: ${response.body}`);
    }
  });

  it("rejects LOCAL_ADMIN sessions from every recruitment read surface", async () => {
    for (const url of routes) {
      const response = await app.inject({ method: "GET", url, cookies: localAdminCookie });
      assert.equal(response.statusCode, 403, `${url}: ${response.body}`);
    }
  });

  it("rejects LOCAL_ADMIN status changes and purges before validation or lookup", async () => {
    const patch = await app.inject({
      method: "PATCH",
      url: "/api/admin/job-applications/application-test",
      cookies: localAdminCookie,
      payload: { status: "REVIEWED" },
    });
    assert.equal(patch.statusCode, 403, patch.body);

    const purge = await app.inject({
      method: "DELETE",
      url: "/api/admin/job-applications/application-test",
      cookies: localAdminCookie,
      payload: { reason: "ADMIN_CORRECTION" },
    });
    assert.equal(purge.statusCode, 403, purge.body);
  });

  it("rejects unauthenticated and LOCAL_ADMIN job writes before body validation", async () => {
    for (const request of [
      { method: "POST" as const, url: "/api/admin/jobs" },
      { method: "PATCH" as const, url: "/api/admin/jobs/job-test" },
    ]) {
      const unauthenticated = await app.inject({ ...request, payload: {} });
      assert.equal(unauthenticated.statusCode, 401, unauthenticated.body);

      const localAdmin = await app.inject({
        ...request,
        cookies: localAdminCookie,
        payload: {},
      });
      assert.equal(localAdmin.statusCode, 403, localAdmin.body);
    }
  });
});
