import assert from "node:assert/strict";
import test from "node:test";

import { buildAppPingRequest, interpretAppPingResponse } from "./app-ping.js";
import { buildSoapEnvelope, el, escapeXml, extractElementText, extractFault } from "./envelope.js";

/**
 * AppPing is the first real SÚKL operation, so these tests pin the two things
 * that decide whether SÚKL accepts or rejects us: the exact request shape from
 * `zprava_bez_dotaz_type`, and the verdict logic — which must not read a
 * business error on an HTTP 200 as success.
 */

const INPUT = {
  uzivatel: "492c5a4d-0bb6-4b86-b4d0-7cb7fca3371a",
  pracoviste: "00150928369",
  verze: "202601B",
  swKlienta: "GlobalHlth",
  idZpravy: "11111111-2222-3333-4444-555555555555",
  odeslano: new Date("2026-08-13T10:20:30.000Z"),
  namespace: "http://www.sukl.cz/erp/common",
};

test("builds the request exactly as zprava_bez_dotaz_type specifies", () => {
  const xml = buildAppPingRequest(INPUT);

  assert.match(xml, /^<\?xml version="1\.0" encoding="utf-8"\?>/);
  assert.match(xml, /<soap:Envelope xmlns:soap="http:\/\/schemas\.xmlsoap\.org\/soap\/envelope\/">/);

  // The schemas are elementFormDefault="qualified", so the operation element
  // carries a DEFAULT xmlns and the children inherit it unprefixed.
  assert.match(xml, /<AppPingDotaz xmlns="http:\/\/www\.sukl\.cz\/erp\/common">/);

  // Order is not cosmetic — xsd:sequence means SÚKL rejects a reordered body.
  const order = [
    "<Doklad>",
    "<Pristupujici>",
    "<Uzivatel>",
    "<Pracoviste>",
    "</Pristupujici>",
    "</Doklad>",
    "<Zprava>",
    "<ID_Zpravy>",
    "<Verze>",
    "<Odeslano>",
    "<SW_Klienta>",
  ];
  let cursor = -1;
  for (const token of order) {
    const at = xml.indexOf(token);
    assert.ok(at > cursor, `${token} is out of sequence`);
    cursor = at;
  }

  assert.ok(xml.includes(`<Pracoviste>${INPUT.pracoviste}</Pracoviste>`));
  assert.ok(xml.includes("<Verze>202601B</Verze>"));
  assert.ok(xml.includes("<Odeslano>2026-08-13T10:20:30.000Z</Odeslano>"));
});

test("a clean 200 is a pass, and echoes the message id", () => {
  const body =
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>' +
    '<AppPingOdpoved xmlns="http://www.sukl.cz/erp/common"><Zprava>' +
    "<ID_Zpravy>99999999-8888-7777-6666-555555555555</ID_Zpravy>" +
    "</Zprava></AppPingOdpoved></soap:Body></soap:Envelope>";
  const v = interpretAppPingResponse({ httpStatus: 200, body });
  assert.equal(v.ok, true);
  assert.equal(v.errorCode, null);
  assert.equal(v.responseMessageId, "99999999-8888-7777-6666-555555555555");
});

test("a business error on an HTTP 200 is NOT a pass", () => {
  // The trap this test exists for: SÚKL can return <Chyba> with a 200, so
  // status alone must never be the verdict.
  const body =
    "<soap:Envelope><soap:Body><AppPingOdpoved>" +
    "<Chyba><Kod>E123</Kod><Popis>Neplatny uzivatel</Popis></Chyba>" +
    "</AppPingOdpoved></soap:Body></soap:Envelope>";
  const v = interpretAppPingResponse({ httpStatus: 200, body });
  assert.equal(v.ok, false);
  assert.equal(v.errorCode, "E123");
  assert.equal(v.errorMessage, "Neplatny uzivatel");
});

test("a SOAP fault is detected regardless of namespace prefix", () => {
  for (const prefix of ["soap:", "env:", ""]) {
    const body =
      `<${prefix}Envelope><${prefix}Body><${prefix}Fault>` +
      "<faultcode>soap:Client</faultcode><faultstring>Bad request</faultstring>" +
      `</${prefix}Fault></${prefix}Body></${prefix}Envelope>`;
    const v = interpretAppPingResponse({ httpStatus: 500, body });
    assert.equal(v.ok, false, `prefix "${prefix}"`);
    assert.equal(v.errorCode, "soap:Client");
    assert.equal(v.errorMessage, "Bad request");
  }
});

test("a non-2xx with no fault body still fails, with the status", () => {
  const v = interpretAppPingResponse({ httpStatus: 503, body: "<html>down</html>" });
  assert.equal(v.ok, false);
  assert.equal(v.errorCode, "HTTP_503");
});

test("values are XML-escaped so a stray character cannot break the envelope", () => {
  assert.equal(escapeXml(`a&b<c>"d"'e'`), "a&amp;b&lt;c&gt;&quot;d&quot;&apos;e&apos;");
  const xml = buildAppPingRequest({ ...INPUT, swKlienta: "a&b" });
  assert.ok(xml.includes("<SW_Klienta>a&amp;b</SW_Klienta>"));
});

test("el() omits an element rather than emitting an empty one", () => {
  // SÚKL's optional fields distinguish absent from empty; an empty element for
  // an unset optional value is a validation failure, not a no-op.
  assert.equal(el("X", null), "");
  assert.equal(el("X", ""), "");
  assert.equal(el("X", "v"), "<X>v</X>");
});

test("extractElementText round-trips escaped content and ignores prefixes", () => {
  assert.equal(extractElementText("<ns:Popis>a &amp; b</ns:Popis>", "Popis"), "a & b");
  assert.equal(extractElementText("<Popis>x</Popis>", "Popis"), "x");
  // Absent must be null, not "" — the difference is meaningful for optionals.
  assert.equal(extractElementText("<Other>x</Other>", "Popis"), null);
  // Double-escaped content must decode once, not twice.
  assert.equal(extractElementText("<P>&amp;lt;</P>", "P"), "&lt;");
});

test("extractFault returns null when there is no fault", () => {
  assert.equal(extractFault("<Envelope><Body><Ok/></Body></Envelope>"), null);
});

test("buildSoapEnvelope nests the body inside soap:Body", () => {
  const xml = buildSoapEnvelope({
    operationElement: "Op",
    namespace: "urn:x",
    body: "<A>1</A>",
  });
  assert.ok(xml.includes('<soap:Body><Op xmlns="urn:x"><A>1</A></Op></soap:Body>'));
});
