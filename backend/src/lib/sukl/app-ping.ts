import { randomUUID } from "node:crypto";

import {
  isSuklServiceConfigured,
  suklInterfaceVersion,
  suklSwKlienta,
  suklUzivatel,
  suklWorkplaceCode,
  SUKL_SERVICE_LABELS,
  type SuklService,
} from "./config.js";
import { buildSoapEnvelope, el, extractElementText, extractFault } from "./envelope.js";
import { SuklError, SuklNotConfiguredError } from "./errors.js";
import { suklPost } from "./transport.js";

/**
 * `AppPing` — the first real SÚKL operation.
 *
 * Chosen deliberately as the first one to implement: it is read-only, SÚKL
 * confirmed pings are permitted, and it exercises the entire stack — mutual
 * TLS, envelope construction, the `Zprava` header, the accessing identity,
 * response parsing and fault mapping. If this returns cleanly, everything except
 * the business payload is proven.
 *
 * Rate limit: SÚKL cap calls per user per minute and temporarily BLOCK access on
 * excess. So this is exposed as a manual admin action only. It must never be
 * wired to a timer, a health check or an uptime probe.
 *
 * Request shape, from `zprava_bez_dotaz_type` in CommonSchema.xsd:
 *
 *   AppPingDotaz
 *     Doklad
 *       Pristupujici
 *         Uzivatel      max 36   — the calling account (a credential)
 *         Pracoviste    11 digits — our workplace code
 *     Zprava
 *       ID_Zpravy       GUID
 *       Verze           [0-9]{6}[A-Z]
 *       Odeslano        dateTime
 *       SW_Klienta      max 12
 *
 * `AppPingZEP` has the same shape plus a REQUIRED `sig:Signature`, which makes it
 * the way to verify signing before attempting a real create. Not implemented
 * here — it needs the signature decision first (SCOPE_CONFIRMATION.md Q15–Q17).
 */

/** Both services expose AppPing, and each has its own namespace. */
const SERVICE_NAMESPACE: Record<SuklService, string> = {
  cuep: "http://www.sukl.cz/erp/cuep",
  common: "http://www.sukl.cz/erp/common",
};

/**
 * Endpoint path. SÚKL's published `soap:address` points at an internal host
 * (`test-erp-as02`), so it cannot be used directly — but their reverse proxy
 * serves the WSDL from the host root, which is where operations are posted too.
 */
const ENDPOINT_PATH = "/";

export interface SuklAppPingResult {
  service: SuklService;
  label: string;
  ok: boolean;
  httpStatus: number;
  durationMs: number;
  /** Our correlation id, echoed by SÚKL in the response when it succeeds. */
  requestId: string;
  /** SÚKL's own message id from the response, when present. */
  responseMessageId: string | null;
  interfaceVersion: string;
  /** Populated only when SÚKL returned an error/fault. Safe to display. */
  errorCode: string | null;
  errorMessage: string | null;
}

export function buildAppPingRequest(input: {
  uzivatel: string;
  pracoviste: string;
  verze: string;
  swKlienta: string;
  idZpravy: string;
  odeslano: Date;
  namespace: string;
}): string {
  const body =
    "<Doklad><Pristupujici>" +
    el("Uzivatel", input.uzivatel) +
    el("Pracoviste", input.pracoviste) +
    "</Pristupujici></Doklad>" +
    "<Zprava>" +
    el("ID_Zpravy", input.idZpravy) +
    el("Verze", input.verze) +
    el("Odeslano", input.odeslano.toISOString()) +
    el("SW_Klienta", input.swKlienta) +
    "</Zprava>";

  return buildSoapEnvelope({
    operationElement: "AppPingDotaz",
    namespace: input.namespace,
    body,
  });
}

/**
 * Reads SÚKL's answer. A 200 with no fault and no `Chyba` is a pass.
 *
 * `Chyba` is their business-error element (see `chyba_type` in CommonSchema);
 * it can be present on a 200, so status alone is not the verdict.
 */
export function interpretAppPingResponse(input: { httpStatus: number; body: string }): {
  ok: boolean;
  responseMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
} {
  const responseMessageId = extractElementText(input.body, "ID_Zpravy");

  const fault = extractFault(input.body);
  if (fault) {
    return {
      ok: false,
      responseMessageId,
      errorCode: fault.faultCode ?? "SUKL_SOAP_FAULT",
      errorMessage: fault.faultString ?? "SÚKL returned a SOAP fault.",
    };
  }

  // Business error. Their `chyba_type` carries a code and a description.
  const chybaKod = extractElementText(input.body, "Kod");
  const chybaPopis = extractElementText(input.body, "Popis");
  if (/<(\w+:)?Chyba[\s>]/i.test(input.body)) {
    return {
      ok: false,
      responseMessageId,
      errorCode: chybaKod ?? "SUKL_BUSINESS_VALIDATION_FAILED",
      errorMessage: chybaPopis ?? "SÚKL rejected the request.",
    };
  }

  if (input.httpStatus < 200 || input.httpStatus >= 300) {
    return {
      ok: false,
      responseMessageId,
      errorCode: `HTTP_${input.httpStatus}`,
      errorMessage: `SÚKL returned HTTP ${input.httpStatus}.`,
    };
  }

  return { ok: true, responseMessageId, errorCode: null, errorMessage: null };
}

export async function suklAppPing(service: SuklService): Promise<SuklAppPingResult> {
  const uzivatel = suklUzivatel();
  const pracoviste = suklWorkplaceCode();
  const verze = suklInterfaceVersion();

  const missing: string[] = [];
  if (!isSuklServiceConfigured(service)) missing.push("the service URL");
  if (!uzivatel) missing.push("SUKL_TEST_UZIVATEL");
  if (!verze) missing.push("SUKL_INTERFACE_VERSION");
  if (!pracoviste) missing.push("SUKL_TEST_WORKPLACE_CODE");
  if (missing.length > 0) {
    throw new SuklNotConfiguredError(
      `Cannot call SÚKL — missing: ${missing.join(", ")}. Every operation, including ` +
        "AppPing, carries the accessing identity and the interface version.",
    );
  }

  const requestId = randomUUID();
  const envelope = buildAppPingRequest({
    uzivatel: uzivatel!,
    pracoviste: pracoviste!,
    verze: verze!,
    swKlienta: suklSwKlienta(),
    idZpravy: requestId,
    odeslano: new Date(),
    namespace: SERVICE_NAMESPACE[service],
  });

  const response = await suklPost(service, ENDPOINT_PATH, envelope, { soapAction: "AppPing" });
  const verdict = interpretAppPingResponse({
    httpStatus: response.httpStatus,
    body: response.body,
  });

  return {
    service,
    label: SUKL_SERVICE_LABELS[service],
    ok: verdict.ok,
    httpStatus: response.httpStatus,
    durationMs: response.durationMs,
    requestId,
    responseMessageId: verdict.responseMessageId,
    interfaceVersion: verze!,
    errorCode: verdict.errorCode,
    errorMessage: verdict.errorMessage,
  };
}

export { SuklError };
