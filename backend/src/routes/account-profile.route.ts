import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../utils/require-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  applyPatientProfileUpdate,
  PricingPlanCountryMismatchError,
  VerifiedPhoneLockedError,
  serializeProfile,
} from "../modules/patient-profile/patient-profile.service.js";
import {
  listNationalityDocuments,
  upsertNationalityDocument,
  deleteNationalityDocument,
  NationalitySlotConflictError,
  NationalityNotFoundError,
} from "../services/patient-nationality.service.js";
import { encryptPhi, decryptPhi } from "../lib/crypto/phi-crypto.js";
import {
  getVerificationSummary,
  openVerificationCycle,
  faceMatchAvailable,
  isVerificationRelevantForPatient,
} from "../modules/identity-verification/identity-verification.service.js";
import { recordCriticalAudit } from "../modules/audit/audit.service.js";
import { verifySniffedMime } from "../utils/sniff-mime.js";
import { guardMedicalRead, MedicalAccessDeniedError } from "../utils/guard-medical-read.js";
import {
  putObject,
  isMediaStorageConfigured,
  getObject,
  streamToNodeReadable,
} from "../services/object-storage.js";

/**
 * Patient self-service profile endpoints. The patient can edit
 * identity / address / pharmacy / plan and their own clinical baseline
 * (allergies, blood type, etc.), but NOT the doctor-only alerts —
 * `statusAlert` / `clinicAlert` are missing from this schema so the
 * .strict() guard rejects any attempt to set them. Doctor + admin
 * endpoints accept those fields separately.
 */
const stringField = (max: number) =>
  z.string().trim().max(max).nullable().optional();

const patientPatchSchema = z
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
    usualMedication: z.array(z.string().trim().max(200)).max(50).optional(),
    nationalIdNumber: stringField(64),
    taxIdNumber: stringField(64),
    passportNumber: stringField(64),
    utenteNumber: stringField(64),
    addressLine1: stringField(200),
    addressLine2: stringField(200),
    addressCity: stringField(120),
    addressState: stringField(120),
    addressPostalCode: stringField(32),
    addressCountryCode: stringField(8),
    preferredPharmacy: stringField(200),
    pricingPlanId: stringField(64),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field" });

const insurancePatchSchema = z
  .object({
    insuranceProviderName: stringField(200),
    insurancePolicyNumber: stringField(200),
    insuranceAdminNotes: z.undefined(), // patients cannot set admin notes
  })
  .strip()
  .refine((d) => Object.keys(d).length > 0, "Provide at least one field");

const nationalityUpsertSchema = z.object({
  nationalityCountry: z.string().trim().min(1).max(100),
  documentType: z.enum(["passport", "id_card", "residence_card", "nicop", "cnic", "other"]),
  documentNumber: z.string().trim().max(64).optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
});

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
/**
 * Selfies are photographs, never documents. Excluding PDF is not just tidiness:
 * the face matcher needs decodable image bytes, and a PDF "selfie" would sail
 * past upload only to produce an unscoreable cycle at review time.
 */
const SELFIE_ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;

async function requirePatient(request: { authUser?: { role: string; email: string; sub: string } | null }) {
  if (!request.authUser || request.authUser.role !== "PATIENT") {
    return null;
  }
  const profile = await prisma.patientProfile.findUnique({
    where: { email: request.authUser.email },
    select: {
      id: true,
      email: true,
      globalHealthNumber: true,
      userId: true,
    },
  });
  return profile;
}


