import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { prisma } from "../../db/prisma.js";
import { uniqueCurrencyCode } from "../../test-utils/unique-currency-code.js";
import {
  BookingClaimUnavailableError,
  holdConsecutiveSlotsForBooking,
} from "./doctor-availability.service.js";

describe("manual booking atomic policy boundary", () => {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const currencyCode = uniqueCurrencyCode();
  const countryCode = `m${Math.random().toString(36).slice(2, 7)}`;
  let databaseAvailable = false;
  let currencyId = "";
  let countryId = "";
  let doctorId = "";
  let serviceId = "";
  let slotOffset = 0;

  before(async () => {
    try {
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch {
      return;
    }
    databaseAvailable = true;

    const currency = await prisma.currency.create({
      data: { code: currencyCode, symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;
    const country = await prisma.country.create({
      data: {
        code: countryCode,
        name: `Manual policy ${unique}`,
        slug: `manual-policy-${unique}`,
        legacyHomePath: `/legacy-${unique}`,
        teamPath: `/team-${unique}`,
        generalConsultationPath: `/general-${unique}`,
        specialistConsultationPath: `/specialist-${unique}`,
        currencyId,
        bookingSetting: { create: { bookingEnabled: true, timezone: "UTC" } },
      },
    });
    countryId = country.id;
    const doctor = await prisma.doctor.create({
      data: {
        countryId,
        slug: `manual-doctor-${unique}`,
        fullName: "Dr Manual Policy",
        title: "Doctor",
      },
    });
    doctorId = doctor.id;
    const service = await prisma.service.create({
      data: {
        countryId,
        slug: `manual-service-${unique}`,
        name: "Manual policy consultation",
        durationMinutes: 30,
        basePriceCents: 3000,
        currencyCode,
      },
    });
    serviceId = service.id;
    await prisma.serviceDoctor.create({
      data: { serviceId, doctorId, isActive: true, status: "active" },
    });
  });

  beforeEach(async () => {
    if (!databaseAvailable) return;
    await Promise.all([
      prisma.bookingSetting.update({
        where: { countryId },
        data: { bookingEnabled: true },
      }),
      prisma.doctor.update({
        where: { id: doctorId },
        data: {
          active: true,
          bookingPausedFrom: null,
          bookingPausedUntil: null,
          bookingPauseReason: null,
        },
      }),
      prisma.service.update({
        where: { id: serviceId },
        data: {
          isActive: true,
          visibility: "PUBLIC",
          bookingPausedFrom: null,
          bookingPausedUntil: null,
          bookingPauseReason: null,
        },
      }),
      prisma.serviceDoctor.update({
        where: { serviceId_doctorId: { serviceId, doctorId } },
        data: { isActive: true, status: "active" },
      }),
    ]);
  });

  after(async () => {
    if (!databaseAvailable) return;
    await prisma.doctorTimeSlot.deleteMany({ where: { doctorId } });
    await prisma.serviceDoctor.deleteMany({ where: { serviceId } });
    await prisma.service.deleteMany({ where: { id: serviceId } });
    await prisma.doctor.deleteMany({ where: { id: doctorId } });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
  });

  async function createThirtyMinuteGrid() {
    const startAt = new Date(Date.now() + (30 * 24 + slotOffset++) * 60 * 60_000);
    startAt.setUTCMinutes(0, 0, 0);
    const middle = new Date(startAt.getTime() + 15 * 60_000);
    const endAt = new Date(startAt.getTime() + 30 * 60_000);
    const [first] = await prisma.$transaction([
      prisma.doctorTimeSlot.create({
        data: { doctorId, startAt, endAt: middle, status: "OPEN" },
      }),
      prisma.doctorTimeSlot.create({
        data: { doctorId, startAt: middle, endAt, status: "OPEN" },
      }),
    ]);
    return { first, startAt, middle, endAt };
  }

  async function attemptHold(slotId: string) {
    return prisma.$transaction((tx) =>
      holdConsecutiveSlotsForBooking(tx, slotId, 30, {
        countryCode,
        serviceId,
        doctorId,
      }),
    );
  }

  async function assertGridRolledBack(startAt: Date) {
    const rows = await prisma.doctorTimeSlot.findMany({
      where: { doctorId, startAt: { gte: startAt, lt: new Date(startAt.getTime() + 30 * 60_000) } },
      orderBy: { startAt: "asc" },
      select: { status: true },
    });
    assert.deepEqual(rows.map((row) => row.status), ["OPEN", "OPEN"]);
  }

  it("rolls back the slot hold when country booking is disabled", async (t) => {
    if (!databaseAvailable) return t.skip("local test database unavailable");
    const grid = await createThirtyMinuteGrid();
    await prisma.bookingSetting.update({
      where: { countryId },
      data: { bookingEnabled: false },
    });

    await assert.rejects(attemptHold(grid.first.id), BookingClaimUnavailableError);
    await assertGridRolledBack(grid.startAt);
  });

  it("uses the consumed end time and rolls back when a service pause starts mid-span", async (t) => {
    if (!databaseAvailable) return t.skip("local test database unavailable");
    const grid = await createThirtyMinuteGrid();
    await prisma.service.update({
      where: { id: serviceId },
      data: { bookingPausedFrom: grid.middle, bookingPausedUntil: null },
    });

    await assert.rejects(attemptHold(grid.first.id), BookingClaimUnavailableError);
    await assertGridRolledBack(grid.startAt);
  });

  it("rolls back when the approved assignment is revoked before claim", async (t) => {
    if (!databaseAvailable) return t.skip("local test database unavailable");
    const grid = await createThirtyMinuteGrid();
    await prisma.serviceDoctor.update({
      where: { serviceId_doctorId: { serviceId, doctorId } },
      data: { status: "pending" },
    });

    await assert.rejects(attemptHold(grid.first.id), BookingClaimUnavailableError);
    await assertGridRolledBack(grid.startAt);
  });

  it("holds the collapsed full span when every policy gate is valid", async (t) => {
    if (!databaseAvailable) return t.skip("local test database unavailable");
    const grid = await createThirtyMinuteGrid();

    const held = await attemptHold(grid.first.id);

    assert.equal(held.startAt.getTime(), grid.startAt.getTime());
    assert.equal(held.endAt.getTime(), grid.endAt.getTime());
    const rows = await prisma.doctorTimeSlot.findMany({
      where: { doctorId, startAt: grid.startAt },
      select: { status: true, endAt: true },
    });
    assert.deepEqual(rows, [{ status: "HELD", endAt: grid.endAt }]);
  });
});
