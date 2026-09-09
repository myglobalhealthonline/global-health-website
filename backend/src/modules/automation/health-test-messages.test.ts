import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NOTIFICATION_LANGS } from "./notification-language.js";
import {
  buildAdminHealthTestAlertText,
  hasTrackingDetails,
  patientEmailSubjectHealthTestTracking,
  patientWhatsAppHealthTestConfirmation,
  patientWhatsAppHealthTestTracking,
  type AdminHealthTestAlertContext,
  type HealthTestTrackingContext,
} from "./health-test-messages.js";

const CTX: AdminHealthTestAlertContext = {
  patientName: "Matthew O'Driscoll",
  patientEmail: "matthew@example.com",
  patientPhone: "+353 879744083",
  countryCode: "ie",
  orderNumber: "ORD-000490",
  kits: ["1× Male Hormone Test"],
  address: "175 Beechwood Court, Stillorgan, Co Dublin, A94W4KH, IE",
  totalLabel: "€57.00",
};

describe("health test messages", () => {
  it("puts the delivery address in the staff alert — that IS the alert", () => {
    const text = buildAdminHealthTestAlertText(CTX);
    assert.match(text, /175 Beechwood Court/);
    assert.match(text, /ORD-000490/);
    assert.match(text, /Male Hormone Test/);
    assert.match(text, /\+353 879744083/);
  });

  it("shouts when an order somehow carries no address", () => {
    assert.match(buildAdminHealthTestAlertText({ ...CTX, address: "" }), /NO ADDRESS ON ORDER/);
  });

  it("writes the patient confirmation in every notification language", () => {
    for (const lang of NOTIFICATION_LANGS) {
      const text = patientWhatsAppHealthTestConfirmation(CTX, lang);
      assert.match(text, /ORD-000490/, lang);
      assert.match(text, /Male Hormone Test/, lang);
      assert.match(text, /175 Beechwood Court/, lang);
      // The localized contact footer is appended to every one of them.
      assert.match(text, /globalhealth@myglobalhealth\.online/, lang);
    }
  });

  it("does not fall back to English for a translated language", () => {
    assert.match(patientWhatsAppHealthTestConfirmation(CTX, "pt"), /Obrigado pelo seu pagamento/);
    assert.match(patientWhatsAppHealthTestConfirmation(CTX, "cs"), /děkujeme za platbu/);
  });
});

const TRACK: HealthTestTrackingContext = {
  patientName: "Matthew O'Driscoll",
  orderNumber: "ORD-000490",
  kits: ["1× Male Hormone Test"],
  trackingNumber: "1Z999AA10123456784",
  trackingCarrier: "An Post",
  trackingUrl: "https://track.anpost.ie/1Z999AA10123456784",
};

describe("health test tracking messages", () => {
  it("carries carrier, code and link in every notification language", () => {
    for (const lang of NOTIFICATION_LANGS) {
      const text = patientWhatsAppHealthTestTracking(TRACK, lang);
      assert.match(text, /An Post/, lang);
      assert.match(text, /1Z999AA10123456784/, lang);
      assert.match(text, /track\.anpost\.ie/, lang);
      assert.match(text, /ORD-000490/, lang);
      assert.match(text, /globalhealth@myglobalhealth\.online/, lang);
    }
  });

  it("drops the lines the courier gave nothing for, with no empty labels", () => {
    const text = patientWhatsAppHealthTestTracking(
      { ...TRACK, trackingCarrier: null, trackingUrl: null },
      "en",
    );
    assert.match(text, /1Z999AA10123456784/);
    assert.doesNotMatch(text, /Carrier/);
    assert.doesNotMatch(text, /Track your kit/);
  });

  it("still sends a plain dispatch notice when there is nothing to track", () => {
    const bare = { ...TRACK, trackingNumber: null, trackingCarrier: null, trackingUrl: null };
    assert.equal(hasTrackingDetails(bare), false);
    const text = patientWhatsAppHealthTestTracking(bare, "en");
    assert.match(text, /on its way/);
    assert.match(text, /ORD-000490/);
  });

  it("reports tracking present when any one field is set", () => {
    assert.equal(hasTrackingDetails({ ...TRACK, trackingNumber: null, trackingUrl: null }), true);
    assert.equal(hasTrackingDetails({ ...TRACK, trackingCarrier: null, trackingNumber: null }), true);
  });

  it("localizes the email subject rather than falling back to English", () => {
    assert.match(patientEmailSubjectHealthTestTracking(TRACK, "pt"), /a caminho|segue para si/i);
    assert.match(patientEmailSubjectHealthTestTracking(TRACK, "cs"), /na cestě/);
    assert.match(patientEmailSubjectHealthTestTracking(TRACK, "en"), /on its way/);
  });
});
