import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizePhoneForWhatsApp,
  normalizePhoneToE164,
  cleanPhoneDigits,
  whatsAppApiRecipient,
  isPlaceholderWhatsAppNumber,
} from "./normalize-phone.js";

describe("normalizePhoneToE164", () => {
  it("passes through E.164 numbers", () => {
    assert.equal(normalizePhoneToE164("+353894715849"), "+353894715849");
  });

  it("converts Pakistani local numbers using country code", () => {
    assert.equal(normalizePhoneToE164("03008400763", "pk"), "+923008400763");
  });

  it("converts Irish local numbers", () => {
    assert.equal(normalizePhoneToE164("0894715849", "ie"), "+353894715849");
  });

  it("handles 00 international prefix", () => {
    assert.equal(normalizePhoneToE164("00353894715849"), "+353894715849");
  });

  it("cleanPhoneDigits strips non-digits", () => {
    assert.equal(cleanPhoneDigits("+92 300-840-0763"), "923008400763");
    assert.equal(whatsAppApiRecipient("+923008400763"), "923008400763");
  });
});

describe("normalizePhoneForWhatsApp", () => {
  it("infers Pakistan from 03 mobile prefix even when booking country is PT", () => {
    const result = normalizePhoneForWhatsApp("03008400763", {
      orderCountryCode: "pt",
    });
    assert.equal(result.e164, "+923008400763");
    assert.equal(result.countryUsed, "pk");
  });

  it("prefers patient address country over booking country", () => {
    const result = normalizePhoneForWhatsApp("0894715849", {
      orderCountryCode: "pt",
      patientAddressCountryCode: "ie",
    });
    assert.equal(result.e164, "+353894715849");
    assert.equal(result.countryUsed, "ie");
  });

  it("uses booking country for Portuguese mobile numbers", () => {
    const result = normalizePhoneForWhatsApp("0912345678", {
      orderCountryCode: "pt",
    });
    assert.equal(result.e164, "+351912345678");
    assert.equal(result.digits, "351912345678");
    assert.equal(result.countryUsed, "pt");
  });

  it("strips formatting characters before normalizing", () => {
    const result = normalizePhoneForWhatsApp("+92 300-840-0763", {
      orderCountryCode: "pt",
    });
    assert.equal(result.e164, "+923008400763");
    assert.equal(result.digits, "923008400763");
  });

  it("normalizes Irish doctor local numbers with doctor country", () => {
    const result = normalizePhoneForWhatsApp("0861234567", {
      orderCountryCode: "ie",
    });
    assert.equal(result.e164, "+353861234567");
    assert.equal(result.digits, "353861234567");
    assert.equal(result.countryUsed, "ie");
  });
});

describe("isPlaceholderWhatsAppNumber", () => {
  it("detects demo Irish and Portuguese numbers", () => {
    assert.equal(
      isPlaceholderWhatsAppNumber({ e164: "+353861234567", digits: "353861234567" }),
      true,
    );
    assert.equal(
      isPlaceholderWhatsAppNumber({ e164: "+351912345678", digits: "351912345678" }),
      true,
    );
  });

  it("allows real-looking numbers", () => {
    assert.equal(
      isPlaceholderWhatsAppNumber({ e164: "+353894715849", digits: "353894715849" }),
      false,
    );
  });
});
