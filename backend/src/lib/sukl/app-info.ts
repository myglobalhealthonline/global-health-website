import {
  isSuklServiceConfigured,
  SUKL_SERVICE_LABELS,
  type SuklService,
} from "./config.js";
import { buildSoapEnvelope, extractElementText, extractFault } from "./envelope.js";
import { SuklError, SuklNotConfiguredError, isSuklError } from "./errors.js";
import { suklPost } from "./transport.js";
import { DEFAULT_ENDPOINT_PATH, SUKL_NAMESPACE_COMMON } from "./app-ping.js";

/**
 * `GetAppInfo` — asks SÚKL which interface version they are actually running.
 *
 * Reports SÚKL's software build (`AktualniVerze/Verze`, e.g. `1.110.10.29473`)
 * and, when the service lists them, the per-document-type interface versions
 * (`AktualniVerze/Doklad/Verze`) — the 202601B-shaped values that
 * `SUKL_INTERFACE_VERSION` is actually comparable to.
 *
 * The distinction cost a wrong UI claim on 2026-09-04: the build number was
 * presented as the interface version and as grounds for changing the env var.
 * It is not. CUEP TEST returns build `1.110.10.29473`, name `Informační systém
 * eRecept TEST`, and NO Doklad entries — so this operation does not currently
 * confirm the interface version at all. AppPing returning HTTP 200 while
 * sending 202601B remains the evidence for that.
 *
 * The request body is genuinely empty — `app_info_dotaz_type` in
 * CommonSchema.xsd is declared as `<xsd:complexType name="app_info_dotaz_type"/>`
 * with no children at all. So unlike every other operation this carries no
 * `Pristupujici` and no `Zprava`, which also makes it the cheapest possible
 * probe: transport credentials still apply, but nothing in the body can be
 * wrong.
 *
 * Rate limited like everything else — a manual admin action, never a timer.
 */

/**
 * One entry of `AktualniVerze/Doklad` (`typ_dokladu_type`).
 *
 * THIS is where the interface version lives — the 202601B-shaped value that
 * `SUKL_INTERFACE_VERSION` must match. Not to be confused with
 * `AktualniVerze/Verze`, which is SÚKL's software build number.
 */
export interface SuklDocumentType {
  /** Interface version for this document type, e.g. 202601B. */
  version: string | null;
  /** Document identifier prefix. */
  prefix: string | null;
  description: string | null;
  validFrom: string | null;
  validTo: string | null;
}

export interface SuklAppInfoResult {
  service: SuklService;
  label: string;
  ok: boolean;
  httpStatus: number;
  durationMs: number;
  /**
   * SÚKL's SOFTWARE BUILD, e.g. `1.110.10.29473` — NOT the message interface
   * version. Confirmed against the live TEST service on 2026-09-04. Do not
   * compare this with SUKL_INTERFACE_VERSION; that belongs to documentTypes.
   */
  applicationVersion: string | null;
  /** Application name, e.g. the module SÚKL believe we are talking to. */
  name: string | null;
  /** Server clock. A large skew against ours is worth knowing about early:
   *  `Zprava/Odeslano` is a timestamp SÚKL may validate. */
  serverTime: string | null;
  /** Document types with their own interface versions and validity windows. */
  documentTypes: SuklDocumentType[];
  errorCode: string | null;
  errorMessage: string | null;
}

export function buildAppInfoRequest(): string {
  // No children: app_info_dotaz_type is empty in the schema.
  return buildSoapEnvelope({
    operationElement: "AppInfoDotaz",
    namespace: SUKL_NAMESPACE_COMMON,
    body: "",
  });
}

/**
 * `Doklad` is a complex element, so it cannot be read with the text extractor —
 * doing so yields raw inner XML. Pull each block out, then read its children.
 *
 * Safe for THIS operation only: `app_info_odpoved_type` contains just
 * AktualniVerze and DatumCasServeru, so every `Doklad` here belongs to
 * AktualniVerze. Other responses reuse the name for unrelated things.
 */
