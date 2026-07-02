import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveStripeAccount, getConfiguredWebhookSecrets } from "./client.js";

describe("resolveStripeAccount", () => {
  it("routes Portugal to its own account", () => {
    assert.equal(resolveStripeAccount("pt"), "pt");
    assert.equal(resolveStripeAccount("PT"), "pt");
    assert.equal(resolveStripeAccount(" Pt "), "pt");
  });

  it("routes Czech to its own account", () => {
    assert.equal(resolveStripeAccount("cz"), "cz");
  });

  it("routes everything else (incl. Spain, Ireland, Romania, Brazil, unknown) to Ireland", () => {
    assert.equal(resolveStripeAccount("es"), "ie");
    assert.equal(resolveStripeAccount("sp"), "ie");
    assert.equal(resolveStripeAccount("ie"), "ie");
    assert.equal(resolveStripeAccount("rm"), "ie");
    assert.equal(resolveStripeAccount("ro"), "ie");
    assert.equal(resolveStripeAccount("br"), "ie");
    assert.equal(resolveStripeAccount("xx"), "ie");
  });

  it("defaults undefined / null / empty to Ireland", () => {
    assert.equal(resolveStripeAccount(undefined), "ie");
    assert.equal(resolveStripeAccount(null), "ie");
    assert.equal(resolveStripeAccount(""), "ie");
  });
});

describe("getConfiguredWebhookSecrets", () => {
  it("returns a de-duplicated list of only configured secrets", () => {
    const secrets = getConfiguredWebhookSecrets();
    // No duplicates.
    assert.equal(secrets.length, new Set(secrets).size);
    // Every entry is a non-empty string.
    for (const s of secrets) assert.ok(typeof s === "string" && s.length > 0);
  });
});
