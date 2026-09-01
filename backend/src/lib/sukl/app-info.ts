import {
  isSuklServiceConfigured,
  SUKL_SERVICE_LABELS,
  type SuklService,
} from "./config.js";
import { buildSoapEnvelope, extractAllElementText, extractElementText, extractFault } from "./envelope.js";
import { SuklError, SuklNotConfiguredError, isSuklError } from "./errors.js";
import { suklPost } from "./transport.js";
import { DEFAULT_ENDPOINT_PATH, SUKL_NAMESPACE_COMMON } from "./app-ping.js";

/**
 * `GetAppInfo` — asks SÚKL which interface version they are actually running.
 *
 * Worth having for one specific reason: `SUKL_INTERFACE_VERSION` is currently
 * `202601B`, a value we INFERRED from a published table rather than were told.
 * Every message carries it in the `Zprava` header and a wrong value is
 * rejected outright, so an inference sitting under every future request is a
 * poor foundation. This replaces it with SÚKL's own answer.
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

export interface SuklAppInfoResult {
  service: SuklService;
  label: string;
  ok: boolean;
  httpStatus: number;
  durationMs: number;
  /** SÚKL's current interface version — compare against SUKL_INTERFACE_VERSION. */
  version: string | null;
  /** Application name, e.g. the module SÚKL believe we are talking to. */
  name: string | null;
  /** Server clock. A large skew against ours is worth knowing about early:
   *  `Zprava/Odeslano` is a timestamp SÚKL may validate. */
  serverTime: string | null;
  /** Document types the service declares it handles, when it lists any. */
  documentTypes: string[];
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

export function interpretAppInfoResponse(input: { httpStatus: number; body: string }): {
  ok: boolean;
  version: string | null;
  name: string | null;
  serverTime: string | null;
  documentTypes: string[];
  errorCode: string | null;
  errorMessage: string | null;
} {
  const fault = extractFault(input.body);
  if (fault) {
    return {
      ok: false,
      version: null,
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
      version: null,
      name: null,
      serverTime: null,
      documentTypes: [],
      errorCode: `HTTP_${input.httpStatus}`,
      errorMessage: `SÚKL returned HTTP ${input.httpStatus}.`,
    };
  }

  // `Verze` appears inside AktualniVerze; there is no competing Verze element in
  // this response because the request carried no Zprava header to echo.
  return {
    ok: true,
    version: extractElementText(input.body, "Verze"),
    name: extractElementText(input.body, "Nazev"),
    serverTime: extractElementText(input.body, "DatumCasServeru"),
    documentTypes: extractAllElementText(input.body, "Doklad"),
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
      version: v.version,
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
        version: null,
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
