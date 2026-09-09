import { SHARED_ELEMENT_NAMESPACE } from "./app-ping.js";
import { type SuklService } from "./config.js";
import { buildMessageElement, el, extractElementText, extractFault } from "./envelope.js";
import { SuklError } from "./errors.js";
import { signSuklMessage, type SuklSigningKey } from "./signing.js";

/**
 * `ZalozitPredpis` — issue an eRecept.
 *
 * Field-for-field from SÚKL's own CUER documentation, recorded in
 * docs/sukl/PRESCRIPTION_PAYLOAD.md. Nothing here is inferred from the WSDL,
 * which carries no types at all.
 *
 * Two things this file is careful about, because getting either wrong is
 * invisible until SÚKL reject it:
 *
 *  - `ID_Zpravy` is not a correlation id. On a create it becomes the SUBMISSION
 *    identifier and the authorisation id required to amend or cancel the
 *    prescription later, so the caller supplies it and must persist it. The
 *    ping operations generate one per call and throw it away; doing that here
 *    would leave a prescription that can never be changed.
 *  - The message is signed BEFORE it is wrapped in the SOAP envelope, and the
 *    signed bytes are then untouchable. See signing.ts.
 *
 * This creates a real prescription. It is never retried blindly: after an
 * ambiguous failure the record stays PENDING and a human decides, because SÚKL
 * may already hold the document (SCOPE_CONFIRMATION Q10).
 */

/** Requested reimbursement — `uhrada`. */
export type SuklUhrada = "PACIENT" | "UHR1" | "UHR2" | "UHR3";

export interface SuklPrescribedItem {
  /** 1–999. */
  quantity: number;
  /** Da signa, max 80 chars, without the "D.S." prefix. */
  instructions: string;
  reimbursement: SuklUhrada;
  /** Medicine name — the only field SÚKL require to identify the product. */
  medicineName: string;
  /** 7-digit SÚKL code list entry, when known. */
  medicineCode?: string;
  atcCode?: string;
  form?: string;
  strength?: string;
  /** ICD-10-ish diagnosis, max 5 chars. */
  diagnosis?: string;
  doNotSubstitute?: boolean;
  /** The "exclamation mark" — dosing deliberately exceeds the norm. */
  doseExceeded?: boolean;
  /**
   * `ID_LP_Zdroj` — OUR identifier for this prescribed line, exactly 14 digits.
   *
   * REQUIRED by SÚKL, and easy to miss: it is the source system's own id, not
   * anything SÚKL issue, and omitting it is rejected as "the element 'PLP' has
   * incomplete content". Supplied by the caller so it can be tied to a row we
   * keep; issueSuklPrescription generates one when it is not.
   */
  sourceItemId: string;
}

export interface SuklPatientIdentity {
  surname?: string;
  givenNames?: string;
  dateOfBirth?: string;
  /** Insurance number, 9–10 digits, no slash. */
  insuranceNumber?: string;
  /** 3-digit insurer code. */
  insurerCode?: string;
  phone?: string;
  email?: string;
}

export interface SuklPrescriberIdentity {
  /** SÚKL login of the prescribing doctor, verified against External Identities. */
  lekar: string;
  /** IČP, 8 digits. */
  icp: string;
  /** PZS, 11 digits. */
  pzs: string;
  /** REQUIRED by SÚKL. */
  phone: string;
  email?: string;
  /** Odbornost, e.g. "001". */
  specialityCode?: string;
}

export interface SuklCreatePrescriptionInput {
  service: SuklService;
  /** Persist this: it is the authorisation id for amendment and cancellation. */
  submissionId: string;
  interfaceVersion: string;
  swKlienta: string;
  sentAt: Date;
  issuedOn: string;
  validUntil: string;
  patient: SuklPatientIdentity;
  prescriber: SuklPrescriberIdentity;
  items: SuklPrescribedItem[];
  note?: string;
  urgent?: boolean;
  key: SuklSigningKey;
}

function patientBlock(p: SuklPatientIdentity): string {
  const jmeno =
    p.surname || p.givenNames
      ? "<Jmeno>" + el("Prijmeni", p.surname) + el("Jmena", p.givenNames) + "</Jmeno>"
      : "";
  const totoznost = "<Totoznost>" + jmeno + el("DatumNarozeni", p.dateOfBirth) + "</Totoznost>";
  return (
    "<Pacient>" +
    totoznost +
    el("CP", p.insuranceNumber) +
    el("ZP", p.insurerCode) +
    el("Telefon", p.phone) +
    el("Email", p.email) +
    "</Pacient>"
  );
}

function prescriberBlock(d: SuklPrescriberIdentity): string {
  return (
    "<Predepisujici>" +
    el("Lekar", d.lekar) +
    el("ICP", d.icp) +
    el("PZS", d.pzs) +
    el("Telefon", d.phone) +
    el("Email", d.email) +
    el("Odbornost", d.specialityCode) +
    "</Predepisujici>"
  );
}

function itemBlock(item: SuklPrescribedItem): string {
  // Exactly one of HVLPReg / HVLPNereg / IPLP / INN identifies the product; we
  // send the registered form, where only Nazev is mandatory.
  const hvlp =
    "<HVLPReg>" +
    el("Kod", item.medicineCode) +
    el("ATC", item.atcCode) +
    el("Nazev", item.medicineName) +
    el("Forma", item.form) +
    el("Sila", item.strength) +
    "</HVLPReg>";

  return (
    "<PLP>" +
    el("Mnozstvi", String(item.quantity)) +
    el("Navod", item.instructions) +
    el("Diagnoza", item.diagnosis) +
    el("Uhrada", item.reimbursement) +
    hvlp +
    (item.doNotSubstitute ? "<Nezamenovat>true</Nezamenovat>" : "") +
    (item.doseExceeded ? "<Prekroceni>true</Prekroceni>" : "") +
    // Last in the sequence, and mandatory.
    el("ID_LP_Zdroj", item.sourceItemId) +
    "</PLP>"
  );
}

