import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminContentPageCreateBodySchema,
  adminContentPagesQuerySchema,
  contentPageKeySchema,
} from "../../validations/admin-content-pages.schema.js";

describe("admin content pages validation", () => {
  it("rejects unsafe pageKey", () => {
    assert.equal(contentPageKeySchema.safeParse("terms/and/conditions").success, false);
    assert.equal(contentPageKeySchema.safeParse("Terms and Conditions").success, false);
  });

  it("accepts safe pageKey", () => {
    assert.equal(contentPageKeySchema.safeParse("terms-and-conditions").success, true);
  });

  it("requires body/content for published content page", () => {
    const result = adminContentPageCreateBodySchema.safeParse({
      pageKey: "privacy-policy",
      title: "Privacy Policy",
      body: "",
      locale: "EN",
      status: "PUBLISHED",
    });
    assert.equal(result.success, false);
  });

  it("rejects invalid locale", () => {
    const result = adminContentPageCreateBodySchema.safeParse({
      pageKey: "privacy-policy",
      title: "Privacy Policy",
      body: "Approved content",
      locale: "IT",
      status: "DRAFT",
    });
    assert.equal(result.success, false);
  });

  it("parses query with status and active flag", () => {
    const result = adminContentPagesQuerySchema.safeParse({
      page: "1",
      pageSize: "20",
      status: "DRAFT",
      isActive: "true",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.status, "DRAFT");
      assert.equal(result.data.isActive, true);
    }
  });
});
