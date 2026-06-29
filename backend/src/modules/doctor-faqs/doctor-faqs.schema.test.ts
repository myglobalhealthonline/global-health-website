import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { doctorFaqsReplaceBodySchema } from "../../validations/doctor-faqs.schema.js";

describe("doctor FAQ validation", () => {
  it("accepts a per-locale FAQ set", () => {
    const result = doctorFaqsReplaceBodySchema.safeParse({
      faqs: [
        {
          locale: "EN",
          question: "Do you prescribe online?",
          answer: "Yes, where clinically appropriate.",
          category: "Prescriptions",
          sortOrder: 0,
          isActive: true,
        },
        { locale: "PT", question: "Atende em português?", answer: "Sim." },
      ],
    });
    assert.equal(result.success, true);
  });

  it("defaults sortOrder and isActive", () => {
    const result = doctorFaqsReplaceBodySchema.parse({
      faqs: [{ locale: "EN", question: "Q?", answer: "A." }],
    });
    assert.equal(result.faqs[0].sortOrder, 0);
    assert.equal(result.faqs[0].isActive, true);
  });

  it("rejects an empty question", () => {
    const result = doctorFaqsReplaceBodySchema.safeParse({
      faqs: [{ locale: "EN", question: "", answer: "A." }],
    });
    assert.equal(result.success, false);
  });

  it("accepts an empty list (clears all FAQs)", () => {
    assert.equal(doctorFaqsReplaceBodySchema.safeParse({ faqs: [] }).success, true);
  });
});
