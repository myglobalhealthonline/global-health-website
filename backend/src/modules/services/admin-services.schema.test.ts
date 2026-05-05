import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminServiceCreateBodySchema,
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
      slug: "test-service",
      name: "Test",
      basePriceCents: -100,
    });
    assert.equal(result.success, false);
  });

  it("create rejects non-positive durationMinutes when provided", () => {
    const noDuration = adminServiceCreateBodySchema.safeParse({
      countryId: "c1",
      slug: "test-service",
      name: "Test",
      durationMinutes: 0,
    });
    assert.equal(noDuration.success, false);

    const neg = adminServiceCreateBodySchema.safeParse({
      countryId: "c1",
      slug: "test-service",
      name: "Test",
      durationMinutes: -5,
    });
    assert.equal(neg.success, false);
  });

  it("create accepts valid payload", () => {
    const result = adminServiceCreateBodySchema.safeParse({
      countryId: "c1",
      slug: "medical-consultation",
      name: "Consultation",
      durationMinutes: 20,
      basePriceCents: 0,
    });
    assert.equal(result.success, true);
  });

  it("query schema parses filters and pagination", () => {
    const result = adminServicesQuerySchema.safeParse({
      page: "2",
      pageSize: "10",
      countryCode: "ie",
      isActive: "true",
      search: "medical",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.page, 2);
      assert.equal(result.data.pageSize, 10);
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
