import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { verifyClinicalReadAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { guardMedicalRead, MedicalAccessDeniedError, medicalAccessDeniedResponse } from "../utils/guard-medical-read.js";
import {
  provableLegacyAppointmentsForDoctor,
  resolvePatientContextByPatientEmail,
} from "../modules/patient-profile/appointment-patient-link.js";

// ponytail: hard cap per collection — this aggregates a patient's WHOLE
// history across every shared appointment, so unlike a per-appointment
// list it can genuinely grow without bound over a multi-year relationship.
// No "load older" UI exists yet, so bound it rather than build one.
const LIST_CAP = 200;

/**
 * Patient-wide document aggregator for the doctor portal. Mongo kept
 * every clinical doc (patient uploads, doctor-generated PDFs) inside a
 * single subdoc on the patient row; Prisma split them into
 * `AppointmentDocument` + `GeneratedDocument` keyed by appointment id.
 * This route unions the two tables so the doctor's chart can render a
 * single "All documents" tab across every appointment the doctor has
 * with this patient.
 *
 * Scoped to `auth.doctorId` — Doctor-A never sees Doctor-B's patient's
 * docs, even if the patient happens to see both.
 */
const doctorPatientDocumentsRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { email: string } }>(
    "/api/doctor/patients/:email/documents",
    async (request, reply) => {
      const auth = await verifyClinicalReadAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      // GDPR plan: downloadable patient-document archive is admin-only.
      // Doctors still view documents in-context on the per-appointment
      // workspace (no download), where the in-app chat is the contact
      // channel. Bouncing DOCTOR here closes the GET-all archive surface.
      if (auth.role !== "ADMIN") {
        return reply.status(403).send(errorResponse("Admin access required"));
      }
      let email: string;
      try {
        email = decodeURIComponent(request.params.email).trim().toLowerCase();
      } catch {
        return reply.status(400).send(errorResponse("Invalid email param"));
      }
      try {
        // Patient's own Medical Files uploads live in MedicalDocument (no
        // appointment scope) — surface them here as "Uploaded document" so
        // the patient upload flow stays in sync with the doctor portal.
        // Resolved through the durable appointment→patient link so a retained
        // record stays reachable after anonymization tombstones
        // `PatientProfile.email`; null, never a guess, when ambiguous.
        //
        // Unscoped on purpose. The handler above bounces every non-ADMIN role,
        // so this is an admin surface even when the admin happens to carry a
        // Doctor profile — narrowing the candidates to that doctor's own
        // appointments would hide the archive of every patient they have not
        // personally treated. The admin shape pools the linked patients and the
        // live profile and still requires exactly one, so a reused address
        // fails closed rather than resolving to the wrong chart.
        const context = await resolvePatientContextByPatientEmail(email);
        // Unresolved identity is a refusal, not a partial answer. This handler
        // used to guard only when a profile resolved and then select the
        // appointment documents by raw `doctorId + email` regardless — so an
        // ambiguous address returned one patient's generated PDFs and storage
        // keys with no medical-access decision recorded at all, and at a reused
        // address it could pair patient B's uploads with patient A's history in
        // a single response. Nothing is queried before identity is settled.
        if (!context) {
          return reply.status(404).send(errorResponse("Patient not found"));
        }
        const patientProfileId = context.patientProfileId;

        // S-032 fix: this handler aggregates PHI (medical documents) across
        // every appointment the doctor shares with this patient — guard once
        // here, covering all three reads below (patientUploads, uploads,
        // generated), and now unconditionally, since there is always exactly
        // one identified patient by this point.
        try {
          await guardMedicalRead(
            request,
            { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
            {
              patientProfileId,
              resourceType: "MEDICAL_DOC",
              accessAction: "VIEWED",
              relatedAppointmentId: context.appointmentId,
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

        const patientUploads = await prisma.medicalDocument.findMany({
          where: { patientProfileId, uploadedByRole: "PATIENT" },
          orderBy: { createdAt: "desc" },
          take: LIST_CAP,
          select: {
            id: true,
            title: true,
            fileName: true,
            mimetype: true,
            byteSize: true,
            createdAt: true,
          },
        });

        // Every appointment-id that belongs to THIS patient, so both child
        // tables can be filtered by that set in one round-trip each.
        //
        // Durable links always win. An unlinked legacy row is included only
        // when account + address + order-line evidence proves it belongs to
        // this exact profile. Accountless guest rows stay out: the address by
        // itself cannot prove whose documents they contain.
        const [linkedAppointments, legacyAppointments] = await Promise.all([
          prisma.appointment.findMany({
            where: { patientProfileId },
            select: { id: true },
          }),
          provableLegacyAppointmentsForDoctor(email),
        ]);
        const appointmentIds = [...new Set([
          ...linkedAppointments.map((a) => a.id),
          ...(legacyAppointments.get(patientProfileId) ?? []),
        ])];
        if (appointmentIds.length === 0) {
          return okResponse({
            uploads: [],
            generated: [],
            patientUploads: patientUploads.map((u) => ({
              ...u,
              createdAt: u.createdAt.toISOString(),
            })),
          });
        }

        const [uploads, generated] = await Promise.all([
          prisma.appointmentDocument.findMany({
            where: { appointmentId: { in: appointmentIds } },
            orderBy: { createdAt: "desc" },
            take: LIST_CAP,
            select: {
              id: true,
              appointmentId: true,
              label: true,
              storageKey: true,
              mimetype: true,
              byteSize: true,
              createdAt: true,
            },
          }),
          prisma.generatedDocument.findMany({
            where: { appointmentId: { in: appointmentIds } },
            orderBy: { createdAt: "desc" },
            take: LIST_CAP,
            select: {
              id: true,
              appointmentId: true,
              fileName: true,
              documentType: true,
              sentToPatient: true,
              storageKey: true,
              metadata: true,
              createdAt: true,
            },
          }),
        ]);

        return okResponse({
          uploads: uploads.map((u) => ({
            ...u,
            createdAt: u.createdAt.toISOString(),
          })),
          generated: generated.map((g) => ({
            ...g,
            createdAt: g.createdAt.toISOString(),
          })),
          patientUploads: patientUploads.map((u) => ({
            ...u,
            createdAt: u.createdAt.toISOString(),
          })),
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load documents"));
      }
    },
  );
};

export default doctorPatientDocumentsRoute;
