import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { after, before, describe, it } from "node:test";

// The backend compiles to CommonJS, so use __dirname (a CJS global) rather
// than import.meta.url, which tsc rejects under module: CommonJS output.
loadEnv({
  path: join(__dirname, "../../..", ".env"),
});

/**
 * Integration tests for doctor service self-selection. Requires Postgres;
 * skips when DATABASE_URL is unreachable.
 */
describe("doctor-services.service", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let adminAssignServiceToDoctor: typeof import("./doctor-services.service.js")["adminAssignServiceToDoctor"];
  let adminRemoveDoctorService: typeof import("./doctor-services.service.js")["adminRemoveDoctorService"];
  let adminUpdateDoctorService: typeof import("./doctor-services.service.js")["adminUpdateDoctorService"];
  let DOCTOR_SELECTABLE_SERVICE_KINDS: typeof import("./doctor-services.service.js")["DOCTOR_SELECTABLE_SERVICE_KINDS"];
  let listAdminDoctorServices: typeof import("./doctor-services.service.js")["listAdminDoctorServices"];
  let listDoctorSelectableServices: typeof import("./doctor-services.service.js")["listDoctorSelectableServices"];
  let saveDoctorServiceSelections: typeof import("./doctor-services.service.js")["saveDoctorServiceSelections"];

  let bootError: unknown = null;
  let fixture: {
    doctorId: string;
    countryId: string;
    currencyId: string;
    generalServiceId: string;
    prescriptionServiceId: string;
    healthTestServiceId: string;
  } | null = null;

  const tag = `dsvc-${Date.now()}`;

  before(async () => {
    try {
      const db = await import("../../db/prisma.js");
      const svc = await import("./doctor-services.service.js");
      prisma = db.prisma;
      adminAssignServiceToDoctor = svc.adminAssignServiceToDoctor;
      adminRemoveDoctorService = svc.adminRemoveDoctorService;
      adminUpdateDoctorService = svc.adminUpdateDoctorService;
      DOCTOR_SELECTABLE_SERVICE_KINDS = svc.DOCTOR_SELECTABLE_SERVICE_KINDS;
      listAdminDoctorServices = svc.listAdminDoctorServices;
      listDoctorSelectableServices = svc.listDoctorSelectableServices;
      saveDoctorServiceSelections = svc.saveDoctorServiceSelections;

      await prisma.$queryRawUnsafe("SELECT 1");

      const currency = await prisma.currency.create({
        data: { code: `D${tag.slice(-7)}`, symbol: "€", decimals: 2 },
      });
      const country = await prisma.country.create({
        data: {
          code: `C${tag.slice(-5)}`,
          name: `Doctor Svc ${tag}`,
          slug: `doc-svc-${tag}`,
          legacyHomePath: `/doc-svc-${tag}`,
          teamPath: `/doc-svc-${tag}/team`,
          generalConsultationPath: `/doc-svc-${tag}/general`,
          specialistConsultationPath: `/doc-svc-${tag}/specialist`,
          currencyId: currency.id,
        },
      });
      await prisma.bookingSetting.upsert({
        where: { countryId: country.id },
        create: {
          countryId: country.id,
          doctorServiceSelfSelectApproval: true,
        },
        update: {
          doctorServiceSelfSelectApproval: true,
        },
      });
      const doctor = await prisma.doctor.create({
        data: {
          countryId: country.id,
          slug: `dr-${tag}`,
          fullName: `Dr ${tag}`,
          title: "GP",
          qualifications: [],
          languages: ["English"],
        },
      });
      const general = await prisma.service.create({
        data: {
          countryId: country.id,
          kind: "GENERAL",
          slug: `general-${tag}`,
          name: `General ${tag}`,
          isActive: true,
        },
      });
      const prescription = await prisma.service.create({
        data: {
          countryId: country.id,
          kind: "PRESCRIPTION",
          slug: `rx-${tag}`,
          name: `Prescription ${tag}`,
          isActive: true,
        },
      });
      const healthTest = await prisma.service.create({
        data: {
          countryId: country.id,
          kind: "HEALTH_TEST",
          slug: `test-${tag}`,
          name: `Health test ${tag}`,
          isActive: true,
        },
      });

      fixture = {
        doctorId: doctor.id,
        countryId: country.id,
        currencyId: currency.id,
        generalServiceId: general.id,
        prescriptionServiceId: prescription.id,
        healthTestServiceId: healthTest.id,
      };
    } catch (err) {
      bootError = err;
    }
  });

  after(async () => {
    if (!fixture) return;
    await prisma.serviceDoctor.deleteMany({ where: { doctorId: fixture.doctorId } });
    await prisma.service.deleteMany({
      where: {
        id: {
          in: [
            fixture.generalServiceId,
            fixture.prescriptionServiceId,
            fixture.healthTestServiceId,
          ],
        },
      },
    });
    await prisma.doctor.delete({ where: { id: fixture.doctorId } }).catch(() => {});
    await prisma.bookingSetting.deleteMany({ where: { countryId: fixture.countryId } });
    await prisma.country.delete({ where: { id: fixture.countryId } }).catch(() => {});
    await prisma.currency.delete({ where: { id: fixture.currencyId } }).catch(() => {});
  });

  it("lists only GP, specialist, and prescription services for doctor portal", async (t) => {
    if (!fixture) {
      t.skip(`DB offline: ${describeError(bootError)}`);
      return;
    }
    const { items } = await listDoctorSelectableServices(fixture.doctorId);
    const kinds = new Set(items.map((s) => s.kind));
    for (const kind of kinds) {
      assert.ok(
        DOCTOR_SELECTABLE_SERVICE_KINDS.includes(kind),
        `unexpected kind in doctor list: ${kind}`,
      );
    }
    assert.ok(
      items.some((s) => s.id === fixture!.generalServiceId),
      "general service should appear",
    );
    assert.ok(
      !items.some((s) => s.id === fixture!.healthTestServiceId),
      "health test must not appear in doctor self-select list",
    );
  });

  it("doctor selection creates pending assignment when approval required", async (t) => {
    if (!fixture) {
      t.skip(`DB offline: ${describeError(bootError)}`);
      return;
    }
    const result = await saveDoctorServiceSelections(fixture.doctorId, [
      fixture.generalServiceId,
    ]);
    assert.equal(result.approvalRequired, true);
    const row = result.items.find((s) => s.id === fixture!.generalServiceId);
    assert.ok(row?.assignment);
    assert.equal(row.assignment?.selectedBy, "doctor");
    assert.equal(row.assignment?.status, "pending");
    assert.equal(row.assignment?.isActive, false);
  });

  it("admin approval activates assignment for booking", async (t) => {
    if (!fixture) {
      t.skip(`DB offline: ${describeError(bootError)}`);
      return;
    }
    const rows = await listAdminDoctorServices(fixture.doctorId);
    const pending = rows.find((r) => r.serviceId === fixture!.generalServiceId);
    assert.ok(pending, "pending row should exist");
    const updated = await adminUpdateDoctorService(
      fixture.doctorId,
      pending!.id,
      "active",
    );
    assert.ok(updated);
    assert.equal(updated!.status, "active");
    assert.equal(updated!.isActive, true);
  });

  it("admin can assign health test directly as active", async (t) => {
    if (!fixture) {
      t.skip(`DB offline: ${describeError(bootError)}`);
      return;
    }
    const row = await adminAssignServiceToDoctor(
      fixture.doctorId,
      fixture.healthTestServiceId,
    );
    assert.ok(row);
    assert.equal(row!.selectedBy, "admin");
    assert.equal(row!.status, "active");
    assert.equal(row!.isActive, true);
    assert.equal(row!.service.kind, "HEALTH_TEST");
  });

  it("doctor cannot remove admin-assigned service by deselecting", async (t) => {
    if (!fixture) {
      t.skip(`DB offline: ${describeError(bootError)}`);
      return;
    }
    await saveDoctorServiceSelections(fixture.doctorId, [fixture.generalServiceId]);
    const rows = await listAdminDoctorServices(fixture.doctorId);
    const adminRow = rows.find((r) => r.serviceId === fixture!.healthTestServiceId);
    assert.ok(adminRow, "admin health test assignment should remain");
    await adminRemoveDoctorService(fixture.doctorId, adminRow!.id);
  });

  it("immediate activation when approval disabled", async (t) => {
    if (!fixture) {
      t.skip(`DB offline: ${describeError(bootError)}`);
      return;
    }
    await prisma.bookingSetting.update({
      where: { countryId: fixture.countryId },
      data: { doctorServiceSelfSelectApproval: false },
    });
    await prisma.serviceDoctor.deleteMany({ where: { doctorId: fixture.doctorId } });

    const result = await saveDoctorServiceSelections(fixture.doctorId, [
      fixture.prescriptionServiceId,
    ]);
    assert.equal(result.approvalRequired, false);
    const row = result.items.find((s) => s.id === fixture!.prescriptionServiceId);
    assert.equal(row?.assignment?.status, "active");
    assert.equal(row?.assignment?.isActive, true);

    await prisma.bookingSetting.update({
      where: { countryId: fixture.countryId },
      data: { doctorServiceSelfSelectApproval: true },
    });
  });
});

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
