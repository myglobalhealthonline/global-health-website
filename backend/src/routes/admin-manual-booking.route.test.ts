import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { createManualAppointmentBodySchema } from "../validations/admin-appointments.schema.js";

/**
 * Auth + Zod-schema guards for POST /api/admin/appointments. Mirrors
 * the admin-doctor-registrations route test — skips when buildApp
 * can't reach Postgres locally.
 */
describe("admin manual booking route — auth + validation", () => {
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

  it("rejects unauthenticated POST", async (t) => {
    if (!app) {
      t.skip(`buildApp() failed — DB likely offline: ${describeError(bootError)}`);
      return;
    }
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/appointments",
      payload: {
        patient: { email: "x@example.com", fullName: "Test" },
        serviceId: "svc_xyz",
        countryCode: "ie",
        consultationMode: "ONLINE",
      },
    });
    // 401 (no cookie) or 503 (admin token fallback enabled with no
    // ADMIN_API_TOKEN env). Both mean "no access".
    assert.ok(
      res.statusCode === 401 || res.statusCode === 503,
      `expected 401 or 503, got ${res.statusCode}`,
    );
  });

  it("schema accepts a minimal ONLINE payload", () => {
    const ok = createManualAppointmentBodySchema.safeParse({
      patient: { email: "Walk-In@Example.COM", fullName: "Walk In" },
      serviceId: "svc_1",
      countryCode: "ie",
      consultationMode: "ONLINE",
    });
    assert.equal(ok.success, true);
    if (ok.success) {
      // Email gets lowercased + trimmed by the schema.
      assert.equal(ok.data.patient.email, "walk-in@example.com");
      assert.equal(ok.data.consultationMode, "ONLINE");
    }
  });

  it("schema requires clinic OR location for IN_PERSON", () => {
    const missing = createManualAppointmentBodySchema.safeParse({
      patient: { email: "x@example.com", fullName: "Xy" },
      serviceId: "svc_1",
      countryCode: "ie",
      consultationMode: "IN_PERSON",
    });
    assert.equal(missing.success, false);

    const okClinic = createManualAppointmentBodySchema.safeParse({
      patient: { email: "x@example.com", fullName: "Xy" },
      serviceId: "svc_1",
      countryCode: "ie",
      consultationMode: "IN_PERSON",
      clinicId: "clinic_1",
    });
    assert.equal(okClinic.success, true);

    const okAddress = createManualAppointmentBodySchema.safeParse({
      patient: { email: "x@example.com", fullName: "Xy" },
      serviceId: "svc_1",
      countryCode: "ie",
      consultationMode: "IN_PERSON",
      locationAddress: "123 Main St, Dublin",
    });
    assert.equal(okAddress.success, true);
  });

  it("schema rejects clinic AND location together", () => {
    const both = createManualAppointmentBodySchema.safeParse({
      patient: { email: "x@example.com", fullName: "Xy" },
      serviceId: "svc_1",
      countryCode: "ie",
      consultationMode: "IN_PERSON",
      clinicId: "clinic_1",
      locationAddress: "free text",
    });
    assert.equal(both.success, false);
  });

  it("schema rejects extra fields at top level (.strict())", () => {
    const extra = createManualAppointmentBodySchema.safeParse({
      patient: { email: "x@example.com", fullName: "Xy" },
      serviceId: "svc_1",
      countryCode: "ie",
      consultationMode: "ONLINE",
      surpriseField: "should-not-pass",
    });
    assert.equal(extra.success, false);
  });

  it("schema rejects extra fields inside patient sub-object", () => {
    const extra = createManualAppointmentBodySchema.safeParse({
      patient: {
        email: "x@example.com",
        fullName: "X",
        secretMedicalNote: "leak",
      },
      serviceId: "svc_1",
      countryCode: "ie",
      consultationMode: "ONLINE",
    });
    assert.equal(extra.success, false);
  });

  it("schema requires email + fullName on patient", () => {
    const noEmail = createManualAppointmentBodySchema.safeParse({
      patient: { fullName: "X" },
      serviceId: "svc_1",
      countryCode: "ie",
      consultationMode: "ONLINE",
    });
    assert.equal(noEmail.success, false);

    const noName = createManualAppointmentBodySchema.safeParse({
      patient: { email: "x@example.com" },
      serviceId: "svc_1",
      countryCode: "ie",
      consultationMode: "ONLINE",
    });
    assert.equal(noName.success, false);

    // Too-short name is also rejected (we enforce min 2 chars).
    const shortName = createManualAppointmentBodySchema.safeParse({
      patient: { email: "x@example.com", fullName: "X" },
      serviceId: "svc_1",
      countryCode: "ie",
      consultationMode: "ONLINE",
    });
    assert.equal(shortName.success, false);
  });
});

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
