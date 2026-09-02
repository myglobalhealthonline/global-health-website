import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { createManualAppointmentBodySchema } from "../validations/admin-appointments.schema.js";

/**
 * Auth + Zod-schema guards for POST /api/admin/appointments. Mirrors
 * the admin-doctor-registrations route test — skips when buildApp
 * can't reach Postgres locally.
 *
 * The schema is the server-side HARD GUARD: an incomplete manual booking
 * must be rejected here (400) before any patient account, payment link,
 * or email/WhatsApp side-effect runs. These cases lock in the required
 * fields: patient name + email + phone (with country code), service,
 * doctor, time slot, consultation mode.
 */

/** A fully-valid ONLINE payload. Tests spread overrides onto this so each
 *  case isolates exactly one rule. */
function validPayload(
  overrides: Record<string, unknown> = {},
  patientOverrides: Record<string, unknown> = {},
) {
  return {
    patient: {
      email: "walk-in@example.com",
      fullName: "Walk In",
      phone: "+353 871234567",
      ...patientOverrides,
    },
    serviceId: "svc_1",
    doctorId: "doc_1",
    timeSlotId: "slot_1",
    countryCode: "ie",
    consultationMode: "ONLINE",
    ...overrides,
  };
}

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
      payload: validPayload(),
    });
    // 401 (no cookie) or 503 (admin token fallback enabled with no
    // ADMIN_API_TOKEN env). Both mean "no access".
    assert.ok(
      res.statusCode === 401 || res.statusCode === 503,
      `expected 401 or 503, got ${res.statusCode}`,
    );
  });

  it("schema accepts a complete ONLINE payload", () => {
    const ok = createManualAppointmentBodySchema.safeParse(
      validPayload({}, { email: "Walk-In@Example.COM" }),
    );
    assert.equal(ok.success, true);
    if (ok.success) {
      // Email gets lowercased + trimmed by the schema.
      assert.equal(ok.data.patient.email, "walk-in@example.com");
      assert.equal(ok.data.consultationMode, "ONLINE");
      assert.equal(ok.data.doctorId, "doc_1");
      assert.equal(ok.data.timeSlotId, "slot_1");
    }
  });

  it("schema requires clinic OR location for IN_PERSON", () => {
    const missing = createManualAppointmentBodySchema.safeParse(
      validPayload({ consultationMode: "IN_PERSON" }),
    );
    assert.equal(missing.success, false);

    const okClinic = createManualAppointmentBodySchema.safeParse(
      validPayload({ consultationMode: "IN_PERSON", clinicId: "clinic_1" }),
    );
    assert.equal(okClinic.success, true);

    const okAddress = createManualAppointmentBodySchema.safeParse(
      validPayload({
        consultationMode: "IN_PERSON",
        locationAddress: "123 Main St, Dublin",
      }),
    );
    assert.equal(okAddress.success, true);
  });

  it("schema rejects clinic AND location together", () => {
    const both = createManualAppointmentBodySchema.safeParse(
      validPayload({
        consultationMode: "IN_PERSON",
        clinicId: "clinic_1",
        locationAddress: "free text",
      }),
    );
    assert.equal(both.success, false);
  });

  it("schema rejects extra fields at top level (.strict())", () => {
    const extra = createManualAppointmentBodySchema.safeParse(
      validPayload({ surpriseField: "should-not-pass" }),
    );
    assert.equal(extra.success, false);
  });

  it("schema rejects extra fields inside patient sub-object", () => {
    const extra = createManualAppointmentBodySchema.safeParse(
      validPayload({}, { secretMedicalNote: "leak" }),
    );
    assert.equal(extra.success, false);
  });

  it("schema requires email + a valid-length fullName on patient", () => {
    const noEmail = createManualAppointmentBodySchema.safeParse(
      validPayload({}, { email: undefined }),
    );
    assert.equal(noEmail.success, false);

    const noName = createManualAppointmentBodySchema.safeParse(
      validPayload({}, { fullName: undefined }),
    );
    assert.equal(noName.success, false);

    // Too-short name is also rejected (we enforce min 2 chars).
    const shortName = createManualAppointmentBodySchema.safeParse(
      validPayload({}, { fullName: "X" }),
    );
    assert.equal(shortName.success, false);
  });

  it("schema requires a doctor (manual bookings always claim a doctor's slot)", () => {
    const noDoctor = createManualAppointmentBodySchema.safeParse(
      validPayload({ doctorId: undefined }),
    );
    assert.equal(noDoctor.success, false);

    const emptyDoctor = createManualAppointmentBodySchema.safeParse(
      validPayload({ doctorId: "" }),
    );
    assert.equal(emptyDoctor.success, false);
  });

  it("schema requires a time slot id", () => {
    const noSlot = createManualAppointmentBodySchema.safeParse(
      validPayload({ timeSlotId: undefined }),
    );
    assert.equal(noSlot.success, false);

    const emptySlot = createManualAppointmentBodySchema.safeParse(
      validPayload({ timeSlotId: "" }),
    );
    assert.equal(emptySlot.success, false);
  });

  it("schema requires a phone number with a country code", () => {
    const noPhone = createManualAppointmentBodySchema.safeParse(
      validPayload({}, { phone: undefined }),
    );
    assert.equal(noPhone.success, false);

    // National number without a leading +<code> is rejected.
    const noCode = createManualAppointmentBodySchema.safeParse(
      validPayload({}, { phone: "871234567" }),
    );
    assert.equal(noCode.success, false);

    // Dial code but no national digits.
    const codeOnly = createManualAppointmentBodySchema.safeParse(
      validPayload({}, { phone: "+353" }),
    );
    assert.equal(codeOnly.success, false);

    // Too short to be a real number.
    const tooShort = createManualAppointmentBodySchema.safeParse(
      validPayload({}, { phone: "+353 12" }),
    );
    assert.equal(tooShort.success, false);
  });

  it("schema accepts an omitted, null, or whole 0..100 discount", () => {
    for (const discountPercent of [undefined, null, 0, 20, 100]) {
      const ok = createManualAppointmentBodySchema.safeParse(
        validPayload({ discountPercent }),
      );
      assert.equal(
        ok.success,
        true,
        `expected discountPercent ${String(discountPercent)} to be accepted`,
      );
    }
  });

  it("schema rejects an out-of-range or fractional discount", () => {
    // Over 100 would flip the price negative; below 0 would be a surcharge the
    // admin never intended; fractional percents don't survive the cents maths
    // cleanly, so they're rejected rather than silently rounded.
    for (const discountPercent of [-1, 101, 12.5, "20"]) {
      const bad = createManualAppointmentBodySchema.safeParse(
        validPayload({ discountPercent }),
      );
      assert.equal(
        bad.success,
        false,
        `expected discountPercent ${String(discountPercent)} to be rejected`,
      );
    }
  });

  it("schema accepts an omitted, null, or well-formed coupon code", () => {
    for (const couponCode of [undefined, null, "SUMMER20", "AB-12"]) {
      const ok = createManualAppointmentBodySchema.safeParse(validPayload({ couponCode }));
      assert.equal(
        ok.success,
        true,
        `expected couponCode ${String(couponCode)} to be accepted`,
      );
    }
  });

  it("schema rejects an over-long coupon code", () => {
    // Shape only — whether the code exists, is in date, has uses left and is
    // allowed on this booking is decided by createManualBooking, which is also
    // where a coupon and a manual discount are refused as mutually exclusive.
    const bad = createManualAppointmentBodySchema.safeParse(
      validPayload({ couponCode: "X".repeat(33) }),
    );
    assert.equal(bad.success, false);
  });

  it("schema accepts valid international phone formats across markets", () => {
    for (const phone of [
      "+353 871234567", // Ireland
      "+420777123456", // Czechia (no space)
      "+351 912345678", // Portugal
      "+34 612345678", // Spain
      "+40 712345678", // Romania
      "+356 79123456", // Malta
      "+55 11912345678", // Brazil
    ]) {
      const ok = createManualAppointmentBodySchema.safeParse(
        validPayload({}, { phone }),
      );
      assert.equal(ok.success, true, `expected ${phone} to be accepted`);
    }
  });
});

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
