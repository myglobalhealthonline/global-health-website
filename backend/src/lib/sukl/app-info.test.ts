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

test("reads the version SÚKL actually run", () => {
  // The whole point: SUKL_INTERFACE_VERSION is currently inferred from a
  // published table, and it rides in every message we send.
  const body =
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>' +
    '<AppInfoOdpoved xmlns="http://www.sukl.cz/erp/common">' +
    "<AktualniVerze><Verze>202601B</Verze><Nazev>CUEP</Nazev>" +
    "<Doklad>ePoukaz</Doklad><Doklad>Vydej</Doklad></AktualniVerze>" +
    "<DatumCasServeru>2026-09-01T10:20:30</DatumCasServeru>" +
    "</AppInfoOdpoved></soap:Body></soap:Envelope>";

  const v = interpretAppInfoResponse({ httpStatus: 200, body });
  assert.equal(v.ok, true);
  assert.equal(v.version, "202601B");
  assert.equal(v.name, "CUEP");
  assert.equal(v.serverTime, "2026-09-01T10:20:30");
  assert.deepEqual(v.documentTypes, ["ePoukaz", "Vydej"]);
  assert.equal(v.errorCode, null);
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
  assert.equal(v.version, null);
});

test("a non-2xx without a fault still fails", () => {
  const v = interpretAppInfoResponse({ httpStatus: 500, body: "<html/>" });
  assert.equal(v.ok, false);
  assert.equal(v.errorCode, "HTTP_500");
});
