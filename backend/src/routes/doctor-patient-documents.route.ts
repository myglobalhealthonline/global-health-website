import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { guardMedicalRead, MedicalAccessDeniedError, medicalAccessDeniedResponse } from "../utils/guard-medical-read.js";

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
      const auth = await verifyDoctorAccess(request);
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
        const profile = await prisma.patientProfile.findUnique({
          where: { email },
          select: { id: true },
        });

        // S-032 fix: this handler aggregates PHI (medical documents) across
        // every appointment the doctor shares with this patient — guard once
        // here, covering all three reads below (patientUploads, uploads,
        // generated). No profile → nothing to guard.
        if (profile) {
          try {
            await guardMedicalRead(
              request,
              { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
              { patientProfileId: profile.id, resourceType: "MEDICAL_DOC", accessAction: "VIEWED" },
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

        const patientUploads = profile
          ? await prisma.medicalDocument.findMany({
              where: { patientProfileId: profile.id, uploadedByRole: "PATIENT" },
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
            })
          : [];

        // First pull every appointment-id the doctor shares with this
        // patient so we can filter both child tables by that set in one
        // round-trip per table.
        const appointments = await prisma.appointment.findMany({
          where: {
            doctorId: auth.doctorId,
            email: { equals: email, mode: "insensitive" },
          },
          select: { id: true },
        });
        const appointmentIds = appointments.map((a) => a.id);
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
