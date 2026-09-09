import assert from "node:assert/strict";
import test from "node:test";

import {
  assertCancelValid,
  buildCancelPrescriptionRequest,
  interpretCancelPrescriptionResponse,
  type SuklCancelPrescriptionInput,
} from "./zrusit-predpis.js";

const SUBMISSION_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

function input(overrides: Partial<SuklCancelPrescriptionInput> = {}): SuklCancelPrescriptionInput {
  return {
    service: "cuer",
    messageId: "11111111-2222-3333-4444-555555555555",
    interfaceVersion: "202501A",
    swKlienta: "GH/1.0",
    sentAt: new Date("2026-09-07T10:00:00.000Z"),
    uzivatel: "141EA8AA-F82D-4D74-A725-CDABE9973ACA",
    pracoviste: "00150928369",
    documentId: "ABCD1234EFGH5678",
    authorisationId: SUBMISSION_ID,
    cancelledOn: "2026-09-07",
    reason: "Chybné dávkování",
    ...overrides,
  };
}

test("cancellation is NOT signed", () => {
  // SÚKL's Table 1 lists the operations needing a qualified signature and
  // cancellation is absent, so a doctor can withdraw a prescription without
  // their personal signing key. Adding a signature here would be wrong.
  const xml = buildCancelPrescriptionRequest(input());
  assert.ok(!xml.includes("Signature"));
  assert.match(xml, /^<ZruseniPredpisuDotaz xmlns="http:\/\/www\.sukl\.cz\/erp\/201704" xmlns:com="http:\/\/www\.sukl\.cz\/erp\/common">/);
});

test("the authorisation id is the ORIGINAL submission id, not this message's", () => {
  const xml = buildCancelPrescriptionRequest(input());
  assert.match(xml, new RegExp(`<AutorizacniID>${SUBMISSION_ID}</AutorizacniID>`));
  // The message carries its own fresh id; confusing the two makes the
  // cancellation unauthorised.
  assert.match(xml, /<com:ID_Zpravy>11111111-2222-3333-4444-555555555555<\/com:ID_Zpravy>/);
  assert.match(xml, /<DuvodZruseni>Chybné dávkování<\/DuvodZruseni>/);
});

test("a missing or malformed authorisation id is caught locally", () => {
  // Without the stored submission id a prescription cannot be withdrawn at
  // all, so this is the failure worth naming precisely.
  assert.throws(
    () => assertCancelValid(input({ authorisationId: "not-a-uuid" })),
    /AutorizacniID must be the UUID sent as ID_Zpravy/,
  );
  assert.throws(() => assertCancelValid(input({ reason: "  " })), /reason is required/);
  assert.throws(() => assertCancelValid(input({ pracoviste: "123" })), /11 digits/);
});

test("a successful cancellation reports the document and date", () => {
  const body =
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>' +
    '<ZruseniPredpisuOdpoved xmlns="http://www.sukl.cz/erp/201704"><Doklad>' +
    "<ID_Dokladu>ABCD1234EFGH5678</ID_Dokladu><DatumZruseni>2026-09-07</DatumZruseni>" +
    "</Doklad></ZruseniPredpisuOdpoved></soap:Body></soap:Envelope>";
  const v = interpretCancelPrescriptionResponse({ httpStatus: 200, body });
  assert.equal(v.ok, true);
  assert.equal(v.documentId, "ABCD1234EFGH5678");
  assert.equal(v.cancelledOn, "2026-09-07");
});

test("a rejection keeps SÚKL's code", () => {
  const body =
    "<soap:Envelope><soap:Body><soap:Fault><faultcode>soap:Server</faultcode>" +
    "<detail><Chyba><Kod>S062</Kod><Popis>Doklad již byl zrušen</Popis></Chyba></detail>" +
    "</soap:Fault></soap:Body></soap:Envelope>";
  const v = interpretCancelPrescriptionResponse({ httpStatus: 500, body });
  assert.equal(v.ok, false);
  assert.equal(v.errorCode, "S062");
});
