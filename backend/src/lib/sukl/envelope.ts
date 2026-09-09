/**
 * SOAP 1.1 envelope construction and response extraction for SÚKL.
 *
 * SÚKL publish both a SOAP 1.1 and a SOAP 1.2 binding for every service. We send
 * **1.1**: `text/xml` with a `SOAPAction` header, which is what `transport.ts`
 * already emits and what their `.asmx` endpoints accept. Switching to 1.2 would
 * mean `application/soap+xml` with the action as a content-type parameter —
 * a transport change, not just a namespace swap.
 *
 * Both request and response elements are namespace-qualified: the schemas set
 * `elementFormDefault="qualified"`, so a default `xmlns` on the operation
 * element carries down to every child. That is why the builder below takes the
 * service namespace and emits unprefixed children.
 *
 * ── On parsing ──────────────────────────────────────────────────────────────
 * `extractFault` and `extractElementText` do targeted string matching, not real
 * XML parsing. That is a deliberate, bounded choice for the DIAGNOSTIC layer —
 * ping and fault detection — where the shapes are tiny and the raw body is kept
 * for a human to read.
 *
 * It is NOT sufficient for the ePoukaz payload layer. Reading a voucher means
 * namespaces, repeated elements, optional branches and typed values, where a
 * missed field is a clinical bug rather than a display glitch. That work should
 * add a real XML parser (`fast-xml-parser`) — which also means regenerating the
 * standalone `backend/pnpm-lock.yaml`, so it belongs in its own change rather
 * than being smuggled in with a ping.
 */

/** XML text-node escaping. Values reach SÚKL, so this is correctness, not cosmetics. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface SoapEnvelopeInput {
  /** Operation element name, e.g. "AppPingDotaz". From the WSDL, never invented. */
  operationElement: string;
  /** Target namespace of the service, e.g. http://www.sukl.cz/erp/common */
  namespace: string;
  /** Already-serialised children of the operation element. */
  body: string;
}

export function buildSoapEnvelope(input: SoapEnvelopeInput): string {
  return wrapInSoapEnvelope(buildMessageElement(input));
}

/**
 * The message element on its own — no envelope, namespace declared on the
 * element itself.
 *
 * This is the exact unit SÚKL sign: elektronicky_podpis_zprav_v2.docx requires
 * the digest to be taken over the message root WITHOUT the SOAP envelope, with
 * the namespace declared on that root. Signing therefore builds this, signs it,
 * and only then wraps it — see signing.ts.
 */
export function buildMessageElement(input: SoapEnvelopeInput): string {
  // `com` is declared unconditionally. Pristupujici and Zprava always live in
  // erp/common regardless of which module the operation belongs to — see
  // comEl() — and on CUEP/Common the two URIs coincide, so declaring it there
  // costs nothing and keeps one shape for every service.
  return (
    `<${input.operationElement} xmlns="${input.namespace}" xmlns:com="${SUKL_COMMON_NAMESPACE}">` +
    input.body +
    `</${input.operationElement}>`
  );
}

/** The namespace shared across every SÚKL module. */
export const SUKL_COMMON_NAMESPACE = "http://www.sukl.cz/erp/common";

/**
 * `<com:Name>value</com:Name>` — a leaf in the COMMON namespace.
 *
 * SÚKL's own example (NIA_v0.8) shows the shape: the operation element and
 * `Doklad` carry the module namespace, while `Pristupujici` and `Zprava` are
 * `com:`-prefixed. A single default xmlns on the operation element puts those
 * two in the module namespace instead, which CUER rejects with S009 — and
 * which passed unnoticed on CUEP and Common only because their module
 * namespace IS erp/common.
 */
export function comEl(name: string, value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return `<com:${name}>${escapeXml(value)}</com:${name}>`;
}

/**
 * Wraps an already-built message element in the SOAP envelope.
 *
 * The element is inserted VERBATIM. For a signed message that is not a style
 * preference but a correctness requirement: reformatting it, re-encoding it, or
 * hoisting its namespace declaration onto the Envelope all invalidate the
 * signature, and SÚKL's document forbids each explicitly.
 */
export function wrapInSoapEnvelope(messageElement: string): string {
  return (
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">' +
    "<soap:Body>" +
    messageElement +
    "</soap:Body>" +
    "</soap:Envelope>"
  );
}

/** `<Name>value</Name>`, escaped. Omits the element entirely when value is null. */
export function el(name: string, value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return `<${name}>${escapeXml(value)}</${name}>`;
}

export interface SoapFault {
  faultCode: string | null;
  faultString: string | null;
}

/**
 * Detects a SOAP fault. Matches with an optional namespace prefix because
 * `<faultcode>`, `<soap:Fault>` and `<env:Fault>` all occur in the wild.
 */
export function extractFault(xml: string): SoapFault | null {
  if (!/<(\w+:)?Fault[\s>]/i.test(xml)) return null;
  return {
    faultCode: extractElementText(xml, "faultcode") ?? extractElementText(xml, "Code"),
    faultString: extractElementText(xml, "faultstring") ?? extractElementText(xml, "Reason"),
  };
}

/**
 * First text value of an element, ignoring any namespace prefix.
 *
 * Returns null rather than an empty string when absent, so a caller can tell
 * "not present" from "present but empty" — which for SÚKL's optional fields is
 * a real distinction.
 */
export function extractElementText(xml: string, localName: string): string | null {
  const re = new RegExp(`<(?:\\w+:)?${localName}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${localName}>`, "i");
  const m = re.exec(xml);
  if (!m || m[1] === undefined) return null;
  return unescapeXml(m[1].trim());
}

/** All text values of a repeated element. */
export function extractAllElementText(xml: string, localName: string): string[] {
  const re = new RegExp(`<(?:\\w+:)?${localName}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${localName}>`, "gi");
  const out: string[] = [];
  for (const m of xml.matchAll(re)) if (m[1] !== undefined) out.push(unescapeXml(m[1].trim()));
  return out;
}

function unescapeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    // Ampersand LAST, or "&amp;lt;" would decode twice into "<".
    .replace(/&amp;/g, "&");
}
