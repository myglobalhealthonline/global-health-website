import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminDoctorMarketPatchBodySchema,
  doctorMarketPatchBodySchema,
} from "../../validations/doctor-market-profiles.schema.js";

describe("doctor market profile validation", () => {
  it("admin payload accepts market title, bio, SEO, and registration fields", () => {
    const result = adminDoctorMarketPatchBodySchema.safeParse({
      active: true,
      sortOrder: 2,
      chamberEntity: "IMC",
      registrationNumber: "123456",
      division: "General Division",
      isVerified: true,
      translations: [
        {
          locale: "EN",
          title: "Medical Doctor",
          bio: "<p>English market bio</p>",
          seoTitle: "Dr Smith Ireland",
          seoDescription: "Ireland profile description",
          seoKeywords: ["cardiology", "telehealth"],
        },
      ],
    });

    assert.equal(result.success, true);
  });

  it("admin payload rejects bank fields (payout is doctor-owned)", () => {
    const result = adminDoctorMarketPatchBodySchema.safeParse({
      translations: [{ locale: "EN", bio: "<p>bio</p>" }],
      bank: { accountHolder: "Jane Smith", iban: "IE29AIBK93115212345678" },
    });
    assert.equal(result.success, false);
  });

  it("admin payload rejects FAQ fields (now doctor-level)", () => {
    const result = adminDoctorMarketPatchBodySchema.safeParse({
      translations: [{ locale: "EN", bio: "<p>bio</p>" }],
      faqs: [{ locale: "EN", question: "Q?", answer: "A." }],
    });
    assert.equal(result.success, false);
  });

  it("doctor payload accepts only practical market fields", () => {
    const result = doctorMarketPatchBodySchema.safeParse({
      chamberEntity: "IMC",
      registrationNumber: "123456",
      division: "General Division",
      translations: [{ locale: "EN", bio: "<p>Doctor-authored bio</p>" }],
      bank: {
        accountHolder: "Jane Smith",
        iban: "IE29AIBK93115212345678",
        bic: "AIBKIE2D",
      },
    });

    assert.equal(result.success, true);
  });

  it("doctor payload rejects SEO and FAQ fields", () => {
    const seo = doctorMarketPatchBodySchema.safeParse({
      translations: [
        {
          locale: "EN",
          bio: "<p>Bio</p>",
          seoTitle: "Should be admin-only",
        },
      ],
    });
    const faq = doctorMarketPatchBodySchema.safeParse({
      faqs: [
        {
          locale: "EN",
          question: "Admin-only?",
          answer: "Yes.",
        },
      ],
    });

    assert.equal(seo.success, false);
    assert.equal(faq.success, false);
  });

  it("rejects empty market updates", () => {
    assert.equal(adminDoctorMarketPatchBodySchema.safeParse({}).success, false);
    assert.equal(doctorMarketPatchBodySchema.safeParse({}).success, false);
  });
});
