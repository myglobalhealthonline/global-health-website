import assert from "node:assert/strict";
import test from "node:test";

import { SUKL_SERVICES } from "../lib/sukl/config.js";
import { suklPingQuerySchema, suklWsdlQuerySchema } from "./admin-sukl.schema.js";

/**
 * The WSDL endpoint fetches over mutual TLS using the facility's certificate,
 * so the `path` parameter is the one place a caller could try to redirect that
 * credential at a host of their choosing. These tests pin that it cannot.
 */

test("defaults to the single conventional WSDL location", () => {
  const parsed = suklWsdlQuerySchema.parse({ service: "cuep" });
  assert.equal(parsed.path, "/?wsdl");
  assert.equal(parsed.service, "cuep");
});

test("accepts a plain path with a query string", () => {
  assert.equal(
    suklWsdlQuerySchema.parse({ service: "common", path: "/cuep/Poukaz?wsdl" }).path,
    "/cuep/Poukaz?wsdl",
  );
});

test("rejects anything that could redirect the client certificate elsewhere", () => {
  const rejected = [
    "https://evil.example/x", // absolute URL
    "//evil.example/x", // protocol-relative — the classic bypass
    "http://evil.example", // scheme
    "relative/path", // must be anchored at /
    "", // empty
  ];
  for (const path of rejected) {
    assert.throws(
      () => suklWsdlQuerySchema.parse({ service: "cuep", path }),
      `expected "${path}" to be rejected`,
    );
  }
});

test("every configured service is addressable, and nothing else is", () => {
  // Derived from SUKL_SERVICES rather than a hardcoded list: adding a service
  // must not leave the route rejecting the value the console offers.
  for (const service of SUKL_SERVICES) {
    assert.equal(suklWsdlQuerySchema.parse({ service }).service, service);
    assert.equal(suklPingQuerySchema.parse({ service }).service, service);
  }
  // cuer is the eRecept (medicines) service the product needs — guard against
  // a refactor quietly dropping it back to devices-only.
  assert.ok((SUKL_SERVICES as readonly string[]).includes("cuer"));
  assert.throws(() => suklWsdlQuerySchema.parse({ service: "cross-border" }));
  assert.throws(() => suklWsdlQuerySchema.parse({ service: "" }));
});
