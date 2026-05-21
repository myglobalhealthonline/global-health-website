import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scheduleAppointmentBodySchema } from "./admin-appointments.schema.js";

/**
 * Covers the location-field additions from T5 / T12:
 *   - clinicId (string | null) — soft FK to a Clinic row
 *   - locationAddress (string | null | "") — free-text override
 *   - Mutually exclusive when both are set to non-empty values
 *
 * The IN_PERSON "must have at least one of clinic/address" rule is
 * enforced in the route handler (it needs the current appointment's
 * consultationMode) and is covered by the manual smoke checklist
 * rather than this Zod-level test.
 */

describe("scheduleAppointmentBodySchema — location fields", () => {
  it("accepts a clinicId only", () => {
    const result = scheduleAppointmentBodySchema.safeParse({
      clinicId: "cln_abcd1234efgh",
    });
    assert.equal(result.success, true);
  });

  it("accepts a free-text locationAddress only", () => {
    const result = scheduleAppointmentBodySchema.safeParse({
      locationAddress: "1 Praça do Comércio, 1100-148 Lisboa",
    });
    assert.equal(result.success, true);
  });

  it("accepts clinicId = null to clear the link", () => {
    const result = scheduleAppointmentBodySchema.safeParse({
      clinicId: null,
    });
    assert.equal(result.success, true);
  });

  it("accepts locationAddress = '' to clear the override", () => {
    const result = scheduleAppointmentBodySchema.safeParse({
      locationAddress: "",
    });
    assert.equal(result.success, true);
  });

  it("rejects both clinicId AND non-empty locationAddress at once", () => {
    const result = scheduleAppointmentBodySchema.safeParse({
      clinicId: "cln_abcd1234efgh",
      locationAddress: "Backup address",
    });
    assert.equal(result.success, false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      assert.ok(
        messages.some((m) => m.includes("OR")),
        `expected "OR" hint in error messages, got ${JSON.stringify(messages)}`,
      );
    }
  });

  it("allows clinicId + empty locationAddress (clearing override while picking a clinic)", () => {
    const result = scheduleAppointmentBodySchema.safeParse({
      clinicId: "cln_abcd1234efgh",
      locationAddress: "",
    });
    assert.equal(result.success, true);
  });

  it("requires at least one field on the patch", () => {
    const result = scheduleAppointmentBodySchema.safeParse({});
    assert.equal(result.success, false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      assert.ok(
        messages.some((m) => m.includes("Provide at least")),
        `expected "Provide at least" hint, got ${JSON.stringify(messages)}`,
      );
    }
  });

  it("rejects locationAddress longer than 500 chars", () => {
    const result = scheduleAppointmentBodySchema.safeParse({
      locationAddress: "x".repeat(501),
    });
    assert.equal(result.success, false);
  });
});