/**
 * Validates what SÚKL's schema constrains, before a request is built.
 *
 * Rejecting here rather than at SÚKL matters: a rejected create is an ambiguous
 * outcome that has to be investigated by hand, whereas a local failure is free.
 */
export function assertCreatePrescriptionValid(input: SuklCreatePrescriptionInput): void {
  const problems: string[] = [];
  if (!/^\d{8}$/.test(input.prescriber.icp)) problems.push("ICP must be 8 digits");
  if (!/^\d{11}$/.test(input.prescriber.pzs)) problems.push("PZS must be 11 digits");
  if (!input.prescriber.phone.trim()) problems.push("the prescriber's phone is required");
  if (input.prescriber.lekar.length > 36) problems.push("Lekar is at most 36 characters");
  if (input.items.length === 0) problems.push("at least one item is required");

  for (const [i, item] of input.items.entries()) {
    const at = `item ${i + 1}`;
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999) {
      problems.push(`${at}: quantity must be a whole number between 1 and 999`);
    }
    if (!item.instructions.trim()) problems.push(`${at}: instructions (Navod) are required`);
    if (item.instructions.length > 80) problems.push(`${at}: instructions exceed 80 characters`);
    if (!item.medicineName.trim()) problems.push(`${at}: a medicine name is required`);
    if (item.medicineCode && !/^\d{7}$/.test(item.medicineCode)) {
      problems.push(`${at}: the SÚKL medicine code is 7 digits`);
    }
    if (!/^\d{14}$/.test(item.sourceItemId)) {
      problems.push(`${at}: ID_LP_Zdroj must be exactly 14 digits`);
    }
  }

  if (problems.length > 0) {
    throw new SuklError(
      "SUKL_SCHEMA_VALIDATION_FAILED",
      "request",
      `The prescription is not valid: ${problems.join("; ")}.`,
    );
  }
}

export function buildCreatePrescriptionRequest(input: SuklCreatePrescriptionInput): string {
  assertCreatePrescriptionValid(input);

  const doklad =
    "<Doklad>" +
    el("DatumVystaveni", input.issuedOn) +
    el("PlatnostDo", input.validUntil) +
    (input.urgent ? "<Akutni>true</Akutni>" : "") +
    patientBlock(input.patient) +
    prescriberBlock(input.prescriber) +
    input.items.map(itemBlock).join("") +
    el("Pozn", input.note) +
    // PREDEPSANY is the state a newly issued eRecept carries.
    el("Stav", "PREDEPSANY") +
    "</Doklad>";

  const zprava =
    "<Zprava>" +
    el("ID_Zpravy", input.submissionId) +
    el("Verze", input.interfaceVersion) +
    el("Odeslano", input.sentAt.toISOString()) +
    el("SW_Klienta", input.swKlienta) +
    "</Zprava>";

  const message = buildMessageElement({
    operationElement: "ZalozeniPredpisuDotaz",
    namespace: SHARED_ELEMENT_NAMESPACE[input.service],
    body: doklad + zprava,
  });

  // Signed as a bare message; the caller wraps it. Never enveloped first.
  return signSuklMessage(message, input.key);
}

export interface SuklCreatePrescriptionResult {
  ok: boolean;
  /** ID_Dokladu — SÚKL's identifier for the issued eRecept. */
  documentId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  /** SÚKL's recommended remedy, when they supply one. */
  errorAdvice: string | null;
}

export function interpretCreatePrescriptionResponse(input: {
  httpStatus: number;
  body: string;
}): SuklCreatePrescriptionResult {
  const fault = extractFault(input.body);
  if (fault) {
    return {
      ok: false,
      documentId: null,
      errorCode: extractElementText(input.body, "Kod") ?? fault.faultCode ?? "SUKL_SOAP_FAULT",
      errorMessage:
        extractElementText(input.body, "Popis") ??
        fault.faultString ??
        "SÚKL rejected the prescription.",
      // chyba_type carries Doporuceni — a recommended fix we should not discard.
      errorAdvice: extractElementText(input.body, "Doporuceni"),
    };
  }

  if (input.httpStatus < 200 || input.httpStatus >= 300) {
    return {
      ok: false,
      documentId: null,
      errorCode: `HTTP_${input.httpStatus}`,
      errorMessage: `SÚKL returned HTTP ${input.httpStatus}.`,
      errorAdvice: null,
    };
  }

  const documentId = extractElementText(input.body, "ID_Dokladu");
  if (!documentId) {
    // A 2xx with no identifier is the ambiguous case: SÚKL may hold the
    // prescription. Reported as a failure, never retried automatically.
    return {
      ok: false,
      documentId: null,
      errorCode: "SUKL_DUPLICATE_OR_UNKNOWN_RESULT",
      errorMessage:
        "SÚKL accepted the request but returned no ID_Dokladu. The prescription may or may " +
        "not exist — check with SeznamPredpisu before resending.",
      errorAdvice: null,
    };
  }

  return { ok: true, documentId, errorCode: null, errorMessage: null, errorAdvice: null };
}
