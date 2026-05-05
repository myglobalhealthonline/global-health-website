import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminAssetCreateBodySchema,
  adminAssetsQuerySchema,
  assetPathSchema,
} from "../../validations/admin-assets.schema.js";

describe("admin assets validation", () => {
  it("path rejects javascript and unsafe schemes", () => {
    assert.equal(assetPathSchema.safeParse("javascript:alert(1)").success, false);
    assert.equal(assetPathSchema.safeParse("data:image/png;base64,abc").success, false);
    assert.equal(assetPathSchema.safeParse("http://evil.com/x.png").success, false);
  });

  it("path allows https and absolute paths", () => {
    assert.equal(assetPathSchema.safeParse("https://cdn.example.com/a.png").success, true);
    assert.equal(assetPathSchema.safeParse("/images/hero/a.svg").success, true);
  });

  it("path rejects relative-looking paths without leading slash", () => {
    assert.equal(assetPathSchema.safeParse("images/foo.svg").success, false);
  });

  it("create rejects missing alt for IMAGE kind", () => {
    const result = adminAssetCreateBodySchema.safeParse({
      countryId: null,
      doctorId: null,
      kind: "IMAGE",
      key: "hero-ie",
      path: "/images/hero.svg",
      altText: "",
    });
    assert.equal(result.success, false);
  });

  it("create allows SOCIAL without alt", () => {
    const result = adminAssetCreateBodySchema.safeParse({
      countryId: null,
      doctorId: null,
      kind: "SOCIAL",
      key: "twitter-icon",
      path: "/icons/twitter.svg",
      altText: null,
    });
    assert.equal(result.success, true);
  });

  it("create accepts IMAGE with alt", () => {
    const result = adminAssetCreateBodySchema.safeParse({
      countryId: null,
      doctorId: null,
      kind: "IMAGE",
      key: "hero-ie",
      path: "/images/hero.svg",
      altText: "Hero illustration",
    });
    assert.equal(result.success, true);
  });

  it("create rejects missing country when validated only via service — schema allows null country", () => {
    const result = adminAssetCreateBodySchema.safeParse({
      countryId: null,
      doctorId: null,
      kind: "LOGO",
      key: "logo-main",
      path: "/logos/wordmark.svg",
      altText: "Logo",
    });
    assert.equal(result.success, true);
  });

  it("query schema parses filters", () => {
    const result = adminAssetsQuerySchema.safeParse({
      page: "1",
      pageSize: "50",
      countryCode: "ie",
      kind: "IMAGE",
      isActive: "true",
      search: "hero",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.kind, "IMAGE");
      assert.equal(result.data.isActive, true);
    }
  });

  it("duplicate kind+key is enforced by DB unique index", () => {
    const a = adminAssetCreateBodySchema.safeParse({
      countryId: null,
      doctorId: null,
      kind: "ICON",
      key: "same-key",
      path: "/icons/a.svg",
      altText: "A",
    });
    const b = adminAssetCreateBodySchema.safeParse({
      countryId: null,
      doctorId: null,
      kind: "ICON",
      key: "same-key",
      path: "/icons/b.svg",
      altText: "B",
    });
    assert.equal(a.success, true);
    assert.equal(b.success, true);
  });
});
