import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { buildMetaPurchasePayload } from "./capi-client.js";

describe("buildMetaPurchasePayload", () => {
  it("uses the order id as event_id, for browser/server dedup", () => {
    const payload = buildMetaPurchasePayload({
      orderId: "order_123",
      eventTime: 1_700_000_000,
      valueMajorUnits: 42.5,
      currency: "EUR",
    });
    assert.equal(payload.data[0].event_id, "order_123");
    assert.equal(payload.data[0].event_name, "Purchase");
    assert.equal(payload.data[0].action_source, "website");
  });

  it("carries only currency + value in custom_data — never item/service names", () => {
    const payload = buildMetaPurchasePayload({
      orderId: "order_1",
      eventTime: 1_700_000_000,
      valueMajorUnits: 19.99,
      currency: "USD",
    });
    assert.deepEqual(Object.keys(payload.data[0].custom_data).sort(), ["currency", "value"]);
    assert.equal(payload.data[0].custom_data.value, "19.99");
    assert.equal(payload.data[0].custom_data.currency, "USD");
  });

  it("hashes email as lowercase-trimmed SHA-256", () => {
    const payload = buildMetaPurchasePayload({
      orderId: "order_1",
      eventTime: 1_700_000_000,
      valueMajorUnits: 10,
      currency: "EUR",
      email: "  Patient@Example.COM ",
    });
    const expected = createHash("sha256").update("patient@example.com").digest("hex");
    assert.deepEqual(payload.data[0].user_data.em, [expected]);
  });

  it("hashes phone as digits-only SHA-256", () => {
    const payload = buildMetaPurchasePayload({
      orderId: "order_1",
      eventTime: 1_700_000_000,
      valueMajorUnits: 10,
      currency: "EUR",
      phone: "+353 (87) 123-4567",
    });
    const expected = createHash("sha256").update("353871234567").digest("hex");
    assert.deepEqual(payload.data[0].user_data.ph, [expected]);
  });

  it("omits user_data fields that were not supplied", () => {
    const payload = buildMetaPurchasePayload({
      orderId: "order_1",
      eventTime: 1_700_000_000,
      valueMajorUnits: 10,
      currency: "EUR",
    });
    assert.deepEqual(payload.data[0].user_data, {});
  });

  it("passes through client IP, user agent, fbp, fbc unhashed", () => {
    const payload = buildMetaPurchasePayload({
      orderId: "order_1",
      eventTime: 1_700_000_000,
      valueMajorUnits: 10,
      currency: "EUR",
      clientIp: "203.0.113.5",
      clientUserAgent: "Mozilla/5.0",
      fbp: "fb.1.111.222",
      fbc: "fb.1.111.333",
    });
    assert.equal(payload.data[0].user_data.client_ip_address, "203.0.113.5");
    assert.equal(payload.data[0].user_data.client_user_agent, "Mozilla/5.0");
    assert.equal(payload.data[0].user_data.fbp, "fb.1.111.222");
    assert.equal(payload.data[0].user_data.fbc, "fb.1.111.333");
  });
});
