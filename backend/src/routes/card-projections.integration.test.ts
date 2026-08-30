import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { uniqueCurrencyCode } from "../test-utils/unique-currency-code.js";

loadEnv({ path: join(__dirname, "../..", ".env") });

/**
 * Real-database integration for the card projections (perf plan
 * docs/plans/new.md phases 3-4).
 *
 * The mocked contract tests in `card-projections.test.ts` never execute the
 * Prisma `select` clauses — a select naming a column that does not exist would
 * pass there and fail in production. These tests run both projections and both
 * legacy collections against actual Postgres over `app.inject`, and assert:
 *
 *   - the projection returns 200 with the same rows, in the same order, as the
 *     legacy endpoint (the ordering + filtering invariants of §6.1);
 *   - the values a card renders match the legacy payload's;
 *   - the projection is materially smaller than the legacy payload;
 *   - private clinician fields are absent.
 *
 * Skips when buildApp cannot reach Postgres.
 */
describe("card projections against a real database", () => {
  let app: FastifyInstance | null = null;
  let prisma: PrismaClient;

  const uniq = `cp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const currencyCode = uniqueCurrencyCode();
  const countryCode = `cp${uniq}`.slice(0, 8).toLowerCase();
  let countryId = "";
  let currencyId = "";
  let serviceId = "";
  let otherServiceId = "";
  let doctorId = "";

  /** A second market with a real roster, so the query-growth test below has
   *  a slope to measure rather than a single point. */
  const BIG_ROSTER = 5;
  const bigCountryCode = `cq${uniq}`.slice(0, 8).toLowerCase();
  let bigCountryId = "";

  before(async () => {
    try {
      const { buildApp } = await import("../app.js");
      prisma = (await import("../db/prisma.js")).prisma;
      app = await buildApp();
    } catch {
      return; // app null → every test below no-ops
    }

    const currency = await prisma.currency.create({
      data: { code: currencyCode, symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;

    const country = await prisma.country.create({
      data: {
        code: countryCode,
        name: `Cards ${uniq}`,
        slug: `cards-${uniq}`.toLowerCase(),
        legacyHomePath: `/cards-${uniq}`,
        teamPath: `/cards-tm-${uniq}`,
        generalConsultationPath: `/cards-gn-${uniq}`,
        specialistConsultationPath: `/cards-sp-${uniq}`,
        currencyId: currency.id,
        enabledFeatures: ["services"],
      },
    });
    countryId = country.id;

    // Two services so ordering (kind, sortOrder, name) is actually exercised.
    const general = await prisma.service.create({
      data: {
        countryId,
        slug: `gp-${uniq}`,
        name: "AAA General Consultation",
        summary: "Base summary",
        kind: "GENERAL",
        visibility: "PUBLIC",
        durationMinutes: 15,
        basePriceCents: 6000,
        currencyCode,
        detailBody: "<p>a long detail body that the projection must not ship</p>",
        sortOrder: 1,
        isActive: true,
      },
    });
    serviceId = general.id;
    const specialist = await prisma.service.create({
      data: {
        countryId,
        slug: `spec-${uniq}`,
        name: "BBB Specialist Consultation",
        summary: "Specialist summary",
        kind: "SPECIALIST",
        visibility: "PUBLIC",
        durationMinutes: 30,
        basePriceCents: 12000,
        currencyCode,
        sortOrder: 1,
        isActive: true,
      },
    });
    otherServiceId = specialist.id;
    // Must never appear in either payload.
    await prisma.service.create({
      data: {
        countryId,
        slug: `hidden-${uniq}`,
        name: "CCC Hidden",
        kind: "GENERAL",
        visibility: "PUBLIC",
        currencyCode,
        isActive: false,
      },
    });

    const doctor = await prisma.doctor.create({
      data: {
        countryId,
        slug: `dr-${uniq}`,
        fullName: "Aaa Test Doctor",
        title: "General Practitioner",
        bio: "Base bio",
        languages: ["English"],
        active: true,
        // Private — must be stripped from every public payload.
        whatsappNumber: "+353000000000",
        editorialChecklist: { nonPhysician: true },
        instagramUrl: "https://instagram.com/example",
      },
    });
    doctorId = doctor.id;
    await prisma.doctorCountry.create({
      data: {
        doctorId,
        countryId,
        active: true,
        chamberEntity: "IMC",
        registrationNumber: "523449",
        division: "General Division",
        isVerified: true,
      },
    });
    for (const id of [serviceId, otherServiceId]) {
      await prisma.serviceDoctor.create({
        data: { serviceId: id, doctorId, isActive: true, status: "active", sortOrder: 1 },
      });
    }

    // Second market: same two service kinds, BIG_ROSTER doctors, every doctor
    // assigned to both services. This is the regime the batch exists for.
    const bigCountry = await prisma.country.create({
      data: {
        code: bigCountryCode,
        name: `Cards Big ${uniq}`,
        slug: `cards-big-${uniq}`.toLowerCase(),
        legacyHomePath: `/cardsbig-${uniq}`,
        teamPath: `/cardsbig-tm-${uniq}`,
        generalConsultationPath: `/cardsbig-gn-${uniq}`,
        specialistConsultationPath: `/cardsbig-sp-${uniq}`,
        currencyId: currency.id,
        enabledFeatures: ["services"],
      },
    });
    bigCountryId = bigCountry.id;
    const bigServiceIds: string[] = [];
    for (const [index, kind] of (["GENERAL", "SPECIALIST"] as const).entries()) {
      const created = await prisma.service.create({
        data: {
          countryId: bigCountryId,
          slug: `big-${kind.toLowerCase()}-${uniq}`,
          name: `Big ${kind}`,
          kind,
          visibility: "PUBLIC",
          durationMinutes: 15 + index * 15,
          basePriceCents: 6000,
          currencyCode,
          sortOrder: 1,
          isActive: true,
        },
      });
      bigServiceIds.push(created.id);
    }
    for (let i = 0; i < BIG_ROSTER; i += 1) {
      const created = await prisma.doctor.create({
        data: {
          countryId: bigCountryId,
          slug: `bigdr-${i}-${uniq}`,
          fullName: `Big Doctor ${i}`,
          title: "General Practitioner",
          languages: ["English"],
          active: true,
        },
      });
      await prisma.doctorCountry.create({
        data: { doctorId: created.id, countryId: bigCountryId, active: true },
      });
      for (const id of bigServiceIds) {
        await prisma.serviceDoctor.create({
          data: {
            serviceId: id,
            doctorId: created.id,
            isActive: true,
            status: "active",
            sortOrder: 1,
          },
        });
      }
    }
  });

  after(async () => {
    if (!app) return;
    for (const id of [countryId, bigCountryId].filter(Boolean)) {
      const doctors = await prisma.doctor.findMany({
        where: { countryId: id },
        select: { id: true },
      });
      const doctorIds = doctors.map((d) => d.id);
      await prisma.serviceDoctor.deleteMany({ where: { doctorId: { in: doctorIds } } });
      await prisma.doctorCountry.deleteMany({ where: { doctorId: { in: doctorIds } } });
      await prisma.doctor.deleteMany({ where: { countryId: id } });
      await prisma.service.deleteMany({ where: { countryId: id } });
      await prisma.country.deleteMany({ where: { id } });
    }
    await prisma.currency.deleteMany({ where: { id: currencyId } });
    await app.close();
  });

  async function get(path: string) {
    const response = await app!.inject({ method: "GET", url: path });
    return { status: response.statusCode, body: response.json(), bytes: response.rawPayload.length };
  }

  it("returns the same services, in the same order, as the legacy collection", async () => {
    if (!app) return;
    const legacy = await get(`/api/countries/${countryCode}/services`);
    const projection = await get(`/api/countries/${countryCode}/service-cards`);
    assert.equal(legacy.status, 200);
    assert.equal(projection.status, 200);
    assert.deepEqual(
      projection.body.data.map((s: { id: string }) => s.id),
      legacy.body.data.map((s: { id: string }) => s.id),
    );
    // Ordering is (kind asc, sortOrder asc, name asc) → GENERAL before SPECIALIST.
    assert.deepEqual(
      projection.body.data.map((s: { slug: string }) => s.slug),
      [`gp-${uniq}`, `spec-${uniq}`],
    );
  });

  it("carries the same card values as the legacy service payload", async () => {
    if (!app) return;
    const legacy = await get(`/api/countries/${countryCode}/services`);
    const projection = await get(`/api/countries/${countryCode}/service-cards`);
    const legacyRow = legacy.body.data[0];
    const card = projection.body.data[0];
    for (const field of [
      "id",
      "slug",
      "name",
      "summary",
      "kind",
      "durationMinutes",
      "basePriceCents",
      "currencyCode",
    ]) {
      assert.deepEqual(card[field], legacyRow[field], field);
    }
    assert.deepEqual(card.bookability, legacyRow.bookability);
    assert.deepEqual(card.insuranceOptions, legacyRow.insuranceOptions);
    assert.deepEqual(
      card.assignedDoctors.map((a: { doctorId: string }) => a.doctorId),
      legacyRow.assignedDoctors.map((a: { doctorId: string }) => a.doctorId),
    );
  });

  it("ships a materially smaller service payload without the detail body", async () => {
    if (!app) return;
    const legacy = await get(`/api/countries/${countryCode}/services`);
    const projection = await get(`/api/countries/${countryCode}/service-cards`);
    assert.ok(
      projection.bytes < legacy.bytes,
      `projection ${projection.bytes}B is not smaller than legacy ${legacy.bytes}B`,
    );
    assert.equal(JSON.stringify(projection.body).includes("detail body"), false);
  });

  it("returns the same doctors, in the same order, as the legacy collection", async () => {
    if (!app) return;
    const legacy = await get(`/api/countries/${countryCode}/doctors`);
    const projection = await get(`/api/countries/${countryCode}/doctor-cards`);
    assert.equal(projection.status, 200);
    assert.deepEqual(
      projection.body.data.map((d: { id: string }) => d.id),
      legacy.body.data.map((d: { id: string }) => d.id),
    );
  });

  it("carries the same card values as the legacy doctor payload", async () => {
    if (!app) return;
    const legacy = await get(`/api/countries/${countryCode}/doctors`);
    const projection = await get(`/api/countries/${countryCode}/doctor-cards`);
    const legacyRow = legacy.body.data[0];
    const card = projection.body.data[0];
    for (const field of [
      "id",
      "slug",
      "fullName",
      "title",
      "bio",
      "languages",
      "imcRegistration",
      "registrationDivision",
      "registrationVerified",
      "medicalRegistrationUrl",
      "instagramUrl",
      "isFeatured",
    ]) {
      assert.deepEqual(card[field], legacyRow[field], field);
    }
    assert.deepEqual(card.bookability, legacyRow.bookability);
    assert.deepEqual(card.bookabilityByServiceId, legacyRow.bookabilityByServiceId);
    assert.deepEqual(
      card.assignedServices.map((a: { serviceId: string }) => a.serviceId),
      legacyRow.assignedServices.map((a: { serviceId: string }) => a.serviceId),
    );
    // The chamber shim must reproduce what the frontend mapper reads.
    assert.equal(
      card.additionalCountries[0].chamberEntity,
      legacyRow.additionalCountries[0].chamberEntity,
    );
    assert.equal(
      card.editorialChecklist?.nonPhysician,
      legacyRow.editorialChecklist?.nonPhysician,
    );
  });

  it("covers every assigned service in bookabilityByServiceId", async () => {
    if (!app) return;
    const projection = await get(`/api/countries/${countryCode}/doctor-cards`);
    const card = projection.body.data[0];
    assert.deepEqual(
      Object.keys(card.bookabilityByServiceId).sort(),
      card.assignedServices.map((a: { serviceId: string }) => a.serviceId).sort(),
    );
  });

  it("keeps private clinician contact out of both doctor payloads", async () => {
    if (!app) return;
    for (const path of [`doctors`, `doctor-cards`]) {
      const payload = JSON.stringify(
        (await get(`/api/countries/${countryCode}/${path}`)).body,
      );
      assert.equal(payload.includes("whatsappNumber"), false, path);
      assert.equal(payload.includes("+353000000000"), false, path);
      assert.equal(payload.includes("bookingPauseReason"), false, path);
    }
  });

  it("ships a materially smaller doctor payload", async () => {
    if (!app) return;
    const legacy = await get(`/api/countries/${countryCode}/doctors`);
    const projection = await get(`/api/countries/${countryCode}/doctor-cards`);
    assert.ok(
      projection.bytes < legacy.bytes,
      `projection ${projection.bytes}B is not smaller than legacy ${legacy.bytes}B`,
    );
  });

  it("404s an unknown country on both projections, like the legacy routes", async () => {
    if (!app) return;
    assert.equal((await get(`/api/countries/zzzz/doctor-cards`)).status, 404);
    assert.equal((await get(`/api/countries/zzzz/service-cards`)).status, 404);
  });

  it("applies the kind filter on service-cards", async () => {
    if (!app) return;
    const projection = await get(`/api/countries/${countryCode}/service-cards?kind=SPECIALIST`);
    assert.deepEqual(
      projection.body.data.map((s: { slug: string }) => s.slug),
      [`spec-${uniq}`],
    );
  });

  /**
   * Cold round-trip count for one request, read off the perf instrumentation.
   * Bookability caches for 60 s, so every measurement clears it first —
   * otherwise the second read of a country measures the cache, not the query
   * plan.
   */
  async function coldDbQueries(path: string): Promise<number> {
    const { invalidateBookabilityCache } = await import(
      "../modules/bookability/bookability.service.js"
    );
    invalidateBookabilityCache();
    const response = await app!.inject({ method: "GET", url: path });
    const timing = String(response.headers["server-timing"] ?? "");
    const match = timing.match(/dbq;desc="(\d+)"/);
    assert.ok(match, `no dbq in Server-Timing: ${timing}`);
    return Number(match[1]);
  }

  /**
   * Phase 7's exit gate is "bounded query count INDEPENDENT of roster size",
   * not "fewer queries on any fixture". The batch is a fixed country-level
   * cost — it loads every service and doctor in the market once — so on a
   * one-doctor market it legitimately issues MORE round trips than the
   * per-item path, which there gets to answer almost everything from its
   * 60 s cache. What must hold is the slope: adding doctors must cost the
   * legacy path more than it costs the projection.
   */
  it("keeps doctor query count flat as the roster grows, unlike the legacy collection", async () => {
    if (!app) return;
    const legacySmall = await coldDbQueries(`/api/countries/${countryCode}/doctors`);
    const legacyLarge = await coldDbQueries(`/api/countries/${bigCountryCode}/doctors`);
    const projectionSmall = await coldDbQueries(`/api/countries/${countryCode}/doctor-cards`);
    const projectionLarge = await coldDbQueries(`/api/countries/${bigCountryCode}/doctor-cards`);

    const legacyGrowth = legacyLarge - legacySmall;
    const projectionGrowth = projectionLarge - projectionSmall;
    // Reported so a future run can see the slope move, not just pass/fail.
    console.warn(
      `      db round trips — legacy ${legacySmall}→${legacyLarge} (+${legacyGrowth}), ` +
        `projection ${projectionSmall}→${projectionLarge} (+${projectionGrowth}) ` +
        `for 1→${BIG_ROSTER} doctors`,
    );
    assert.ok(
      projectionGrowth < legacyGrowth,
      `projection grew by ${projectionGrowth} vs legacy ${legacyGrowth} — batching is not bounding the fan-out`,
    );
  });

  it("emits a Server-Timing header and an opaque request id", async () => {
    if (!app) return;
    const response = await app.inject({
      method: "GET",
      url: `/api/countries/${countryCode}/doctor-cards`,
    });
    const timing = response.headers["server-timing"];
    assert.ok(typeof timing === "string" && timing.includes("total;dur="), "missing Server-Timing");
    assert.ok(timing.includes("query;dur="), "missing the query phase span");
    assert.ok(response.headers["x-request-id"], "missing x-request-id");
  });
});
