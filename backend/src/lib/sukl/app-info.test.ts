import assert from "node:assert/strict";
import test from "node:test";

import { buildAppInfoRequest, interpretAppInfoResponse } from "./app-info.js";

/**
 * GetAppInfo is unusual: `app_info_dotaz_type` is declared empty in
 * CommonSchema.xsd, so the request carries no identity and no message header.
 * That is easy to "helpfully" add later, which would break it — hence the
 * assertions on absence below.
 */

test("the request body is empty, with no identity and no message header", () => {
  const xml = buildAppInfoRequest();
  assert.match(xml, /<AppInfoDotaz xmlns="http:\/\/www\.sukl\.cz\/erp\/common"><\/AppInfoDotaz>/);
  // Adding these would be a natural-looking mistake — the schema has no room.
  assert.ok(!xml.includes("Pristupujici"));
  assert.ok(!xml.includes("Zprava"));
  assert.ok(!xml.includes("Uzivatel"));
});

test("separates the software build from the document interface versions", () => {
  // Regression for a wrong claim shipped on 2026-09-04: AktualniVerze/Verze is
  // SÚKL's BUILD number. The 202601B-shaped interface version lives on each
  // Doklad entry, which is also a complex element and must not be read as text.
  const body =
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>' +
    '<AppInfoOdpoved xmlns="http://www.sukl.cz/erp/common">' +
    "<AktualniVerze><Verze>1.110.10.29473</Verze><Nazev>eRecept TEST</Nazev>" +
    "<Doklad><Verze>202601B</Verze><Prefix>EP</Prefix><Popis>ePoukaz</Popis>" +
    "<PlatOd>2026-01-01</PlatOd><PlatDo>2026-12-31</PlatDo></Doklad>" +
    "<Doklad><Verze>202605A</Verze><Prefix>ER</Prefix><Popis>eRecept</Popis>" +
    "<PlatOd>2026-05-01</PlatOd></Doklad></AktualniVerze>" +
    "<DatumCasServeru>2026-09-01T10:20:30</DatumCasServeru>" +
    "</AppInfoOdpoved></soap:Body></soap:Envelope>";

  const v = interpretAppInfoResponse({ httpStatus: 200, body });
  assert.equal(v.ok, true);
  // The build, NOT 202601B — the Doklad blocks each carry their own Verze and
  // must not win this read.
  assert.equal(v.applicationVersion, "1.110.10.29473");
  assert.equal(v.name, "eRecept TEST");
  assert.equal(v.serverTime, "2026-09-01T10:20:30");
  assert.equal(v.documentTypes.length, 2);
  assert.deepEqual(v.documentTypes[0], {
    version: "202601B",
    prefix: "EP",
    description: "ePoukaz",
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
  });
  assert.equal(v.documentTypes[1]?.version, "202605A");
  assert.equal(v.documentTypes[1]?.validTo, null);
  assert.equal(v.errorCode, null);
});

test("the live CUEP shape: a build, a name, and no document types", () => {
  // Exactly what CUEP TEST returned on 2026-09-04. Recorded so a future parser
  // change cannot quietly start inventing document types here.
  const body =
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>' +
    '<AppInfoOdpoved xmlns="http://www.sukl.cz/erp/common">' +
    "<AktualniVerze><Verze>1.110.10.29473</Verze>" +
    "<Nazev>Informační systém eRecept TEST</Nazev></AktualniVerze>" +
    "<DatumCasServeru>2026-09-04T19:51:19.753579+02:00</DatumCasServeru>" +
    "</AppInfoOdpoved></soap:Body></soap:Envelope>";

  const v = interpretAppInfoResponse({ httpStatus: 200, body });
  assert.equal(v.applicationVersion, "1.110.10.29473");
  assert.equal(v.name, "Informační systém eRecept TEST");
  assert.deepEqual(v.documentTypes, []);
});

test("a fault reports SÚKL's own code, not the generic soap:Server", () => {
  const body =
    "<soap:Envelope><soap:Body><soap:Fault>" +
    "<faultcode>soap:Server</faultcode><faultstring>S026 - …</faultstring>" +
    "<detail><Chyba><Kod>S026</Kod><Popis>Chybné jméno/heslo</Popis></Chyba></detail>" +
    "</soap:Fault></soap:Body></soap:Envelope>";
  const v = interpretAppInfoResponse({ httpStatus: 401, body });
  assert.equal(v.ok, false);
  assert.equal(v.errorCode, "S026");
  assert.equal(v.applicationVersion, null);
});

test("a non-2xx without a fault still fails", () => {
  const v = interpretAppInfoResponse({ httpStatus: 500, body: "<html/>" });
  assert.equal(v.ok, false);
  assert.equal(v.errorCode, "HTTP_500");
});
