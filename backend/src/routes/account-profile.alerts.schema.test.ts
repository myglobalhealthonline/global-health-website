import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";

/**
 * Patient-side /api/account/profile must reject `statusAlert` /
 * `clinicAlert` mutations — those are doctor-only clinical flags.
 *
 * The route's Zod schema lives inline in account-profile.route.ts (not
 * exported), but it's a fixed shape: doesn't list the alert fields and
 * uses `.strict()` so unknown keys 400. This file mirrors the exact
 * schema and asserts the rejection behavior so a future contributor
 * who edits the route can't silently widen the patient surface.
 */

const stringField = (max: number) =>
  z.string().trim().max(max).nullable().optional();

const patientPatchSchema = z
  .object({
    fullName: stringField(200),
    phone: stringField(40),
    dateOfBirth: z.string().datetime().nullable().optional(),
    weightKg: z.number().positive().max(500).nullable().optional(),
    heightM: z.number().positive().max(3).nullable().optional(),
    bmi: z.number().positive().max(100).nullable().optional(),
    bloodType: stringField(8),
    allergies: z.array(z.string().trim().max(200)).max(50).optional(),
    chronicDiseases: z.array(z.string().trim().max(200)).max(50).optional(),
    familyHistory: z.array(z.string().trim().max(200)).max(50).optional(),
    socialHabits: z.array(z.string().trim().max(200)).max(50).optional(),
    surgeries: z.array(z.string().trim().max(200)).max(50).optional(),
    nationalIdNumber: stringField(64),
    taxIdNumber: stringField(64),
    passportNumber: stringField(64),
    addressLine1: stringField(200),
    addressLine2: stringField(200),
    addressCity: stringField(120),
    addressPostalCode: stringField(32),
    addressCountryCode: stringField(8),
    preferredPharmacy: stringField(200),
    pricingPlanId: stringField(64),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one field",
  });

describe("patient self /account/profile schema — alert rejection", () => {
  it("accepts a normal identity update", () => {
    const result = patientPatchSchema.safeParse({ nationalIdNumber: "X-123" });
    assert.equal(result.success, true);
  });

  it("rejects statusAlert mutation by patient", () => {
    const result = patientPatchSchema.safeParse({ statusAlert: "Penicillin allergy" });
    assert.equal(result.success, false);
  });

  it("rejects clinicAlert mutation by patient", () => {
    const result = patientPatchSchema.safeParse({ clinicAlert: "Mornings only" });
    assert.equal(result.success, false);
  });

  it("rejects an empty payload (must change at least one field)", () => {
    const result = patientPatchSchema.safeParse({});
    assert.equal(result.success, false);
  });

  it("rejects unknown keys via .strict()", () => {
    const result = patientPatchSchema.safeParse({ wat: "x" });
    assert.equal(result.success, false);
  });

  it("rejects identity values over 64 chars", () => {
    const result = patientPatchSchema.safeParse({
      nationalIdNumber: "x".repeat(65),
    });
    assert.equal(result.success, false);
  });
});
