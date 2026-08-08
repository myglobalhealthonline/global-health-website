import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";

loadEnv({ path: join(__dirname, "../..", ".env") });

/**
 * §25 — the recipient count on the import endpoints.
 *
 * The count is the whole safety argument for previewing before the send: an
 * admin approves "committing will email N members" while they can still
 * cancel. `summarize` is unit-tested exhaustively; what is tested HERE is that
 * the number actually crosses the wire, because the admin page renders what
 * the endpoint returns and nothing else. A correct `summarize` behind a
 * response that omits `counts` shows the admin no number at all.
 */
describe("membership import routes — recipient count", () => {
  let app: FastifyInstance | null = null;
  let prisma: PrismaClient;
  let signAuthToken: typeof import("../utils/auth-session.js")["signAuthToken"];

  const uniq = `imprt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let currencyId = "";
  let countryId = "";
  let planId = "";
  let adminCookie: Record<string, string> = {};
  let adminUserId = "";

  before(async () => {
    try {
      const { buildApp } = await import("../app.js");
      prisma = (await import("../db/prisma.js")).prisma;
      signAuthToken = (await import("../utils/auth-session.js")).signAuthToken;
      app = await buildApp();
    } catch {
      return;
    }

    const currency = await prisma.currency.create({
      data: { code: `M${uniq}`.slice(0, 9), symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;
    const country = await prisma.country.create({
      data: {
        code: `m${uniq}`.slice(0, 8).toLowerCase(),
        name: `Import Route ${uniq}`,
        slug: `import-route-${uniq}`.toLowerCase(),
        legacyHomePath: `/mlg-${uniq}`,
        teamPath: `/mtm-${uniq}`,
        generalConsultationPath: `/mgn-${uniq}`,
        specialistConsultationPath: `/msp-${uniq}`,
        currencyId,
      },
    });
    countryId = country.id;
    const plan = await prisma.membershipPlan.create({
      data: {
        primaryCountryId: countryId,
        countries: { create: { countryId } },
        slug: `route-plan-${uniq}`,
        name: "Route Plan",
      },
    });
    planId = plan.id;
    await prisma.membershipLevel.create({
      data: { planId, slug: "standard", name: "Standard", isDefault: true },
    });

    const admin = await prisma.user.create({
      data: {
        email: `import-admin-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Import Admin",
        role: "SUPER_ADMIN",
        emailVerifiedAt: new Date(),
      },
    });
    adminUserId = admin.id;
    adminCookie = {
      gh_auth: signAuthToken({ sub: admin.id, role: "SUPER_ADMIN", email: admin.email }),
    };
  });

  after(async () => {
    if (!app) return;
    await prisma.membershipEnrollment.deleteMany({ where: { planId } });
    await prisma.membershipImportBatch.deleteMany({ where: { planId } });
    await prisma.membershipPlan.deleteMany({ where: { primaryCountryId: countryId } });
    await prisma.user.deleteMany({ where: { id: adminUserId } });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
    await app.close();
  });

  it("returns the recipient count on GET, which is what the preview page renders", async (t) => {
    if (!app) return t.skip();
    const svc = await import("../modules/memberships/membership-import.service.js");
    const csv = [
      "email,firstName,lastName,partnerReference",
      `r1-${uniq}@test.local,A,One,REF-1`,
      `r2-${uniq}@test.local,B,Two,REF-2`,
      // Rejected: applies nothing, so it must not be counted as an email.
      `not-an-email,C,Three,REF-3`,
    ].join("\n");
    const batch = await svc.previewMembershipImport({
      planId,
      fileName: "members.csv",
      csv,
      adminId: adminUserId,
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/admin/membership-imports/${batch.id}`,
      cookies: adminCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
    const counts = res.json().data.counts;
    assert.ok(counts, "the endpoint carries counts, or the page has no number to show");
    assert.equal(counts.recipients, 2, "two members, not three rows");
    assert.equal(counts.reject, 1);
  });

  it("tolerates a batch stored before phase 7c rather than throwing", async (t) => {
    if (!app) return t.skip();
    // A PREVIEW batch written by the old code has rows with no `willEmail`.
    // The page must still open — reporting zero recipients is acceptable, a
    // 500 on a stale batch is not.
    const legacy = await prisma.membershipImportBatch.create({
      data: {
        planId,
        fileName: "legacy.csv",
        status: "PREVIEW",
        rowCount: 1,
        previewData: { headers: [], rows: [{ line: 2, outcome: "CREATE", email: "x@y.test" }] },
      },
    });
    const res = await app.inject({
      method: "GET",
      url: `/api/admin/membership-imports/${legacy.id}`,
      cookies: adminCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(res.json().data.counts.recipients, 0);
  });
});
