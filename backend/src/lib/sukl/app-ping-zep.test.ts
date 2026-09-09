import { VALID_PFX, FIXTURE_PASSWORD } from "./client.test-env.js";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { SignedXml } from "xml-crypto";

import { buildAppPingZepRequest, interpretAppPingZepResponse } from "./app-ping-zep.js";
import { readSigningKeyFromPkcs12 } from "./signing.js";

/**
 * AppPingZEP is where the signing order is proven. Getting it backwards —
 * enveloping first, or re-serialising after — produces XML that looks correct
 * and that SÚKL reject with an opaque fault, so it is pinned here rather than
 * left to review.
 */

function key() {
  return readSigningKeyFromPkcs12(readFileSync(VALID_PFX), FIXTURE_PASSWORD);
}

function build() {
  return buildAppPingZepRequest({
    service: "cuer",
    uzivatel: "141ea8aa-f82d-4d74-a725-cdabe9973aca",
    pracoviste: "00150928369",
    verze: "202601B",
    swKlienta: "GH/1.0",
    idZpravy: "22222222-3333-4444-5555-666666666666",
    odeslano: new Date("2026-09-05T08:00:00.000Z"),
    key: key(),
  });
}

test("the signed message sits inside the envelope, namespace still on the message", () => {
  const xml = build();

  assert.match(xml, /^<\?xml version="1\.0" encoding="utf-8"\?><soap:Envelope/);
  // CUER declares the shared elements in erp/201704, and the declaration must
  // stay on the message root — hoisting it to the Envelope invalidates the
  // signature, which SÚKL's document forbids explicitly.
  assert.match(xml, /<AppPingZEPDotaz xmlns="http:\/\/www\.sukl\.cz\/erp\/201704">/);
  assert.ok(!/<soap:Envelope[^>]*www\.sukl\.cz/.test(xml));
  assert.match(xml, /<Signature xmlns="http:\/\/www\.w3\.org\/2000\/09\/xmldsig#"/);
  assert.match(xml, /<Pracoviste>00150928369<\/Pracoviste>/);
});

test("the signature verifies against the message extracted from the envelope", () => {
  // The real proof of the ordering: pull the message element back out of the
  // envelope and verify the signature over exactly those bytes. If the digest
  // had covered the envelope, or the message had been re-serialised on the way
  // in, this fails.
  const xml = build();
  const message = /<AppPingZEPDotaz[\s\S]*<\/AppPingZEPDotaz>/.exec(xml)?.[0];
  assert.ok(message, "the message element should be recoverable from the envelope");

  const k = key();
  const signature = /<(?:\w+:)?Signature[\s\S]*<\/(?:\w+:)?Signature>/.exec(message)?.[0];
  const verifier = new SignedXml({
    publicCert: `-----BEGIN CERTIFICATE-----\n${k.certificateBase64.replace(/(.{64})/g, "$1\n")}\n-----END CERTIFICATE-----`,
  });
  verifier.loadSignature(signature!);
  assert.equal(verifier.checkSignature(message), true);
});

test("a rejected signature surfaces SÚKL's own code", () => {
  const body =
    "<soap:Envelope><soap:Body><soap:Fault>" +
    "<faultcode>soap:Server</faultcode><faultstring>podpis</faultstring>" +
    "<detail><Chyba><Kod>S015</Kod><Popis>Neplatný elektronický podpis</Popis></Chyba></detail>" +
    "</soap:Fault></soap:Body></soap:Envelope>";
  const v = interpretAppPingZepResponse({ httpStatus: 500, body });
  assert.equal(v.ok, false);
  assert.equal(v.errorCode, "S015");
  assert.equal(v.errorMessage, "Neplatný elektronický podpis");
});

test("a clean 200 is a pass", () => {
  const body =
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>' +
    '<AppPingZEPOdpoved xmlns="http://www.sukl.cz/erp/201704"><ZpravaOdpoved>' +
    "<Prijato>2026-09-05T08:00:01</Prijato></ZpravaOdpoved>" +
    "</AppPingZEPOdpoved></soap:Body></soap:Envelope>";
  const v = interpretAppPingZepResponse({ httpStatus: 200, body });
  assert.equal(v.ok, true);
  assert.equal(v.errorCode, null);
});