const accountProfileRoute: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuth);

  // ─── Profile ─────────────────────────────────────────────────────────────

  app.get("/api/account/profile", async (request, reply) => {
    if (!request.authUser || request.authUser.role !== "PATIENT") {
      return reply.status(403).send(errorResponse("Patient access required"));
    }
    try {
      const profile = await prisma.patientProfile.findUnique({
        where: { email: request.authUser.email },
      });
      return okResponse({
        profile: serializeProfile(profile, { includeAlerts: false }),
      });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load profile"));
    }
  });

  app.patch("/api/account/profile", async (request, reply) => {
    if (!request.authUser || request.authUser.role !== "PATIENT") {
      return reply.status(403).send(errorResponse("Patient access required"));
    }
    const body = patientPatchSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid profile", body.error.flatten()));
    }
    try {
      const { dateOfBirth, ...rest } = body.data;
      const { profile } = await applyPatientProfileUpdate(
        request.authUser.email,
        {
          ...rest,
          ...(dateOfBirth !== undefined
            ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }
            : {}),
        },
        {
          actor: { userId: request.authUser.sub, role: "PATIENT" },
          ipAddress: request.ip,
        },
      );
      return okResponse({
        profile: serializeProfile(profile, { includeAlerts: false }),
      });
    } catch (error) {
      if (error instanceof VerifiedPhoneLockedError) {
        return reply.status(403).send(errorResponse(error.message));
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
  });

  // ─── Insurance ───────────────────────────────────────────────────────────

  app.get("/api/account/profile/insurance", async (request, reply) => {
    const profile = await requirePatient(request);
    if (!profile) return reply.status(403).send(errorResponse("Patient access required"));

    try {
      const row = await prisma.patientProfile.findUnique({
        where: { id: profile.id },
        select: {
          insuranceProviderName: true,
          insurancePolicyNumber: true,
          insuranceDocumentKey: true,
          insuranceDocumentStatus: true,
          insuranceAdminNotes: true,
        },
      });
      if (!row) return reply.status(404).send(errorResponse("Profile not found"));

      await guardMedicalRead(
        request,
        { userId: request.authUser!.sub, role: "PATIENT" },
        { patientProfileId: profile.id, resourceType: "INSURANCE_DOC", accessAction: "VIEWED" },
      ).catch((e) => { if (!(e instanceof MedicalAccessDeniedError)) throw e; });

      return okResponse({
        insurance: {
          insuranceProviderName: row.insuranceProviderName,
          insurancePolicyNumber: decryptPhi(row.insurancePolicyNumber),
          hasDocument: Boolean(row.insuranceDocumentKey),
          insuranceDocumentStatus: row.insuranceDocumentStatus,
        },
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load insurance details"));
    }
  });

  app.patch("/api/account/profile/insurance", async (request, reply) => {
    const profile = await requirePatient(request);
    if (!profile) return reply.status(403).send(errorResponse("Patient access required"));

    const body = insurancePatchSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid insurance payload", body.error.flatten()));
    }

    try {
      const update: Record<string, string | null | undefined> = {};
      if (body.data.insuranceProviderName !== undefined) {
        update.insuranceProviderName = body.data.insuranceProviderName ?? null;
      }
      if (body.data.insurancePolicyNumber !== undefined) {
        update.insurancePolicyNumber = body.data.insurancePolicyNumber
          ? encryptPhi(body.data.insurancePolicyNumber)
          : null;
      }
      await prisma.patientProfile.update({ where: { id: profile.id }, data: update });
      return okResponse({}, "Insurance details updated");
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not update insurance"));
    }
  });

  app.post("/api/account/profile/insurance/document", async (request, reply) => {
    const profile = await requirePatient(request);
    if (!profile) return reply.status(403).send(errorResponse("Patient access required"));
    if (!isMediaStorageConfigured()) {
      return reply.status(503).send(errorResponse("Upload storage not configured"));
    }

    let fileBuffer: Buffer | null = null;
    let mimetype = "application/octet-stream";

    for await (const part of request.parts()) {
      if (part.type === "file" && part.fieldname === "file") {
        fileBuffer = await part.toBuffer();
        mimetype = part.mimetype;
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return reply.status(400).send(errorResponse("File is required"));
    }
    if (fileBuffer.length > MAX_BYTES) {
      return reply.status(413).send(errorResponse("File too large (max 10 MB)"));
    }
    const sniffedMime = verifySniffedMime(fileBuffer, mimetype, ALLOWED_MIME);
    if (!sniffedMime) {
      return reply.status(400).send(errorResponse("File content does not match an allowed type (PDF, JPG, PNG, WebP)"));
    }
    mimetype = sniffedMime;

    const ext = mimetype === "application/pdf" ? "pdf" : mimetype.split("/")[1];
    const storageKey = `patient-docs/${profile.id}/insurance/${randomUUID()}.${ext}`;

    try {
      await putObject(storageKey, fileBuffer, mimetype);
      await prisma.patientProfile.update({
        where: { id: profile.id },
        data: {
          insuranceDocumentKey: storageKey,
          insuranceDocumentStatus: "PENDING",
        },
      });

      // Log-only by design: a patient's own-record access is never blocked
      // (even in enforce mode), so the guard runs after the write to record
      // only uploads that actually happened.
      await guardMedicalRead(
        request,
        { userId: request.authUser!.sub, role: "PATIENT" },
        { patientProfileId: profile.id, resourceType: "INSURANCE_DOC", accessAction: "UPLOADED" },
      ).catch((e) => { if (!(e instanceof MedicalAccessDeniedError)) throw e; });

      return okResponse({ uploaded: true }, "Insurance document uploaded");
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send(errorResponse("Upload failed"));
    }
  });

  // ─── ID document upload ───────────────────────────────────────────────────

  app.post("/api/account/profile/id-document", async (request, reply) => {
    const profile = await requirePatient(request);
    if (!profile) return reply.status(403).send(errorResponse("Patient access required"));
    if (!isMediaStorageConfigured()) {
      return reply.status(503).send(errorResponse("Upload storage not configured"));
    }

    let fileBuffer: Buffer | null = null;
    let mimetype = "application/octet-stream";
    let side: "front" | "back" = "front";
    let idDocumentType: string | null = null;

    for await (const part of request.parts()) {
      if (part.type === "field" && part.fieldname === "side") {
        side = String(part.value) === "back" ? "back" : "front";
      }
      if (part.type === "field" && part.fieldname === "documentType") {
        idDocumentType = String(part.value);
      }
      if (part.type === "file" && part.fieldname === "file") {
        fileBuffer = await part.toBuffer();
        mimetype = part.mimetype;
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return reply.status(400).send(errorResponse("File is required"));
    }
    if (fileBuffer.length > MAX_BYTES) {
      return reply.status(413).send(errorResponse("File too large (max 10 MB)"));
    }
    const sniffedMime = verifySniffedMime(fileBuffer, mimetype, ALLOWED_MIME);
    if (!sniffedMime) {
      return reply.status(400).send(errorResponse("File content does not match an allowed type"));
    }
    mimetype = sniffedMime;

    const ext = mimetype === "application/pdf" ? "pdf" : mimetype.split("/")[1];
    const storageKey = `patient-docs/${profile.id}/id-document/${side}-${randomUUID()}.${ext}`;

    try {
      await putObject(storageKey, fileBuffer, mimetype);
      const data: Record<string, string | null | undefined> = {
        idVerificationStatus: "PENDING",
      };
      if (side === "front") data.idDocumentKey = storageKey;
      else data.idDocumentBackKey = storageKey;
      if (idDocumentType) data.idDocumentType = idDocumentType;

      await prisma.patientProfile.update({ where: { id: profile.id }, data });

      await guardMedicalRead(
        request,
        { userId: request.authUser!.sub, role: "PATIENT" },
        { patientProfileId: profile.id, resourceType: "ID_DOC", accessAction: "UPLOADED" },
      ).catch((e) => { if (!(e instanceof MedicalAccessDeniedError)) throw e; });

      return okResponse({ uploaded: true, side }, `ID document (${side}) uploaded`);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send(errorResponse("Upload failed"));
    }
  });

  // ─── Identity verification: live selfie (Ireland controlled meds) ─────────

  app.post("/api/account/profile/identity-verification/selfie", async (request, reply) => {
    const profile = await requirePatient(request);
    if (!profile) return reply.status(403).send(errorResponse("Patient access required"));
    if (!isMediaStorageConfigured()) {
      return reply.status(503).send(errorResponse("Upload storage not configured"));
    }

    let fileBuffer: Buffer | null = null;
    let mimetype = "application/octet-stream";

    for await (const part of request.parts()) {
      if (part.type === "file" && part.fieldname === "file") {
        fileBuffer = await part.toBuffer();
        mimetype = part.mimetype;
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return reply.status(400).send(errorResponse("Photo is required"));
    }
    if (fileBuffer.length > MAX_BYTES) {
      return reply.status(413).send(errorResponse("Photo too large (max 10 MB)"));
    }
    const sniffedMime = verifySniffedMime(fileBuffer, mimetype, SELFIE_ALLOWED_MIME);
    if (!sniffedMime) {
      return reply.status(400).send(errorResponse("Photo must be a JPG, PNG or WebP image"));
    }
    mimetype = sniffedMime;

    // The ID document has to already be on file — there is nothing to match a
    // face against otherwise, and a selfie sitting alone in the review queue
    // just wastes a reviewer's time.
    const existing = await prisma.patientProfile.findUnique({
      where: { id: profile.id },
      select: { idDocumentKey: true },
    });
    if (!existing?.idDocumentKey) {
      return reply
        .status(409)
        .send(errorResponse("Upload your ID document before taking the verification photo"));
    }

    const ext = mimetype.split("/")[1];
    const storageKey = `patient-docs/${profile.id}/identity-verification/selfie-${randomUUID()}.${ext}`;

    try {
      await putObject(storageKey, fileBuffer, mimetype);
      await prisma.patientProfile.update({
        where: { id: profile.id },
        data: {
          selfieImageKey: storageKey,
          selfieUploadedAt: new Date(),
          // Back to PENDING even if they were VERIFIED before: a new face
          // submission is a new claim and has to be looked at again.
          idVerificationStatus: "PENDING",
        },
      });

      const event = await openVerificationCycle({
        patientProfileId: profile.id,
        selfieKey: storageKey,
        idDocumentKey: existing.idDocumentKey,
      });

      await guardMedicalRead(
        request,
        { userId: request.authUser!.sub, role: "PATIENT" },
        { patientProfileId: profile.id, resourceType: "SELFIE_IMAGE", accessAction: "UPLOADED" },
      ).catch((e) => { if (!(e instanceof MedicalAccessDeniedError)) throw e; });

      // Critical (not fire-and-forget): this is the moment biometric-adjacent
      // data enters the workflow, so a lost audit row must surface as an error.
      await recordCriticalAudit({
        actorUserId: request.authUser!.sub,
        actorRole: "PATIENT",
        action: "IDENTITY_VERIFICATION_SELFIE_SUBMITTED",
        entityType: "IdentityVerificationEvent",
        entityId: event.id,
        metadata: {
          patientProfileId: profile.id,
          referenceId: event.referenceId,
          method: event.method,
          faceMatchScore: event.faceMatchScore,
        },
        request,
      });

      return okResponse(
        {
          uploaded: true,
          status: "PENDING",
          referenceId: event.referenceId,
          // Never the score — the patient must not be able to tune their photo
          // against the matcher, and it is a reviewer's aid, not a result.
          automatedCheckRan: event.faceMatchScore !== null,
        },
        "Verification photo submitted for review",
      );
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send(errorResponse("Upload failed"));
    }
  });

  app.get("/api/account/profile/identity-verification", async (request, reply) => {
    const profile = await requirePatient(request);
    if (!profile) return reply.status(403).send(errorResponse("Patient access required"));

    try {
      const summary = await getVerificationSummary(profile.id);
      if (!summary) return reply.status(404).send(errorResponse("Profile not found"));

      const relevant = await isVerificationRelevantForPatient({
        patientProfileId: profile.id,
        patientEmail: profile.email,
      });

      return okResponse({
        identityVerification: {
          relevant,
          status: summary.status,
          verifiedAt: summary.verifiedAt,
          hasIdDocument: summary.hasIdDocument,
          hasSelfie: summary.hasSelfie,
          selfieUploadedAt: summary.selfieUploadedAt,
          requestedAt: summary.requestedAt,
          referenceId: summary.latestEvent?.referenceId ?? null,
          reviewNotes: summary.latestEvent?.reviewNotes ?? null,
          automatedCheckAvailable: faceMatchAvailable(),
        },
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load identity verification"));
    }
  });

  // ─── Verification status (read-only for patient) ──────────────────────────

  app.get("/api/account/profile/verification", async (request, reply) => {
    const profile = await requirePatient(request);
    if (!profile) return reply.status(403).send(errorResponse("Patient access required"));

    try {
      const row = await prisma.patientProfile.findUnique({
        where: { id: profile.id },
        select: {
          idVerificationStatus: true,
          idDocumentType: true,
          idVerificationAdminNotes: true,
          idVerificationReviewedAt: true,
          phoneVerificationStatus: true,
          phoneVerifiedAt: true,
          emailVerificationStatus: true,
          emailVerifiedAt: true,
          insuranceDocumentStatus: true,
        },
      });
      if (!row) return reply.status(404).send(errorResponse("Profile not found"));

      await guardMedicalRead(
        request,
        { userId: request.authUser!.sub, role: "PATIENT" },
        { patientProfileId: profile.id, resourceType: "VERIFICATION_STATUS", accessAction: "VIEWED" },
      ).catch((e) => { if (!(e instanceof MedicalAccessDeniedError)) throw e; });

      return okResponse({ verification: row });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load verification status"));
    }
  });

  // ─── Nationality documents ────────────────────────────────────────────────

  app.get("/api/account/profile/nationality", async (request, reply) => {
    const profile = await requirePatient(request);
    if (!profile) return reply.status(403).send(errorResponse("Patient access required"));

    try {
      const docs = await listNationalityDocuments(profile.id);

      await guardMedicalRead(
        request,
        { userId: request.authUser!.sub, role: "PATIENT" },
        { patientProfileId: profile.id, resourceType: "NATIONALITY_DOC", accessAction: "VIEWED" },
      ).catch((e) => { if (!(e instanceof MedicalAccessDeniedError)) throw e; });

      return okResponse({ nationalityDocuments: docs });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load nationality documents"));
    }
  });

  app.put("/api/account/profile/nationality/:slot", async (request, reply) => {
    const profile = await requirePatient(request);
    if (!profile) return reply.status(403).send(errorResponse("Patient access required"));

    const slotRaw = Number((request.params as { slot: string }).slot);
    if (slotRaw !== 1 && slotRaw !== 2) {
      return reply.status(400).send(errorResponse("slot must be 1 or 2"));
    }
    const slot = slotRaw as 1 | 2;

    const body = nationalityUpsertSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid nationality payload", body.error.flatten()));
    }

    try {
      const doc = await upsertNationalityDocument(profile.id, profile.globalHealthNumber ?? null, {
        slotNumber: slot,
        nationalityCountry: body.data.nationalityCountry,
        documentType: body.data.documentType,
        documentNumber: body.data.documentNumber,
        expiryDate: body.data.expiryDate ? new Date(body.data.expiryDate) : null,
      });
      return okResponse({ nationalityDocument: doc });
    } catch (error) {
      if (error instanceof NationalitySlotConflictError) {
        return reply.status(422).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not save nationality document"));
    }
  });

  app.delete("/api/account/profile/nationality/:slot", async (request, reply) => {
    const profile = await requirePatient(request);
    if (!profile) return reply.status(403).send(errorResponse("Patient access required"));

    const slotRaw = Number((request.params as { slot: string }).slot);
    if (slotRaw !== 1 && slotRaw !== 2) {
      return reply.status(400).send(errorResponse("slot must be 1 or 2"));
    }

    try {
      await deleteNationalityDocument(profile.id, slotRaw);
      return okResponse({}, "Nationality document deleted");
    } catch (error) {
      if (error instanceof NationalityNotFoundError) {
        return reply.status(404).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not delete nationality document"));
    }
  });

  app.post("/api/account/profile/nationality/:slot/upload", async (request, reply) => {
    const profile = await requirePatient(request);
    if (!profile) return reply.status(403).send(errorResponse("Patient access required"));
    if (!isMediaStorageConfigured()) {
      return reply.status(503).send(errorResponse("Upload storage not configured"));
    }

    const slotRaw = Number((request.params as { slot: string }).slot);
    if (slotRaw !== 1 && slotRaw !== 2) {
      return reply.status(400).send(errorResponse("slot must be 1 or 2"));
    }

    let fileBuffer: Buffer | null = null;
    let mimetype = "application/octet-stream";
    let side: "front" | "back" = "front";

    for await (const part of request.parts()) {
      if (part.type === "field" && part.fieldname === "side") {
        side = String(part.value) === "back" ? "back" : "front";
      }
      if (part.type === "file" && part.fieldname === "file") {
        fileBuffer = await part.toBuffer();
        mimetype = part.mimetype;
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return reply.status(400).send(errorResponse("File is required"));
    }
    if (fileBuffer.length > MAX_BYTES) {
      return reply.status(413).send(errorResponse("File too large (max 10 MB)"));
    }
    const sniffedMime = verifySniffedMime(fileBuffer, mimetype, ALLOWED_MIME);
    if (!sniffedMime) {
      return reply.status(400).send(errorResponse("File content does not match an allowed type"));
    }
    mimetype = sniffedMime;

    const ext = mimetype === "application/pdf" ? "pdf" : mimetype.split("/")[1];
    const storageKey = `patient-docs/${profile.id}/nationality-${slotRaw}/${side}-${randomUUID()}.${ext}`;

    try {
      await putObject(storageKey, fileBuffer, mimetype);
      const data: Record<string, string | null | undefined> = {};
      if (side === "front") data.frontFileKey = storageKey;
      else data.backFileKey = storageKey;

      // Ensure nationality doc row exists before setting file key
      const existing = await prisma.patientNationalityDocument.findUnique({
        where: { patientProfileId_slotNumber: { patientProfileId: profile.id, slotNumber: slotRaw } },
        select: { id: true },
      });
      if (!existing) {
        return reply.status(404).send(errorResponse("Create the nationality record first before uploading documents."));
      }

      await prisma.patientNationalityDocument.update({
        where: { patientProfileId_slotNumber: { patientProfileId: profile.id, slotNumber: slotRaw } },
        data,
      });

      await guardMedicalRead(
        request,
        { userId: request.authUser!.sub, role: "PATIENT" },
        { patientProfileId: profile.id, resourceType: "NATIONALITY_DOC", accessAction: "UPLOADED" },
      ).catch((e) => { if (!(e instanceof MedicalAccessDeniedError)) throw e; });

      return okResponse({ uploaded: true, side, slot: slotRaw }, "Document uploaded");
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send(errorResponse("Upload failed"));
    }
  });

  // ─── Secure downloads (streaming) ────────────────────────────────────────

  app.get("/api/account/profile/id-document/download", async (request, reply) => {
    const profile = await requirePatient(request);
    if (!profile) return reply.status(403).send(errorResponse("Patient access required"));

    const side = ((request.query as { side?: string }).side ?? "front") === "back" ? "back" : "front";

    try {
      const row = await prisma.patientProfile.findUnique({
        where: { id: profile.id },
        select: { idDocumentKey: true, idDocumentBackKey: true },
      });
      const key = side === "back" ? row?.idDocumentBackKey : row?.idDocumentKey;
      if (!key) return reply.status(404).send(errorResponse("Document not found"));

      await guardMedicalRead(
        request,
        { userId: request.authUser!.sub, role: "PATIENT" },
        { patientProfileId: profile.id, resourceType: "ID_DOC", accessAction: "DOWNLOADED" },
      ).catch((e) => { if (!(e instanceof MedicalAccessDeniedError)) throw e; });

      const obj = await getObject(key);
      const stream = streamToNodeReadable(obj.Body);
      if (!stream) return reply.status(404).send(errorResponse("Document not found"));

      const contentType = obj.ContentType ?? "application/octet-stream";
      void reply.header("Content-Type", contentType);
      void reply.header("Cache-Control", "private, no-store");
      // nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write -- streaming an S3 object's Node Readable via Fastify's typed reply.send(), not writing an HTML string built from user input; this rule is tuned for Express res.write(userInput).
      return reply.send(stream);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send(errorResponse("Download failed"));
    }
  });

  app.get("/api/account/profile/identity-verification/selfie/download", async (request, reply) => {
    const profile = await requirePatient(request);
    if (!profile) return reply.status(403).send(errorResponse("Patient access required"));

    try {
      const row = await prisma.patientProfile.findUnique({
        where: { id: profile.id },
        select: { selfieImageKey: true },
      });
      if (!row?.selfieImageKey) return reply.status(404).send(errorResponse("Photo not found"));

      await guardMedicalRead(
        request,
        { userId: request.authUser!.sub, role: "PATIENT" },
        { patientProfileId: profile.id, resourceType: "SELFIE_IMAGE", accessAction: "DOWNLOADED" },
      ).catch((e) => { if (!(e instanceof MedicalAccessDeniedError)) throw e; });

      const obj = await getObject(row.selfieImageKey);
      const stream = streamToNodeReadable(obj.Body);
      if (!stream) return reply.status(404).send(errorResponse("Photo not found"));

      void reply.header("Content-Type", obj.ContentType ?? "application/octet-stream");
      void reply.header("Cache-Control", "private, no-store");
      // nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write -- streaming an S3 object's Node Readable via Fastify's typed reply.send(), not writing an HTML string built from user input; this rule is tuned for Express res.write(userInput).
      return reply.send(stream);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send(errorResponse("Download failed"));
    }
  });

  app.get("/api/account/profile/nationality/:slot/download", async (request, reply) => {
    const profile = await requirePatient(request);
    if (!profile) return reply.status(403).send(errorResponse("Patient access required"));

    const slotRaw = Number((request.params as { slot: string }).slot);
    if (slotRaw !== 1 && slotRaw !== 2) {
      return reply.status(400).send(errorResponse("slot must be 1 or 2"));
    }
    const side = ((request.query as { side?: string }).side ?? "front") === "back" ? "back" : "front";

    try {
      const doc = await prisma.patientNationalityDocument.findUnique({
        where: { patientProfileId_slotNumber: { patientProfileId: profile.id, slotNumber: slotRaw } },
        select: { frontFileKey: true, backFileKey: true },
      });
      const key = side === "back" ? doc?.backFileKey : doc?.frontFileKey;
      if (!key) return reply.status(404).send(errorResponse("Document not found"));

      await guardMedicalRead(
        request,
        { userId: request.authUser!.sub, role: "PATIENT" },
        { patientProfileId: profile.id, resourceType: "NATIONALITY_DOC", accessAction: "DOWNLOADED" },
      ).catch((e) => { if (!(e instanceof MedicalAccessDeniedError)) throw e; });

      const obj = await getObject(key);
      const stream = streamToNodeReadable(obj.Body);
      if (!stream) return reply.status(404).send(errorResponse("Document not found"));

      void reply.header("Content-Type", obj.ContentType ?? "application/octet-stream");
      void reply.header("Cache-Control", "private, no-store");
      // nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write -- streaming an S3 object's Node Readable via Fastify's typed reply.send(), not writing an HTML string built from user input; this rule is tuned for Express res.write(userInput).
      return reply.send(stream);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send(errorResponse("Download failed"));
    }
  });
};

export default accountProfileRoute;
