import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

// Mirrors manage-subscriptions-auth.test.ts: the module transitively imports
// config/env (via admin-auth + auth-session), which validates DATABASE_URL at
// load. Load .env then import dynamically.
loadEnv({ path: join(__dirname, "../..", ".env") });

describe("elevateToManageAdjustments (separation of duties — §4)", () => {
  let elevate: typeof import("./manage-subscription-adjustments-auth.js")["elevateToManageAdjustments"];
  let forbidden: string;

  before(async () => {
    const mod = await import("./manage-subscription-adjustments-auth.js");
    elevate = mod.elevateToManageAdjustments;
    forbidden = mod.MANAGE_ADJUSTMENTS_FORBIDDEN;
  });

  it("propagates a failed base decision unchanged", () => {
    const result = elevate({ ok: false, status: 401, message: "Not authenticated" }, null, null, null);
    assert.deepEqual(result, { ok: false, status: 401, message: "Not authenticated" });
  });

  it("allows the master admin token fallback (super-admin-equivalent)", () => {
    const result = elevate({ ok: true, method: "token_fallback" }, null, null, null);
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.actorRole, "SUPER_ADMIN");
  });

  it("allows a session with adminScope SUPER and carries the actor id", () => {
    const result = elevate({ ok: true, method: "session" }, "ADMIN", "admin-7", "SUPER");
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.actorUserId, "admin-7");
    assert.equal(result.ok && result.method, "session");
  });

  // The KEY separation: the SUPER_ADMIN *role* alone is enough to configure
  // plans (manage-subscriptions) but must NOT grant balance adjustments — only
  // the SUPER *scope* does. This is the behaviour change at the heart of §4.
  it("rejects a SUPER_ADMIN role WITHOUT SUPER scope with 403", () => {
    const result = elevate({ ok: true, method: "session" }, "SUPER_ADMIN", "admin-123", null);
    assert.deepEqual(result, { ok: false, status: 403, message: forbidden });
  });

  it("rejects a generic ADMIN session (no SUPER scope) with 403", () => {
    const result = elevate({ ok: true, method: "session" }, "ADMIN", "admin-123", null);
    assert.deepEqual(result, { ok: false, status: 403, message: forbidden });
  });

  it("rejects a GLOBAL scope (not SUPER) with 403", () => {
    const result = elevate({ ok: true, method: "session" }, "ADMIN", "admin-9", "GLOBAL");
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.status, 403);
  });
});
