import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { PatientAlertType } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  PatientProfileEmailConflictError,
  PatientProfileNotFoundError,
  PricingPlanCountryMismatchError,
  serializeProfile,
  writePatientProfile,
} from "../modules/patient-profile/patient-profile.service.js";
import {
  AlertNotFoundError,
  AlertRemovalRequiresNoteError,
  listPatientAlertLog,
  recordAlertChanges,
  removePatientAlert,
} from "../modules/patient-profile/patient-alert-log.service.js";
import { recordCriticalAudit } from "../modules/audit/audit.service.js";
import { resolveAuditActor } from "../utils/request-auth.js";
import { guardMedicalRead, MedicalAccessDeniedError, medicalAccessDeniedResponse } from "../utils/guard-medical-read.js";
import {
  getVerificationSummary,
  prescriptionGradeVerification,
  requestVerification,
  reviewVerification,
  faceMatchAvailable,
  VerificationEventNotFoundError,
  VerificationAlreadyReviewedError,
} from "../modules/identity-verification/identity-verification.service.js";
import { notifyPatientVerificationRequested } from "../modules/identity-verification/notify-identity-verification.service.js";
import { getObject, streamToNodeReadable } from "../services/object-storage.js";
import {
  appointmentIdsBookedForSomeoneElse,
  resolvePatientContextByPatientEmail,
} from "../modules/patient-profile/appointment-patient-link.js";

const stringField = (max: number) =>
  z.string().trim().max(max).nullable().optional();

// Government-ID numbers are intentionally withheld from the doctor portal
// (GDPR plan): doctors see idVerificationStatus only, never the numbers.
// The deliberate carve-outs all live outside this route, on the appointment
// workspace card, and are Portugal-only: Número de Utente (markets with
// `BookingSetting.collectUtenteNumber`), NIF and Cartão de Cidadão — the
// identifiers a PT prescription/certificate has to carry. Each is logged as
// a SENSITIVE_PROFILE read there. See consultations.route.ts. Passport is
// never disclosed to doctors, and no ID is disclosed outside PT.
function stripIdentityFields<T extends Record<string, unknown> | null>(profile: T): T {
  if (!profile) return profile;
  const {
    nationalIdNumber: _nationalIdNumber,
    taxIdNumber: _taxIdNumber,
    passportNumber: _passportNumber,
    utenteNumber: _utenteNumber,
    insurancePolicyNumber: _insurancePolicyNumber,
    ...rest
  } = profile as Record<string, unknown>;
  return rest as T;
}

/**
 * Doctor-side patch — accepts the full clinical + administrative
 * surface including alerts, which patient-self endpoints reject.
 */
