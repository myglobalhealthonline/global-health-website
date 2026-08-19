import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { PatientAlertType } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  applyPatientProfileUpdate,
  PricingPlanCountryMismatchError,
  serializeProfile,
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
      const hasAppt = await prisma.appointment.findFirst({
        where: { doctorId: auth.doctorId, email: { equals: email, mode: "insensitive" } },
        select: { id: true },
      });
      if (!hasAppt) {
        return reply.status(404).send(errorResponse("Patient not found"));
      }
      try {
        const profile = await prisma.patientProfile.findUnique({ where: { email } });
        if (profile) {
          // Central guard: authorizes + logs (MedicalAccessLog) + alerts as a
          // side effect. In shadow mode it never blocks; in enforce mode a
          // denied decision throws MedicalAccessDeniedError → 403.
          try {
            await guardMedicalRead(
              request,
              { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
              {
                patientProfileId: profile.id,
                resourceType: "SENSITIVE_PROFILE",
                accessAction: "VIEWED",
                relatedAppointmentId: hasAppt.id,
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
      const appt = await prisma.appointment.findFirst({
        where: { doctorId: auth.doctorId, email: { equals: email, mode: "insensitive" } },
        select: { fullName: true, phone: true },
      });
      if (!appt) {
        return reply.status(404).send(errorResponse("Patient not found"));
      }

      // Central guard: authorize the profile edit before writing; logs the
      // UPDATED action (MedicalAccessLog) as a side effect. Skipped when the
      // profile doesn't exist yet (first write creates it from appointment
      // fallbacks — nothing to guard until the record exists).
      const existingProfile = await prisma.patientProfile.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existingProfile) {
        try {
          await guardMedicalRead(
            request,
            { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
            {
              patientProfileId: existingProfile.id,
              resourceType: "SENSITIVE_PROFILE",
              accessAction: "UPDATED",
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
        const { profile, alertChanges, alertPrevious } = await applyPatientProfileUpdate(
          email,
          {
            ...rest,
            ...(dateOfBirth !== undefined
              ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }
              : {}),
          },
          {
            fallbackFullName: appt.fullName,
            fallbackPhone: appt.phone,
            actor: { userId: auth.userId, role: auth.role },
            ipAddress: request.ip,
          },
        );
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
            entityId: profile?.id ?? email,
            metadata: {
              email,
              changes: alertChanges,
              statusAlert: profile?.statusAlert ?? null,
              clinicAlert: profile?.clinicAlert ?? null,
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
   * Returns the profile id, or a reply-ready failure.
   */
  async function resolveOwnPatient(
    request: { params: { email: string } },
    doctorId: string,
  ): Promise<
    | { ok: true; email: string; profileId: string; appointmentId: string }
    | { ok: false; status: 400 | 404; message: string }
  > {
    let email: string;
    try {
      email = decodeURIComponent(request.params.email).trim().toLowerCase();
    } catch {
      return { ok: false, status: 400, message: "Invalid email param" };
    }
    const appt = await prisma.appointment.findFirst({
      where: { doctorId, email: { equals: email, mode: "insensitive" } },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });
    if (!appt) return { ok: false, status: 404, message: "Patient not found" };

    const profile = await prisma.patientProfile.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!profile) return { ok: false, status: 404, message: "Patient profile not found" };

    return { ok: true, email, profileId: profile.id, appointmentId: appt.id };
  }

  app.get<{ Params: { email: string } }>(
    "/api/doctor/patients/:email/identity-verification",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const found = await resolveOwnPatient(request, auth.doctorId);
      if (!found.ok) return reply.status(found.status).send(errorResponse(found.message));

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
            awaitingReview:
              summary.latestEvent != null && summary.latestEvent.reviewedAt == null,
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
          metadata: { email: found.email, doctorId: auth.doctorId },
          request,
        });

        // After the audit row, and never fatal: the request is recorded and
        // visible in the patient's portal whether or not the message lands.
        const delivery = await notifyPatientVerificationRequested({
          patientEmail: found.email,
          doctorName: auth.fullName,
        }).catch(() => null);

        return okResponse(
          {
            requestedAt,
            sent: delivery?.sent ?? [],
            failed: delivery?.failed ?? ["email"],
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
            email: found.email,
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
      const hasAppt = await prisma.appointment.findFirst({
        where: { doctorId: auth.doctorId, email: { equals: email, mode: "insensitive" } },
        select: { id: true },
      });
      if (!hasAppt) {
        return reply.status(404).send(errorResponse("Patient not found"));
      }
      try {
        const profile = await prisma.patientProfile.findUnique({
          where: { email },
          select: { id: true },
        });
        // No profile row yet means no alert was ever raised — an empty list,
        // not a 404, so the chart card renders its empty state.
        if (!profile) return okResponse({ entries: [] });
        return okResponse({ entries: await listPatientAlertLog(profile.id) });
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
      const hasAppt = await prisma.appointment.findFirst({
        where: { doctorId: auth.doctorId, email: { equals: email, mode: "insensitive" } },
        select: { id: true },
      });
      if (!hasAppt) {
        return reply.status(404).send(errorResponse("Patient not found"));
      }
      const existingProfile = await prisma.patientProfile.findUnique({
        where: { email },
        select: { id: true },
      });
      if (!existingProfile) {
        return reply.status(404).send(errorResponse("No alert to remove"));
      }
      // Same gate the profile PATCH uses — clearing an alert is a write to the
      // sensitive profile and belongs in MedicalAccessLog.
      try {
        await guardMedicalRead(
          request,
          { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
          {
            patientProfileId: existingProfile.id,
            resourceType: "SENSITIVE_PROFILE",
            accessAction: "UPDATED",
            relatedAppointmentId: hasAppt.id,
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
          email,
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
            email,
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
