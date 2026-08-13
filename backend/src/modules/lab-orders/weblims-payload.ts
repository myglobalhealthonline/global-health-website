import { env } from "../../config/env.js";
import { splitPatientName } from "../automation/pre-payment-email-template.js";
import type {
  WeblimsPatientParams,
  WeblimsPriority,
  WeblimsRequestParams,
} from "../../lib/weblims/client.js";

/**
 * Pure translation from our patient record to Synlab's
 * `ApiRemoteRequestParams`. Kept free of Prisma and fetch so the field-mapping
 * rules — which are where this integration is most likely to go wrong — are
 * unit-testable on plain objects.
 *
 * See docs/guides/synlab-integration-questions.md for the questions that still
 * govern this mapping (C1, C4, C5, B3, B4).
 */

export class LabPatientIdentifierMissingError extends Error {
  constructor() {
    super(
      "This patient has no Czech birth number (rodné číslo) and no insurance policy number on file. " +
        "Synlab needs one of the two to identify the patient — add it to the patient profile first.",
    );
    this.name = "LabPatientIdentifierMissingError";
  }
}

export class LabPatientDataIncompleteError extends Error {
  constructor(missing: string[]) {
    super(`Synlab requires ${missing.join(" and ")} for this patient — complete the profile first.`);
    this.name = "LabPatientDataIncompleteError";
  }
}

/** The decrypted subset of PatientProfile the mapping needs. */
export interface LabPatientSource {
  fullName: string | null;
  dateOfBirth: Date | null;
  /** DECRYPTED rodné číslo. In Czechia `nationalIdNumber` holds the RČ. */
  nationalIdNumber: string | null;
  /** DECRYPTED policy number — the fallback identifier for patients with no RČ. */
  insurancePolicyNumber: string | null;
}

export interface LabPatientIdentifier {
  patientId: string;
  /**
   * True when `patientId` is an insurance/travel policy number rather than a
   * Czech birth number.
   */
  isTravel: boolean;
}

/**
 * Which identifier goes into `patientId`.
 *
 * A Czech birth number is the documented case. The travel-insurance branch is
 * PROVISIONAL: their `isTravel` flag exists precisely for identifiers that are
 * not a rodné číslo, but they have not yet told us what value belongs in
 * `patientId` in that case (question C1). It matters because a large part of our
 * Czech patient base are expatriates and visitors with no RČ at all.
 *
 * Until C1 is answered this is the best-supported reading of their schema; if
 * their answer differs, this one function changes.
 */
export function resolvePatientIdentifier(source: LabPatientSource): LabPatientIdentifier {
  const birthNumber = source.nationalIdNumber?.trim();
  if (birthNumber) return { patientId: birthNumber, isTravel: false };

  const policy = source.insurancePolicyNumber?.trim();
  if (policy) return { patientId: policy, isTravel: true };

  throw new LabPatientIdentifierMissingError();
}

/**
 * Build the `patient` object.
 *
 * Required-field set follows the OpenAPI (`patientId`, `surname`, `birthDate`),
 * not the PDF (`patientId`, `sex`) — see question C4. Validating here rather
 * than at their endpoint turns a 400 with a Czech error body into a sentence an
 * admin can act on.
 *
 * `sex` is always sent as "U": we do not record patient sex anywhere in the
 * platform. Their OpenAPI does not mark it required, which supports this;
 * the operator can set it in the WebLIMS form if the lab needs it.
 */
export function buildWeblimsPatientParams(source: LabPatientSource): WeblimsPatientParams {
  const missing: string[] = [];
  if (!source.fullName?.trim()) missing.push("a full name");
  if (!source.dateOfBirth) missing.push("a date of birth");
  if (missing.length > 0) throw new LabPatientDataIncompleteError(missing);

  const { patientId, isTravel } = resolvePatientIdentifier(source);
  const { firstName, lastName } = splitPatientName(source.fullName!.trim());

  // Single-word names produce an empty lastName, and `surname` is required.
  // Fall back to the one token we have rather than sending an empty string.
  const surname = lastName.trim() || firstName.trim();
  const name = lastName.trim() ? firstName.trim() : "";

  return {
    patientId,
    isTravel,
    ...(name ? { name } : {}),
    surname,
    // `format: date-time` in their schema, so send the full ISO instant.
    birthDate: source.dateOfBirth!.toISOString(),
    sex: "U",
    ...(env.WEBLIMS_SELFPAY_INSURANCE_CODE?.trim()
      ? { insurance: env.WEBLIMS_SELFPAY_INSURANCE_CODE.trim() }
      : {}),
  };
}

/**
 * Build the `request` object from our env-held FOL identity.
 *
 * Every field is optional and omitted when unset, so a partially-registered
 * workplace still produces a valid requisition — WebLIMS then falls back to
 * whatever the logged-in operator is bound to.
 *
 * `doctorCode` intentionally comes from env, not from our `Doctor` record: our
 * prescribing doctors are not all registered in the Czech KRZP, so until
 * question B3 is answered every requisition is issued under one clinic-level
 * doctor.
 */
export function buildWeblimsRequestParams(input: {
  collectionDate?: Date | null;
  priority?: string | null;
}): WeblimsRequestParams {
  const priority = normalizePriority(input.priority);

  return {
    ...(input.collectionDate ? { collectionDate: input.collectionDate.toISOString() } : {}),
    ...(env.WEBLIMS_WARD_CODE?.trim() ? { wardCode: env.WEBLIMS_WARD_CODE.trim() } : {}),
    ...(env.WEBLIMS_WARD_ICP?.trim() ? { wardICP: env.WEBLIMS_WARD_ICP.trim() } : {}),
    ...(env.WEBLIMS_WARD_NODE?.trim() ? { wardNode: env.WEBLIMS_WARD_NODE.trim() } : {}),
    ...(env.WEBLIMS_WARD_SPECIALITY?.trim()
      ? { wardSpeciality: env.WEBLIMS_WARD_SPECIALITY.trim() }
      : {}),
    ...(env.WEBLIMS_DEFAULT_DOCTOR_CODE?.trim()
      ? { doctorCode: env.WEBLIMS_DEFAULT_DOCTOR_CODE.trim() }
      : {}),
    priority,
  };
}

const PRIORITIES: readonly WeblimsPriority[] = ["Rutina", "Statim", "Vital"];

/** Anything unrecognised degrades to routine — never to a Vital requisition. */
export function normalizePriority(value: string | null | undefined): WeblimsPriority {
  const match = PRIORITIES.find((p) => p.toLowerCase() === value?.trim().toLowerCase());
  return match ?? "Rutina";
}
