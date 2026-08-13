import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveDirectorCountryScope } from "./country-director-scope.js";

/**
 * The country clamp is the only thing preventing a country director from
 * reading another market's consultations, so it is tested exhaustively —
 * including the escalation cases that a naive `requested ?? granted` would get
 * wrong.
 */
describe("resolveDirectorCountryScope", () => {
  it("returns the whole grant when no country is requested", () => {
    const result = resolveDirectorCountryScope(["pt", "br"], undefined);
    assert.deepEqual(result, { ok: true, codes: ["pt", "br"] });
  });

  it("narrows to a requested country inside the grant", () => {
    const result = resolveDirectorCountryScope(["pt", "br"], "br");
    assert.deepEqual(result, { ok: true, codes: ["br"] });
  });

  it("refuses a requested country outside the grant", () => {
    const result = resolveDirectorCountryScope(["pt"], "br");
    assert.deepEqual(result, { ok: false, reason: "not-granted" });
  });

  it("refuses rather than falling through when the grant is empty", () => {
    // The dangerous case: an empty array must never be treated like `null`
    // (unrestricted), or a doctor with the master flag on and no market ticked
    // would read every country.
    assert.deepEqual(resolveDirectorCountryScope([], undefined), {
      ok: false,
      reason: "not-granted",
    });
    assert.deepEqual(resolveDirectorCountryScope([], "pt"), {
      ok: false,
      reason: "not-granted",
    });
  });

  it("is case-insensitive on both sides", () => {
    // Country codes are lowercase by convention, not by constraint — an
    // upper-cased request must still match a lowercase grant, and vice versa.
    assert.deepEqual(resolveDirectorCountryScope(["pt"], "PT"), {
      ok: true,
      codes: ["pt"],
    });
    assert.deepEqual(resolveDirectorCountryScope(["PT"], "pt"), {
      ok: true,
      codes: ["pt"],
    });
    assert.deepEqual(resolveDirectorCountryScope(["PT", "BR"], undefined), {
      ok: true,
      codes: ["pt", "br"],
    });
  });

  it("trims a padded request before matching", () => {
    assert.deepEqual(resolveDirectorCountryScope(["pt"], "  pt  "), {
      ok: true,
      codes: ["pt"],
    });
  });

  it("treats a blank request as no request, not as a country", () => {
    assert.deepEqual(resolveDirectorCountryScope(["pt", "br"], "   "), {
      ok: true,
      codes: ["pt", "br"],
    });
    assert.deepEqual(resolveDirectorCountryScope(["pt", "br"], ""), {
      ok: true,
      codes: ["pt", "br"],
    });
  });

  it("leaves an unrestricted caller (ADMIN) unrestricted", () => {
    assert.deepEqual(resolveDirectorCountryScope(null, undefined), {
      ok: true,
      codes: null,
    });
  });

  it("still applies a requested country for an unrestricted caller", () => {
    assert.deepEqual(resolveDirectorCountryScope(null, "BR"), {
      ok: true,
      codes: ["br"],
    });
  });
});
