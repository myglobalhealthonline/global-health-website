import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { prisma } from "../db/prisma.js";
import { uniqueCurrencyCode } from "../test-utils/unique-currency-code.js";

/**
 * Regression test for a bug found in a prior review pass: POST
 * /api/appointments (the direct public booking endpoint) stamped
 * amountCents from the flat Service.basePriceCents, ignoring peak/off-peak
 * pricing entirely — every other booking surface (cart, checkout, admin
 * manual booking) recomputes the price from the slot's clinic-local start
 * time specifically as an anti-tamper measure. A patient could book a PEAK
 * slot through this endpoint and be charged the STANDARD price.
 *
 * Fixed by recomputing via computeSlotPrice/getServicePeakConfig — same
 * pattern as manual-booking.service.ts — whenever a timeSlotId + service
 * with an enabled peak config are both present.
 */
describe("POST /api/appointments — peak pricing", () => {
  let app: FastifyInstance | null = null;
  let bootError: unknown = null;

  const uniq = `peakbook-${Date.now()}`;

  const currencyCode = uniqueCurrencyCode();
  let currencyId: string;
  let countryId: string;
  let countryCode: string;
  let doctorId: string;
  let serviceId: string;
  let serviceSlug: string;

  before(async () => {
    try {
      app = await buildApp();
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
      return;
    }

    const currency = await prisma.currency.create({
      data: { code: currencyCode, symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;
    // Lowercase — the booking schema lowercases the incoming country code
    // before querying, and Postgres string comparison is case-sensitive.
    countryCode = `t${uniq}`.toLowerCase().slice(0, 8);
    const country = await prisma.country.create({
      data: {
        code: countryCode,
        name: `Peak Booking Test ${uniq}`,
        slug: `peak-booking-${uniq}`,
        legacyHomePath: `/legacy-${uniq}`,
        teamPath: `/team-${uniq}`,
        generalConsultationPath: `/gen-${uniq}`,
        specialistConsultationPath: `/spec-${uniq}`,
        currencyId: currency.id,
      },
    });
    countryId = country.id;

    const doctor = await prisma.doctor.create({
      data: { countryId, slug: `doc-${uniq}`, fullName: "Dr Peak Test", title: "GP" },
    });
    doctorId = doctor.id;

    serviceSlug = `svc-${uniq}`;
    const service = await prisma.service.create({
      data: {
        countryId,
        slug: serviceSlug,
        name: "GP Consultation",
        basePriceCents: 3000,
        currencyCode: currency.code,
      },
    });
    serviceId = service.id;

    await prisma.serviceDoctor.create({
      data: { serviceId, doctorId, isActive: true, status: "active" },
    });

    // 18:00–22:00 UTC is PEAK at 8000 cents; everything else is OFF_PEAK at
    // 1000 cents. Clinic timezone falls back to UTC (no BookingSetting row).
    await prisma.servicePeakPricing.create({
      data: {
        serviceId,
        enabled: true,
        peakPriceCents: 8000,
        offPeakPriceCents: 1000,
        currencyCode: currency.code,
        windows: { create: [{ startMinute: 18 * 60, endMinute: 22 * 60 }] },
      },
    });
  });

  after(async () => {
    if (app) await app.close();
    if (bootError) return;
    await prisma.doctorTimeSlot.deleteMany({ where: { doctorId } });
    await prisma.appointment.deleteMany({ where: { doctorId } });
    await prisma.servicePeakPricing.deleteMany({ where: { serviceId } });
    await prisma.serviceDoctor.deleteMany({ where: { serviceId } });
    await prisma.service.deleteMany({ where: { id: serviceId } });
    await prisma.doctor.deleteMany({ where: { id: doctorId } });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
  });

  function bookingPayload(timeSlotId: string) {
    return {
      country: countryCode.toLowerCase(),
      consultationType: "general",
      fullName: "Peak Pricing Test Patient",
      email: `${uniq}@test.local`,
      consentAccepted: true,
      // Required-true on every booking since the compliance pass
      // (booking.schema.ts) — omitting it 400s before pricing is ever reached.
      crossBorderConsentAccepted: true,
      gdprConsentClinic: true,
      gdprConsentPlatform: true,
      serviceSlug,
      timeSlotId,
    };
  }

  it("charges the PEAK price for a slot inside the peak window, not the flat base price", async (t) => {
    if (!app) return t.skip(`buildApp() failed: ${describeError(bootError)}`);

    const slot = await prisma.doctorTimeSlot.create({
      data: {
        doctorId,
        startAt: new Date("2026-08-10T19:00:00.000Z"), // 19:00 UTC — inside 18:00-22:00 peak window
        endAt: new Date("2026-08-10T19:30:00.000Z"),
        status: "OPEN",
      },
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/appointments",
      payload: bookingPayload(slot.id),
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = JSON.parse(res.body) as { data: { appointmentId: string } };

    const appt = await prisma.appointment.findUnique({
      where: { id: body.data.appointmentId },
      select: { amountCents: true },
    });
    assert.equal(
      appt?.amountCents,
      8000,
      "peak slot must be charged the PEAK price (8000), not the flat base price (3000)",
    );
  });

  it("charges the OFF_PEAK price for a slot outside the peak window", async (t) => {
    if (!app) return t.skip(`buildApp() failed: ${describeError(bootError)}`);

    const slot = await prisma.doctorTimeSlot.create({
      data: {
        doctorId,
        startAt: new Date("2026-08-10T09:00:00.000Z"), // 09:00 UTC — outside the peak window
        endAt: new Date("2026-08-10T09:30:00.000Z"),
        status: "OPEN",
      },
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/appointments",
      payload: bookingPayload(slot.id),
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = JSON.parse(res.body) as { data: { appointmentId: string } };

    const appt = await prisma.appointment.findUnique({
      where: { id: body.data.appointmentId },
      select: { amountCents: true },
    });
    assert.equal(appt?.amountCents, 1000, "off-peak slot must be charged the OFF_PEAK price (1000)");
  });
});

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
