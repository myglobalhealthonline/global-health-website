import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { prisma } from "../db/prisma.js";
import { uniqueCurrencyCode } from "../test-utils/unique-currency-code.js";

describe("public appointment booking policy", () => {
  let app: FastifyInstance | null = null;
  let bootError: unknown = null;
  const uniq = `pause-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const currencyCode = uniqueCurrencyCode();
  let currencyId = "";
  let countryId = "";
  let countryCode = "";
  let doctorId = "";
  let serviceId = "";
  let serviceSlug = "";
  let slotOffsetHours = 0;

  before(async () => {
    let candidate: FastifyInstance | null = null;
    try {
      candidate = await buildApp();
      await prisma.$queryRawUnsafe("SELECT 1");
      app = candidate;
    } catch (error) {
      bootError = error;
      await candidate?.close();
      return;
    }

    const currency = await prisma.currency.create({
      data: { code: currencyCode, symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;
    countryCode = `p${uniq}`.slice(0, 8).toLowerCase();
    const country = await prisma.country.create({
      data: {
        code: countryCode,
        name: `Pause Test ${uniq}`,
        slug: `pause-${uniq}`,
        legacyHomePath: `/legacy-${uniq}`,
        teamPath: `/team-${uniq}`,
        generalConsultationPath: `/general-${uniq}`,
        specialistConsultationPath: `/specialist-${uniq}`,
        currencyId,
      },
    });
    countryId = country.id;
    const doctor = await prisma.doctor.create({
      data: { countryId, slug: `doctor-${uniq}`, fullName: "Dr Pause", title: "GP" },
    });
    doctorId = doctor.id;
    serviceSlug = `service-${uniq}`;
    const service = await prisma.service.create({
      data: {
        countryId,
        slug: serviceSlug,
        name: "Consultation",
        basePriceCents: 3000,
        currencyCode,
      },
    });
    serviceId = service.id;
    await prisma.serviceDoctor.create({
      data: { serviceId, doctorId, isActive: true, status: "active" },
    });
  });

  after(async () => {
    if (!app) return;
    await prisma.appointment.deleteMany({ where: { doctorId } });
    await prisma.doctorTimeSlot.deleteMany({ where: { doctorId } });
    await prisma.serviceDoctor.deleteMany({ where: { serviceId } });
    await prisma.service.deleteMany({ where: { id: serviceId } });
    await prisma.doctor.deleteMany({ where: { id: doctorId } });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
    await app.close();
  });

  function futureSlot() {
    const startAt = new Date(
      Date.now() + 7 * 24 * 60 * 60_000 + slotOffsetHours++ * 60 * 60_000,
    );
    startAt.setUTCMinutes(0, 0, 0);
    return prisma.doctorTimeSlot.create({
      data: {
        doctorId,
        startAt,
        endAt: new Date(startAt.getTime() + 30 * 60_000),
        status: "OPEN",
      },
    });
  }

  function payload(timeSlotId: string) {
    return {
      country: countryCode,
      consultationType: "general",
      serviceSlug,
      timeSlotId,
      fullName: "Pause Test Patient",
      email: `${uniq}@test.local`,
      consentAccepted: true,
      crossBorderConsentAccepted: true,
      gdprConsentClinic: true,
      gdprConsentPlatform: true,
    };
  }

  it("rejects a forged slot during a service pause and rolls the claim back", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const slot = await futureSlot();
    await prisma.service.update({
      where: { id: serviceId },
      data: {
        bookingPausedFrom: new Date(Date.now() - 60_000),
        bookingPausedUntil: null,
        bookingPauseReason: "TEMPORARY_UNAVAILABLE",
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/appointments",
      payload: payload(slot.id),
    });
    assert.equal(response.statusCode, 409, response.body);
    const reloaded = await prisma.doctorTimeSlot.findUnique({ where: { id: slot.id } });
    assert.equal(reloaded?.status, "OPEN", "failed pause guard must roll back the slot claim");
  });

  it("rejects the same forged paused selection on cart add", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const slot = await futureSlot();
    await prisma.service.update({
      where: { id: serviceId },
      data: {
        bookingPausedFrom: new Date(Date.now() - 60_000),
        bookingPausedUntil: null,
        bookingPauseReason: "TEMPORARY_UNAVAILABLE",
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/cart/items",
      payload: {
        kind: "GENERAL_CONSULTATION",
        serviceId,
        doctorId,
        timeSlotId: slot.id,
        patient: {
          fullName: "Pause Test Patient",
          email: `${uniq}@test.local`,
          consentAccepted: true,
          crossBorderConsentAccepted: true,
          gdprConsentClinic: true,
          gdprConsentPlatform: true,
        },
      },
    });
    assert.equal(response.statusCode, 409, response.body);
    const reloaded = await prisma.doctorTimeSlot.findUnique({ where: { id: slot.id } });
    assert.equal(reloaded?.status, "OPEN");
  });

  it("rejects a forged slot during a doctor pause", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    await prisma.service.update({
      where: { id: serviceId },
      data: { bookingPausedFrom: null, bookingPausedUntil: null, bookingPauseReason: null },
    });
    const slot = await futureSlot();
    await prisma.doctor.update({
      where: { id: doctorId },
      data: {
        bookingPausedFrom: new Date(Date.now() - 60_000),
        bookingPausedUntil: null,
        bookingPauseReason: "LEAVE",
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/appointments",
      payload: payload(slot.id),
    });
    assert.equal(response.statusCode, 409, response.body);
  });

  it("requires an approved active assignment", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    await prisma.doctor.update({
      where: { id: doctorId },
      data: { bookingPausedFrom: null, bookingPausedUntil: null, bookingPauseReason: null },
    });
    await prisma.serviceDoctor.update({
      where: { serviceId_doctorId: { serviceId, doctorId } },
      data: { status: "pending" },
    });
    const slot = await futureSlot();

    const response = await app.inject({
      method: "POST",
      url: "/api/appointments",
      payload: payload(slot.id),
    });
    assert.equal(response.statusCode, 400, response.body);
  });
});
