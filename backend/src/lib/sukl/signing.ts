import forge from "node-forge";
import { SignedXml } from "xml-crypto";

import { SuklError } from "./errors.js";

/**
 * XML-DSig signing for the SÚKL operations that legally require it.
 *
 * Everything here follows `elektronicky_podpis_zprav_v2.docx` (received
 * 2026-09-05, recorded in docs/sukl/SIGNING_SPEC.md). The rules that are easy to
 * violate without noticing, because the result still looks like valid XML:
 *
 *   - the digest covers the MESSAGE ROOT ONLY, with no SOAP envelope around it;
 *   - that root holds only `Doklad` and `Zprava`, and `Signature` must be absent
 *     when the digest is taken — not even present and empty;
 *   - afterwards the signed XML must not be reformatted, re-encoded, or have its
 *     namespace declarations moved onto the Envelope.
 *
 * So this signs a standalone message element and returns it as a string that the
 * caller must embed verbatim.
 *
 * WHOSE KEY: for `ZalozitPredpis` the signature is the prescribing DOCTOR's
 * qualified signature, not the facility's. This module therefore takes the
 * signing credential as an explicit argument and never reaches for the facility
 * certificate on its own — the two are different keys with different custody
 * rules, and conflating them is exactly the mistake to avoid. See the open
 * decision in docs/sukl/SIGNING_SPEC.md.
 */

/** The algorithms SÚKL's document lists first, and the ones we send. */
export const SUKL_CANONICALIZATION = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
export const SUKL_ENVELOPED_TRANSFORM = "http://www.w3.org/2000/09/xmldsig#enveloped-signature";
export const SUKL_DIGEST_SHA256 = "http://www.w3.org/2001/04/xmlenc#sha256";
export const SUKL_SIGNATURE_RSA_SHA256 = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";

export interface SuklSigningKey {
  /** PEM private key. */
  privateKeyPem: string;
  /** Base64 DER of the signer's certificate, for X509Certificate. */
  certificateBase64: string;
}

/**
 * Extracts the signing key and certificate from a PKCS#12 container.
 *
 * Node has no PKCS#12 parser — `crypto` can present a .p12 for TLS but cannot
 * hand back the private key — so this is why node-forge is a dependency.
 *
 * Errors never include the password, the key, or the container bytes.
 */
export function readSigningKeyFromPkcs12(pfx: Buffer, passphrase: string): SuklSigningKey {
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(pfx.toString("binary")));
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, passphrase);
  } catch {
    // The most common cause by far is SÚKL's legacy RC2 export, which is also
    // what breaks the TLS path — see TESTING_RUNBOOK.md for the conversion.
    throw new SuklError(
      "SUKL_CERTIFICATE_INVALID",
      "certificate",
      "The signing certificate could not be opened. The password may be wrong, or the " +
        "container may use legacy RC2 encryption — re-export it as AES-256/PBKDF2.",
    );
  }

  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
    forge.pki.oids.pkcs8ShroudedKeyBag
  ];
  const plainKeyBags = p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag];
  const key = keyBags?.[0]?.key ?? plainKeyBags?.[0]?.key;
  if (!key) {
    throw new SuklError(
      "SUKL_CERTIFICATE_INVALID",
      "certificate",
      "The signing container holds no private key, so it cannot sign.",
    );
  }

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag];
  const cert = certBags?.[0]?.cert;
  if (!cert) {
    throw new SuklError(
      "SUKL_CERTIFICATE_INVALID",
      "certificate",
      "The signing container holds no certificate. SÚKL require it in X509Certificate.",
    );
  }

  const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  return {
    privateKeyPem: forge.pki.privateKeyToPem(key),
    certificateBase64: forge.util.encode64(der),
  };
}

/**
 * Signs a standalone SÚKL message element.
 *
 * `messageXml` must be the message root only — `<AppPingZEPDotaz xmlns="...">`
 * with `Doklad` and `Zprava` inside and no `Signature`. The returned string is
 * the same document with `Signature` appended as the last child, and it must be
 * placed in the SOAP body byte-for-byte.
 */
export function signSuklMessage(messageXml: string, key: SuklSigningKey): string {
  if (/<(?:\w+:)?Signature\b/i.test(messageXml)) {
    // The spec is explicit that Signature must not be present when the digest is
    // computed. Signing a document that already carries one would produce a
    // digest SÚKL cannot reproduce.
    throw new SuklError(
      "SUKL_SCHEMA_VALIDATION_FAILED",
      "request",
      "The message already contains a Signature element; it must be absent before signing.",
    );
  }

  const sig = new SignedXml({
    privateKey: key.privateKeyPem,
    signatureAlgorithm: SUKL_SIGNATURE_RSA_SHA256,
    canonicalizationAlgorithm: SUKL_CANONICALIZATION,
    // SÚKL require the certificate alongside the signature.
    getKeyInfoContent: () => `<X509Data><X509Certificate>${key.certificateBase64}</X509Certificate></X509Data>`,
  });

  // URI "" is the whole document; the enveloped transform is what removes the
  // Signature itself from the digest, which is what "Signature must be absent"
  // means once the element has been added.
  //
  // isEmptyUri matters more than it looks: without it xml-crypto stamps an
  // Id="_0" attribute onto the signed root so it has something to point at.
  // zprava_zep_dotaz_type declares no such attribute, so SÚKL's XSD validation
  // would reject the message — and the attribute cannot simply be stripped
  // afterwards, because it is inside the bytes the digest covers.
  sig.addReference({
    xpath: "/*",
    transforms: [SUKL_ENVELOPED_TRANSFORM, SUKL_CANONICALIZATION],
    digestAlgorithm: SUKL_DIGEST_SHA256,
    uri: "",
    isEmptyUri: true,
  });

  try {
    sig.computeSignature(messageXml, { location: { reference: "/*", action: "append" } });
  } catch (error) {
    throw new SuklError(
      "SUKL_SCHEMA_VALIDATION_FAILED",
      "request",
      `The message could not be signed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  return sig.getSignedXml();
}