const patchProfileSchema = z
  .object({
    fullName: stringField(200),
    // phone deliberately excluded — the doctor UI never sends it, and a
    // verified patient's phone can only be changed by the patient or admin
    // (see applyPatientProfileUpdate's actorRole guard).
    dateOfBirth: z.string().datetime().nullable().optional(),
    weightKg: z.number().positive().max(500).nullable().optional(),
    heightM: z.number().positive().max(3).nullable().optional(),
    bmi: z.number().positive().max(100).nullable().optional(),
    bloodType: stringField(8),
    allergies: z.array(z.string().trim().max(200)).max(50).optional(),
    chronicDiseases: z.array(z.string().trim().max(200)).max(50).optional(),
    familyHistory: z.array(z.string().trim().max(200)).max(50).optional(),
    socialHabits: z.array(z.string().trim().max(200)).max(50).optional(),
    surgeries: z.array(z.string().trim().max(200)).max(50).optional(),
    usualMedication: z.array(z.string().trim().max(200)).max(50).optional(),
    bloodPressureSystolic: z.number().int().positive().max(400).nullable().optional(),
    bloodPressureDiastolic: z.number().int().positive().max(300).nullable().optional(),
    nationalIdNumber: stringField(64),
    taxIdNumber: stringField(64),
    passportNumber: stringField(64),
    // Doctor may write the Número de Utente for a PT patient who booked
    // without one — the appointment card exposes it as an editable row for
    // markets with `collectUtenteNumber`. PHI-encrypted on write like the
    // other government IDs (PHI_ENCRYPTED_FIELDS). Read stays gated + logged
    // in consultations.route.ts; it is stripped from this route's response.
    utenteNumber: stringField(64),
    addressLine1: stringField(200),
    addressLine2: stringField(200),
    addressCity: stringField(120),
    addressState: stringField(120),
    addressPostalCode: stringField(32),
    addressCountryCode: stringField(8),
    preferredPharmacy: stringField(200),
    statusAlert: stringField(500),
    clinicAlert: stringField(500),
    pricingPlanId: stringField(64),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field" });

/** `:type` path segment → PatientAlertType. */
const alertTypeParam = z
  .enum(["status", "clinic"])
  .transform((value): PatientAlertType => (value === "status" ? "STATUS" : "CLINIC"));

/** Note length mirrors the alert fields themselves (500). The 3-char floor
 *  keeps "x" from passing as a rationale. */
const removeAlertSchema = z.object({
  note: z.string().trim().min(3).max(500),
});

/**
 * The chart sitting at `:email` — but only when it is the same patient the
 * evidence says this doctor treated, and identified by an id that no later
 * lookup can re-point.
 *
 * Every endpoint below used to address its patient by ADDRESS all the way down:
 * the profile PATCH and the alert removal called services that took an email,
 * so identity was checked against one row and the write landed on whatever row
 * held that address at persistence time. Three different situations collapsed
 * into the same "no profile here yet, go ahead and upsert" answer — a genuinely
 * new patient, a linked patient whose profile email has been TOMBSTONED by
 * anonymization, and an unresolvable dependent booking — and the upsert then
 * created a second chart at the released address for the first two.
 *
 * So: resolve once, into an immutable id, and hand that id to the write.
 *
 * `guardMedicalRead` afterwards is not a substitute for any of this. It has
 * allow branches driven by the PATIENT's own consent (country-clinic,
 * global-network, a live cross-country grant) that never consult the treatment
 * relationship, so a wrongly identified patient with an ordinary broad consent
 * is authorized — for a read of their alert history, and for a WRITE onto their
 * chart. Identity has to be settled first.
 *
 * The three outcomes are genuinely different states and are kept apart:
 *
 * - `existing` — one patient, proven, with the appointment that proves it. The
 *   caller guards against `profile.id` and writes to `profile.id`.
 * - `absent` — nothing resolved AND nobody holds the address. Only here may a
 *   first chart be created, and only after `firstChartEligible` proves the
 *   booking was the patient's own.
 * - `{ ok: false }` — nothing resolved but somebody DOES hold the address: it
 *   belongs to a person this doctor cannot be shown to treat (or the evidence
 *   names more than one patient, which is the same refusal). Touch nothing.
 */
type ChartTarget =
  | {
      ok: true;
      kind: "existing";
      profile: NonNullable<Awaited<ReturnType<typeof prisma.patientProfile.findUnique>>>;
      appointmentId: string | null;
    }
  | { ok: true; kind: "absent" }
  | { ok: false };

async function resolveChartTarget(email: string, doctorId: string): Promise<ChartTarget> {
  const context = await resolvePatientContextByPatientEmail(email, { doctorId });
  if (!context) {
    // Nothing this doctor holds identifies a patient here. Who owns the
    // address decides which of the two remaining states this is — and it is
    // consulted ONLY here, never to second-guess a patient the evidence
    // already settled. A retained patient whose released address has since
    // been taken by a stranger still resolves to their own chart above; that
    // is the access anonymization is supposed to preserve, and comparing it
    // against the current holder would take it away again.
    const holder = await prisma.patientProfile.findUnique({
      where: { email },
      select: { id: true },
    });
    return holder ? { ok: false } : { ok: true, kind: "absent" };
  }
  const profile = await prisma.patientProfile.findUnique({
    where: { id: context.patientProfileId },
  });
  if (!profile) return { ok: false };
  return {
    ok: true,
    kind: "existing",
    profile,
    appointmentId: context.appointmentId,
  };
}

/**
 * May a PATCH create the FIRST chart at this address?
 *
 * Only when the booking behind it is provably the patient's OWN. `absent`
 * already establishes that nobody holds the address and nothing resolved, but
 * "nothing resolved" also covers two cases a create would get wrong: a
 * dependent booking wearing the purchaser's address, which would open a chart
 * at an address the payer merely paid from; and an address whose evidence names
 * two different patients, where creating a third row is the worst answer of the
 * three.
 *
 * Conditions, all required:
 *   1. this doctor has at least one appointment at the address;
 *   2. none of them carries a durable patient link — a link means a patient
 *      already exists behind this address, so an unresolved read is ambiguity,
 *      not a blank slate (this is what keeps a TOMBSTONED linked patient from
 *      getting a duplicate chart at the address they released);
 *   3. no order line marks any of them as booked for a dependent or for
 *      someone else;
 *   4. at most one account appears on them, and that account holds no chart of
 *      its own — an account whose chart lives at another address would be
 *      duplicated by creating a second one here.
 *
 * A guest row (no account at all) passes: nobody is being misattributed,
 * because there is no account to misattribute to, and the new chart is built
 * from the appointment's own name and phone.
 */
async function firstChartEligible(
  email: string,
  doctorId: string,
): Promise<{ ok: true; userId: string | null } | { ok: false }> {
  const rows = await prisma.appointment.findMany({
    where: { doctorId, email: { equals: email, mode: "insensitive" } },
    select: { id: true, userId: true, patientProfileId: true },
  });
  if (rows.length === 0) return { ok: false };
  if (rows.some((r) => r.patientProfileId)) return { ok: false };
  const bookedForOthers = await appointmentIdsBookedForSomeoneElse(
    prisma,
    rows.map((r) => r.id),
  );
  if (rows.some((r) => bookedForOthers.has(r.id))) return { ok: false };
  const accountIds = [
    ...new Set(rows.map((r) => r.userId).filter((id): id is string => Boolean(id))),
  ];
  if (accountIds.length === 0) return { ok: true, userId: null };
  if (accountIds.length > 1) return { ok: false };
  const existing = await prisma.patientProfile.findUnique({
    where: { userId: accountIds[0] },
    select: { id: true },
  });
  if (existing) return { ok: false };
  // The account is returned, not just approved: the new chart has to CARRY it,
  // or nothing corroborates the chart afterwards and the doctor who just
  // created the patient can never resolve them again.
  return { ok: true, userId: accountIds[0]! };
}

/**
 * An anonymized chart is a RETAINED clinical record: its personal data was
 * erased on a legal instruction and its address was released. Its treating
 * doctor may still read it — that is the whole point of the durable link — but
 * writing personal or clinical fields back onto it would undo the erasure, and
 * creating a fresh chart at the address it gave up is the duplicate this file
 * exists to prevent. 409, so the caller can tell "not permitted here" from
 * "no such patient".
 */
const ANONYMIZED_WRITE_MESSAGE =
  "This record has been anonymized and can no longer be edited";

const doctorPatientProfileRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { email: string } }>(
    "/api/doctor/patients/:email/profile",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      let email: string;
      try {
        email = decodeURIComponent(request.params.email).trim().toLowerCase();
      } catch {
        return reply.status(400).send(errorResponse("Invalid email param"));
      }
      try {
        // Resolved through the durable appointment→patient link, scoped to this
        // doctor's own appointments, so an anonymized patient's retained record
        // still reaches its doctor of record after `PatientProfile.email` has
        // been tombstoned. Unidentified is 404, not an empty 200: the resolver
        // is null both for a booking with no chart yet and for one whose patient
        // cannot be proven, and an empty 200 read as "this patient has a blank
        // chart" in the second case. It also used to be the branch that answered
        // with whoever holds the address today — so the guard ran, denied, and
        // wrote a MedicalAccessLog row attributed to the WRONG patient. Nothing
        // is guarded on that path now because there is nobody to guard against;
        // the request is simply refused.
        const target = await resolveChartTarget(email, auth.doctorId);
        if (!target.ok || target.kind !== "existing") {
          return reply.status(404).send(errorResponse("Patient profile not found"));
        }
        const profile = target.profile;
        // Central guard: authorizes + logs (MedicalAccessLog) + alerts as a
        // side effect. In shadow mode it never blocks; in enforce mode a
        // denied decision throws MedicalAccessDeniedError → 403. The appointment
        // it logs is the one that PROVED this patient, not the newest row at the
        // address — at a reused address those are two different people.
        try {
          await guardMedicalRead(
            request,
            { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
            {
              patientProfileId: profile.id,
              resourceType: "SENSITIVE_PROFILE",
              accessAction: "VIEWED",
              relatedAppointmentId: target.appointmentId,
            },
          );
        } catch (guardError) {
          if (guardError instanceof MedicalAccessDeniedError) {
            return reply.status(403).send(medicalAccessDeniedResponse(guardError));
          }
          throw guardError;
        }
        return okResponse({
          profile: stripIdentityFields(serializeProfile(profile, { includeAlerts: true })),
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load profile"));
      }
    },
  );

  app.patch<{ Params: { email: string } }>(
    "/api/doctor/patients/:email/profile",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      let email: string;
      try {
        email = decodeURIComponent(request.params.email).trim().toLowerCase();
      } catch {
        return reply.status(400).send(errorResponse("Invalid email param"));
      }
      const body = patchProfileSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid profile", body.error.flatten()));
      }
      // Identity before authorization: refuse outright when the evidence does
      // not name exactly one patient this doctor treated, because everything
      // below is a WRITE and the guard's consent-driven allow branches would
      // happily authorize one onto a stranger's chart.
      const target = await resolveChartTarget(email, auth.doctorId);
      if (!target.ok) {
        return reply.status(404).send(errorResponse("Patient profile not found"));
      }

      // Central guard: authorize the profile edit before writing; logs the
      // UPDATED action (MedicalAccessLog) as a side effect. Skipped only in the
      // `absent` branch, where no record exists yet and there is nothing to
      // authorize against — and where `firstChartEligible` below, not the
      // guard, is what keeps the create honest.
      if (target.kind === "existing") {
        if (target.profile.anonymizedAt) {
          return reply.status(409).send(errorResponse(ANONYMIZED_WRITE_MESSAGE));
        }
        try {
          await guardMedicalRead(
            request,
            { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
            {
              patientProfileId: target.profile.id,
              resourceType: "SENSITIVE_PROFILE",
              accessAction: "UPDATED",
              relatedAppointmentId: target.appointmentId,
            },
          );
        } catch (guardError) {
          if (guardError instanceof MedicalAccessDeniedError) {
            return reply
              .status(403)
              .send(medicalAccessDeniedResponse(guardError));
          }
          throw guardError;
        }
      }

      try {
        const { dateOfBirth, ...rest } = body.data;
        const fields = {
          ...rest,
          ...(dateOfBirth !== undefined
            ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }
            : {}),
        };
        let outcome;
        if (target.kind === "existing") {
          // The id the guard just authorized, carried through to persistence.
          // Re-deriving the row from `email` here is what created a second
          // chart whenever the address had moved on since it was resolved.
          outcome = await writePatientProfile(
            { kind: "id", patientProfileId: target.profile.id },
            fields,
            {
              actor: { userId: auth.userId, role: auth.role },
              ipAddress: request.ip,
            },
          );
        } else {
          const eligible = await firstChartEligible(email, auth.doctorId);
          if (!eligible.ok) {
            return reply.status(404).send(errorResponse("Patient profile not found"));
          }
          const appt = await prisma.appointment.findFirst({
            where: { doctorId: auth.doctorId, email: { equals: email, mode: "insensitive" } },
            select: { fullName: true, phone: true },
          });
          // CREATE, never upsert: if the address was claimed between the
          // eligibility proof and the insert, the unique constraint has to
          // fail the request rather than quietly update whoever just took it.
          // The proven account rides along so the new chart is linked to its
          // appointments and stays resolvable on the next request.
          outcome = await writePatientProfile(
            { kind: "create", email, userId: eligible.userId },
            fields,
            {
              fallbackFullName: appt?.fullName ?? null,
              fallbackPhone: appt?.phone ?? null,
              actor: { userId: auth.userId, role: auth.role },
              ipAddress: request.ip,
            },
          );
        }
        const { profile, alertChanges, alertPrevious } = outcome;
        if ((alertChanges.statusAlert || alertChanges.clinicAlert) && profile) {
          // Chart-visible history (removals get their own row, written by the
          // remove endpoint below with its mandatory note).
          void recordAlertChanges({
            patientProfileId: profile.id,
            actor: { userId: auth.userId, role: auth.role, name: auth.fullName },
            before: alertPrevious,
            after: {
              statusAlert: profile.statusAlert,
              clinicAlert: profile.clinicAlert,
            },
          });
        }
        if (alertChanges.statusAlert || alertChanges.clinicAlert) {
          // S-008: resolveOptionalAuthUser only resolves PATIENT/ADMIN
          // sessions and returns null for DOCTOR, which previously logged
          // this PHI-adjacent alert change with a null actor whenever a
          // doctor made it. resolveAuditActor reads the real (id, role)
          // for every authenticated role.
          const actor = resolveAuditActor(request);
          await recordCriticalAudit({
            actorUserId: actor?.userId ?? null,
            actorRole: actor?.role ?? "DOCTOR",
            action: "PATIENT_ALERT_UPDATED",
            entityType: "PatientProfile",
            // The chart that was actually written, never the address that was
            // typed — at a reused address the two name different people, and an
            // audit row keyed on the address records the wrong one.
            entityId: profile?.id ?? "unknown",
            // Which alerts changed, never what they now say. The alert wording
            // is clinical free-text about a named patient, and `AuditLog` is
            // read and CSV-exported through /api/admin/audit-log with no
            // per-record consent or country-folder check — so a value here is
            // the same disclosure `MedicalAccessLog` exists to gate, written
            // to the one log that does not gate it. The text itself lives on
            // the chart-scoped `PatientAlertLog`, which is where the sibling
            // removal event already keeps it.
            metadata: {
              patientProfileId: profile?.id ?? null,
              changes: alertChanges,
            },
            request,
          });
        }
        return okResponse({
          profile: stripIdentityFields(serializeProfile(profile, { includeAlerts: true })),
        });
      } catch (error) {
        if (error instanceof AlertRemovalRequiresNoteError) {
          return reply.status(400).send(errorResponse(error.message));
        }
        if (error instanceof PricingPlanCountryMismatchError) {
          return reply.status(400).send(errorResponse(error.message));
        }
        // The resolved chart went away, or the address was claimed under us.
        // Either way the patient this request was authorized for is no longer
        // the one a retry would reach — refuse rather than land somewhere else.
        if (error instanceof PatientProfileNotFoundError) {
          return reply.status(404).send(errorResponse("Patient profile not found"));
        }
        if (error instanceof PatientProfileEmailConflictError) {
          return reply.status(409).send(errorResponse(error.message));
        }
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not update profile"));
      }
    },
  );

  // ─── Identity verification (Ireland controlled medications) ───────────────
  //
  // Note the asymmetry with the rest of this file: `stripIdentityFields`
  // withholds government-ID NUMBERS from doctors, and that still holds — the
  // endpoints below never disclose one. What they do disclose is the ID
  // PHOTOGRAPH and the selfie, because comparing two faces is the entire task
  // the doctor is being asked to perform. Every such read is guarded and
  // logged as a SELFIE_IMAGE / ID_DOC access.

  /**
   * Resolve the patient and confirm this doctor actually treats them.
   * Returns the profile id and the appointment that PROVES it, or a
   * reply-ready failure.
   *
   * The two used to be derived separately: the appointment was "this doctor's
   * newest row at this address" and the patient came from resolving the address
   * across every matching row. At a reused address those describe two different
   * people, so a `MedicalAccessLog` row could name patient A's chart alongside
   * patient B's consultation, and the verification request below inherited the
   * same incoherence. One resolution now returns both, and the appointment it
   * returns always resolves to the patient it returns.
   */
  async function resolveOwnPatient(
    request: { params: { email: string } },
    doctorId: string,
  ): Promise<
    | {
        ok: true;
        profileId: string;
        appointmentId: string | null;
        /** Set when the resolved chart is a RETAINED, erased record. Reads
         *  below still serve it — that is the access the durable link exists to
         *  preserve — but the two endpoints that MUTATE verification state must
         *  refuse, for the same reason the profile PATCH does. */
        anonymizedAt: Date | null;
      }
    | { ok: false; status: 400 | 404; message: string }
  > {
    let email: string;
    try {
      email = decodeURIComponent(request.params.email).trim().toLowerCase();
    } catch {
      return { ok: false, status: 400, message: "Invalid email param" };
    }
    // Doctor-scoped, so every candidate is already one of this doctor's own
    // appointments — the treatment check and the identity resolution are the
    // same query. Null (never a guess) when the address is unknown or the
    // evidence names more than one patient.
    const context = await resolvePatientContextByPatientEmail(email, { doctorId });
    if (!context) return { ok: false, status: 404, message: "Patient not found" };
    const profile = await prisma.patientProfile.findUnique({
      where: { id: context.patientProfileId },
      select: { anonymizedAt: true },
    });
    if (!profile) return { ok: false, status: 404, message: "Patient profile not found" };

    return {
      ok: true,
      profileId: context.patientProfileId,
      appointmentId: context.appointmentId,
      anonymizedAt: profile.anonymizedAt,
    };
  }

  app.get<{ Params: { email: string } }>(
    "/api/doctor/patients/:email/identity-verification",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const found = await resolveOwnPatient(request, auth.doctorId);
      if (!found.ok) return reply.status(found.status).send(errorResponse(found.message));

      // The summary is PHI — verification status, review notes, the face-match
      // score and the reviewing role. `resolveOwnPatient` only proves this
      // doctor has an appointment at this address; the confidentiality
      // agreement, 2FA and the patient's consent are the guard's business, and
      // this route was reading verification state without asking it. Guarded
      // before the first service read, and mapped to 403 exactly like the
      // image route below.
      try {
        await guardMedicalRead(
          request,
          { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
          {
            patientProfileId: found.profileId,
            resourceType: "ID_DOC",
            accessAction: "VIEWED",
            relatedAppointmentId: found.appointmentId,
          },
        );
      } catch (guardError) {
        if (guardError instanceof MedicalAccessDeniedError) {
          return reply.status(403).send(medicalAccessDeniedResponse(guardError));
        }
        throw guardError;
      }

      try {
        const summary = await getVerificationSummary(found.profileId);
        if (!summary) return reply.status(404).send(errorResponse("Patient profile not found"));

        // Same rule the document generator uses, so the badge the doctor sees
        // and the marking the PDF prints can never disagree.
        const prescriptionGrade = await prescriptionGradeVerification(found.profileId);

        return okResponse({
          identityVerification: {
            verifiedForPrescription: prescriptionGrade !== null,
            status: summary.status,
            verifiedAt: summary.verifiedAt,
            hasIdDocument: summary.hasIdDocument,
            idDocumentRenderAs: summary.idDocumentRenderAs,
            hasSelfie: summary.hasSelfie,
            selfieUploadedAt: summary.selfieUploadedAt,
            requestedAt: summary.requestedAt,
            requestedByDoctorId: summary.requestedByDoctorId,
            automatedCheckAvailable: faceMatchAvailable(),
            // The score is shown to the reviewer — it is the assist they are
            // meant to weigh. Awaiting review only when the cycle is still open.
            latestEvent: summary.latestEvent,
            // Submitted, not merely started. A patient part-way through
            // swapping a wrong photo is not waiting on the doctor, and must
            // not appear in the queue as though they were.
            awaitingReview:
              summary.submitted &&
              summary.latestEvent != null &&
              summary.latestEvent.reviewedAt == null,
          },
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load identity verification"));
      }
    },
  );

  /**
   * Stream the ID photo or the selfie so the doctor can compare the two faces.
   * Fetched on demand (never bundled into the profile payload) so opening a
   * patient's chart does not silently pull their biometric images.
   */
  app.get<{ Params: { email: string }; Querystring: { type?: string } }>(
    "/api/doctor/patients/:email/identity-verification/image",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const found = await resolveOwnPatient(request, auth.doctorId);
      if (!found.ok) return reply.status(found.status).send(errorResponse(found.message));

      const type = request.query.type === "selfie" ? "selfie" : "id";

      try {
        const row = await prisma.patientProfile.findUnique({
          where: { id: found.profileId },
          select: { idDocumentKey: true, selfieImageKey: true },
        });
        const key = type === "selfie" ? row?.selfieImageKey : row?.idDocumentKey;
        if (!key) return reply.status(404).send(errorResponse("Image not found"));

        try {
          await guardMedicalRead(
            request,
            { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
            {
              patientProfileId: found.profileId,
              resourceType: type === "selfie" ? "SELFIE_IMAGE" : "ID_DOC",
              accessAction: "VIEWED",
              relatedAppointmentId: found.appointmentId,
            },
          );
        } catch (guardError) {
          if (guardError instanceof MedicalAccessDeniedError) {
            return reply.status(403).send(medicalAccessDeniedResponse(guardError));
          }
          throw guardError;
        }

        const obj = await getObject(key);
        const stream = streamToNodeReadable(obj.Body);
        if (!stream) return reply.status(404).send(errorResponse("Image not found"));

        void reply.header("Content-Type", obj.ContentType ?? "application/octet-stream");
        void reply.header("Cache-Control", "private, no-store");
        // nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write -- streaming an S3 object's Node Readable via Fastify's typed reply.send(), not writing an HTML string built from user input; this rule is tuned for Express res.write(userInput).
        return reply.send(stream);
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load image"));
      }
    },
  );

  app.post<{ Params: { email: string } }>(
    "/api/doctor/patients/:email/identity-verification/request",
    { config: { rateLimit: { max: 20, timeWindow: "1 hour", skipOnError: false } } },
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const found = await resolveOwnPatient(request, auth.doctorId);
      if (!found.ok) return reply.status(found.status).send(errorResponse(found.message));
      // Stamping a verification request onto an erased record would put
      // `idVerifyRequestedAt` / `idVerifyRequestedBy` back on a chart whose
      // identity data was deleted on a legal instruction — and there is nobody
      // left to answer it. Same refusal as the profile PATCH.
      if (found.anonymizedAt) {
        return reply.status(409).send(errorResponse(ANONYMIZED_WRITE_MESSAGE));
      }

      // AZ-4: `resolveOwnPatient` only proves this doctor has an appointment
      // with this email. The confidentiality agreement, 2FA and the patient's
      // consent are the guard's business, and this route skipped it — so a
      // doctor blocked from reading the chart could still stamp a verification
      // request onto the profile. Guarded here, after ownership and before the
      // write, so a denial leaves the profile untouched.
      try {
        await guardMedicalRead(
          request,
          { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
          {
            patientProfileId: found.profileId,
            resourceType: "ID_DOC",
            accessAction: "UPDATED",
            relatedAppointmentId: found.appointmentId,
          },
        );
      } catch (guardError) {
        if (guardError instanceof MedicalAccessDeniedError) {
          return reply.status(403).send(medicalAccessDeniedResponse(guardError));
        }
        throw guardError;
      }

      try {
        const requestedAt = await requestVerification({
          patientProfileId: found.profileId,
          requestedByDoctorId: auth.doctorId,
        });

        await recordCriticalAudit({
          actorUserId: auth.userId,
          actorRole: auth.role ?? "DOCTOR",
          action: "IDENTITY_VERIFICATION_REQUESTED",
          entityType: "PatientProfile",
          entityId: found.profileId,
          // The resolved patient, not the address the URL carried: at a reused
          // address they are different people, and the audit trail is worth
          // nothing if it records the one that was merely typed.
          metadata: { patientProfileId: found.profileId, doctorId: auth.doctorId },
          request,
        });

        // After the audit row, and never fatal: the request is recorded and
        // visible in the patient's portal whether or not the message lands.
        //
        // Addressed by resolved id + the appointment that proves it, never by
        // the URL address. Passing the address let the notifier re-derive its
        // own recipient from it, so when patient A had released the address and
        // patient B now held it, A's verification request was written to A and
        // the email and WhatsApp went to B.
        const delivery = await notifyPatientVerificationRequested({
          patientProfileId: found.profileId,
          appointmentId: found.appointmentId,
          doctorName: auth.fullName,
        }).catch(() => null);

        return okResponse(
          {
            requestedAt,
            sent: delivery?.sent ?? [],
            failed: delivery?.failed ?? ["email"],
            // Deliberately suppressed is not the same as attempted-and-quiet.
            // Without this the doctor sees an empty `sent`/`failed` pair and
            // has no way to know the patient has no reachable contact details
            // at all, so they re-send into the same silence.
            missingContact: delivery?.missingContact ?? false,
          },
          "Verification requested",
        );
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not request verification"));
      }
    },
  );

  const reviewSchema = z.object({
    eventId: z.string().trim().min(1),
    status: z.enum(["VERIFIED", "REJECTED"]),
    reviewNotes: z.string().trim().max(1000).nullable().optional(),
  });

  /**
   * The human decision. This is the ONLY route to VERIFIED — the face-match
   * score never promotes a cycle on its own.
   */
  app.post<{ Params: { email: string } }>(
    "/api/doctor/patients/:email/identity-verification/review",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const found = await resolveOwnPatient(request, auth.doctorId);
      if (!found.ok) return reply.status(found.status).send(errorResponse(found.message));

      const body = reviewSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid review", body.error.flatten()));
      }
      // This is the only route to VERIFIED, so it is the last place that should
      // be able to write an identity decision onto an erased record.
      if (found.anonymizedAt) {
        return reply.status(409).send(errorResponse(ANONYMIZED_WRITE_MESSAGE));
      }

      // AZ-4: this is the ONLY route to VERIFIED, so it is the last place that
      // should have been reachable without the central guard. Same placement
      // as the request endpoint — after ownership, before any mutation.
      try {
        await guardMedicalRead(
          request,
          { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
          {
            patientProfileId: found.profileId,
            resourceType: "ID_DOC",
            accessAction: "UPDATED",
            relatedAppointmentId: found.appointmentId,
          },
        );
      } catch (guardError) {
        if (guardError instanceof MedicalAccessDeniedError) {
          return reply.status(403).send(medicalAccessDeniedResponse(guardError));
        }
        throw guardError;
      }

      try {
        const event = await reviewVerification({
          eventId: body.data.eventId,
          patientProfileId: found.profileId,
          status: body.data.status,
          reviewedByUserId: auth.userId,
          reviewedByRole: auth.role ?? "DOCTOR",
          reviewNotes: body.data.reviewNotes ?? null,
        });

        await recordCriticalAudit({
          actorUserId: auth.userId,
          actorRole: auth.role ?? "DOCTOR",
          action: "IDENTITY_VERIFICATION_REVIEWED",
          entityType: "IdentityVerificationEvent",
          entityId: event.id,
          metadata: {
            patientProfileId: found.profileId,
            referenceId: event.referenceId,
            status: event.status,
            method: event.method,
            // Recorded so a later audit can tell whether the human agreed with
            // the machine, and how often.
            faceMatchScore: event.faceMatchScore,
          },
          request,
        });

        return okResponse(
          {
            status: event.status,
            referenceId: event.referenceId,
            reviewedAt: event.reviewedAt,
          },
          body.data.status === "VERIFIED" ? "Patient identity verified" : "Verification rejected",
        );
      } catch (error) {
        if (error instanceof VerificationEventNotFoundError) {
          return reply.status(404).send(errorResponse(error.message));
        }
        if (error instanceof VerificationAlreadyReviewedError) {
          return reply.status(409).send(errorResponse(error.message));
        }
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not record review"));
      }
    },
  );
  // ─── Alert history + removal ───────────────────────────────────────────────
  // An alert is set/reworded through the profile PATCH above; clearing one is
  // routed here instead, because a removal has to carry a reason that lands in
  // the chart (applyPatientProfileUpdate rejects a PATCH that blanks an alert).

  app.get<{ Params: { email: string } }>(
    "/api/doctor/patients/:email/alert-log",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      let email: string;
      try {
        email = decodeURIComponent(request.params.email).trim().toLowerCase();
      } catch {
        return reply.status(400).send(errorResponse("Invalid email param"));
      }
      try {
        // Identity before authorization — the alert log is verbatim clinical
        // text, and the address alone does not say whose.
        const target = await resolveChartTarget(email, auth.doctorId);
        if (!target.ok) {
          return reply.status(404).send(errorResponse("Patient profile not found"));
        }
        // Nobody at this address at all means no alert was ever raised — an
        // empty list, not a 404, so the chart card renders its empty state.
        // Nothing to authorize against either, and nothing disclosed.
        if (target.kind !== "existing") return okResponse({ entries: [] });

        // AZ-4: the alert log is verbatim clinical text (status/clinic alert
        // wording, plus the removal rationale). It went out with no guard call
        // at all — no decision, and no MedicalAccessLog row. Guarded before
        // the alert rows are read, so a denial returns no alert content.
        try {
          await guardMedicalRead(
            request,
            { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
            {
              patientProfileId: target.profile.id,
              resourceType: "SENSITIVE_PROFILE",
              accessAction: "VIEWED",
              relatedAppointmentId: target.appointmentId,
            },
          );
        } catch (guardError) {
          if (guardError instanceof MedicalAccessDeniedError) {
            return reply.status(403).send(medicalAccessDeniedResponse(guardError));
          }
          throw guardError;
        }

        return okResponse({ entries: await listPatientAlertLog(target.profile.id) });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load alert history"));
      }
    },
  );

  app.post<{ Params: { email: string; type: string } }>(
    "/api/doctor/patients/:email/alerts/:type/remove",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      let email: string;
      try {
        email = decodeURIComponent(request.params.email).trim().toLowerCase();
      } catch {
        return reply.status(400).send(errorResponse("Invalid email param"));
      }
      const params = alertTypeParam.safeParse(request.params.type);
      if (!params.success) {
        return reply.status(400).send(errorResponse("Unknown alert type"));
      }
      const body = removeAlertSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply
          .status(400)
          .send(errorResponse("A removal note is required", body.error.flatten()));
      }
      // Identity before authorization: this clears a banner off a chart.
      const target = await resolveChartTarget(email, auth.doctorId);
      if (!target.ok) {
        return reply.status(404).send(errorResponse("Patient profile not found"));
      }
      if (target.kind !== "existing") {
        return reply.status(404).send(errorResponse("No alert to remove"));
      }
      if (target.profile.anonymizedAt) {
        return reply.status(409).send(errorResponse(ANONYMIZED_WRITE_MESSAGE));
      }
      // Same gate the profile PATCH uses — clearing an alert is a write to the
      // sensitive profile and belongs in MedicalAccessLog.
      try {
        await guardMedicalRead(
          request,
          { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
          {
            patientProfileId: target.profile.id,
            resourceType: "SENSITIVE_PROFILE",
            accessAction: "UPDATED",
            relatedAppointmentId: target.appointmentId,
          },
        );
      } catch (guardError) {
        if (guardError instanceof MedicalAccessDeniedError) {
          return reply.status(403).send(medicalAccessDeniedResponse(guardError));
        }
        throw guardError;
      }

      try {
        const { profile, previousValue } = await removePatientAlert({
          // The id the guard authorized. Re-resolving from `email` inside the
          // service is what let a reassigned address move the removal — and the
          // chart note that records it — onto a different patient.
          patientProfileId: target.profile.id,
          alertType: params.data,
          note: body.data.note,
          actor: { userId: auth.userId, role: auth.role, name: auth.fullName },
        });
        const actor = resolveAuditActor(request);
        await recordCriticalAudit({
          actorUserId: actor?.userId ?? null,
          actorRole: actor?.role ?? "DOCTOR",
          action: "PATIENT_ALERT_UPDATED",
          entityType: "PatientProfile",
          entityId: profile.id,
          metadata: {
            patientProfileId: profile.id,
            removed: params.data,
            // Alert TEXT is clinical free-text; the audit log keeps only the
            // fact of the removal. The text and the note live in
            // PatientAlertLog, which is chart-scoped.
            hadValue: previousValue !== null,
          },
          request,
        });
        return okResponse({
          profile: stripIdentityFields(serializeProfile(profile, { includeAlerts: true })),
          entries: await listPatientAlertLog(profile.id),
        });
      } catch (error) {
        if (error instanceof AlertRemovalRequiresNoteError) {
          return reply.status(400).send(errorResponse(error.message));
        }
        if (error instanceof AlertNotFoundError) {
          return reply.status(404).send(errorResponse(error.message));
        }
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not remove alert"));
      }
    },
  );
};

export default doctorPatientProfileRoute;
