import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify";
import { buildApp } from "../app.js";

/**
 * Auth + redaction guard for /api/admin/sukl/*.
 *
 * Skips when buildApp() cannot reach Postgres, same pattern as
 * admin-doctor-registrations.route.test.ts.
 *
 * The redaction assertions matter more here than the status codes: this subtree
 * is the only HTTP surface anywhere near the SÚKL certificate, so the tests
 * check that an unauthenticated response body cannot contain the password, the
 * certificate path, or a full fingerprint.
 */

function describeError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Anything that would be a leak if it appeared in a response body. */
const FORBIDDEN_IN_BODY = [
  "PFX",
  "pfx",
  "passphrase",
  "BEGIN PRIVATE KEY",
  "BEGIN RSA PRIVATE KEY",
  ".pfx",
  ".p12",
];

describe("admin SÚKL route — auth + redaction", () => {
  let app: FastifyInstance | null = null;
  let bootError: unknown = null;

  before(async () => {
    try {
      app = await buildApp();
    } catch (err) {
      bootError = err;
    }
  });

  after(async () => {
    if (app) await app.close();
  });

  const unauthenticated: Array<{ method: "GET" | "POST" | "PUT" | "DELETE"; url: string }> = [
    { method: "GET", url: "/api/admin/sukl/status" },
    { method: "POST", url: "/api/admin/sukl/test-connection" },
    { method: "GET", url: "/api/admin/sukl/doctor-identities" },
    { method: "PUT", url: "/api/admin/sukl/doctor-identities/user_test" },
    { method: "DELETE", url: "/api/admin/sukl/doctor-identities/user_test" },
  ];

  for (const { method, url } of unauthenticated) {
    it(`rejects unauthenticated ${method} ${url}`, async (t) => {
      if (!app) {
        t.skip(`buildApp() failed — DB likely offline: ${describeError(bootError)}`);
        return;
      }
      const options: InjectOptions = {
        method,
        url,
        ...(method === "PUT" ? { payload: { suklProfessionalIdentifier: "TEST-1" } } : {}),
      };
      const res = await app.inject(options);
      // 401 = no session cookie. 503 = admin token fallback enabled without
      // ADMIN_API_TOKEN set, an env quirk on some boxes. Both mean "not without
      // credentials".
      assert.ok(
        res.statusCode === 401 || res.statusCode === 503,
        `expected 401 or 503, got ${res.statusCode}`,
      );
    });
  }

  it("leaks no certificate material in an unauthenticated response", async (t) => {
    if (!app) {
      t.skip(`buildApp() failed — DB likely offline: ${describeError(bootError)}`);
      return;
    }
    for (const { method, url } of unauthenticated) {
      const options: InjectOptions = {
        method,
        url,
        ...(method === "PUT" ? { payload: { suklProfessionalIdentifier: "TEST-1" } } : {}),
      };
      const res: LightMyRequestResponse = await app.inject(options);
      const body: string = res.body ?? "";
      for (const needle of FORBIDDEN_IN_BODY) {
        assert.ok(
          !body.includes(needle),
          `${method} ${url} response contained "${needle}": ${body.slice(0, 200)}`,
        );
      }
      // A full SHA-256 fingerprint is 32 colon-separated hex pairs. Only the
      // 8-character suffix may ever be published.
      assert.ok(
        !/([0-9A-Fa-f]{2}:){10}/.test(body),
        `${method} ${url} response looks like it contains a full fingerprint`,
      );
    }
  });

  it("404s an unknown SÚKL subpath rather than forwarding it", async (t) => {
    if (!app) {
      t.skip(`buildApp() failed — DB likely offline: ${describeError(bootError)}`);
      return;
    }
    const res = await app.inject({ method: "GET", url: "/api/admin/sukl/not-a-real-endpoint" });
    // The auth hook is plugin-wide, so credentials are demanded before routing
    // resolves; either answer proves the path is not silently served.
    assert.ok(
      res.statusCode === 404 || res.statusCode === 401 || res.statusCode === 503,
      `expected 404/401/503, got ${res.statusCode}`,
    );
  });
});
