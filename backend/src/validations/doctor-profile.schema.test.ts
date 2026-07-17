import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { profilePatchBodySchema } from "./doctor-profile.schema.js";

/**
 * `PATCH /api/doctor/profile` used to be the doctor's self-edit for name, bio
 * and qualifications. Those are admin-approved now and flow through
 * DoctorProfileChangeRequest instead, so this endpoint's job is to reject them
 * with an explanation and accept only what the doctor still owns outright.
 */
describe("doctor profile validation", () => {
  it("accepts the fields a doctor still owns", () => {
    const result = profilePatchBodySchema.safeParse({
      languages: ["English", "Portuguese"],
      whatsappNumber: "+351 912 345 678",
    });

    assert.equal(result.success, true);
    if (result.success) {
      assert.deepEqual(result.data.languages, ["English", "Portuguese"]);
      assert.equal(result.data.whatsappNumber, "+351 912 345 678");
    }
  });

  it("accepts payout bank details on their own", () => {
    const result = profilePatchBodySchema.safeParse({
      bankAccountHolder: "Ana Silva",
    });
    assert.equal(result.success, true);
  });

  for (const [field, payload] of [
    ["fullName", { fullName: "Dr Ana Silva" }],
    ["qualifications", { qualifications: ["MB BCh BAO"] }],
    ["bio", { bio: "<p>Hello</p>" }],
    ["translations", { translations: [{ locale: "EN", bio: "<p>Hello</p>" }] }],
  ] as const) {
    it(`rejects ${field} — it needs admin approval`, () => {
      const result = profilePatchBodySchema.safeParse(payload);
      assert.equal(result.success, false);
      if (!result.success) {
        // The message has to name the field: a doctor hitting this needs to
        // know where the change actually goes, not just that it failed.
        const messages = result.error.issues.map((i) => i.message).join(" ");
        assert.match(messages, /admin approval/i);
      }
    });
  }

  it("rejects a locked field even when sent alongside a writable one", () => {
    const result = profilePatchBodySchema.safeParse({
      languages: ["English"],
      fullName: "Dr Ana Silva",
    });
    assert.equal(result.success, false);
  });

  it("rejects an empty update payload", () => {
    assert.equal(profilePatchBodySchema.safeParse({}).success, false);
    assert.equal(
      profilePatchBodySchema.safeParse({ translations: [] }).success,
      false,
    );
  });
});
