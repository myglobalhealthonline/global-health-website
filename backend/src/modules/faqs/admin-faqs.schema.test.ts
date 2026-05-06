import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminFaqCreateBodySchema,
  adminFaqsQuerySchema,
} from "../../validations/admin-faqs.schema.js";

describe("admin FAQs validation", () => {
  it("requires question and answer", () => {
    const result = adminFaqCreateBodySchema.safeParse({
      locale: "EN",
      question: "",
      answer: "",
      sortOrder: 0,
    });
    assert.equal(result.success, false);
  });

  it("rejects invalid locale", () => {
    const result = adminFaqCreateBodySchema.safeParse({
      locale: "IT",
      question: "How does this work?",
      answer: "Like this.",
      sortOrder: 2,
    });
    assert.equal(result.success, false);
  });

  it("accepts numeric sortOrder", () => {
    const result = adminFaqCreateBodySchema.safeParse({
      locale: "EN",
      question: "How does this work?",
      answer: "Like this.",
      sortOrder: "5",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.sortOrder, 5);
    }
  });

  it("parses query filters", () => {
    const result = adminFaqsQuerySchema.safeParse({
      page: "1",
      pageSize: "25",
      locale: "EN",
      isActive: "false",
      search: "refund",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.isActive, false);
    }
  });
});
