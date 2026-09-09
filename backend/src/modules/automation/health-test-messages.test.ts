import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NOTIFICATION_LANGS } from "./notification-language.js";
import {
  buildAdminHealthTestAlertText,
  patientWhatsAppHealthTestConfirmation,
  type AdminHealthTestAlertContext,
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
