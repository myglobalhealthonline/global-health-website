import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";
import { env } from "../config/env.js";
import { signAuthToken } from "./auth-session.js";
import {
  createAdminCountryScopeGuard,
  createNestedCountryOwnershipAuditor,
  type AdminCountryScopeDependencies,
} from "./admin-country-scope.js";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
env.AUTH_JWT_PRIVATE_KEY = privateKey;
env.AUTH_JWT_PUBLIC_KEY = publicKey;

function requestWithRole(role: "ADMIN" | "LOCAL_ADMIN") {
  const token = signAuthToken({ sub: "actor-1", role, email: "admin@example.test" });
  return {
    cookies: { [env.AUTH_COOKIE_NAME]: token },
    ip: "127.0.0.1",
  } as never;
}

function dependencies(
  overrides: Partial<AdminCountryScopeDependencies> = {},
): AdminCountryScopeDependencies {
  return {
    findCountry: async () => ({ code: "pt" }),
    findCurrentAdmin: async () => ({
      role: "LOCAL_ADMIN",
      allowedCountryFolders: ["pt"],
    }),
    auditDenied: async () => {},
    ...overrides,
  };
}

describe("admin country scope", () => {
  it("uses the current DB role instead of a stale ADMIN JWT claim", async () => {
    const guard = createAdminCountryScopeGuard(
      dependencies({
        findCountry: async () => ({ code: "ie" }),
        findCurrentAdmin: async () => ({
          role: "LOCAL_ADMIN",
          allowedCountryFolders: ["pt"],
        }),
      }),
    );

    const result = await guard({
      request: requestWithRole("ADMIN"),
      authenticatedAccess: { ok: true, method: "session" },
      countryId: "country-ie",
      operation: "read",
      resourceType: "SeoLandingPage",
      resourceId: "page-ie",
    });

    assert.deepEqual(result, {
      allowed: false,
      status: 403,
      message: "This country is outside your assigned scope",
    });
  });

  it("normalizes case and whitespace but requires an exact country code", async () => {
    const guard = createAdminCountryScopeGuard(
      dependencies({
        findCountry: async () => ({ code: " PT " }),
        findCurrentAdmin: async () => ({
          role: "LOCAL_ADMIN",
          allowedCountryFolders: ["  pT  "],
        }),
      }),
    );
    assert.deepEqual(
      await guard({
        request: requestWithRole("LOCAL_ADMIN"),
        authenticatedAccess: { ok: true, method: "session" },
        countryId: "country-pt",
        operation: "read",
        resourceType: "SeoLandingPage",
      }),
      { allowed: true, countryCode: "pt" },
    );

    const variants = ["pt-br", "*"];
    for (const folder of variants) {
      const exactGuard = createAdminCountryScopeGuard(
        dependencies({
          findCurrentAdmin: async () => ({
            role: "LOCAL_ADMIN",
            allowedCountryFolders: [folder],
          }),
        }),
      );
      const result = await exactGuard({
        request: requestWithRole("LOCAL_ADMIN"),
        authenticatedAccess: { ok: true, method: "session" },
        countryId: "country-pt",
        operation: "read",
        resourceType: "SeoLandingPage",
      });
      assert.equal(result.allowed, false, `${folder} must not grant pt access`);
      if (!result.allowed) assert.equal(result.status, 403);
    }
  });

  it("denies an empty LOCAL_ADMIN folder assignment", async () => {
    const guard = createAdminCountryScopeGuard(
      dependencies({
        findCurrentAdmin: async () => ({ role: "LOCAL_ADMIN", allowedCountryFolders: [] }),
      }),
    );
    const result = await guard({
      request: requestWithRole("LOCAL_ADMIN"),
      authenticatedAccess: { ok: true, method: "session" },
      countryId: "country-pt",
      operation: "read",
      resourceType: "SeoLandingPage",
    });
    assert.equal(result.allowed, false);
    if (!result.allowed) assert.equal(result.status, 403);
  });

  it("keeps token fallback and current ADMIN/SUPER_ADMIN unscoped", async () => {
    let userLookups = 0;
    const fallbackGuard = createAdminCountryScopeGuard(
      dependencies({
        findCurrentAdmin: async () => {
          userLookups += 1;
          return { role: "LOCAL_ADMIN", allowedCountryFolders: [] };
        },
      }),
    );
    assert.deepEqual(
      await fallbackGuard({
        request: {} as never,
        authenticatedAccess: { ok: true, method: "token_fallback" },
        countryId: "country-pt",
        operation: "read",
        resourceType: "SeoLandingPage",
      }),
      { allowed: true, countryCode: "pt" },
    );
    assert.equal(userLookups, 0);

    for (const role of ["ADMIN", "SUPER_ADMIN"] as const) {
      const guard = createAdminCountryScopeGuard(
        dependencies({
          findCurrentAdmin: async () => ({ role, allowedCountryFolders: [] }),
        }),
      );
      assert.deepEqual(
        await guard({
          request: requestWithRole("LOCAL_ADMIN"),
          authenticatedAccess: { ok: true, method: "session" },
          countryId: "country-pt",
          operation: "read",
          resourceType: "SeoLandingPage",
        }),
        { allowed: true, countryCode: "pt" },
      );
    }
  });

  it("fails closed when the current admin row is missing or no longer an admin", async () => {
    for (const currentAdmin of [
      null,
      { role: "PATIENT", allowedCountryFolders: ["pt"] },
    ]) {
      const guard = createAdminCountryScopeGuard(
        dependencies({ findCurrentAdmin: async () => currentAdmin }),
      );
      const result = await guard({
        request: requestWithRole("ADMIN"),
        authenticatedAccess: { ok: true, method: "session" },
        countryId: "country-pt",
        operation: "read",
        resourceType: "SeoLandingPage",
      });
      assert.deepEqual(result, {
        allowed: false,
        status: 403,
        message: "Admin account scope could not be verified",
      });
    }
  });

  it("returns 404 for a missing country and 503 for lookup failures", async () => {
    const missing = createAdminCountryScopeGuard(
      dependencies({ findCountry: async () => null }),
    );
    assert.deepEqual(
      await missing({
        request: requestWithRole("LOCAL_ADMIN"),
        authenticatedAccess: { ok: true, method: "session" },
        countryId: "missing",
        operation: "read",
        resourceType: "SeoLandingPage",
      }),
      { allowed: false, status: 404, message: "Country not found" },
    );

    for (const failingDependency of ["findCountry", "findCurrentAdmin"] as const) {
      const guard = createAdminCountryScopeGuard(
        dependencies({
          [failingDependency]: async () => {
            throw new Error("database connection string must not leak");
          },
        }),
      );
      const result = await guard({
        request: requestWithRole("LOCAL_ADMIN"),
        authenticatedAccess: { ok: true, method: "session" },
        countryId: "country-pt",
        operation: "read",
        resourceType: "SeoLandingPage",
      });
      assert.deepEqual(result, {
        allowed: false,
        status: 503,
        message: "Country authorization is temporarily unavailable",
      });
    }
  });

  it("audits a denial without request-body data and still denies if audit fails", async () => {
    const bodyMarker = "patient-secret-body-marker";
    let auditInput: Record<string, unknown> | undefined;
    const guard = createAdminCountryScopeGuard(
      dependencies({
        findCurrentAdmin: async () => ({
          role: "LOCAL_ADMIN",
          allowedCountryFolders: ["ie"],
        }),
        auditDenied: async (input) => {
          auditInput = input as unknown as Record<string, unknown>;
          throw new Error("audit unavailable");
        },
      }),
    );
    const request = requestWithRole("LOCAL_ADMIN") as { body: unknown };
    request.body = { content: bodyMarker };
    const result = await guard({
      request: request as never,
      authenticatedAccess: { ok: true, method: "session" },
      countryId: "country-pt",
      operation: "upsert",
      resourceType: "SeoLandingPage",
      resourceId: "heart-health",
    });

    assert.equal(result.allowed, false);
    if (!result.allowed) assert.equal(result.status, 403);
    assert.ok(auditInput);
    assert.ok(!JSON.stringify(auditInput).includes(bodyMarker));
    assert.deepEqual(
      (auditInput.metadata as Record<string, unknown>).operation,
      "upsert",
    );
    assert.deepEqual(
      (auditInput.metadata as Record<string, unknown>).resourceType,
      "SeoLandingPage",
    );
    assert.deepEqual(
      (auditInput.metadata as Record<string, unknown>).resourceId,
      "heart-health",
    );
  });

  it("builds a PHI-free nested ownership mismatch audit", async () => {
    const bodyMarker = "nested-secret-body-marker";
    const recorded: Array<Record<string, unknown>> = [];
    const audit = createNestedCountryOwnershipAuditor({
      auditDenied: async (input) => {
        recorded.push(input as unknown as Record<string, unknown>);
      },
    });
    const request = requestWithRole("ADMIN") as { body: unknown };
    request.body = { title: bodyMarker };

    await audit({
      request: request as never,
      authenticatedAccess: { ok: true, method: "session" },
      operation: "delete",
      routeCountryId: "country-pt",
      routeCountryCode: "pt",
      resourceCountryId: "country-ie",
      resourceType: "SeoLandingPage",
      resourceId: "page-ie",
    });

    assert.equal(recorded.length, 1);
    assert.ok(!JSON.stringify(recorded).includes(bodyMarker));
    assert.deepEqual(recorded[0]?.metadata, {
      reason: "Nested resource country mismatch",
      operation: "delete",
      routeCountryId: "country-pt",
      routeCountryCode: "pt",
      resourceCountryId: "country-ie",
      resourceType: "SeoLandingPage",
      resourceId: "page-ie",
    });
  });
});
