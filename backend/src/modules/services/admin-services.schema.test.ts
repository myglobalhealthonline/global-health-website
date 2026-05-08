import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminServiceCreateBodySchema,
  adminServiceUpdateBodySchema,
  adminServicesQuerySchema,
  serviceSlugSchema,
} from "../../validations/admin-services.schema.js";

describe("admin services validation", () => {
  it("rejects invalid slug characters", () => {
    assert.equal(serviceSlugSchema.safeParse("Bad_Slug").success, false);
    assert.equal(serviceSlugSchema.safeParse("UPPER").success, false);
    assert.equal(serviceSlugSchema.safeParse("ok-slug").success, true);
  });

  it("create rejects negative basePriceCents", () => {
    const result = adminServiceCreateBodySchema.safeParse({
      countryId: "c1",
      kind: "GENERAL",
      slug: "test-service",
      name: "Test",
      basePriceCents: -100,
    });
    assert.equal(result.success, false);
  });

  it("create rejects non-positive durationMinutes when provided", () => {
    const noDuration = adminServiceCreateBodySchema.safeParse({
      countryId: "c1",
      kind: "GENERAL",
      slug: "test-service",
      name: "Test",
      durationMinutes: 0,
    });
    assert.equal(noDuration.success, false);

    const neg = adminServiceCreateBodySchema.safeParse({
      countryId: "c1",
      kind: "GENERAL",
      slug: "test-service",
      name: "Test",
      durationMinutes: -5,
    });
    assert.equal(neg.success, false);
  });

  it("create accepts valid payload", () => {
    const result = adminServiceCreateBodySchema.safeParse({
      countryId: "c1",
      kind: "GENERAL",
      slug: "medical-consultation",
      name: "Consultation",
      durationMinutes: 20,
      basePriceCents: 0,
    });
    assert.equal(result.success, true);
  });

  it("update accepts rich detailBody HTML", () => {
    const result = adminServiceUpdateBodySchema.safeParse({
      kind: "GENERAL",
      detailBody: "<p><span style=\"font-family: Georgia; color: #1b4d3e;\" class=\"MsoNormal\">Detailed body</span></p>",
    });
    assert.equal(result.success, true);
  });

  it("update accepts large detailBody values", () => {
    const result = adminServiceUpdateBodySchema.safeParse({
      kind: "GENERAL",
      detailBody: `<p>${"a".repeat(50000)}</p>`,
    });
    assert.equal(result.success, true);
  });

  it("requires specialty for specialist services", () => {
    const result = adminServiceCreateBodySchema.safeParse({
      countryId: "c1",
      kind: "SPECIALIST",
      slug: "cardiology-consultation",
      name: "Cardiology Consultation",
    });
    assert.equal(result.success, false);
  });

  it("rejects specialty for non-specialist services", () => {
    const result = adminServiceCreateBodySchema.safeParse({
      countryId: "c1",
      kind: "GENERAL",
      slug: "medical-consultation",
      name: "Consultation",
      specialtyId: "sp1",
    });
    assert.equal(result.success, false);
  });

  it("query schema parses filters and pagination", () => {
    const result = adminServicesQuerySchema.safeParse({
      page: "2",
      pageSize: "10",
      kind: "GENERAL",
      countryCode: "ie",
      isActive: "true",
      search: "medical",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.page, 2);
      assert.equal(result.data.pageSize, 10);
      assert.equal(result.data.kind, "GENERAL");
      assert.equal(result.data.countryCode, "ie");
      assert.equal(result.data.isActive, true);
      assert.equal(result.data.search, "medical");
    }
  });

  it("query schema coerces isActive false", () => {
    const result = adminServicesQuerySchema.safeParse({ isActive: "false" });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.isActive, false);
    }
  });
});
