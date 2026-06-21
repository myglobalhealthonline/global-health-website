import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

// The module under test transitively imports config/env (via admin-auth +
// auth-session), which validates DATABASE_URL at load. Load .env, then import
// dynamically (mirrors the repo's route-test convention).
loadEnv({ path: join(__dirname, "../..", ".env") });

describe("elevateToManageSubscriptions", () => {
  let elevate: typeof import("./manage-subscriptions-auth.js")["elevateToManageSubscriptions"];
  let forbidden: string;

  before(async () => {
    const mod = await import("./manage-subscriptions-auth.js");
    elevate = mod.elevateToManageSubscriptions;
    forbidden = mod.MANAGE_SUBSCRIPTIONS_FORBIDDEN;
  });

  it("propagates a failed base decision unchanged", () => {
    const result = elevate({ ok: false, status: 401, message: "Not authenticated" }, null, null, null);
    assert.deepEqual(result, { ok: false, status: 401, message: "Not authenticated" });
  });

  it("allows the master admin token fallback (super-admin-equivalent)", () => {
    const result = elevate({ ok: true, method: "token_fallback" }, null, null, null);
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.actorRole, "SUPER_ADMIN");
    assert.equal(result.ok && result.actorUserId, null);
  });

  it("allows a SUPER_ADMIN session and carries the actor id", () => {
    const result = elevate({ ok: true, method: "session" }, "SUPER_ADMIN", "admin-123", null);
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.actorUserId, "admin-123");
    assert.equal(result.ok && result.method, "session");
  });

  it("allows a role=ADMIN session with adminScope SUPER", () => {
    const result = elevate({ ok: true, method: "session" }, "ADMIN", "admin-7", "SUPER");
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.actorUserId, "admin-7");
  });

  it("rejects a generic ADMIN session (no SUPER scope) with 403", () => {
    const result = elevate({ ok: true, method: "session" }, "ADMIN", "admin-123", null);
    assert.deepEqual(result, { ok: false, status: 403, message: forbidden });
  });

  it("rejects a LOCAL_ADMIN with GLOBAL scope (not SUPER) with 403", () => {
    const result = elevate({ ok: true, method: "session" }, "LOCAL_ADMIN", "admin-9", "GLOBAL");
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.status, 403);
  });
});
