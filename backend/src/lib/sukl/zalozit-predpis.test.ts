import { VALID_PFX, FIXTURE_PASSWORD } from "./client.test-env.js";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { SignedXml } from "xml-crypto";

import { readSigningKeyFromPkcs12 } from "./signing.js";
import {
  assertCreatePrescriptionValid,
  buildCreatePrescriptionRequest,
  interpretCreatePrescriptionResponse,
  type SuklCreatePrescriptionInput,
} from "./zalozit-predpis.js";

/**
 * ZalozitPredpis creates a real prescription, so these tests pin the shape
 * before SÚKL ever see it. A rejected create is not free: it is an ambiguous
 * outcome a human then has to investigate.
 */

function key() {
  return readSigningKeyFromPkcs12(readFileSync(VALID_PFX), FIXTURE_PASSWORD);
}

function input(overrides: Partial<SuklCreatePrescriptionInput> = {}): SuklCreatePrescriptionInput {
  return {
    service: "cuer",
    submissionId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    interfaceVersion: "202501A",
    swKlienta: "GH/1.0",
    sentAt: new Date("2026-09-07T09:00:00.000Z"),
    issuedOn: "2026-09-07",
    validUntil: "2026-10-07",
    patient: {
      surname: "Nováková",
      givenNames: "Jana",
      dateOfBirth: "1985-04-12",
      insuranceNumber: "8554120123",
      insurerCode: "111",
    },
    prescriber: {
      lekar: "141EA8AA-F82D-4D74-A725-CDABE9973ACA",
      icp: "12345678",
      pzs: "00150928369",
      phone: "+420123456789",
      specialityCode: "001",
    },
    items: [
      {
        quantity: 1,
        instructions: "1 tableta denně po jídle",
        reimbursement: "PACIENT",
        medicineName: "PARALEN 500",
        sourceItemId: "17578000000001",
      },
    ],
    key: key(),
    ...overrides,
  };
}

test("the request carries the required fields in SÚKL's shape", () => {
  const xml = buildCreatePrescriptionRequest(input());

  assert.match(xml, /^<ZalozeniPredpisuDotaz xmlns="http:\/\/www\.sukl\.cz\/erp\/201704">/);
  assert.match(xml, /<DatumVystaveni>2026-09-07<\/DatumVystaveni>/);
  assert.match(xml, /<PlatnostDo>2026-10-07<\/PlatnostDo>/);
  assert.match(xml, /<Lekar>141EA8AA-F82D-4D74-A725-CDABE9973ACA<\/Lekar>/);
  assert.match(xml, /<PZS>00150928369<\/PZS>/);
  // Mandatory and easy to forget — SÚKL require the prescriber's phone.
  assert.match(xml, /<Telefon>\+420123456789<\/Telefon>/);
  assert.match(xml, /<Navod>1 tableta denně po jídle<\/Navod>/);
  // PREDEPSANY is the state a newly issued eRecept carries.
  assert.match(xml, /<Stav>PREDEPSANY<\/Stav>/);
  // Required, last in the PLP sequence, and the omission SÚKL reported as
  // "the element 'PLP' has incomplete content" on 2026-09-09.
  assert.match(xml, /<ID_LP_Zdroj>17578000000001<\/ID_LP_Zdroj>/);
});

test("the submission id is the one supplied, not a fresh one", () => {
  // SÚKL treat ID_Zpravy on a create as the authorisation id for later
  // amendment, so generating it internally would strand the prescription.
  const xml = buildCreatePrescriptionRequest(input());
  assert.match(xml, /<ID_Zpravy>3fa85f64-5717-4562-b3fc-2c963f66afa6<\/ID_Zpravy>/);
});

test("the message is signed, unenveloped, and verifies over its own bytes", () => {
  const k = key();
  const xml = buildCreatePrescriptionRequest(input({ key: k }));

  assert.ok(!xml.includes("soap:Envelope"), "signing happens before enveloping");
  const signature = /<(?:\w+:)?Signature[\s\S]*<\/(?:\w+:)?Signature>/.exec(xml)?.[0];
  assert.ok(signature, "a prescription must be signed");

  const verifier = new SignedXml({
    publicCert: `-----BEGIN CERTIFICATE-----\n${k.certificateBase64.replace(/(.{64})/g, "$1\n")}\n-----END CERTIFICATE-----`,
  });
  verifier.loadSignature(signature);
  assert.equal(verifier.checkSignature(xml), true);
});

