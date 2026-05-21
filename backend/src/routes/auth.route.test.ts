import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";

/**
 * Login audit hooks (T6). Each /api/auth/login outcome should emit a
 * row on AuditLog so admin can spot credential-stuffing bursts and see
 * who logged in when. We boot the full app, inject a login with a
 * deliberately-wrong password, then read back the audit table.
 *
 * Skips with `t.skip()` when buildApp can't reach Postgres — same
 * pattern as the other integration tests in this folder.
 */

describe("auth route — login audit hooks", () => {
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

  it("rejects login without payload with 400 (no audit row)", async (t) => {
    if (!app) {
      t.skip(`buildApp() failed — DB likely offline: ${describeError(bootError)}`);
      return;
    }
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {},
    });
    assert.equal(res.statusCode, 400);
  });

  it("bad-password login writes a LOGIN_FAILED audit row", async (t) => {
    if (!app) {
      t.skip(`buildApp() failed — DB likely offline: ${describeError(bootError)}`);
      return;
    }
    const probeEmail = `audit-probe-${Date.now()}@example.test`;
    const { prisma } = await import("../db/prisma.js");
    const before = await prisma.auditLog.count({
      where: { action: "LOGIN_FAILED" },
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: probeEmail, password: "definitely-wrong-Pw" },
    });
    assert.equal(res.statusCode, 401);

    // recordAudit is fire-and-forget. Give it a moment to land.
    await new Promise((r) => setTimeout(r, 250));
    const after = await prisma.auditLog.count({
      where: { action: "LOGIN_FAILED" },
    });
    assert.ok(
      after >= before + 1,
      `expected LOGIN_FAILED count to increase, before=${before} after=${after}`,
    );
  });

  it("logout endpoint is reachable and returns ok", async (t) => {
    if (!app) {
      t.skip(`buildApp() failed — DB likely offline: ${describeError(bootError)}`);
      return;
    }
    // Without a cookie, logout still 200s (clears nothing) but doesn't
    // emit an audit row since there's no session to snapshot.
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
    });
    assert.equal(res.statusCode, 200);
  });
});

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
