import assert from "node:assert/strict";
import test from "node:test";

import { suklPingQuerySchema, suklWsdlQuerySchema } from "./admin-sukl.schema.js";

/**
 * The ping and the WSDL reader share path validation but must NOT share a
 * default — pinging `/?wsdl` would ask SÚKL to execute a document request as an
 * operation, which is a category error that would read as a permissions
 * failure and send an investigation the wrong way.
 */

test("ping defaults to the host root, WSDL defaults to ?wsdl", () => {
  assert.equal(suklPingQuerySchema.parse({ service: "common" }).path, "/");
  assert.equal(suklWsdlQuerySchema.parse({ service: "common" }).path, "/?wsdl");
});

test("ping accepts the candidate service paths", () => {
  for (const path of [
    "/",
    "/Endpoints/CommonWebService.asmx",
    "/LekovyZaznam/Endpoints/CuepWebService.asmx",
  ]) {
    assert.equal(suklPingQuerySchema.parse({ service: "cuep", path }).path, path);
  }
});

test("ping refuses anything that could redirect the client certificate", () => {
  // The ping posts using the facility certificate, so `path` is the one place
  // someone could aim that credential at a host of their choosing.
  for (const path of ["https://evil.example/x", "//evil.example/x", "http://evil.example", "rel"]) {
    assert.throws(
      () => suklPingQuerySchema.parse({ service: "cuep", path }),
      `expected "${path}" to be rejected`,
    );
  }
});

test("ping only addresses the two known services", () => {
  assert.throws(() => suklPingQuerySchema.parse({ service: "cross-border" }));
});
