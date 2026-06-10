import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  applyPatientProfileUpdate,
  PricingPlanCountryMismatchError,
  serializeProfile,
} from "../modules/patient-profile/patient-profile.service.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import {
  listNationalityDocuments,
  adminUpdateNationalityVerification,
  NationalityNotFoundError,
} from "../services/patient-nationality.service.js";
import { getObject, streamToNodeReadable } from "../services/object-storage.js";
import { VerificationStatus } from "@prisma/client";
import { logAccess } from "../lib/access-log.js";

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
        const actor = await resolveOptionalAuthUser(request);
        await logAccess({
          patientProfileId: profile.id,
          globalHealthNumber: profile.globalHealthNumber,
          accessedByUserId: actor?.id ?? null,
          accessedByRole: "ADMIN",
          accessedResourceType: "PATIENT_PROFILE",
          accessAction: "VIEW",
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"] ?? null,
        });
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
        const actor = await resolveOptionalAuthUser(request);
        // Always audit the edit. Record only the changed FIELD NAMES, never
        // the values — the values are PHI/PII and must not land in the audit
        // log. The alert-specific event below keeps its existing shape.
        recordAudit({
          actorUserId: actor?.id ?? null,
          actorRole: actor?.role ?? "ADMIN",
          action: "PATIENT_PROFILE_UPDATED",
          entityType: "PatientProfile",
          entityId: profile?.id ?? email,
          metadata: { email, changedFields: Object.keys(body.data) },
          request,
        }).catch(() => {});
        if (alertChanges.statusAlert || alertChanges.clinicAlert) {
          recordAudit({
            actorUserId: actor?.id ?? null,
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
    if (!ghn && !email) {
      return reply.status(400).send(errorResponse("Provide ghn or email"));
    }
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

        const actor = await resolveOptionalAuthUser(request);
        const data: Record<string, unknown> = {};
        if (kind === "id") {
          data.idVerificationStatus = body.data.status;
          data.idVerificationAdminNotes = body.data.adminNotes ?? null;
          data.idVerificationReviewedBy = actor?.id ?? null;
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
          actorUserId: actor?.id ?? null,
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
        const actor = await resolveOptionalAuthUser(request);
        await logAccess({
          patientProfileId: profile.id,
          globalHealthNumber: profile.globalHealthNumber,
          accessedByUserId: actor?.id ?? null,
          accessedByRole: "ADMIN",
          accessedResourceType: "NationalityDocuments",
          accessAction: "VIEW",
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"] ?? null,
        });
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

        const actor = await resolveOptionalAuthUser(request);
        const doc = await adminUpdateNationalityVerification(profile.id, slotRaw, {
          verificationStatus: body.data.verificationStatus,
          adminNotes: body.data.adminNotes,
          reviewedByAdminId: actor?.id ?? null,
        });

        recordAudit({
          actorUserId: actor?.id ?? null,
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

      try {
        const row = await prisma.patientProfile.findUnique({
          where: { email },
          select: { id: true, globalHealthNumber: true, idDocumentKey: true, idDocumentBackKey: true },
        });
        const key = side === "back" ? row?.idDocumentBackKey : row?.idDocumentKey;
        if (!key) return reply.status(404).send(errorResponse("Document not found"));

        const obj = await getObject(key);
        const stream = streamToNodeReadable(obj.Body);
        if (!stream) return reply.status(404).send(errorResponse("Document not found"));

        const actor = await resolveOptionalAuthUser(request);
        await logAccess({
          patientProfileId: row!.id,
          globalHealthNumber: row!.globalHealthNumber,
          accessedByUserId: actor?.id ?? null,
          accessedByRole: "ADMIN",
          accessedResourceType: "IdDocument",
          accessAction: "DOWNLOAD",
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"] ?? null,
        });
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
      try {
        const row = await prisma.patientProfile.findUnique({
          where: { email },
          select: { id: true, globalHealthNumber: true, insuranceDocumentKey: true },
        });
        if (!row?.insuranceDocumentKey) return reply.status(404).send(errorResponse("Document not found"));

        const obj = await getObject(row.insuranceDocumentKey);
        const stream = streamToNodeReadable(obj.Body);
        if (!stream) return reply.status(404).send(errorResponse("Document not found"));

        const actor = await resolveOptionalAuthUser(request);
        await logAccess({
          patientProfileId: row.id,
          globalHealthNumber: row.globalHealthNumber,
          accessedByUserId: actor?.id ?? null,
          accessedByRole: "ADMIN",
          accessedResourceType: "InsuranceDocument",
          accessAction: "DOWNLOAD",
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"] ?? null,
        });
        void reply.header("Content-Type", obj.ContentType ?? "application/octet-stream");
        void reply.header("Cache-Control", "private, no-store");
        return reply.send(stream);
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Download failed"));
      }
    },
  );
};

export default adminPatientProfileRoute;
