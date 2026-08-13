/**
 * Minimal WSDL reader — a DIAGNOSTIC, not a parser to build payloads from.
 *
 * Its only job is to answer the questions blocking `docs/sukl/INTERFACE_INVENTORY.md`:
 * what is the service called, what `soap:address` does it publish, which
 * namespace, which operations, SOAP 1.1 or 1.2. That is enough to fill the
 * inventory in and to know what to ask SÚKL next.
 *
 * Why regular expressions rather than an XML parser: this reads a handful of
 * attributes out of a document whose RAW TEXT is returned to the caller
 * alongside the summary, so a human verifies anything that matters. Pulling in
 * an XML dependency is a decision that belongs with the real payload layer,
 * where correctness is load-bearing and a missed namespace is a production bug.
 * Nothing here is used to construct a request.
 *
 * If the summary and the raw document ever disagree, the raw document wins.
 */

export interface WsdlSummary {
  looksLikeWsdl: boolean;
  targetNamespace: string | null;
  /** Every xmlns:<prefix>="<uri>" declared on the root element. */
  namespaces: Record<string, string>;
  services: string[];
  ports: Array<{ name: string | null; binding: string | null }>;
  /** The values that must become the `path` argument to suklPost(). */
  addresses: string[];
  bindings: Array<{ name: string | null; transport: string | null }>;
  operations: string[];
  /** Which SOAP bindings the document declares. SÚKL publish BOTH, so this is a
   *  list rather than a single value — reporting only "1.2" because the soap12
   *  namespace appeared would hide that 1.1 is available and is what we send. */
  soapVersions: Array<"1.1" | "1.2">;
  /** SÚKL stamp the interface version into the schema as an XML comment, e.g.
   *  `<!--202601B-->`. It is the value the `Zprava` header must carry, and it is
   *  not negotiated — a wrong one is rejected — so extracting it here saves
   *  hunting through 150 KB of XML for the single string that matters. */
  interfaceVersion: string | null;
  /** Other WSDL/XSD documents this one pulls in — usually where the types live. */
  imports: string[];
  byteLength: number;
}

function all(re: RegExp, text: string, group = 1): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(re)) {
    const v = m[group];
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

export function summariseWsdl(xml: string): WsdlSummary {
  const looksLikeWsdl = /<(\w+:)?definitions[\s>]/i.test(xml);

  const namespaces: Record<string, string> = {};
  for (const m of xml.matchAll(/xmlns:([A-Za-z0-9_.-]+)\s*=\s*"([^"]+)"/g)) {
    if (m[1] && m[2] && !namespaces[m[1]]) namespaces[m[1]] = m[2];
  }

  const ns = Object.values(namespaces);
  const soapVersions: Array<"1.1" | "1.2"> = [];
  // Order matters for the reader: 1.1 first because that is what the transport
  // sends (text/xml + a SOAPAction header).
  if (ns.some((u) => /wsdl\/soap\/?$/.test(u))) soapVersions.push("1.1");
  if (ns.some((u) => u.includes("wsdl/soap12"))) soapVersions.push("1.2");

  // `<!--202601B-->`. Anchored to the comment form SÚKL actually use rather than
  // a loose search, so a version-shaped string elsewhere in the document cannot
  // be mistaken for the interface version.
  const interfaceVersion = /<!--\s*(\d{6}[A-Z])\s*-->/.exec(xml)?.[1] ?? null;

  return {
    looksLikeWsdl,
    targetNamespace: /targetNamespace\s*=\s*"([^"]+)"/.exec(xml)?.[1] ?? null,
    namespaces,
    services: all(/<(?:\w+:)?service[^>]*\bname\s*=\s*"([^"]+)"/gi, xml),
    ports: [...xml.matchAll(/<(?:\w+:)?port\b[^>]*>/gi)].map((m) => ({
      name: /\bname\s*=\s*"([^"]+)"/.exec(m[0])?.[1] ?? null,
      binding: /\bbinding\s*=\s*"([^"]+)"/.exec(m[0])?.[1] ?? null,
    })),
    // The whole point of the exercise.
    addresses: all(/<(?:\w+:)?address[^>]*\blocation\s*=\s*"([^"]+)"/gi, xml),
    bindings: [...xml.matchAll(/<(?:\w+:)?binding\b[^>]*\bname\s*=\s*"[^"]*"[^>]*>/gi)].map(
      (m) => ({
        name: /\bname\s*=\s*"([^"]+)"/.exec(m[0])?.[1] ?? null,
        transport: /\btransport\s*=\s*"([^"]+)"/.exec(m[0])?.[1] ?? null,
      }),
    ),
    operations: all(/<(?:\w+:)?operation[^>]*\bname\s*=\s*"([^"]+)"/gi, xml),
    soapVersions,
    interfaceVersion,
    imports: all(
      /<(?:\w+:)?(?:import|include)[^>]*\b(?:location|schemaLocation)\s*=\s*"([^"]+)"/gi,
      xml,
    ),
    byteLength: Buffer.byteLength(xml),
  };
}

/**
 * Turns a published `soap:address` into the `path` that `suklPost()` expects,
 * given the configured host. Returns null when the address points at a
 * different host — which is itself worth surfacing rather than silently
 * rewriting, because it would mean the service lives somewhere we have not
 * configured.
 */
export function addressToPath(address: string, configuredHostUrl: string): string | null {
  try {
    const a = new URL(address);
    const h = new URL(configuredHostUrl);
    if (a.host.toLowerCase() !== h.host.toLowerCase()) return null;
    return `${a.pathname}${a.search}`;
  } catch {
    return null;
  }
}
