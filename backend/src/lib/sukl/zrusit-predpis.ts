import { SHARED_ELEMENT_NAMESPACE } from "./app-ping.js";
import { type SuklService } from "./config.js";
import { buildMessageElement, el, extractElementText, extractFault } from "./envelope.js";
import { SuklError } from "./errors.js";

/**
 * `ZrusitPredpis` — cancel an eRecept.
 *
 * Deliberately unsigned. SÚKL's Table 1 lists exactly which operations require
 * a qualified signature (AppPingZEP, ZalozitPredpis, ZmenitPredpis) and
 * cancellation is not among them, so this runs on the workplace certificate
 * alone — which means a doctor can withdraw a prescription without their
 * personal signing key being available.
 *
 * `AutorizacniID` is the ID_Zpravy we sent when the prescription was created,
 * not a new value. Without it a prescription cannot be withdrawn, which is why
 * SuklPrescription.submissionId exists.
 */

export interface SuklCancelPrescriptionInput {
  service: SuklService;
  /** Fresh id for THIS message — distinct from the authorisation id. */
  messageId: string;
  interfaceVersion: string;
  swKlienta: string;
  sentAt: Date;
  uzivatel: string;
  /** 11-digit workplace code. */
  pracoviste: string;
  /** ID_Dokladu of the prescription being withdrawn. */
  documentId: string;
  /** ID_Zpravy from the original create — SuklPrescription.submissionId. */
  authorisationId: string;
  cancelledOn: string;
  /** Required by SÚKL, max 1000 characters. */
  reason: string;
}

export function assertCancelValid(input: SuklCancelPrescriptionInput): void {
  const problems: string[] = [];
  if (!/^\d{11}$/.test(input.pracoviste)) problems.push("Pracoviste must be 11 digits");
  if (input.documentId.length < 12) problems.push("ID_Dokladu is at least 12 characters");
  if (
    !/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/.test(
      input.authorisationId,
    )
  ) {
    problems.push("AutorizacniID must be the UUID sent as ID_Zpravy when the eRecept was created");
  }
  if (!input.reason.trim()) problems.push("a cancellation reason is required");
  if (input.reason.length > 1000) problems.push("the reason exceeds 1000 characters");

  if (problems.length > 0) {
    throw new SuklError(
      "SUKL_SCHEMA_VALIDATION_FAILED",
      "request",
      `The cancellation is not valid: ${problems.join("; ")}.`,
    );
  }
}

export function buildCancelPrescriptionRequest(input: SuklCancelPrescriptionInput): string {
  assertCancelValid(input);

  const doklad =
    "<Doklad>" +
    el("Uzivatel", input.uzivatel) +
    el("Pracoviste", input.pracoviste) +
    el("ID_Dokladu", input.documentId) +
    el("AutorizacniID", input.authorisationId) +
    el("DatumZruseni", input.cancelledOn) +
    el("DuvodZruseni", input.reason) +
    "</Doklad>";

  const zprava =
    "<Zprava>" +
    el("ID_Zpravy", input.messageId) +
    el("Verze", input.interfaceVersion) +
    el("Odeslano", input.sentAt.toISOString()) +
    el("SW_Klienta", input.swKlienta) +
    "</Zprava>";

  // No Signature: cancellation is not on SÚKL's signed-operations list.
  return buildMessageElement({
    operationElement: "ZruseniPredpisuDotaz",
    namespace: SHARED_ELEMENT_NAMESPACE[input.service],
    body: doklad + zprava,
  });
}

export interface SuklCancelPrescriptionResult {
  ok: boolean;
  documentId: string | null;
  cancelledOn: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  errorAdvice: string | null;
}

export function interpretCancelPrescriptionResponse(input: {
  httpStatus: number;
  body: string;
}): SuklCancelPrescriptionResult {
  const fault = extractFault(input.body);
  if (fault) {
    return {
      ok: false,
      documentId: null,
      cancelledOn: null,
      errorCode: extractElementText(input.body, "Kod") ?? fault.faultCode ?? "SUKL_SOAP_FAULT",
      errorMessage:
        extractElementText(input.body, "Popis") ??
        fault.faultString ??
        "SÚKL rejected the cancellation.",
      errorAdvice: extractElementText(input.body, "Doporuceni"),
    };
  }

  if (input.httpStatus < 200 || input.httpStatus >= 300) {
    return {
      ok: false,
      documentId: null,
      cancelledOn: null,
      errorCode: `HTTP_${input.httpStatus}`,
      errorMessage: `SÚKL returned HTTP ${input.httpStatus}.`,
      errorAdvice: null,
    };
  }

  return {
    ok: true,
    documentId: extractElementText(input.body, "ID_Dokladu"),
    cancelledOn: extractElementText(input.body, "DatumZruseni"),
    errorCode: null,
    errorMessage: null,
    errorAdvice: null,
  };
}
