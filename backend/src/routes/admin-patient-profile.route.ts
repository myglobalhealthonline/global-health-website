import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { verifyAdminAccess, resolveAdminSessionActor } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  applyPatientProfileUpdate,
  PricingPlanCountryMismatchError,
  serializeProfile,
} from "../modules/patient-profile/patient-profile.service.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import {
  listNationalityDocuments,
  adminUpdateNationalityVerification,
  NationalityNotFoundError,
} from "../services/patient-nationality.service.js";
import { getObject, streamToNodeReadable } from "../services/object-storage.js";
import { VerificationStatus } from "@prisma/client";
import { guardMedicalRead, MedicalAccessDeniedError } from "../utils/guard-medical-read.js";

const stringField = (max: number) =>
  z.string().trim().max(max).nullable().optional();

const adminPatchSchema = z
  .object({
    fullName: stringField(200),
    phone: stringField(40),
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
    nationalIdNumber: stringField(64),
    taxIdNumber: stringField(64),
    passportNumber: stringField(64),
    addressLine1: stringField(200),
    addressLine2: stringField(200),
    addressCity: stringField(120),
    addressPostalCode: stringField(32),
    addressCountryCode: stringField(8),
    preferredPharmacy: stringField(200),
    statusAlert: stringField(500),
    clinicAlert: stringField(500),
    pricingPlanId: stringField(64),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field" });

const adminPatientProfileRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get<{ Params: { email: string } }>(
    "/api/admin/patients/:email/profile",
    async (request, reply) => {
      let email: string;
      try {
        email = decodeURIComponent(request.params.email).trim().toLowerCase();
      } catch {
        return reply.status(400).send(errorResponse("Invalid email param"));
      }
      try {
        const profile = await prisma.patientProfile.findUnique({ where: { email } });
        if (!profile) {
          return reply.status(404).send(errorResponse("Patient profile not found"));
        }
        const actor = resolveAdminSessionActor(request);
        // Central guard: logs the access + enforces LOCAL_ADMIN folder scope
        // (in enforce mode) and raises alerts on out-of-scope reads. Shadow
        // mode logs only and never blocks.
        try {
          await guardMedicalRead(
            request,
            { userId: actor?.userId ?? "", role: actor?.role ?? "ADMIN" },
            {
              patientProfileId: profile.id,
              resourceType: "SENSITIVE_PROFILE",
              accessAction: "VIEWED",
            },
          );
        } catch (guardError) {
          if (guardError instanceof MedicalAccessDeniedError) {
            return reply
              .status(403)
              .send(errorResponse("Access to this medical record is not permitted"));
          }
          throw guardError;
        }
        return okResponse({
          profile: serializeProfile(profile, { includeAlerts: true }),
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
    "/api/admin/patients/:email/profile",
    async (request, reply) => {
      let email: string;
      try {
        email = decodeURIComponent(request.params.email).trim().toLowerCase();
      } catch {
        return reply.status(400).send(errorResponse("Invalid email param"));
      }
      const body = adminPatchSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid profile", body.error.flatten()));
      }
      try {
        const { dateOfBirth, ...rest } = body.data;
        const { profile, alertChanges } = await applyPatientProfileUpdate(email, {
          ...rest,
          ...(dateOfBirth !== undefined
            ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }
            : {}),
        });
        const actor = resolveAdminSessionActor(request);
        // Always audit the edit. Record only the changed FIELD NAMES, never
        // the values — the values are PHI/PII and must not land in the audit
        // log. The alert-specific event below keeps its existing shape.
        recordAudit({
          actorUserId: actor?.userId ?? null,
          actorRole: actor?.role ?? "ADMIN",
          action: "PATIENT_PROFILE_UPDATED",
          entityType: "PatientProfile",
          entityId: profile?.id ?? email,
          metadata: { email, changedFields: Object.keys(body.data) },
          request,
        }).catch(() => {});
        if (alertChanges.statusAlert || alertChanges.clinicAlert) {
          recordAudit({
            actorUserId: actor?.userId ?? null,
            actorRole: actor?.role ?? "ADMIN",
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
          }).catch(() => {});
        }
        return okResponse({
          profile: serializeProfile(profile, { includeAlerts: true }),
        });
      } catch (error) {
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
  // ─── GHN search ────────────────────────────────────────────────────────────

  app.get("/api/admin/patients/search", async (request, reply) => {
    const query = z
      .object({
        ghn: z.string().trim().optional(),
        email: z.string().trim().optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(50).default(20),
      })
      .safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid query", query.error.flatten()));
    }
    const { ghn, email, page, pageSize } = query.data;
    try {
      const where: Record<string, unknown> = {};
      if (ghn) where.globalHealthNumber = { contains: ghn, mode: "insensitive" };
      if (email) where.email = { contains: email, mode: "insensitive" };

      const [items, total] = await Promise.all([
        prisma.patientProfile.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            email: true,
            fullName: true,
            globalHealthNumber: true,
            idVerificationStatus: true,
            emailVerificationStatus: true,
            phoneVerificationStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.patientProfile.count({ where }),
      ]);

      return okResponse({ items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send(errorResponse("Search failed"));
    }
  });

  // ─── Existing-patient typeahead for manual booking ─────────────────────────
  // The admin types part of an email; we substring-match it (case-insensitive)
  // and return the distinct patients behind the matching emails. A single
  // account email can have booked MORE THAN ONE distinct person (e.g. a parent
  // booking for themselves and a child); those people are not separate
  // PatientProfile rows (the profile is unique per email), so we reconstruct
  // the distinct patients from Appointment history, de-duplicated by
  // (email, fullName, dateOfBirth). Registered profile holders are included
  // too, so a patient who registered but never booked still shows.
  app.get("/api/admin/patients/by-email", async (request, reply) => {
    const query = z
      .object({ email: z.string().trim().max(254) })
      .safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid query", query.error.flatten()));
    }
    const q = query.data.email.toLowerCase();
    // Need at least a couple of characters before searching — a 1-char
    // substring would match almost every patient.
    if (q.length < 2) {
      return okResponse({ patients: [] });
    }

    try {
      const [appointments, profiles] = await Promise.all([
        prisma.appointment.findMany({
          where: { email: { contains: q, mode: "insensitive" } },
          select: { email: true, fullName: true, dateOfBirth: true, phone: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 300,
        }),
        prisma.patientProfile.findMany({
          where: { email: { contains: q, mode: "insensitive" } },
          select: {
            email: true,
            fullName: true,
            dateOfBirth: true,
            phone: true,
            nationalIdNumber: true,
            taxIdNumber: true,
            passportNumber: true,
            addressLine1: true,
            addressCity: true,
            addressCountryCode: true,
          },
          take: 50,
        }),
      ]);

      // PatientProfile is unique per email, so its ID / address fields are
      // shared by every distinct person booked under that email. Index them
      // by email to attach to each returned patient.
      const profileByEmail = new Map<
        string,
        {
          nationalIdNumber: string | null;
          taxIdNumber: string | null;
          passportNumber: string | null;
          addressLine1: string | null;
          addressCity: string | null;
          addressCountryCode: string | null;
        }
      >();
      for (const profile of profiles) {
        const email = profile.email?.trim().toLowerCase();
        if (!email) continue;
        profileByEmail.set(email, {
          nationalIdNumber: profile.nationalIdNumber ?? null,
          taxIdNumber: profile.taxIdNumber ?? null,
          passportNumber: profile.passportNumber ?? null,
          addressLine1: profile.addressLine1 ?? null,
          addressCity: profile.addressCity ?? null,
          addressCountryCode: profile.addressCountryCode ?? null,
        });
      }

      type Agg = {
        email: string;
        fullName: string;
        dateOfBirth: Date | null;
        phone: string | null;
        appointmentCount: number;
        lastBookedAt: Date | null;
      };
      const keyOf = (email: string, name: string, dob: Date | null) =>
        `${email.trim().toLowerCase()}|${name.trim().toLowerCase()}|${dob ? dob.toISOString().slice(0, 10) : ""}`;
      const byKey = new Map<string, Agg>();

      for (const a of appointments) {
        const name = a.fullName?.trim();
        const email = a.email?.trim();
        if (!name || !email) continue;
        const key = keyOf(email, name, a.dateOfBirth);
        const existing = byKey.get(key);
        if (existing) {
          existing.appointmentCount += 1;
          if (!existing.phone && a.phone) existing.phone = a.phone;
          if (a.createdAt && (!existing.lastBookedAt || a.createdAt > existing.lastBookedAt)) {
            existing.lastBookedAt = a.createdAt;
          }
        } else {
          byKey.set(key, {
            email: email.toLowerCase(),
            fullName: name,
            dateOfBirth: a.dateOfBirth ?? null,
            phone: a.phone ?? null,
            appointmentCount: 1,
            lastBookedAt: a.createdAt ?? null,
          });
        }
      }

      for (const profile of profiles) {
        const name = profile.fullName?.trim();
        const email = profile.email?.trim();
        if (!name || !email) continue;
        const key = keyOf(email, name, profile.dateOfBirth);
        if (!byKey.has(key)) {
          byKey.set(key, {
            email: email.toLowerCase(),
            fullName: name,
            dateOfBirth: profile.dateOfBirth ?? null,
            phone: profile.phone ?? null,
            appointmentCount: 0,
            lastBookedAt: null,
          });
        }
      }

      const emptyProfile = {
        nationalIdNumber: null,
        taxIdNumber: null,
        passportNumber: null,
        addressLine1: null,
        addressCity: null,
        addressCountryCode: null,
      };
      const patients = [...byKey.values()]
        .sort((a, b) => (b.lastBookedAt?.getTime() ?? 0) - (a.lastBookedAt?.getTime() ?? 0))
        .slice(0, 20)
        .map((p) => ({
          email: p.email,
          fullName: p.fullName,
          dateOfBirth: p.dateOfBirth ? p.dateOfBirth.toISOString().slice(0, 10) : null,
          phone: p.phone,
          appointmentCount: p.appointmentCount,
          lastBookedAt: p.lastBookedAt ? p.lastBookedAt.toISOString() : null,
          ...(profileByEmail.get(p.email) ?? emptyProfile),
        }));

      return okResponse({ patients });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load patients"));
    }
  });

  // ─── Admin: verification status update ─────────────────────────────────────

  const verificationStatusSchema = z.object({
    status: z.nativeEnum(VerificationStatus),
    adminNotes: z.string().trim().max(1000).nullable().optional(),
  });

  app.patch<{ Params: { email: string; kind: string } }>(
    "/api/admin/patients/:email/verification/:kind",
    async (request, reply) => {
      let email: string;
      try {
        email = decodeURIComponent(request.params.email).trim().toLowerCase();
      } catch {
        return reply.status(400).send(errorResponse("Invalid email param"));
      }
      const kind = request.params.kind;
      if (!["id", "phone", "email", "insurance"].includes(kind)) {
        return reply.status(400).send(errorResponse("kind must be id | phone | email | insurance"));
      }

      const body = verificationStatusSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid payload", body.error.flatten()));
      }

      try {
        const profile = await prisma.patientProfile.findUnique({
          where: { email },
          select: { id: true, globalHealthNumber: true },
        });
        if (!profile) return reply.status(404).send(errorResponse("Patient not found"));

        const actor = resolveAdminSessionActor(request);
        const data: Record<string, unknown> = {};
        if (kind === "id") {
          data.idVerificationStatus = body.data.status;
          data.idVerificationAdminNotes = body.data.adminNotes ?? null;
          data.idVerificationReviewedBy = actor?.userId ?? null;
          data.idVerificationReviewedAt = new Date();
        } else if (kind === "phone") {
          data.phoneVerificationStatus = body.data.status;
          if (body.data.status === VerificationStatus.VERIFIED) {
            data.phoneVerifiedAt = new Date();
          }
        } else if (kind === "email") {
          data.emailVerificationStatus = body.data.status;
          if (body.data.status === VerificationStatus.VERIFIED) {
            data.emailVerifiedAt = new Date();
          }
        } else if (kind === "insurance") {
          data.insuranceDocumentStatus = body.data.status;
          data.insuranceAdminNotes = body.data.adminNotes ?? null;
        }

        const updated = await prisma.patientProfile.update({
          where: { id: profile.id },
          data,
          select: {
            idVerificationStatus: true,
            phoneVerificationStatus: true,
            emailVerificationStatus: true,
            insuranceDocumentStatus: true,
          },
        });

        recordAudit({
          actorUserId: actor?.userId ?? null,
          actorRole: actor?.role ?? "ADMIN",
          action: "PATIENT_PROFILE_UPDATED",
          entityType: "PatientProfile",
          entityId: profile.id,
          metadata: { email, verificationKind: kind, newStatus: body.data.status },
          request,
        }).catch(() => {});

        return okResponse({ verification: updated });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not update verification status"));
      }
    },
  );

  // ─── Admin: nationality documents ──────────────────────────────────────────

  app.get<{ Params: { email: string } }>(
    "/api/admin/patients/:email/nationality",
    async (request, reply) => {
      let email: string;
      try {
        email = decodeURIComponent(request.params.email).trim().toLowerCase();
      } catch {
        return reply.status(400).send(errorResponse("Invalid email param"));
      }
      try {
        const profile = await prisma.patientProfile.findUnique({
          where: { email },
          select: { id: true, globalHealthNumber: true },
        });
        if (!profile) return reply.status(404).send(errorResponse("Patient not found"));

        const docs = await listNationalityDocuments(profile.id);
        const actor = resolveAdminSessionActor(request);
        try {
          await guardMedicalRead(
            request,
            { userId: actor?.userId ?? "", role: actor?.role ?? "ADMIN" },
            { patientProfileId: profile.id, resourceType: "NATIONALITY_DOC", accessAction: "VIEWED" },
          );
        } catch (guardError) {
          if (guardError instanceof MedicalAccessDeniedError) {
            return reply.status(403).send(errorResponse("Access to this medical record is not permitted"));
          }
          throw guardError;
        }
        return okResponse({ nationalityDocuments: docs });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load nationality documents"));
      }
    },
  );

  app.patch<{ Params: { email: string; slot: string } }>(
    "/api/admin/patients/:email/nationality/:slot/verification",
    async (request, reply) => {
      let email: string;
      try {
        email = decodeURIComponent(request.params.email).trim().toLowerCase();
      } catch {
        return reply.status(400).send(errorResponse("Invalid email param"));
      }
      const slotRaw = Number(request.params.slot);
      if (slotRaw !== 1 && slotRaw !== 2) {
        return reply.status(400).send(errorResponse("slot must be 1 or 2"));
      }

      const body = z
        .object({
          verificationStatus: z.nativeEnum(VerificationStatus),
          adminNotes: z.string().trim().max(1000).nullable().optional(),
        })
        .safeParse(request.body ?? {});
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid payload", body.error.flatten()));
      }

      try {
        const profile = await prisma.patientProfile.findUnique({
          where: { email },
          select: { id: true },
        });
        if (!profile) return reply.status(404).send(errorResponse("Patient not found"));

        const actor = resolveAdminSessionActor(request);
        const doc = await adminUpdateNationalityVerification(profile.id, slotRaw, {
          verificationStatus: body.data.verificationStatus,
          adminNotes: body.data.adminNotes,
          reviewedByAdminId: actor?.userId ?? null,
        });

        recordAudit({
          actorUserId: actor?.userId ?? null,
          actorRole: actor?.role ?? "ADMIN",
          action: "PATIENT_PROFILE_UPDATED",
          entityType: "PatientNationalityDocument",
          entityId: doc.id,
          metadata: { email, slotNumber: slotRaw, newStatus: body.data.verificationStatus },
          request,
        }).catch(() => {});

        return okResponse({ nationalityDocument: doc });
      } catch (error) {
        if (error instanceof NationalityNotFoundError) {
          return reply.status(404).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not update nationality verification"));
      }
    },
  );

  // ─── Admin: document streaming download ────────────────────────────────────

  app.get<{ Params: { email: string } }>(
    "/api/admin/patients/:email/id-document/download",
    async (request, reply) => {
      let email: string;
      try {
        email = decodeURIComponent(request.params.email).trim().toLowerCase();
      } catch {
        return reply.status(400).send(errorResponse("Invalid email param"));
      }
      const side = ((request.query as { side?: string }).side ?? "front") === "back" ? "back" : "front";

      const row = await prisma.patientProfile.findUnique({
        where: { email },
        select: { id: true, idDocumentKey: true, idDocumentBackKey: true },
      });
      const key = side === "back" ? row?.idDocumentBackKey : row?.idDocumentKey;
      if (!key) return reply.status(404).send(errorResponse("Document not found"));

      const actor = resolveAdminSessionActor(request);
      try {
        await guardMedicalRead(
          request,
          { userId: actor?.userId ?? "", role: actor?.role ?? "ADMIN" },
          { patientProfileId: row!.id, resourceType: "ID_DOC", accessAction: "DOWNLOADED" },
        );
      } catch (guardError) {
        if (guardError instanceof MedicalAccessDeniedError) {
          return reply.status(403).send(errorResponse("Access to this medical record is not permitted"));
        }
        throw guardError;
      }

      try {
        const obj = await getObject(key);
        const stream = streamToNodeReadable(obj.Body);
        if (!stream) return reply.status(404).send(errorResponse("Document not found"));
        void reply.header("Content-Type", obj.ContentType ?? "application/octet-stream");
        void reply.header("Cache-Control", "private, no-store");
        return reply.send(stream);
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Download failed"));
      }
    },
  );

  app.get<{ Params: { email: string } }>(
    "/api/admin/patients/:email/insurance/download",
    async (request, reply) => {
      let email: string;
      try {
        email = decodeURIComponent(request.params.email).trim().toLowerCase();
      } catch {
        return reply.status(400).send(errorResponse("Invalid email param"));
      }
      const row = await prisma.patientProfile.findUnique({
        where: { email },
        select: { id: true, insuranceDocumentKey: true },
      });
      if (!row?.insuranceDocumentKey) return reply.status(404).send(errorResponse("Document not found"));

      const actor = resolveAdminSessionActor(request);
      try {
        await guardMedicalRead(
          request,
          { userId: actor?.userId ?? "", role: actor?.role ?? "ADMIN" },
          { patientProfileId: row.id, resourceType: "INSURANCE_DOC", accessAction: "DOWNLOADED" },
        );
      } catch (guardError) {
        if (guardError instanceof MedicalAccessDeniedError) {
          return reply.status(403).send(errorResponse("Access to this medical record is not permitted"));
        }
        throw guardError;
      }

      try {
        const obj = await getObject(row.insuranceDocumentKey);
        const stream = streamToNodeReadable(obj.Body);
        if (!stream) return reply.status(404).send(errorResponse("Document not found"));
        void reply.header("Content-Type", obj.ContentType ?? "application/octet-stream");
        void reply.header("Cache-Control", "private, no-store");
        return reply.send(stream);
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Download failed"));
      }
    },
  );

  // ─── Admin: patient payment history ────────────────────────────────────────

  app.get<{ Params: { email: string } }>(
    "/api/admin/patients/:email/payments",
    async (request, reply) => {
      let email: string;
      try {
        email = decodeURIComponent(request.params.email).trim().toLowerCase();
      } catch {
        return reply.status(400).send(errorResponse("Invalid email param"));
      }
      try {
        const profile = await prisma.patientProfile.findUnique({
          where: { email },
          select: { id: true },
        });
        if (!profile) return reply.status(404).send(errorResponse("Patient not found"));

        const payments = await prisma.payment.findMany({
          where: { appointment: { email: { equals: email, mode: "insensitive" } } },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            amountCents: true,
            currencyCode: true,
            rawEventType: true,
            stripePaymentIntentId: true,
            createdAt: true,
            appointment: {
              select: {
                id: true,
                consultationType: true,
                countryCode: true,
                createdAt: true,
                service: { select: { name: true } },
                doctor: { select: { fullName: true } },
              },
            },
          },
          take: 200,
        });

        const items = payments.map((p) => ({
          id: p.id,
          appointmentId: p.appointment.id,
          consultationType: p.appointment.consultationType,
          countryCode: p.appointment.countryCode,
          serviceName: p.appointment.service?.name ?? null,
          doctorName: p.appointment.doctor?.fullName ?? null,
          status: p.status,
          amountCents: p.amountCents,
          currencyCode: p.currencyCode,
          eventType: p.rawEventType,
          bookedAt: p.appointment.createdAt.toISOString(),
          paidAt: p.createdAt.toISOString(),
          stripePaymentIntentId: p.stripePaymentIntentId ?? null,
        }));

        return okResponse({ items, total: items.length });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load payment history"));
      }
    },
  );
};

export default adminPatientProfileRoute;
