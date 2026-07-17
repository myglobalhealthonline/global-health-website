import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { doctorMarketPatchBodySchema } from "./doctor-market-profiles.schema.js";
import {
  adminDoctorProfileChangeReviewBodySchema,
  doctorProfileChangeRequestBodySchema,
} from "./doctor-profile-change-requests.schema.js";

describe("doctor market self-patch validation", () => {
  it("accepts payout details — the one thing still doctor-owned here", () => {
    const result = doctorMarketPatchBodySchema.safeParse({
      bank: { accountHolder: "Ana Silva" },
    });
    assert.equal(result.success, true);
  });

  for (const [field, payload] of [
    ["registrationNumber", { registrationNumber: "123456" }],
    ["chamberEntity", { chamberEntity: "OM" }],
    ["division", { division: "General Division" }],
    ["translations", { translations: [{ locale: "EN", bio: "<p>Hi</p>" }] }],
  ] as const) {
    it(`rejects ${field} — it needs admin approval`, () => {
      const result = doctorMarketPatchBodySchema.safeParse(payload);
      assert.equal(result.success, false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message).join(" ");
        assert.match(messages, /admin approval/i);
      }
    });
  }

  it("rejects an empty payload", () => {
    assert.equal(doctorMarketPatchBodySchema.safeParse({}).success, false);
  });
});

describe("doctor profile change request body", () => {
  it("accepts a full name proposal", () => {
    const result = doctorProfileChangeRequestBodySchema.safeParse({
      field: "fullName",
      value: "  Dr Ana Silva  ",
    });
    assert.equal(result.success, true);
    if (result.success && result.data.field === "fullName") {
      assert.equal(result.data.value, "Dr Ana Silva");
    }
  });

  it("accepts a registration proposal with nulls for the blanks", () => {
    const result = doctorProfileChangeRequestBodySchema.safeParse({
      field: "registration",
      countryId: "country-1",
      chamberEntity: "OM",
      registrationNumber: "123456",
      division: "",
    });
    assert.equal(result.success, true);
    if (result.success && result.data.field === "registration") {
      // Empty string is a cleared field, not a literal "" written to the DB.
      assert.equal(result.data.division, null);
    }
  });

  it("requires a market for market-scoped fields", () => {
    assert.equal(
      doctorProfileChangeRequestBodySchema.safeParse({
        field: "registration",
        chamberEntity: "OM",
        registrationNumber: "123456",
        division: null,
      }).success,
      false,
    );
    assert.equal(
      doctorProfileChangeRequestBodySchema.safeParse({
        field: "bio",
        translations: [{ locale: "EN", bio: "<p>Hi</p>" }],
      }).success,
      false,
    );
  });

  it("rejects duplicate bio locales", () => {
    const result = doctorProfileChangeRequestBodySchema.safeParse({
      field: "bio",
      countryId: "country-1",
      translations: [
        { locale: "EN", bio: "<p>Hello</p>" },
        { locale: "EN", bio: "<p>Again</p>" },
      ],
    });
    assert.equal(result.success, false);
  });

  it("rejects a photo proposal — that needs the upload route", () => {
    const result = doctorProfileChangeRequestBodySchema.safeParse({
      field: "photo",
      photo: { removed: true },
    });
    assert.equal(result.success, false);
  });

  it("rejects an unknown field", () => {
    assert.equal(
      doctorProfileChangeRequestBodySchema.safeParse({
        field: "slug",
        value: "sneaky",
      }).success,
      false,
    );
  });
});

describe("admin review body", () => {
  it("accepts an approval that marks the registration verified", () => {
    const result = adminDoctorProfileChangeReviewBodySchema.safeParse({
      status: "approved",
      markVerified: true,
    });
    assert.equal(result.success, true);
  });

  it("accepts a rejection with a note", () => {
    const result = adminDoctorProfileChangeReviewBodySchema.safeParse({
      status: "rejected",
      reviewNote: "Please attach the certificate",
    });
    assert.equal(result.success, true);
  });

  it("rejects statuses that aren't a decision", () => {
    for (const status of ["pending", "cancelled", "active"]) {
      assert.equal(
        adminDoctorProfileChangeReviewBodySchema.safeParse({ status }).success,
        false,
      );
    }
  });
});
