import assert from "node:assert/strict";
import test from "node:test";

import { suklWsdlQuerySchema } from "./admin-sukl.schema.js";

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

test("only the two known services are addressable", () => {
  assert.throws(() => suklWsdlQuerySchema.parse({ service: "cross-border" }));
  assert.throws(() => suklWsdlQuerySchema.parse({ service: "" }));
});
