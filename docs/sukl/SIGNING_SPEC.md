# SÚKL message signing — the actual specification

Source: `elektronicky_podpis_zprav_v2.docx`, supplied by SÚKL 2026-09-05 in
`eRecept_prioritni_webove_sluzby_netCORE_v2_dokumentace_pro_vyvojare.zip`.
This file records what that document says. It replaces every earlier guess.

## Which operations need a certificate-based signature

Exactly the seven in the document's Table 1. Ours are the first three:

| Function | Actor |
|---|---|
| `AppPingZEP` | Doctor, Pharmacist |
| `ZalozitPredpis` | Doctor |
| `ZmenitPredpis` | Doctor |
| `ZalozitVydej`, `ZmenitVydej`, `ZalozitVydejOTC`, `ZmenitVydejOTC` | Pharmacist — not ours |

Everything else — reads, listing, and **cancellation** — needs only the "plain
electronic signature", which SÚKL define as *the sender identifier already
present in the message or in the HTTP Authorization header*. We satisfy that
today with `Uzivatel` plus HTTP Basic. No extra work.

## The route that avoids signing altogether

Vyhláška 329/2019 Sb. § 3(4), quoted in the document:

> Data odesílaná podle odstavce 3 musí být podepsána uznávaným elektronickým
> podpisem … **Tento postup se nepoužije, přistupuje-li lékař nebo farmaceut k
> systému eRecept prostřednictvím Národního bodu pro identifikaci a
> autentizaci.**

The signature requirement **does not apply** when the doctor accesses eRecept
through the National Identification and Authentication Point (NIA / Identita
občana). This is the legal basis for the alternative SÚKL mentioned in ticket
40336, now confirmed from the regulation itself rather than from a support
reply. It is a genuine fork, not a footnote — see "Open decision" below.

## What is signed

- The digest is computed over **the message root element only — WITHOUT the SOAP
  Envelope**. Sign the standalone data message, then place it in the body.
- That root element contains **only `Doklad` and `Zprava`**.
- **`Signature` must not be present when the digest is computed — not even as an
  empty element.**
- The document must be UTF-8, valid, and must already declare its namespaces and
  prefixes before signing.

## What must not happen after signing

The document is explicit, and each of these silently invalidates the signature:

- The signed XML must not be reformatted in any way.
- Namespace declarations must **not** be moved from the signed root element up to
  the `Envelope` element.
- The Czech text encoding must not be changed.
- Nothing may alter the byte form of the signed XML.

Note what this means for us: `buildSoapEnvelope` already puts the namespace on
the operation element rather than the envelope, which is the shape the signature
requires. The signed message must be embedded verbatim — no re-serialising, no
pretty-printing, no namespace hoisting.

## Algorithms

`Signature` is `http://www.w3.org/2000/09/xmldsig#`. Hashing must be SHA-2.

Worked example from the document:

```xml
<dsig:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
<dsig:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
<dsig:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
<dsig:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
```

Permitted `SignatureMethod`: `rsa-sha256`, `ecdsa-sha256`, `rsa-sha512`,
`ecdsa-sha512`, `dsa-sha256`. Permitted `DigestMethod`: `xmlenc#sha256`,
`xmlenc#sha512`. Canonicalisation may be c14n 2001, c14n11 or exc-c14n, each
with or without comments; transforms additionally allow `base64` and
`enveloped-signature`.

**The certificate must be sent with the signature, in `X509Certificate`.**

## Certificates

- **Production:** a qualified certificate from an accredited provider —
  PostSignum, První certifikační autorita (ICA), eIdentity, Národní certifikační
  autorita, or the Slovak NBÚ.
- **Test:** any of the above, or a certificate from cacerts.org, or a
  **PostSignum DEMO** certificate. SÚKL confirmed the DEMO route separately.
- Key storage is explicitly the client's choice: file, token, OS store, or
  application store.

## Open decision — whose key signs a prescription

The signature on `ZalozitPredpis` is the **prescribing doctor's**, not the
facility's. A qualified electronic signature requires the signatory's sole
control of the signing key, so holding doctors' qualified private keys on our
server is a legal question before it is a technical one.

Two routes, and this has to be decided before any production signing is built:

1. **NIA / Identita občana** — no signature required at all, per § 3(4). No key
   material held by us. Onboarding process still unknown.
2. **Per-doctor qualified signature** — needs a custody model that keeps the key
   under the doctor's sole control, plus the security and legal review that
   `SECURITY_MODEL.md` gates on.

Neither is chosen. The test environment is unaffected: a DEMO certificate can
prove `AppPingZEP` and the whole signing path without settling this.