function extractDocumentTypes(xml: string): SuklDocumentType[] {
  const blocks = xml.matchAll(/<(?:\w+:)?Doklad(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?Doklad>/gi);
  const out: SuklDocumentType[] = [];
  for (const b of blocks) {
    const inner = b[1] ?? "";
    out.push({
      version: extractElementText(inner, "Verze"),
      prefix: extractElementText(inner, "Prefix"),
      description: extractElementText(inner, "Popis"),
      validFrom: extractElementText(inner, "PlatOd"),
      validTo: extractElementText(inner, "PlatDo"),
    });
  }
  return out;
}

export function interpretAppInfoResponse(input: { httpStatus: number; body: string }): {
  ok: boolean;
  applicationVersion: string | null;
  name: string | null;
  serverTime: string | null;
  documentTypes: SuklDocumentType[];
  errorCode: string | null;
  errorMessage: string | null;
} {
  const fault = extractFault(input.body);
  if (fault) {
    return {
      ok: false,
      applicationVersion: null,
      name: null,
      serverTime: null,
      documentTypes: [],
      // SÚKL's structured code beats the generic soap:Server — see app-ping.ts.
      errorCode: extractElementText(input.body, "Kod") ?? fault.faultCode ?? "SUKL_SOAP_FAULT",
      errorMessage:
        extractElementText(input.body, "Popis") ??
        fault.faultString ??
        "SÚKL returned a SOAP fault.",
    };
  }

  if (input.httpStatus < 200 || input.httpStatus >= 300) {
    return {
      ok: false,
      applicationVersion: null,
      name: null,
      serverTime: null,
      documentTypes: [],
      errorCode: `HTTP_${input.httpStatus}`,
      errorMessage: `SÚKL returned HTTP ${input.httpStatus}.`,
    };
  }

  // `Verze` appears inside AktualniVerze; there is no competing Verze element in
  // this response because the request carried no Zprava header to echo.
  // Strip the Doklad blocks before reading the application version: each block
  // carries its OWN <Verze>, and a first-match read would otherwise be at the
  // mercy of element order.
  const withoutDoklady = input.body.replace(
    /<(?:\w+:)?Doklad(?:\s[^>]*)?>[\s\S]*?<\/(?:\w+:)?Doklad>/gi,
    "",
  );

  return {
    ok: true,
    applicationVersion: extractElementText(withoutDoklady, "Verze"),
    name: extractElementText(withoutDoklady, "Nazev"),
    serverTime: extractElementText(input.body, "DatumCasServeru"),
    documentTypes: extractDocumentTypes(input.body),
    errorCode: null,
    errorMessage: null,
  };
}

export async function suklGetAppInfo(service: SuklService): Promise<SuklAppInfoResult> {
  if (!isSuklServiceConfigured(service)) {
    throw new SuklNotConfiguredError(
      `${SUKL_SERVICE_LABELS[service]} is not configured — set its service URL.`,
    );
  }

  const shared = { service, label: SUKL_SERVICE_LABELS[service] };

  try {
    const response = await suklPost(service, DEFAULT_ENDPOINT_PATH, buildAppInfoRequest(), {
      soapAction: "GetAppInfo",
    });
    const v = interpretAppInfoResponse({
      httpStatus: response.httpStatus,
      body: response.body,
    });
    return {
      ...shared,
      ok: v.ok,
      httpStatus: response.httpStatus,
      durationMs: response.durationMs,
      applicationVersion: v.applicationVersion,
      name: v.name,
      serverTime: v.serverTime,
      documentTypes: v.documentTypes,
      errorCode: v.errorCode,
      errorMessage: v.errorMessage,
    };
  } catch (error) {
    // Transport rejections carry the diagnosis (status, headers, excerpt); a
    // thrown error would strip it — same reasoning as AppPing.
    if (isSuklError(error)) {
      return {
        ...shared,
        ok: false,
        httpStatus: error.httpStatus ?? 0,
        durationMs: 0,
        applicationVersion: null,
        name: null,
        serverTime: null,
        documentTypes: [],
        errorCode: error.code,
        errorMessage: error.safeMessage,
      };
    }
    throw error;
  }
}

export { SuklError };
