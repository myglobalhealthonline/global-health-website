import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateAdminAccess } from "./admin-access-evaluator.js";

describe("admin access evaluation", () => {
  it("returns 401 when no session and no token", () => {
    const result = evaluateAdminAccess({
      sessionRole: null,
      authorizationHeader: undefined,
      expectedToken: "token",
      tokenFallbackEnabled: true,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 401);
  });

  it("returns 403 for patient session", () => {
    const result = evaluateAdminAccess({
      sessionRole: "PATIENT",
      authorizationHeader: undefined,
      expectedToken: "token",
      tokenFallbackEnabled: true,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 403);
  });

  it("allows admin session", () => {
    const result = evaluateAdminAccess({
      sessionRole: "ADMIN",
      authorizationHeader: undefined,
      expectedToken: "token",
      tokenFallbackEnabled: true,
    });
    assert.equal(result.ok, true);
  });

  it("allows valid token fallback when enabled", () => {
    const result = evaluateAdminAccess({
      sessionRole: null,
      authorizationHeader: "Bearer token",
      expectedToken: "token",
      tokenFallbackEnabled: true,
    });
    assert.equal(result.ok, true);
  });

  it("rejects invalid token", () => {
    const result = evaluateAdminAccess({
      sessionRole: null,
      authorizationHeader: "Bearer invalid",
      expectedToken: "token",
      tokenFallbackEnabled: true,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 401);
  });

  // SEC-001: global-scope boundary — LOCAL_ADMIN is a single-country role
  // and must be excluded from global/cross-country operations.
  it("allows local admin on a country-scoped (non-global) endpoint", () => {
    const result = evaluateAdminAccess({
      sessionRole: "LOCAL_ADMIN",
      authorizationHeader: undefined,
      expectedToken: "token",
      tokenFallbackEnabled: true,
    });
    assert.equal(result.ok, true);
  });

  it("rejects local admin (403) on a global-scope endpoint", () => {
    const result = evaluateAdminAccess({
      sessionRole: "LOCAL_ADMIN",
      authorizationHeader: undefined,
      expectedToken: "token",
      tokenFallbackEnabled: true,
      requireGlobalScope: true,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 403);
  });

  it("still allows admin and super admin on a global-scope endpoint", () => {
    for (const role of ["ADMIN", "SUPER_ADMIN"] as const) {
      const result = evaluateAdminAccess({
        sessionRole: role,
        authorizationHeader: undefined,
        expectedToken: "token",
        tokenFallbackEnabled: true,
        requireGlobalScope: true,
      });
      assert.equal(result.ok, true, role);
    }
  });

  it("keeps the maintenance-token fallback unscoped on global endpoints", () => {
    const result = evaluateAdminAccess({
      sessionRole: null,
      authorizationHeader: "Bearer token",
      expectedToken: "token",
      tokenFallbackEnabled: true,
      requireGlobalScope: true,
    });
    assert.equal(result.ok, true);
  });

  it("rejects token when fallback is disabled", () => {
    const result = evaluateAdminAccess({
      sessionRole: null,
      authorizationHeader: "Bearer token",
      expectedToken: "token",
      tokenFallbackEnabled: false,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 401);
  });
});

