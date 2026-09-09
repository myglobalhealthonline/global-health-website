import { randomUUID } from "node:crypto";

import {
  isSuklCallable,
  suklInterfaceVersion,
  suklMissingCallConfig,
  suklSwKlienta,
  SUKL_SERVICE_LABELS,
  type SuklService,
} from "./config.js";
import {
  buildSoapEnvelope,
  el,
  extractAllElementText,
  extractElementText,
  extractFault,
} from "./envelope.js";
import { SuklError, SuklNotConfiguredError, isSuklError } from "./errors.js";
import { suklPost } from "./transport.js";
import { DEFAULT_ENDPOINT_PATH, SHARED_ELEMENT_NAMESPACE } from "./app-ping.js";

/**
 * `Login` — asks SÚKL who they think we are.
 *
 * This is the cheapest way to verify a doctor's registration without asking
 * SÚKL by email. The response names the user, the roles they hold, and the
 * healthcare provider (PZS) the account is bound to — which is exactly the
 * question left open when a prescriber is registered through the web form and
 * no workplace linking step is offered.
 *
 * The request is unusual in the same direction as GetAppInfo: `LoginDotaz` is
 * `zprava_bez_doklad_type`, which carries ONLY `Zprava`. There is no `Doklad`
 * and therefore no `Pristupujici` — the accessing identity comes from the
 * transport credentials, not the body. Read from the live Common WSDL on
 * 2026-09-05.
 *
 * Read-only. Creates nothing. Rate limited like every other call, so this is a
 * manual admin action and never a timer.
 */

export interface SuklLoginResult {
  service: SuklService;
  label: string;
  ok: boolean;
  httpStatus: number;
  durationMs: number;
  /** SÚKL's own code for the user — compare with what we send as `Uzivatel`. */
  userCode: string | null;
  userSurname: string | null;
  userGivenNames: string | null;
  /** Roles held by the person. Confirmed live 2026-09-07: `eRPlekar` is the
   *  eRecept prescriber role, `ePPracovnikVydeje` the ePoukaz dispensing one.
   *  NOT the `typ_pristupujiciho` enum (LEKAR, LEKARNIK…), which is a
   *  different vocabulary used inside document payloads. */
  personRoles: string[];
  /** Roles held by the subject/organisation. */
  subjectRoles: string[];
  /** The provider this account is bound to. */
  providerCode: string | null;
  providerName: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export function buildLoginRequest(input: {
  service: SuklService;
  verze: string;
  swKlienta: string;
  idZpravy: string;
  odeslano: Date;
}): string {
  // Only Zprava: zprava_bez_doklad_type has no Doklad, so no Pristupujici.
  //
  // The wrapper tags are written literally, as in app-ping.ts: el() escapes its
  // value, so passing built-up markup through it would emit &lt;ID_Zpravy&gt;
  // and SÚKL would reject the message. el() is for leaves only.
  const body =
    "<Zprava>" +
    el("ID_Zpravy", input.idZpravy) +
    el("Verze", input.verze) +
    el("Odeslano", input.odeslano.toISOString()) +
    el("SW_Klienta", input.swKlienta) +
    "</Zprava>";

  return buildSoapEnvelope({
    operationElement: "LoginDotaz",
    namespace: SHARED_ELEMENT_NAMESPACE[input.service],
    body,
  });
}

export function interpretLoginResponse(input: { httpStatus: number; body: string }): {
  ok: boolean;
  userCode: string | null;
  userSurname: string | null;
  userGivenNames: string | null;
  personRoles: string[];
  subjectRoles: string[];
  providerCode: string | null;
  providerName: string | null;
  errorCode: string | null;
  errorMessage: string | null;
} {
  const empty = {
    userCode: null,
    userSurname: null,
    userGivenNames: null,
    personRoles: [] as string[],
    subjectRoles: [] as string[],
    providerCode: null,
    providerName: null,
  };

  const fault = extractFault(input.body);
  if (fault) {
    return {
      ok: false,
      ...empty,
      // SÚKL's structured code beats the generic soap:Server — see app-ping.ts.
      errorCode: extractElementText(input.body, "Kod") ?? fault.faultCode ?? "SUKL_SOAP_FAULT",
      errorMessage:
        extractElementText(input.body, "Popis") ?? fault.faultString ?? "SÚKL returned a fault.",
    };
  }

  if (input.httpStatus < 200 || input.httpStatus >= 300) {
    return {
      ok: false,
      ...empty,
      errorCode: `HTTP_${input.httpStatus}`,
      errorMessage: `SÚKL returned HTTP ${input.httpStatus}.`,
    };
  }

  // `Kod` appears under both Uzivatel and PZS, and `Nazev` only under PZS, so
  // each is read from its own block rather than from the whole document.
  const uzivatel = extractElementText(input.body, "Uzivatel") ?? "";
  const pzs = extractElementText(input.body, "PZS") ?? "";
  const roleOsoby = extractElementText(input.body, "RoleOsoby") ?? "";
  const roleSubjektu = extractElementText(input.body, "RoleSubjektu") ?? "";

  return {
    ok: true,
    userCode: extractElementText(uzivatel, "Kod"),
    userSurname: extractElementText(uzivatel, "Prijmeni"),
    userGivenNames: extractElementText(uzivatel, "Jmena"),
    personRoles: extractAllElementText(roleOsoby, "Role"),
    subjectRoles: extractAllElementText(roleSubjektu, "Role"),
    providerCode: extractElementText(pzs, "Kod"),
    providerName: extractElementText(pzs, "Nazev"),
    errorCode: null,
    errorMessage: null,
  };
}

export async function suklLogin(service: SuklService): Promise<SuklLoginResult> {
  // Same gate as AppPing: the message header carries the interface version, so
  // an unconfigured version is a refusal rather than a request SÚKL rejects.
  if (!isSuklCallable(service)) {
    throw new SuklNotConfiguredError(
      `Cannot call SÚKL — missing: ${suklMissingCallConfig(service).join(", ")}`,
    );
  }

  const shared = { service, label: SUKL_SERVICE_LABELS[service] };
  const envelope = buildLoginRequest({
    service,
    verze: suklInterfaceVersion()!,
    swKlienta: suklSwKlienta(),
    idZpravy: randomUUID(),
    odeslano: new Date(),
  });

  try {
    const response = await suklPost(service, DEFAULT_ENDPOINT_PATH, envelope, {
      soapAction: "Login",
    });
    const v = interpretLoginResponse({
      httpStatus: response.httpStatus,
      body: response.body,
    });
    return { ...shared, httpStatus: response.httpStatus, durationMs: response.durationMs, ...v };
  } catch (error) {
    // A transport rejection carries the diagnosis; throwing would strip it.
    if (isSuklError(error)) {
      return {
        ...shared,
        ok: false,
        httpStatus: error.httpStatus ?? 0,
        durationMs: 0,
        userCode: null,
        userSurname: null,
        userGivenNames: null,
        personRoles: [],
        subjectRoles: [],
        providerCode: null,
        providerName: null,
        errorCode: error.code,
        errorMessage: error.safeMessage,
      };
    }
    throw error;
  }
}

export { SuklError };
