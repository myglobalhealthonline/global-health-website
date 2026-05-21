import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../../db/prisma.js";
import {
  DoctorOrCountryNotFoundError,
  getDoctorRegistrationByCountryCode,
  listDoctorRegistrations,
  upsertDoctorRegistration,
} from "./doctor-registrations.service.js";

/**
 * Integration-style tests for the per-country medical-registration
 * service. Needs a live Postgres so we boot a small fixture (Currency
 * → Country → Doctor → DoctorCountry) in `before` and tear it down in
 * `after`. When the DB is unreachable, every case calls `t.skip()` so
 * the suite stays green on dev boxes without Postgres.
 */
describe("doctor-registrations.service", () => {
  let bootError: unknown = null;
  let fixture: {
    doctorId: string;
    countryAId: string;
    countryBId: string;
    currencyId: string;
  } | null = null;

  const tag = `t22-${Date.now()}`;

  before(async () => {
    try {
      // Cheap connectivity probe — if this fails, the whole suite skips.
      await prisma.$queryRawUnsafe("SELECT 1");

      const currency = await prisma.currency.create({
        data: { code: `X${tag.slice(-7)}`, symbol: "$", decimals: 2 },
      });
      const countryA = await prisma.country.create({
        data: {
          code: `A${tag.slice(-5)}`,
          name: `Test A ${tag}`,
          slug: `test-a-${tag}`,
          legacyHomePath: `/test-a-${tag}`,
          teamPath: `/test-a-${tag}/team`,
          generalConsultationPath: `/test-a-${tag}/general`,
          specialistConsultationPath: `/test-a-${tag}/specialist`,
          currencyId: currency.id,
        },
      });
      const countryB = await prisma.country.create({
        data: {
          code: `B${tag.slice(-5)}`,
          name: `Test B ${tag}`,
          slug: `test-b-${tag}`,
          legacyHomePath: `/test-b-${tag}`,
          teamPath: `/test-b-${tag}/team`,
          generalConsultationPath: `/test-b-${tag}/general`,
          specialistConsultationPath: `/test-b-${tag}/specialist`,
          currencyId: currency.id,
        },
      });
      const doctor = await prisma.doctor.create({
        data: {
          countryId: countryA.id,
          slug: `dr-test-${tag}`,
          fullName: `Dr Test ${tag}`,
          title: "MD",
        },
      });
      fixture = {
        doctorId: doctor.id,
        countryAId: countryA.id,
        countryBId: countryB.id,
        currencyId: currency.id,
      };
    } catch (err) {
      bootError = err;
    }
  });

  after(async () => {
    if (!fixture) return;
    // Cascade order matters; DoctorCountry rows cascade with Doctor.
    await prisma.doctor.deleteMany({ where: { id: fixture.doctorId } });
    await prisma.country.deleteMany({
      where: { id: { in: [fixture.countryAId, fixture.countryBId] } },
    });
    await prisma.currency.deleteMany({ where: { id: fixture.currencyId } });
    await prisma.$disconnect();
  });

  it("upsert is idempotent on (doctorId, countryId)", async (t) => {
    if (!fixture) {
      t.skip(`DB unreachable: ${describeError(bootError)}`);
      return;
    }
    const first = await upsertDoctorRegistration(
      fixture.doctorId,
      fixture.countryAId,
      { chamberEntity: "IMC", registrationNumber: "MC-1234" },
    );
    const second = await upsertDoctorRegistration(
      fixture.doctorId,
      fixture.countryAId,
      { chamberEntity: "IMC", registrationNumber: "MC-1234" },
    );
    assert.equal(first.id, second.id);
    assert.equal(second.registrationNumber, "MC-1234");
  });

  it("stamps verifiedAt when transitioning to isVerified=true", async (t) => {
    if (!fixture) {
      t.skip(`DB unreachable: ${describeError(bootError)}`);
      return;
    }
    const verified = await upsertDoctorRegistration(
      fixture.doctorId,
      fixture.countryAId,
      { chamberEntity: "IMC", registrationNumber: "MC-1234", isVerified: true },
    );
    assert.equal(verified.isVerified, true);
    assert.ok(verified.verifiedAt, "verifiedAt should be set");
  });

  it("clears verifiedAt when transitioning back to unverified", async (t) => {
    if (!fixture) {
      t.skip(`DB unreachable: ${describeError(bootError)}`);
      return;
    }
    await upsertDoctorRegistration(fixture.doctorId, fixture.countryAId, {
      chamberEntity: "IMC",
      registrationNumber: "MC-1234",
      isVerified: true,
    });
    const cleared = await upsertDoctorRegistration(
      fixture.doctorId,
      fixture.countryAId,
      { isVerified: false },
    );
    assert.equal(cleared.isVerified, false);
    assert.equal(cleared.verifiedAt, null);
  });

  it("list joins country name + code", async (t) => {
    if (!fixture) {
      t.skip(`DB unreachable: ${describeError(bootError)}`);
      return;
    }
    await upsertDoctorRegistration(fixture.doctorId, fixture.countryBId, {
      chamberEntity: "OM",
      registrationNumber: "OM-9999",
    });
    const rows = await listDoctorRegistrations(fixture.doctorId);
    assert.ok(rows.length >= 2, `expected ≥2 rows, got ${rows.length}`);
    for (const r of rows) {
      assert.ok(r.countryCode, "countryCode joined");
      assert.ok(r.countryName, "countryName joined");
    }
  });

  it("getDoctorRegistrationByCountryCode returns the right country's row", async (t) => {
    if (!fixture) {
      t.skip(`DB unreachable: ${describeError(bootError)}`);
      return;
    }
    await upsertDoctorRegistration(fixture.doctorId, fixture.countryAId, {
      chamberEntity: "IMC",
      registrationNumber: "MC-1234",
    });
    await upsertDoctorRegistration(fixture.doctorId, fixture.countryBId, {
      chamberEntity: "OM",
      registrationNumber: "OM-9999",
    });
    const countryA = await prisma.country.findUnique({
      where: { id: fixture.countryAId },
      select: { code: true },
    });
    const found = await getDoctorRegistrationByCountryCode(
      fixture.doctorId,
      countryA!.code,
    );
    assert.equal(found?.chamberEntity, "IMC");
    assert.equal(found?.registrationNumber, "MC-1234");
  });

  it("upsert throws when doctor or country is missing", async (t) => {
    if (!fixture) {
      t.skip(`DB unreachable: ${describeError(bootError)}`);
      return;
    }
    await assert.rejects(
      () =>
        upsertDoctorRegistration("doctor_nope", fixture!.countryAId, {
          chamberEntity: "IMC",
          registrationNumber: "X",
        }),
      DoctorOrCountryNotFoundError,
    );
  });
});

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
