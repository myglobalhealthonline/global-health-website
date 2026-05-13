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

