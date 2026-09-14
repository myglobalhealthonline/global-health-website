import { SHARED_ELEMENT_NAMESPACE } from "./app-ping.js";
import { type SuklService } from "./config.js";
import {
  buildMessageElement,
  el,
  extractAllElementText,
  extractElementText,
  extractFault,
} from "./envelope.js";
import { SuklError } from "./errors.js";

/**
 * Reading an eRecept back: `NacistPredpis` (its content) and `StahnoutPruvodku`
 * (the průvodka PDF the patient takes to a pharmacy).
 *
 * Both operations take the SAME request type, `nacteni_dokladu_dotaz_type`, so
 * they share one builder and differ only in the operation element. Both are
 * read-only and absent from SÚKL's list of operations requiring a qualified
 * signature, so neither is signed.
 *
 * The document is identified by ID_Dokladu (SÚKL's id) or ID_Podani (the
 * ID_Zpravy we sent when creating it). SÚKL require at least one.
 */

export type SuklReadOperationElement = "NacteniPredpisuDotaz" | "StazeniPruvodkyDotaz";

export interface SuklReadDocumentInput {
  service: SuklService;
  operationElement: SuklReadOperationElement;
  /** Fresh id for this message. */
  messageId: string;
  interfaceVersion: string;
  swKlienta: string;
  sentAt: Date;
  uzivatel: string;
  /** 11-digit workplace code. */
  pracoviste: string;
  /** ID_Dokladu, 12–36 characters. */
  documentId?: string;
  /** ID_Podani — the ID_Zpravy of the original create. */
  submissionId?: string;
}

export function buildReadDocumentRequest(input: SuklReadDocumentInput): string {
  const problems: string[] = [];
  if (!input.documentId && !input.submissionId) {
    problems.push("either the SÚKL document id or the submission id is required");
  }
  if (input.documentId && (input.documentId.length < 12 || input.documentId.length > 36)) {
    problems.push("ID_Dokladu is 12 to 36 characters");
  }
  if (!/^\d{11}$/.test(input.pracoviste)) problems.push("Pracoviste must be 11 digits");
  if (problems.length > 0) {
    throw new SuklError(
      "SUKL_SCHEMA_VALIDATION_FAILED",
      "request",
      `The request is not valid: ${problems.join("; ")}.`,
    );
  }

  // Sequence per identifikace_dokladu_type: ID_Podani before ID_Dokladu.
  const doklad =
    "<Doklad><Pristupujici>" +
    el("Uzivatel", input.uzivatel) +
    el("Pracoviste", input.pracoviste) +
    "</Pristupujici><Identifikator>" +
    el("ID_Podani", input.submissionId) +
    el("ID_Dokladu", input.documentId) +
    "</Identifikator></Doklad>";

  const zprava =
    "<Zprava>" +
    el("ID_Zpravy", input.messageId) +
    el("Verze", input.interfaceVersion) +
    el("Odeslano", input.sentAt.toISOString()) +
    el("SW_Klienta", input.swKlienta) +
    "</Zprava>";

  return buildMessageElement({
    operationElement: input.operationElement,
    namespace: SHARED_ELEMENT_NAMESPACE[input.service],
    body: doklad + zprava,
  });
}

interface SuklFaultFields {
  errorCode: string | null;
  errorMessage: string | null;
  errorAdvice: string | null;
}

/** Shared fault/HTTP handling. Null means the response is a success to parse. */
function failureOf(input: { httpStatus: number; body: string }): SuklFaultFields | null {
  const fault = extractFault(input.body);
  if (fault) {
    return {
      errorCode: extractElementText(input.body, "Kod") ?? fault.faultCode ?? "SUKL_SOAP_FAULT",
      errorMessage:
        extractElementText(input.body, "Popis") ?? fault.faultString ?? "SÚKL rejected the request.",
      errorAdvice: extractElementText(input.body, "Doporuceni"),
    };
  }
  if (input.httpStatus < 200 || input.httpStatus >= 300) {
    return {
      errorCode: `HTTP_${input.httpStatus}`,
      errorMessage: `SÚKL returned HTTP ${input.httpStatus}.`,
      errorAdvice: null,
    };
  }
  return null;
}

function blocks(xml: string, localName: string): string[] {
  const re = new RegExp(
    `<(?:\\w+:)?${localName}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${localName}>`,
    "gi",
  );
  return [...xml.matchAll(re)].map((m) => m[1] ?? "");
}

