import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { env } from "../../config/env.js";
import { DEFAULT_ENDPOINT_PATH, SHARED_ELEMENT_NAMESPACE } from "./app-ping.js";
import {
  isSuklCallable,
  suklInterfaceVersion,
  suklMissingCallConfig,
  suklWorkplaceCode,
  suklSwKlienta,
  suklUzivatel,
  SUKL_SERVICE_LABELS,
  type SuklService,
} from "./config.js";
import {
  buildMessageElement,
  el,
  extractElementText,
  extractFault,
  wrapInSoapEnvelope,
} from "./envelope.js";
import { SuklError, SuklNotConfiguredError, isSuklError } from "./errors.js";
import { readSigningKeyFromPkcs12, signSuklMessage, type SuklSigningKey } from "./signing.js";
import { suklPost } from "./transport.js";

/**
 * `AppPingZEP` — AppPing plus a real XML-DSig signature.
 *
 * SÚKL describe it as "AppPing pro test elektronického podpisu", and it is the
 * only signed operation that creates nothing. That makes it the correct place
 * to prove the entire signing path — key extraction, digest scope,
 * canonicalisation, certificate delivery — before any prescription exists.
 *
 * The order here is the whole point and is dictated by
 * docs/sukl/SIGNING_SPEC.md: build the message element ALONE, sign that, then
 * wrap the signed bytes in the envelope untouched. Building the envelope first
 * and signing inside it would digest the wrong scope; re-serialising afterwards
 * would invalidate a correct signature.
 */

export interface SuklAppPingZepResult {
  service: SuklService;
  label: string;
  ok: boolean;
  httpStatus: number;
  durationMs: number;
  requestId: string;
  /** Whether a signing credential was configured at all. */
  signed: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  bodyExcerpt: string | null;
}

/** True when a signing credential is configured. Separate from the facility cert. */
export function isSuklSigningConfigured(): boolean {
  return Boolean(
    (env.SUKL_SIGNING_PFX_BASE64?.trim() || env.SUKL_SIGNING_PFX_PATH?.trim()) &&
      env.SUKL_SIGNING_PFX_PASSWORD?.trim(),
  );
}

/**
 * Loads the signing credential from env. Base64 wins over path, matching the
 * facility certificate's precedence: Railway supplies base64, local supplies a
 * path. Never discloses the path or password in an error.
 */
export function loadSuklSigningKey(): SuklSigningKey {
  const base64 = env.SUKL_SIGNING_PFX_BASE64?.trim();
  const path = env.SUKL_SIGNING_PFX_PATH?.trim();
  const password = env.SUKL_SIGNING_PFX_PASSWORD?.trim();

  if (!password || (!base64 && !path)) {
    throw new SuklNotConfiguredError(
      "No signing certificate is configured — set SUKL_SIGNING_PFX_BASE64 (or _PATH) " +
        "and SUKL_SIGNING_PFX_PASSWORD.",
    );
  }

  let pfx: Buffer;
  if (base64) {
    pfx = Buffer.from(base64, "base64");
    if (pfx.byteLength < 64) {
      throw new SuklError(
        "SUKL_CERTIFICATE_INVALID",
        "certificate",
        "SUKL_SIGNING_PFX_BASE64 does not decode to a certificate container.",
      );
    }
  } else {
    try {
      pfx = readFileSync(path!);
    } catch {
      throw new SuklError(
        "SUKL_CERTIFICATE_INVALID",
        "certificate",
        "The signing certificate file could not be read.",
      );
    }
  }

  return readSigningKeyFromPkcs12(pfx, password);
}

export function buildAppPingZepRequest(input: {
  service: SuklService;
  uzivatel: string;
  pracoviste: string;
  verze: string;
  swKlienta: string;
  idZpravy: string;
  odeslano: Date;
  key: SuklSigningKey;
}): string {
  // Same Doklad/Zprava shape as AppPing — zprava_zep_dotaz_type adds only the
  // Signature, which signSuklMessage appends.
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

  const message = buildMessageElement({
    operationElement: "AppPingZEPDotaz",
    namespace: SHARED_ELEMENT_NAMESPACE[input.service],
    body,
  });

  // Sign the bare message, then wrap it verbatim. Never the other way round.
  return wrapInSoapEnvelope(signSuklMessage(message, input.key));
}

export function interpretAppPingZepResponse(input: { httpStatus: number; body: string }): {
  ok: boolean;
  errorCode: string | null;
  errorMessage: string | null;
} {
  const fault = extractFault(input.body);
  if (fault) {
    return {
      ok: false,
      errorCode: extractElementText(input.body, "Kod") ?? fault.faultCode ?? "SUKL_SOAP_FAULT",
      errorMessage:
        extractElementText(input.body, "Popis") ??
        fault.faultString ??
        "SÚKL rejected the signed message.",
    };
  }
  if (input.httpStatus < 200 || input.httpStatus >= 300) {
    return {
      ok: false,
      errorCode: `HTTP_${input.httpStatus}`,
      errorMessage: `SÚKL returned HTTP ${input.httpStatus}.`,
    };
  }
  return { ok: true, errorCode: null, errorMessage: null };
}

export async function suklAppPingZep(service: SuklService): Promise<SuklAppPingZepResult> {
  if (!isSuklCallable(service)) {
    throw new SuklNotConfiguredError(
      `Cannot call SÚKL — missing: ${suklMissingCallConfig(service).join(", ")}`,
    );
  }

  const requestId = randomUUID();
  const shared = {
    service,
    label: SUKL_SERVICE_LABELS[service],
    requestId,
    signed: isSuklSigningConfigured(),
  };

  try {
    const envelope = buildAppPingZepRequest({
      service,
      uzivatel: suklUzivatel()!,
      pracoviste: suklWorkplaceCode()!,
      verze: suklInterfaceVersion()!,
      swKlienta: suklSwKlienta(),
      idZpravy: requestId,
      odeslano: new Date(),
      key: loadSuklSigningKey(),
    });

    const response = await suklPost(service, DEFAULT_ENDPOINT_PATH, envelope, {
      soapAction: "AppPingZEP",
    });
    const v = interpretAppPingZepResponse({
      httpStatus: response.httpStatus,
      body: response.body,
    });
    return {
      ...shared,
      ok: v.ok,
      httpStatus: response.httpStatus,
      durationMs: response.durationMs,
      errorCode: v.errorCode,
      errorMessage: v.errorMessage,
      bodyExcerpt: v.ok ? null : response.body.slice(0, 4000),
    };
  } catch (error) {
    if (isSuklError(error)) {
      return {
        ...shared,
        ok: false,
        httpStatus: error.httpStatus ?? 0,
        durationMs: 0,
        errorCode: error.code,
        errorMessage: error.safeMessage,
        bodyExcerpt: error.bodyExcerpt ?? null,
      };
    }
    throw error;
  }
}