test("invalid input is refused locally rather than by SÚKL", () => {
  // Each of these is a constraint from SÚKL's schema. Failing here is free;
  // failing at SÚKL leaves an outcome someone has to investigate.
  assert.throws(
    () => assertCreatePrescriptionValid(input({ prescriber: { ...input().prescriber, pzs: "123" } })),
    /PZS must be 11 digits/,
  );
  assert.throws(
    () => assertCreatePrescriptionValid(input({ prescriber: { ...input().prescriber, phone: " " } })),
    /phone is required/,
  );
  assert.throws(() => assertCreatePrescriptionValid(input({ items: [] })), /at least one item/);
  assert.throws(
    () =>
      assertCreatePrescriptionValid(
        input({ items: [{ ...input().items[0]!, instructions: "x".repeat(81) }] }),
      ),
    /exceed 80 characters/,
  );
  assert.throws(
    () => assertCreatePrescriptionValid(input({ items: [{ ...input().items[0]!, quantity: 0 }] })),
    /between 1 and 999/,
  );
  assert.throws(
    () =>
      assertCreatePrescriptionValid(
        input({ items: [{ ...input().items[0]!, sourceItemId: "123" }] }),
      ),
    /ID_LP_Zdroj must be exactly 14 digits/,
  );
});

test("a successful response yields SÚKL's document id", () => {
  const body =
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>' +
    '<ZalozeniPredpisuOdpoved xmlns="http://www.sukl.cz/erp/201704"><Doklad>' +
    "<ID_Dokladu>ABCD1234EFGH5678</ID_Dokladu></Doklad>" +
    "</ZalozeniPredpisuOdpoved></soap:Body></soap:Envelope>";
  const v = interpretCreatePrescriptionResponse({ httpStatus: 200, body });
  assert.equal(v.ok, true);
  assert.equal(v.documentId, "ABCD1234EFGH5678");
});

test("a 2xx with no identifier is ambiguous, never a success", () => {
  // The dangerous case: SÚKL may hold the prescription. Treating this as a
  // failure that can be retried would risk issuing the same script twice.
  const body =
    '<soap:Envelope><soap:Body><ZalozeniPredpisuOdpoved/></soap:Body></soap:Envelope>';
  const v = interpretCreatePrescriptionResponse({ httpStatus: 200, body });
  assert.equal(v.ok, false);
  assert.equal(v.errorCode, "SUKL_DUPLICATE_OR_UNKNOWN_RESULT");
  assert.match(v.errorMessage!, /may or may not exist/);
});

test("a rejection keeps SÚKL's code and their recommended remedy", () => {
  const body =
    "<soap:Envelope><soap:Body><soap:Fault>" +
    "<faultcode>soap:Server</faultcode><faultstring>chyba</faultstring>" +
    "<detail><Chyba><Kod>S045</Kod><Popis>Neplatný kód pojišťovny</Popis>" +
    "<Doporuceni>Zkontrolujte kód ZP dle číselníku</Doporuceni></Chyba></detail>" +
    "</soap:Fault></soap:Body></soap:Envelope>";
  const v = interpretCreatePrescriptionResponse({ httpStatus: 500, body });
  assert.equal(v.ok, false);
  assert.equal(v.errorCode, "S045");
  assert.equal(v.errorMessage, "Neplatný kód pojišťovny");
  assert.equal(v.errorAdvice, "Zkontrolujte kód ZP dle číselníku");
});

test("an unregistered product avoids the DLP register lookup", () => {
  // SÚKL match HVLPReg against their register by name/form/strength/package
  // and reject a near-miss with C013 — which is what "PARALEN 500" as free
  // text did on 2026-09-09. HVLPNereg carries no such lookup.
  const registered = buildCreatePrescriptionRequest(input());
  assert.match(registered, /<HVLPReg>/);
  assert.ok(!registered.includes("<HVLPNereg>"));

  const unregistered = buildCreatePrescriptionRequest(
    input({ items: [{ ...input().items[0]!, unregistered: true }] }),
  );
  assert.match(unregistered, /<HVLPNereg>.*<\/HVLPNereg>/s);
  assert.ok(!unregistered.includes("<HVLPReg>"));
});

test("the patient address is sent inside Totoznost when supplied", () => {
  // SÚKL answer C018 when they cannot find the patient in the population
  // register and no address was given — always the case for a fictional or
  // foreign patient. City and postcode are the mandatory pair.
  const xml = buildCreatePrescriptionRequest(
    input({
      patient: {
        ...input().patient,
        address: { street: "Václavské náměstí", houseNumber: "1", city: "Praha", postcode: "11000" },
      },
    }),
  );
  assert.match(xml, /<Totoznost>[\s\S]*<Adresa>[\s\S]*<\/Adresa><\/Totoznost>/);
  assert.match(xml, /<NazevObce>Praha<\/NazevObce>/);
  assert.match(xml, /<PSC>11000<\/PSC>/);
  // Absent by default — a patient SÚKL can find needs no address.
  assert.ok(!buildCreatePrescriptionRequest(input()).includes("<Adresa>"));
});
