import assert from "node:assert/strict";
import test from "node:test";

import { buildLoginRequest, interpretLoginResponse } from "./login.js";

/**
 * Login's value is that it answers, from SÚKL rather than from us, which roles
 * a prescriber holds and which provider the account is bound to. These tests
 * pin the request shape (which is unusual) and the two name collisions in the
 * response that a careless read would get wrong.
 */

const REQ = {
  service: "common" as const,
  verze: "202601B",
  swKlienta: "GH/1.0",
  idZpravy: "11111111-2222-3333-4444-555555555555",
  odeslano: new Date("2026-09-05T08:00:00.000Z"),
};

test("the request carries only Zprava — no Doklad, no Pristupujici", () => {
  const xml = buildLoginRequest(REQ);
  assert.match(xml, /<LoginDotaz xmlns="http:\/\/www\.sukl\.cz\/erp\/common" xmlns:com="http:\/\/www\.sukl\.cz\/erp\/common">/);
  assert.match(xml, /<com:Zprava><com:ID_Zpravy>11111111-2222-3333-4444-555555555555<\/com:ID_Zpravy>/);
  assert.match(xml, /<com:Verze>202601B<\/com:Verze>/);
  assert.match(xml, /<com:SW_Klienta>GH\/1\.0<\/com:SW_Klienta>/);
  // zprava_bez_doklad_type has no Doklad at all, so adding the accessing
  // identity here — which every other operation carries — would be wrong.
  assert.ok(!xml.includes("Pristupujici"));
  assert.ok(!xml.includes("<Doklad>"));
  // el() escapes its value, so nesting built-up markup through it would emit
  // &lt;ID_Zpravy&gt; and SÚKL would reject the message outright.
  assert.ok(!xml.includes("&lt;"));
});

test("reads the user, roles and provider without confusing the two Kod fields", () => {
  // Uzivatel and PZS BOTH contain <Kod>, and a whole-document read would return
  // the user's code as the provider's. Nazev exists only under PZS.
  const body =
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>' +
    '<LoginOdpoved xmlns="http://www.sukl.cz/erp/common"><Doklad>' +
    "<com:Uzivatel><Kod>141ea8aa-f82d-4d74-a725-cdabe9973aca</Kod>" +
    "<Jmeno><Prijmeni>Nováková</Prijmeni><Jmena>Jana</Jmena></Jmeno></Uzivatel>" +
    "<RoleOsoby><Role>eRPlekar</Role><Role>ePPracovnikVydeje</Role></RoleOsoby>" +
    "<RoleSubjektu><Role>eRPambulance</Role></RoleSubjektu>" +
    "<PZS><Kod>00150928369</Kod><Nazev>Global Guest s.r.o.</Nazev></PZS>" +
    "</Doklad></LoginOdpoved></soap:Body></soap:Envelope>";

  const v = interpretLoginResponse({ httpStatus: 200, body });
  assert.equal(v.ok, true);
  assert.equal(v.userCode, "141ea8aa-f82d-4d74-a725-cdabe9973aca");
  assert.equal(v.userSurname, "Nováková");
  assert.equal(v.userGivenNames, "Jana");
  assert.deepEqual(v.personRoles, ["eRPlekar", "ePPracovnikVydeje"]);
  assert.deepEqual(v.subjectRoles, ["eRPambulance"]);
  // The provider code, NOT the user's UUID.
  assert.equal(v.providerCode, "00150928369");
  assert.equal(v.providerName, "Global Guest s.r.o.");
});

test("a fault reports SÚKL's own code", () => {
  const body =
    "<soap:Envelope><soap:Body><soap:Fault>" +
    "<faultcode>soap:Server</faultcode><faultstring>S026</faultstring>" +
    "<detail><Chyba><Kod>S026</Kod><Popis>Chybné jméno nebo heslo</Popis></Chyba></detail>" +
    "</soap:Fault></soap:Body></soap:Envelope>";
  const v = interpretLoginResponse({ httpStatus: 401, body });
  assert.equal(v.ok, false);
  assert.equal(v.errorCode, "S026");
  assert.equal(v.errorMessage, "Chybné jméno nebo heslo");
  assert.equal(v.userCode, null);
});

test("a non-2xx without a fault still fails", () => {
  const v = interpretLoginResponse({ httpStatus: 503, body: "<html/>" });
  assert.equal(v.ok, false);
  assert.equal(v.errorCode, "HTTP_503");
});
