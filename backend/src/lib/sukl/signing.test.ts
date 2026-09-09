import { VALID_PFX, FIXTURE_PASSWORD } from "./client.test-env.js";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { SignedXml } from "xml-crypto";

import { readSigningKeyFromPkcs12, signSuklMessage } from "./signing.js";

/**
 * These tests use the committed self-signed fixture, not a real qualified
 * certificate. That is enough to prove the mechanics SÚKL specify — digest
 * scope, algorithms, and that the signature verifies over the exact bytes — all
 * of which are independent of who issued the certificate.
 */

const FIXTURE = VALID_PFX;
const PASSWORD = FIXTURE_PASSWORD;

const MESSAGE =
  '<AppPingZEPDotaz xmlns="http://www.sukl.cz/erp/201704">' +
  "<Doklad><Pristupujici><Uzivatel>u-1</Uzivatel>" +
  "<Pracoviste>00150928369</Pracoviste></Pristupujici></Doklad>" +
  "<Zprava><ID_Zpravy>msg-1</ID_Zpravy><Verze>202601B</Verze>" +
  "<Odeslano>2026-09-05T08:00:00.000Z</Odeslano></Zprava>" +
  "</AppPingZEPDotaz>";

function key() {
  return readSigningKeyFromPkcs12(readFileSync(FIXTURE), PASSWORD);
}

test("the private key and certificate come out of the PKCS#12", () => {
  const k = key();
  assert.match(k.privateKeyPem, /^-----BEGIN RSA PRIVATE KEY-----/);
  // SÚKL require the certificate to travel with the signature.
  assert.ok(k.certificateBase64.length > 100);
  assert.ok(!k.certificateBase64.includes("-----"), "must be bare base64 DER");
});

test("a wrong password fails without disclosing it", () => {
  try {
    readSigningKeyFromPkcs12(readFileSync(FIXTURE), "not-the-password");
    assert.fail("should have thrown");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert.ok(!message.includes("not-the-password"));
    assert.match(message, /could not be opened/);
  }
});

test("the signature uses the algorithms SÚKL specify and carries the certificate", () => {
  const signed = signSuklMessage(MESSAGE, key());

  assert.match(signed, /Algorithm="http:\/\/www\.w3\.org\/2001\/04\/xmldsig-more#rsa-sha256"/);
  assert.match(signed, /Algorithm="http:\/\/www\.w3\.org\/2001\/04\/xmlenc#sha256"/);
  assert.match(signed, /Algorithm="http:\/\/www\.w3\.org\/2000\/09\/xmldsig#enveloped-signature"/);
  assert.match(signed, /Algorithm="http:\/\/www\.w3\.org\/TR\/2001\/REC-xml-c14n-20010315"/);
  assert.match(signed, /<[^>]*X509Certificate>/);
});

test("the signed message is still the message — no envelope, root unchanged", () => {
  const signed = signSuklMessage(MESSAGE, key());

  // The digest is taken over the message root WITHOUT the SOAP envelope, so
  // nothing envelope-shaped may appear here.
  assert.ok(!signed.includes("soap:Envelope"));
  assert.ok(!signed.includes("<?xml"));
  // The namespace must stay declared on the message root; hoisting it to the
  // Envelope later is what SÚKL's document forbids.
  assert.match(signed, /^<AppPingZEPDotaz xmlns="http:\/\/www\.sukl\.cz\/erp\/201704">/);
  // xml-crypto will stamp Id="_0" on the root unless isEmptyUri is set, and
  // that attribute is not in SÚKL's schema.
  assert.ok(!/^<AppPingZEPDotaz[^>]*\sId=/.test(signed));
  assert.ok(signed.includes("<Doklad>"));
  assert.ok(signed.includes("<Zprava>"));
});

test("the signature actually verifies over the produced bytes", () => {
  // The real check: not that a Signature element exists, but that recomputing
  // the digest and checking the RSA signature succeeds. A wrong digest scope or
  // a reformatted document fails here, which is the failure mode SÚKL would
  // otherwise report as an opaque rejection.
  const k = key();
  const signed = signSuklMessage(MESSAGE, k);

  const signature = /<(?:\w+:)?Signature[\s\S]*<\/(?:\w+:)?Signature>/.exec(signed)?.[0];
  assert.ok(signature, "a Signature element should have been appended");

  const verifier = new SignedXml({
    publicCert: `-----BEGIN CERTIFICATE-----\n${k.certificateBase64.replace(/(.{64})/g, "$1\n")}\n-----END CERTIFICATE-----`,
  });
  verifier.loadSignature(signature);
  assert.equal(verifier.checkSignature(signed), true);
});

test("tampering after signing is detected", () => {
  const k = key();
  const signed = signSuklMessage(MESSAGE, k);
  // Exactly the class of change SÚKL forbid: altering the signed bytes.
  const tampered = signed.replace("00150928369", "00150928360");

  const signature = /<(?:\w+:)?Signature[\s\S]*<\/(?:\w+:)?Signature>/.exec(tampered)?.[0];
  const verifier = new SignedXml({
    publicCert: `-----BEGIN CERTIFICATE-----\n${k.certificateBase64.replace(/(.{64})/g, "$1\n")}\n-----END CERTIFICATE-----`,
  });
  verifier.loadSignature(signature!);
  assert.equal(verifier.checkSignature(tampered), false);
});

test("a message that already carries a Signature is refused", () => {
  const already = MESSAGE.replace("</AppPingZEPDotaz>", "<Signature/></AppPingZEPDotaz>");
  assert.throws(() => signSuklMessage(already, key()), /must be absent before signing/);
});
