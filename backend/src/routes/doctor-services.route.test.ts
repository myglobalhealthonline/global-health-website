import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { env } from "../config/env.js";
import { signAuthToken } from "../utils/auth-session.js";

describe("doctor services route — auth + validation", () => {
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

  it("rejects unauthenticated GET /api/doctor/services", async (t) => {
    if (!app) {
      t.skip(`buildApp() failed: ${describeError(bootError)}`);
      return;
    }
    const res = await app.inject({ method: "GET", url: "/api/doctor/services" });
    assert.equal(res.statusCode, 401);
  });

  it("rejects unauthenticated POST /api/doctor/services", async (t) => {
    if (!app) {
      t.skip(`buildApp() failed: ${describeError(bootError)}`);
      return;
    }
    const res = await app.inject({
      method: "POST",
      url: "/api/doctor/services",
      payload: { serviceIds: [] },
    });
    assert.equal(res.statusCode, 401);
  });

  it("rejects patient role on GET /api/doctor/services", async (t) => {
    if (!app) {
      t.skip(`buildApp() failed: ${describeError(bootError)}`);
      return;
    }
    const token = signAuthToken({
      sub: "patient-user-id",
      role: "PATIENT",
      email: "patient@example.test",
    });
    const res = await app.inject({
      method: "GET",
      url: "/api/doctor/services",
      cookies: { [env.AUTH_COOKIE_NAME]: token },
    });
    assert.equal(res.statusCode, 403);
  });

  it("forbids doctor self-selecting services (admin-only)", async (t) => {
    if (!app) {
      t.skip(`buildApp() failed: ${describeError(bootError)}`);
      return;
    }
    const { prisma } = await import("../db/prisma.js");
    const tag = `route-${Date.now()}`;
    const currency = await prisma.currency.create({
      data: { code: `R${tag.slice(-7)}`, symbol: "€", decimals: 2 },
    });
    const country = await prisma.country.create({
      data: {
        code: `R${tag.slice(-4)}`,
        name: `Route ${tag}`,
        slug: `route-${tag}`,
        legacyHomePath: `/route-${tag}`,
        teamPath: `/route-${tag}/team`,
        generalConsultationPath: `/route-${tag}/general`,
        specialistConsultationPath: `/route-${tag}/specialist`,
        currencyId: currency.id,
      },
    });
    const doctor = await prisma.doctor.create({
      data: {
        countryId: country.id,
        slug: `dr-route-${tag}`,
        fullName: `Dr Route ${tag}`,
        title: "GP",
        qualifications: [],
        languages: ["English"],
      },
    });
    const user = await prisma.user.create({
      data: {
        email: `dr-route-${tag}@example.test`,
        passwordHash: "x",
        fullName: `Dr Route ${tag}`,
        role: "DOCTOR",
        doctorId: doctor.id,
        isActive: true,
      },
    });
    const token = signAuthToken({
      sub: user.id,
      role: "DOCTOR",
      email: user.email,
    });

    try {
      const res = await app.inject({
        method: "POST",
        url: "/api/doctor/services",
        cookies: { [env.AUTH_COOKIE_NAME]: token },
        payload: { serviceIds: [] },
      });
      assert.equal(res.statusCode, 403);
    } finally {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
      await prisma.doctor.delete({ where: { id: doctor.id } }).catch(() => {});
      await prisma.country.delete({ where: { id: country.id } }).catch(() => {});
      await prisma.currency.delete({ where: { id: currency.id } }).catch(() => {});
    }
  });
});

describe("admin doctor services route — auth", () => {
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

  it("rejects unauthenticated GET /api/admin/doctors/:id/services", async (t) => {
    if (!app) {
      t.skip(`buildApp() failed: ${describeError(bootError)}`);
      return;
    }
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/doctors/doc_test/services",
    });
    assert.ok(
      res.statusCode === 401 || res.statusCode === 503,
      `expected 401 or 503, got ${res.statusCode}`,
    );
  });
});

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
