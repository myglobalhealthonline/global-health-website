import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { identityDocumentError } from "./booking.schema.js";

describe("identityDocumentError", () => {
  it("returns null for a country with no identity-document rule", () => {
    assert.equal(identityDocumentError("ie", {}), null);
    assert.equal(identityDocumentError(null, {}), null);
  });

  it("accepts either CPF or passport in Brazil", () => {
    assert.equal(identityDocumentError("br", { nationalIdNumber: "111.222.333-44" }), null);
    assert.equal(identityDocumentError("br", { passportNumber: "EU99887766" }), null);
    assert.equal(
      identityDocumentError("br", { nationalIdNumber: "  ", passportNumber: null }),
      "Enter your CPF or your passport number to continue.",
    );
  });

  it("requires the passport / ID card number in Czechia", () => {
    assert.equal(identityDocumentError("cz", { passportNumber: "AB1234567" }), null);
    assert.equal(
      identityDocumentError("cz", { nationalIdNumber: "760506/1234" }),
      "Enter your passport or ID card number to continue.",
    );
    assert.equal(
      identityDocumentError("CZ", {}),
      "Enter your passport or ID card number to continue.",
    );
  });
});