function withoutBlocks(xml: string, localName: string): string {
  const re = new RegExp(
    `<(?:\\w+:)?${localName}(?:\\s[^>]*)?>[\\s\\S]*?</(?:\\w+:)?${localName}>`,
    "gi",
  );
  return xml.replace(re, "");
}

export interface SuklPrescriptionItemView {
  name: string | null;
  quantity: string | null;
  instructions: string | null;
}

export interface SuklPrescriptionView extends SuklFaultFields {
  ok: boolean;
  documentId: string | null;
  issuedOn: string | null;
  validUntil: string | null;
  /** VypisDo — set when the validity has been extended. */
  extendedUntil: string | null;
  /** Stav, e.g. PREDEPSANY, CASTECNE_VYDANY, PLNE_VYDANY. */
  state: string | null;
  createdAt: string | null;
  changedAt: string | null;
  note: string | null;
  patientSurname: string | null;
  patientGivenNames: string | null;
  items: SuklPrescriptionItemView[];
  /** How many dispensings SÚKL have recorded against this eRecept. */
  dispensingCount: number;
}

export function interpretReadPrescriptionResponse(input: {
  httpStatus: number;
  body: string;
}): SuklPrescriptionView {
  const empty = {
    documentId: null,
    issuedOn: null,
    validUntil: null,
    extendedUntil: null,
    state: null,
    createdAt: null,
    changedAt: null,
    note: null,
    patientSurname: null,
    patientGivenNames: null,
    items: [] as SuklPrescriptionItemView[],
    dispensingCount: 0,
  };

  const failure = failureOf(input);
  if (failure) return { ok: false, ...empty, ...failure };

  const items = blocks(input.body, "PLP").map((plp) => ({
    name: extractElementText(plp, "Nazev"),
    quantity: extractElementText(plp, "Mnozstvi"),
    instructions: extractElementText(plp, "Navod"),
  }));
  const dispensings = blocks(input.body, "Vydej");
  const patient = blocks(input.body, "Pacient")[0] ?? "";

  // Items and dispensings carry their own Stav, Pozn, Zmena and Zalozeni, so
  // the document-level values are read with those blocks removed — otherwise a
  // dispensing's state could be reported as the prescription's.
  const topLevel = withoutBlocks(
    withoutBlocks(withoutBlocks(input.body, "PLP"), "Vydej"),
    "Pacient",
  );

  return {
    ok: true,
    documentId: extractElementText(topLevel, "ID_Dokladu"),
    issuedOn: extractElementText(topLevel, "DatumVystaveni"),
    validUntil: extractElementText(topLevel, "PlatnostDo"),
    extendedUntil: extractElementText(topLevel, "VypisDo"),
    state: extractElementText(topLevel, "Stav"),
    createdAt: extractElementText(topLevel, "Zalozeni"),
    changedAt: extractElementText(topLevel, "Zmena"),
    note: extractElementText(topLevel, "Pozn"),
    patientSurname: extractElementText(patient, "Prijmeni"),
    patientGivenNames: extractElementText(patient, "Jmena"),
    items,
    dispensingCount: dispensings.length,
    errorCode: null,
    errorMessage: null,
    errorAdvice: null,
  };
}

export interface SuklPruvodkaResult extends SuklFaultFields {
  ok: boolean;
  /** The PDF bytes, when SÚKL returned a genuine PDF. */
  pdf: Buffer | null;
}

export function interpretPruvodkaResponse(input: {
  httpStatus: number;
  body: string;
}): SuklPruvodkaResult {
  const failure = failureOf(input);
  if (failure) return { ok: false, pdf: null, ...failure };

  // Doklad is base64Binary[]; a prescription has one průvodka.
  const encoded = extractAllElementText(input.body, "Doklad")[0]?.replace(/\s+/g, "") ?? "";
  const pdf = encoded ? Buffer.from(encoded, "base64") : null;

  // Check the bytes rather than trusting the element: serving something that
  // is not a PDF as application/pdf would hand the browser arbitrary content.
  if (!pdf || pdf.subarray(0, 4).toString("latin1") !== "%PDF") {
    return {
      ok: false,
      pdf: null,
      errorCode: "SUKL_DUPLICATE_OR_UNKNOWN_RESULT",
      errorMessage: "SÚKL answered without a průvodka PDF.",
      errorAdvice: null,
    };
  }
  return { ok: true, pdf, errorCode: null, errorMessage: null, errorAdvice: null };
}
