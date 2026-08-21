import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultNotificationLocaleForCountry,
  parseNotificationLocale,
  resolveNotificationLang,
} from "./notification-language.js";

describe("resolveNotificationLang", () => {
  it("uses the booking's own locale over the country", () => {
    // The case the feature exists for: an English-speaking expat booking a
    // Portuguese consultation must not be written to in Portuguese.
    assert.equal(
      resolveNotificationLang({
        notificationLocale: "EN",
        countryCode: "pt",
        serviceName: "PT - Consulta",
      }),
      "en",
    );
  });

  it("writes German bookings in English, since no German templates exist", () => {
    assert.equal(
      resolveNotificationLang({ notificationLocale: "DE", countryCode: "de" }),
      "en",
    );
  });

  it("falls back to the pre-feature country derivation when null", () => {
    assert.equal(
      resolveNotificationLang({ notificationLocale: null, countryCode: "cz" }),
      "cs",
    );
    assert.equal(
      resolveNotificationLang({ notificationLocale: null, countryCode: "br" }),
      "pt",
    );
  });

  it("still reads the service-name prefix when the country is unknown", () => {
    assert.equal(
      resolveNotificationLang({
        notificationLocale: null,
        countryCode: "xx",
        serviceName: "RO - Specialist",
      }),
      "ro",
    );
  });

  it("defaults to English when nothing identifies a language", () => {
    assert.equal(resolveNotificationLang({}), "en");
  });
});

describe("defaultNotificationLocaleForCountry", () => {
  it("maps each market to its own locale", () => {
    assert.equal(defaultNotificationLocaleForCountry("ie"), "EN");
    assert.equal(defaultNotificationLocaleForCountry("pt"), "PT");
    assert.equal(defaultNotificationLocaleForCountry("br"), "PT");
    assert.equal(defaultNotificationLocaleForCountry("cz"), "CS");
    assert.equal(defaultNotificationLocaleForCountry("ro"), "RO");
    assert.equal(defaultNotificationLocaleForCountry("es"), "ES");
  });

  it("is case-insensitive — country codes are stored lowercase", () => {
    assert.equal(defaultNotificationLocaleForCountry("PT"), "PT");
  });

  it("falls back to English for an unknown or missing country", () => {
    assert.equal(defaultNotificationLocaleForCountry("xx"), "EN");
    assert.equal(defaultNotificationLocaleForCountry(null), "EN");
  });
});

describe("parseNotificationLocale", () => {
  it("accepts a known locale in any case", () => {
    assert.equal(parseNotificationLocale("pt"), "PT");
    assert.equal(parseNotificationLocale(" RO "), "RO");
  });

  it("rejects anything else rather than writing a bad column value", () => {
    assert.equal(parseNotificationLocale("fr"), null);
    assert.equal(parseNotificationLocale(""), null);
    assert.equal(parseNotificationLocale(null), null);
  });
});
