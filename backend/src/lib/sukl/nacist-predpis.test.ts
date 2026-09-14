import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReadDocumentRequest,
  interpretPruvodkaResponse,
  interpretReadPrescriptionResponse,
  type SuklReadDocumentInput,
} from "./nacist-predpis.js";

function input(overrides: Partial<SuklReadDocumentInput> = {}): SuklReadDocumentInput {
  return {
    service: "cuer",
    operationElement: "NacteniPredpisuDotaz",
    messageId: "11111111-2222-3333-4444-555555555555",
    interfaceVersion: "202501A",
    swKlienta: "GLOBALHEALTH",
    sentAt: new Date("2026-09-14T10:00:00.000Z"),
    uzivatel: "141EA8AA-F82D-4D74-A725-CDABE9973ACA",
    pracoviste: "00150928369",
    documentId: "PQAFCMKRARFD",
    ...overrides,
  };
}

test("reading is unsigned and identifies the document by ID_Dokladu", () => {
  const xml = buildReadDocumentRequest(input());
  assert.match(xml, /^<NacteniPredpisuDotaz xmlns="http:\/\/www\.sukl\.cz\/erp\/201704">/);
  assert.match(xml, /<Identifikator><ID_Dokladu>PQAFCMKRARFD<\/ID_Dokladu><\/Identifikator>/);
  assert.match(xml, /<Pracoviste>00150928369<\/Pracoviste>/);
  // Neither read operation is on SÚKL's signed-operations list.
  assert.ok(!xml.includes("Signature"));
});

test("the průvodka shares the request type under its own element", () => {
  const xml = buildReadDocumentRequest(input({ operationElement: "StazeniPruvodkyDotaz" }));
  assert.match(xml, /^<StazeniPruvodkyDotaz xmlns="http:\/\/www\.sukl\.cz\/erp\/201704">/);
});

test("ID_Podani comes before ID_Dokladu, and one of them is required", () => {
  const both = buildReadDocumentRequest(
    input({ submissionId: "aa3baaa6-d064-45df-a9ed-7298abdda201" }),
  );
  assert.ok(both.indexOf("<ID_Podani>") < both.indexOf("<ID_Dokladu>"));
  assert.throws(
    () => buildReadDocumentRequest(input({ documentId: undefined })),
    /document id or the submission id is required/,
  );
});

test("document-level fields are not confused with a dispensing's own", () => {
  // Vydej and PLP blocks carry their own Stav and Zalozeni. Reading the whole
  // body would report a dispensing's state as the prescription's.
  const body =
    '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>' +
    '<NacteniPredpisuOdpoved xmlns="http://www.sukl.cz/erp/201704"><Doklad>' +
    "<ID_Dokladu>PQAFCMKRARFD</ID_Dokladu>" +
    "<DatumVystaveni>2026-09-14</DatumVystaveni><PlatnostDo>2026-10-14</PlatnostDo>" +
    "<Pacient><Totoznost><Jmeno><Prijmeni>Testovací</Prijmeni><Jmena>Jan</Jmena></Jmeno>" +
    "</Totoznost></Pacient>" +
    "<PLP><Mnozstvi>1</Mnozstvi><Navod>1 tableta při bolesti</Navod>" +
    "<HVLPNereg><Nazev>PARALEN 500</Nazev></HVLPNereg></PLP>" +
    "<Stav>CASTECNE_VYDANY</Stav>" +
    "<Vydej><Stav>PLNE_VYDANY</Stav><Zalozeni>2026-09-15T09:00:00</Zalozeni></Vydej>" +
    "<Zmena>2026-09-15T09:00:00</Zmena><Zalozeni>2026-09-14T12:00:00</Zalozeni>" +
    "</Doklad></NacteniPredpisuOdpoved></s:Body></s:Envelope>";

  const v = interpretReadPrescriptionResponse({ httpStatus: 200, body });
  assert.equal(v.ok, true);
  assert.equal(v.state, "CASTECNE_VYDANY");
  assert.equal(v.createdAt, "2026-09-14T12:00:00");
  assert.equal(v.patientSurname, "Testovací");
  assert.deepEqual(v.items, [
    { name: "PARALEN 500", quantity: "1", instructions: "1 tableta při bolesti" },
  ]);
  assert.equal(v.dispensingCount, 1);
});

test("a read rejection keeps SÚKL's code", () => {
  const body =
    "<s:Envelope><s:Body><s:Fault><faultcode>s:Sender</faultcode>" +
    "<detail><Chyba><Kod>C004</Kod><Popis>Doklad nenalezen</Popis></Chyba></detail>" +
    "</s:Fault></s:Body></s:Envelope>";
  const v = interpretReadPrescriptionResponse({ httpStatus: 500, body });
  assert.equal(v.ok, false);
  assert.equal(v.errorCode, "C004");
});

test("the průvodka is decoded, and anything that is not a PDF is refused", () => {
  const pdfBytes = Buffer.from("%PDF-1.4\nfake");
  const good =
    "<s:Envelope><s:Body><StazeniPruvodkyOdpoved><Doklad>" +
    pdfBytes.toString("base64") +
    "</Doklad></StazeniPruvodkyOdpoved></s:Body></s:Envelope>";
  const ok = interpretPruvodkaResponse({ httpStatus: 200, body: good });
  assert.equal(ok.ok, true);
  assert.equal(ok.pdf?.toString("latin1").slice(0, 8), "%PDF-1.4");

  // Serving non-PDF bytes as application/pdf would hand the browser arbitrary
  // content, so the magic number is checked rather than trusted.
  const notPdf =
    "<s:Envelope><s:Body><StazeniPruvodkyOdpoved><Doklad>" +
    Buffer.from("<html>nope</html>").toString("base64") +
    "</Doklad></StazeniPruvodkyOdpoved></s:Body></s:Envelope>";
  const bad = interpretPruvodkaResponse({ httpStatus: 200, body: notPdf });
  assert.equal(bad.ok, false);
  assert.equal(bad.pdf, null);
});
