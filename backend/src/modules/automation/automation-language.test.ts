import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectAutomationLanguage } from "./pre-payment-messages.js";

describe("detectAutomationLanguage", () => {
  it("uses country code before service name", () => {
    assert.equal(
      detectAutomationLanguage({ countryCode: "pt", serviceName: "IE - General Consultation" }),
      "pt",
    );
    assert.equal(
      detectAutomationLanguage({ countryCode: "ie", serviceName: "PT - Consulta" }),
      "en",
    );
  });

  it("falls back to service prefix when country is unknown", () => {
    assert.equal(detectAutomationLanguage({ countryCode: "xx", serviceName: "RO - Specialist" }), "ro");
  });

  it("defaults to English", () => {
    assert.equal(detectAutomationLanguage({ countryCode: "xx", serviceName: "Consulta Medica" }), "en");
  });
});
