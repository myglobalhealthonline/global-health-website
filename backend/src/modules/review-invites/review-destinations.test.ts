import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canSendReviewInvite,
  defaultReviewLocaleForCountry,
  parseCountryReviewSetting,
  resolveUniversalReviewInviteRouting,
  toPatientReviewDestinations,
} from "./review-destinations.js";

describe("review destinations", () => {
  it("returns country Google and Doctify links plus the global Trustpilot link", () => {
    const result = toPatientReviewDestinations({
      countrySetting: {
        sendReviewRequests: true,
        googleReviewUrl: "https://search.google.com/local/writereview?placeid=ie",
        doctifyReviewUrl: "https://www.doctify.com/ie/review/global-health",
      },
      trustpilotReviewUrl: "https://www.trustpilot.com/evaluate/myglobalhealth.online",
    });

    assert.deepEqual(result, [
      {
        provider: "GOOGLE",
        url: "https://search.google.com/local/writereview?placeid=ie",
      },
      {
        provider: "DOCTIFY",
        url: "https://www.doctify.com/ie/review/global-health",
      },
      {
        provider: "TRUSTPILOT",
        url: "https://www.trustpilot.com/evaluate/myglobalhealth.online",
      },
    ]);
  });

  it("omits destinations that are unconfigured", () => {
    assert.deepEqual(
      toPatientReviewDestinations({ countrySetting: null, trustpilotReviewUrl: null }),
      [],
    );
  });

  it("defaults legacy country settings to review requests disabled", () => {
    assert.deepEqual(
      parseCountryReviewSetting({
        googleReviewUrl: "https://search.google.com/local/writereview?placeid=ie",
        doctifyReviewUrl: null,
      }),
      {
        sendReviewRequests: false,
        googleReviewUrl: "https://search.google.com/local/writereview?placeid=ie",
        doctifyReviewUrl: null,
      },
    );
  });

  it("requires both an enabled country and at least one configured destination", () => {
    const enabledWithoutProfiles = {
      sendReviewRequests: true,
      googleReviewUrl: null,
      doctifyReviewUrl: null,
    };

    assert.equal(
      canSendReviewInvite({
        countrySetting: enabledWithoutProfiles,
        trustpilotReviewUrl: null,
      }),
      false,
    );
    assert.equal(
      canSendReviewInvite({
        countrySetting: enabledWithoutProfiles,
        trustpilotReviewUrl: "https://www.trustpilot.com/evaluate/myglobalhealth.online",
      }),
      true,
    );
    assert.equal(
      canSendReviewInvite({
        countrySetting: { ...enabledWithoutProfiles, sendReviewRequests: false },
        trustpilotReviewUrl: "https://www.trustpilot.com/evaluate/myglobalhealth.online",
      }),
      false,
    );
  });

  it("fails closed when stored country JSON has invalid URLs", () => {
    assert.equal(
      parseCountryReviewSetting({
        googleReviewUrl: "https://example.com/not-google",
        doctifyReviewUrl: "javascript:alert(1)",
      }),
      null,
    );
  });

  it("uses the market language when an appointment has no notification locale", () => {
    assert.equal(defaultReviewLocaleForCountry("CZ"), "cs");
    assert.equal(defaultReviewLocaleForCountry("PT"), "pt");
    assert.equal(defaultReviewLocaleForCountry("ES"), "es");
    assert.equal(defaultReviewLocaleForCountry("RO"), "ro");
    assert.equal(defaultReviewLocaleForCountry("BR"), "pt-br");
    assert.equal(defaultReviewLocaleForCountry("IE"), "en");
    assert.equal(defaultReviewLocaleForCountry("unknown"), "en");
  });

  it("routes every new appointment through the universal internal review hub", () => {
    assert.deepEqual(
      resolveUniversalReviewInviteRouting({ countryCode: "BR", notificationLocale: null }),
      { channel: "INTERNAL", scheduledFor: null, localeCode: "pt-br" },
    );
    assert.deepEqual(
      resolveUniversalReviewInviteRouting({ countryCode: "CZ", notificationLocale: "EN" }),
      { channel: "INTERNAL", scheduledFor: null, localeCode: "en" },
    );
  });
});
