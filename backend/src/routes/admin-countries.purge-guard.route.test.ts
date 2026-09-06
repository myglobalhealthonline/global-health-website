import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { deleteAuditLogs } from "../test-utils/audit-cleanup.js";
import { waitForAuditRow } from "../test-utils/wait-for-audit.js";
import { uniqueCurrencyCode } from "../test-utils/unique-currency-code.js";

loadEnv({ path: join(__dirname, "../..", ".env") });

/**
 * AZ-3 — the admin country delete-impact endpoint and the purge guard.
 *
 * The purge used to be a bare `country.delete()` behind a frontend
 * confirmation, and the Country row is the root of an 80-table cascade
 * closure. These tests pin the SERVER side of the fix: the informational
 * endpoint, the 409 refusal, that a refusal changes nothing and audits
 * nothing, that a genuinely empty country still deletes and audits once, and
 * that the route's existing global-admin authorization is unchanged.
 *
 * Authorization is deliberately re-asserted rather than assumed: this batch
 * added a route to a plugin whose `onRequest` hook is the only thing keeping
 * LOCAL_ADMIN out of cross-country configuration.
 */
describe("admin country purge guard (AZ-3)", () => {
  let app: FastifyInstance | null = null;
  let prisma: PrismaClient;
  let signAuthToken: (typeof import("../utils/auth-session.js"))["signAuthToken"];

  const uniq = `az3r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  let currencyId = "";

  const createdCountryIds: string[] = [];
  const createdUserIds: string[] = [];

  let blockedCountryId = "";
  let emptyCountryId = "";
  let purgedCountryId = "";

  let superCookie: Record<string, string> = {};
  let adminCookie: Record<string, string> = {};
  let localAdminCookie: Record<string, string> = {};
  let patientCookie: Record<string, string> = {};

  let counter = 0;
  const mkCountry = async (label: string) => {
    const n = counter++;
    const row = await prisma.country.create({
      data: {
        code: `q${n}${Date.now().toString(36)}`.slice(0, 8).toLowerCase(),
        name: `AZ3 route ${label} ${uniq}`,
        slug: `az3r-${label}-${uniq}`.toLowerCase(),
        legacyHomePath: `/az3r-lg-${label}-${uniq}`,
        teamPath: `/az3r-tm-${label}-${uniq}`,
        generalConsultationPath: `/az3r-gn-${label}-${uniq}`,
        specialistConsultationPath: `/az3r-sp-${label}-${uniq}`,
        currencyId,
      },
    });
    createdCountryIds.push(row.id);
    return row;
  };

  before(async () => {
    try {
      const { buildApp } = await import("../app.js");
      prisma = (await import("../db/prisma.js")).prisma;
      signAuthToken = (await import("../utils/auth-session.js")).signAuthToken;
      app = await buildApp();
    } catch {
      return; // app null → every test skips
    }

    currencyId = (
      await prisma.currency.create({
        data: { code: uniqueCurrencyCode(), symbol: "€", decimals: 2 },
      })
    ).id;

    // Durable membership history: plan → level → enrollment.
    const blocked = await mkCountry("blocked");
    blockedCountryId = blocked.id;
    const plan = await prisma.membershipPlan.create({
      data: { primaryCountryId: blocked.id, slug: `rp-${uniq}`, name: "Plan" },
    });
    const level = await prisma.membershipLevel.create({
      data: { planId: plan.id, slug: `rl-${uniq}`, name: "Standard", isDefault: true },
    });
    await prisma.membershipEnrollment.create({
      data: {
        planId: plan.id,
        levelId: level.id,
        countryId: blocked.id,
        membershipId: `AZ3R-${uniq}`,
        email: `route-member-${uniq}@example.test`,
        firstName: "Route",
        lastName: "Member",
        startDate: new Date("2026-01-01T00:00:00.000Z"),
      },
    });

    emptyCountryId = (await mkCountry("empty")).id;
    purgedCountryId = (await mkCountry("purged")).id;
    await prisma.countryLocale.create({
      data: { countryId: purgedCountryId, locale: "EN", isDefault: true },
    });

    const mkUser = async (role: "SUPER_ADMIN" | "ADMIN" | "LOCAL_ADMIN" | "PATIENT") => {
      const user = await prisma.user.create({
        data: {
          email: `${role.toLowerCase()}-${uniq}@example.test`,
          passwordHash: "x",
          fullName: `AZ3 ${role}`,
          role,
        },
      });
      createdUserIds.push(user.id);
      return { gh_auth: signAuthToken({ sub: user.id, role, email: user.email }) };
    };
    superCookie = await mkUser("SUPER_ADMIN");
    adminCookie = await mkUser("ADMIN");
    localAdminCookie = await mkUser("LOCAL_ADMIN");
    patientCookie = await mkUser("PATIENT");
  });

  after(async () => {
    if (!app) return;
    await deleteAuditLogs(prisma, { entityType: "Country", entityId: { in: createdCountryIds } });
    for (const id of createdCountryIds) {
      await prisma.country.deleteMany({ where: { id } }).catch(() => {});
    }
    for (const id of createdUserIds) {
      await prisma.user.deleteMany({ where: { id } }).catch(() => {});
    }
    if (currencyId) {
      await prisma.currency.deleteMany({ where: { id: currencyId } }).catch(() => {});
    }
    await app.close();
  });

  const impact = (id: string, cookies: Record<string, string> = superCookie) =>
    app!.inject({ method: "GET", url: `/api/admin/countries/${id}/delete-impact`, cookies });
  const purge = (id: string, cookies: Record<string, string> = superCookie) =>
    app!.inject({ method: "DELETE", url: `/api/admin/countries/${id}/purge`, cookies });

  // ── delete-impact ────────────────────────────────────────────────────────

  it("404s the impact endpoint for a country that does not exist", async () => {
    if (!app) return;
    const res = await impact("country-that-does-not-exist");
    assert.equal(res.statusCode, 404);
  });

  it("reports an empty country as unblocked", async () => {
    if (!app) return;
    const res = await impact(emptyCountryId);
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.data.blocked, false);
    assert.equal(body.data.blockers.membershipEnrollments, 0);
  });

  it("reports blockers for a country with membership history, counts only", async () => {
    if (!app) return;
    const res = await impact(blockedCountryId);
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.data.blocked, true);
    assert.equal(body.data.blockers.membershipEnrollments, 1);
    assert.equal(body.data.removableConfiguration.membershipPlans, 1);

    const leaves = [
      ...Object.values(body.data.blockers),
      ...Object.values(body.data.removableConfiguration),
      ...Object.values(body.data.detachedRecords),
    ];
    for (const leaf of leaves) assert.equal(typeof leaf, "number");
    for (const needle of ["@example.test", uniq, "Member", "Route"]) {
      assert.equal(JSON.stringify(body).includes(needle), false, `impact leaked "${needle}"`);
    }
  });

  it("rejects an unauthenticated impact request", async () => {
    if (!app) return;
    const res = await app.inject({
      method: "GET",
      url: `/api/admin/countries/${emptyCountryId}/delete-impact`,
    });
    assert.equal(res.statusCode, 401);
  });

  it("rejects a patient and a LOCAL_ADMIN — country config is global-admin only", async () => {
    if (!app) return;
    assert.equal((await impact(emptyCountryId, patientCookie)).statusCode, 403);
    assert.equal((await impact(emptyCountryId, localAdminCookie)).statusCode, 403);
    assert.equal((await purge(emptyCountryId, localAdminCookie)).statusCode, 403);
  });

  it("allows a generic ADMIN, matching the rest of the country routes", async () => {
    if (!app) return;
    assert.equal((await impact(emptyCountryId, adminCookie)).statusCode, 200);
  });

  // ── purge ────────────────────────────────────────────────────────────────

  it("404s the purge for a country that does not exist", async () => {
    if (!app) return;
    assert.equal((await purge("country-that-does-not-exist")).statusCode, 404);
  });

  it("409s a purge that would destroy durable records", async () => {
    if (!app) return;
    const res = await purge(blockedCountryId);
    assert.equal(res.statusCode, 409);
    const body = res.json();
    assert.equal(body.details.code, "COUNTRY_HAS_DURABLE_RECORDS");
    assert.equal(body.details.impact.blockers.membershipEnrollments, 1);
    assert.match(body.message, /1 membership enrollment/);
    assert.equal(JSON.stringify(body).includes("@example.test"), false);
  });

  it("leaves the country and its membership history untouched after a 409", async () => {
    if (!app) return;
    assert.ok(await prisma.country.findUnique({ where: { id: blockedCountryId } }));
    assert.equal(
      await prisma.membershipEnrollment.count({ where: { countryId: blockedCountryId } }),
      1,
    );
    assert.equal(
      await prisma.membershipPlan.count({ where: { primaryCountryId: blockedCountryId } }),
      1,
    );
  });

  it("emits no purge audit event when the purge is refused", async () => {
    if (!app) return;
    const row = await waitForAuditRow(
      () =>
        prisma.auditLog.findFirst({
          where: { entityType: "Country", entityId: blockedCountryId, action: "ENTITY_PURGED" },
        }),
      { timeoutMs: 400 },
    );
    assert.equal(row, null);
  });

  it("deactivation stays available for a blocked country", async () => {
    if (!app) return;
    const res = await app.inject({
      method: "DELETE",
      url: `/api/admin/countries/${blockedCountryId}`,
      cookies: superCookie,
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().data.country.isActive, false);
  });

  it("purges a configuration-only country and audits it once", async () => {
    if (!app) return;
    const res = await purge(purgedCountryId);
    assert.equal(res.statusCode, 200);
    assert.equal(await prisma.country.count({ where: { id: purgedCountryId } }), 0);
    assert.equal(await prisma.countryLocale.count({ where: { countryId: purgedCountryId } }), 0);

    const row = await waitForAuditRow(() =>
      prisma.auditLog.findFirst({
        where: { entityType: "Country", entityId: purgedCountryId, action: "ENTITY_PURGED" },
      }),
    );
    assert.ok(row, "expected one ENTITY_PURGED audit row");
    assert.equal(
      await prisma.auditLog.count({
        where: { entityType: "Country", entityId: purgedCountryId, action: "ENTITY_PURGED" },
      }),
      1,
    );
  });
});
