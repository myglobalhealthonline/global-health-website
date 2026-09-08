import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { PatientAlertType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "../db/prisma.js";
import { verifyAdminAccess, resolveAdminSessionActor } from "../utils/admin-auth.js";
import {
  resolvePatientContextByPatientEmail,
  resolvePatientProfileIdByPatientEmail,
} from "../modules/patient-profile/appointment-patient-link.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  applyPatientProfileUpdate,
  upsertPatientProfileByEmail,
  PatientProfileAnonymizedError,
  PatientProfileEmailConflictError,
  PatientProfileNotFoundError,
  PricingPlanCountryMismatchError,
  serializeProfile,
  writePatientProfile,
} from "../modules/patient-profile/patient-profile.service.js";
import { issuePasswordResetToken } from "../modules/auth/auth.service.js";
import { absoluteSiteUrl } from "../lib/email/send-email.js";
import { emailSchema, fullNameSchema } from "../validations/shared.schema.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import {
  AlertNotFoundError,
  AlertRemovalRequiresNoteError,
  listPatientAlertLog,
  recordAlertChanges,
  removePatientAlert,
} from "../modules/patient-profile/patient-alert-log.service.js";
import {
  listNationalityDocuments,
  adminUpdateNationalityVerification,
  NationalityNotFoundError,
} from "../services/patient-nationality.service.js";
import { getObject, streamToNodeReadable } from "../services/object-storage.js";
import { VerificationStatus } from "@prisma/client";
import { guardMedicalRead, MedicalAccessDeniedError, medicalAccessDeniedResponse } from "../utils/guard-medical-read.js";
import { resolveAdminListCountryFolders } from "../utils/order-country-scope.js";

const stringField = (max: number) =>
  z.string().trim().max(max).nullable().optional();

/** `:type` path segment → PatientAlertType. */
const adminAlertTypeParam = z
  .enum(["status", "clinic"])
  .transform((value): PatientAlertType => (value === "status" ? "STATUS" : "CLINIC"));

const adminRemoveAlertSchema = z.object({
  note: z.string().trim().min(3).max(500),
});

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
    usualMedication: z.array(z.string().trim().max(200)).max(50).optional(),
    bloodPressureSystolic: z.number().int().positive().max(400).nullable().optional(),
    bloodPressureDiastolic: z.number().int().positive().max(300).nullable().optional(),
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
    statusAlert: stringField(500),
    clinicAlert: stringField(500),
    pricingPlanId: stringField(64),
    insuranceProviderName: stringField(200),
    insurancePolicyNumber: stringField(200),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field" });

// Admin-initiated patient creation. email + fullName required; the rest of the
// identity/address fields are optional and handled by applyPatientProfileUpdate
// (same path as the manual-booking flow).
const adminCreatePatientSchema = z
  .object({
    email: emailSchema,
    fullName: fullNameSchema,
    phone: stringField(40),
    dateOfBirth: z.string().datetime().nullable().optional(),
    nationalIdNumber: stringField(64),
    taxIdNumber: stringField(64),
    passportNumber: stringField(64),
    addressLine1: stringField(200),
    addressLine2: stringField(200),
    addressCity: stringField(120),
    addressState: stringField(120),
    addressPostalCode: stringField(32),
    addressCountryCode: stringField(8),
  })
  .strict();

const adminPatientProfileRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  // ─── Admin: create a new patient manually ──────────────────────────────────
  // Mints a PATIENT User + PatientProfile (with GHN) from scratch, mirroring the
  // manual-booking onboarding: a temp password is set with mustChangePassword,
  // and a 7-day invite reset link is returned so the admin can hand the patient
  // a one-click path to set their own password.
  app.post("/api/admin/patients", async (request, reply) => {
    const parsed = adminCreatePatientSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Invalid patient", parsed.error.flatten()));
    }
    const email = parsed.data.email.trim().toLowerCase();
    try {
      // Reject if any account already owns this email — "create" must not
      // silently edit an existing patient or collide with a doctor/admin login.
      const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (existing) {
        return reply
          .status(409)
          .send(errorResponse("An account with that email already exists"));
      }

      const tempHash = await bcrypt.hash(randomBytes(12).toString("base64url"), 12);
      const dob = parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null;

      const { userId, profile: baseProfile } = await upsertPatientProfileByEmail(
        {
          email,
          fullName: parsed.data.fullName,
          phone: parsed.data.phone ?? null,
          dateOfBirth: dob,
        },
        { passwordHashOverride: tempHash, mustChangePassword: true },
      );
      if (!userId) {
        // Non-patient role owns the email (race with the pre-check above).
        return reply
          .status(409)
          .send(errorResponse("An account with that email already exists"));
      }

      // Persist the optional identity/address fields via the shared write path
      // (same validation + PHI encryption + blind-index handling as self-edit).
      let profile: Awaited<ReturnType<typeof prisma.patientProfile.findUnique>> = baseProfile;
      const idAddress = {
        ...(parsed.data.nationalIdNumber !== undefined
          ? { nationalIdNumber: parsed.data.nationalIdNumber?.trim() || null }
          : {}),
        ...(parsed.data.taxIdNumber !== undefined
          ? { taxIdNumber: parsed.data.taxIdNumber?.trim() || null }
          : {}),
        ...(parsed.data.passportNumber !== undefined
          ? { passportNumber: parsed.data.passportNumber?.trim() || null }
          : {}),
        ...(parsed.data.addressLine1 !== undefined
          ? { addressLine1: parsed.data.addressLine1?.trim() || null }
          : {}),
        ...(parsed.data.addressLine2 !== undefined
          ? { addressLine2: parsed.data.addressLine2?.trim() || null }
          : {}),
        ...(parsed.data.addressCity !== undefined
          ? { addressCity: parsed.data.addressCity?.trim() || null }
          : {}),
        ...(parsed.data.addressState !== undefined
          ? { addressState: parsed.data.addressState?.trim() || null }
          : {}),
        ...(parsed.data.addressPostalCode !== undefined
          ? { addressPostalCode: parsed.data.addressPostalCode?.trim() || null }
          : {}),
        ...(parsed.data.addressCountryCode !== undefined
          ? { addressCountryCode: parsed.data.addressCountryCode?.trim().toLowerCase() || null }
          : {}),
      };
      if (Object.keys(idAddress).length > 0) {
        const creatingActor = resolveAdminSessionActor(request);
        const updated = await applyPatientProfileUpdate(email, idAddress, {
          fallbackFullName: parsed.data.fullName,
          fallbackPhone: parsed.data.phone ?? null,
          actor: { userId: creatingActor?.userId ?? null, role: creatingActor?.role ?? "ADMIN" },
          ipAddress: request.ip,
        });
        profile = updated.profile;
      }

      const inviteToken = await issuePasswordResetToken(userId, {
        ttlMinutes: 7 * 24 * 60,
        isInvite: true,
      });
      const inviteUrl = absoluteSiteUrl(
        `/reset-password?token=${encodeURIComponent(inviteToken)}&invite=1`,
      );

      const actor = resolveAdminSessionActor(request);
      recordAudit({
        actorUserId: actor?.userId ?? null,
        actorRole: actor?.role ?? "ADMIN",
        // No dedicated CREATED enum value exists; flag the create in metadata.
        action: "PATIENT_PROFILE_UPDATED",
        entityType: "PatientProfile",
        // The chart that was written, never the address it was typed under: an
        // address can be released by an anonymized patient and re-registered by
        // somebody new, so an audit row keyed on one names the wrong person the
        // moment it moves.
        entityId: profile?.id ?? "unknown",
        // Identity only — never the PHI/PII field values.
        metadata: { patientProfileId: profile?.id ?? null, created: true },
        request,
      }).catch(() => {});

      return reply
        .status(201)
        .send(okResponse({
          profile: serializeProfile(profile, { includeAlerts: true }),
          inviteUrl,
        }));
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not create patient"));
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
        // Resolved through the durable appointment→patient link: admins reach
        // patients by the address the portal holds, which comes from
        // `Appointment.email` and survives anonymization, while
        // `PatientProfile.email` becomes a tombstone. Null (never a guess) when
        // the address maps to more than one patient.
        const profileId = await resolvePatientProfileIdByPatientEmail(email);
        const profile = profileId
          ? await prisma.patientProfile.findUnique({ where: { id: profileId } })
          : null;
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
              .send(medicalAccessDeniedResponse(guardError));
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
      // Identity before persistence, the same rule the doctor portal now
      // follows. The GET above already resolves through the durable link; this
      // PATCH went straight to the address-keyed upsert, so the two could name
      // different rows. Two concrete failures: an admin editing a retained
      // record whose address was released got a brand-new duplicate chart at
      // that address instead of an edit, and an admin working from a stale
      // reference to an address a new person has since registered wrote onto
      // THAT person's chart. The admin shape pools the live holder with every
      // linked patient and requires exactly one, so an ambiguous address is a
      // refusal rather than a guess.
      const context = await resolvePatientContextByPatientEmail(email);
      const resolvedId = context?.patientProfileId ?? null;
      const resolved = resolvedId
        ? await prisma.patientProfile.findUnique({
            where: { id: resolvedId },
            select: { id: true, anonymizedAt: true },
          })
        : null;
      if (resolvedId && !resolved) {
        return reply.status(404).send(errorResponse("Patient profile not found"));
      }
      if (!resolvedId) {
        // A null resolution means "no candidate" OR "several" — the resolver
        // deliberately reports both the same way. Only the first is the
        // create-on-edit case, so both kinds of candidate have to be excluded
        // before inventing a chart here: a live holder the address cannot be
        // shown to identify, AND any patient a linked appointment already puts
        // at it. Checking the live holder alone left the ambiguous shape that
        // has no current holder — two retained/re-addressed patients each with
        // a linked appointment here — falling through to the upsert, which
        // creates a THIRD chart at the address, skips the guard below (there is
        // no resolved id to authorize against) and leaves no medical-access
        // trail.
        const [holder, linked] = await Promise.all([
          prisma.patientProfile.findUnique({ where: { email }, select: { id: true } }),
          prisma.appointment.findFirst({
            where: {
              email: { equals: email, mode: "insensitive" },
              patientProfileId: { not: null },
            },
            select: { id: true },
          }),
        ]);
        if (holder || linked) {
          return reply.status(404).send(errorResponse("Patient profile not found"));
        }
      }
      // Central guard, the same one the sibling GET already ran. This handler
      // writes the entire clinical + identity surface and had no guard call at
      // all, so a LOCAL_ADMIN's country scope — which nothing else on this
      // route enforces — went unchecked on WRITES while it was enforced on the
      // read next door, and no MedicalAccessLog row was ever produced for an
      // admin edit. Skipped only where `resolvedId` is null, which is the
      // long-standing create-on-edit path: no record exists yet, so there is
      // nothing to authorize against (same shape as the doctor portal's
      // `absent` branch).
      if (resolvedId) {
        const guardActor = resolveAdminSessionActor(request);
        try {
          await guardMedicalRead(
            request,
            { userId: guardActor?.userId ?? "", role: guardActor?.role ?? "ADMIN" },
            {
              patientProfileId: resolvedId,
              resourceType: "SENSITIVE_PROFILE",
              accessAction: "UPDATED",
              // The resolver's OWN appointment, never a separately-picked row:
              // at a reused address a row chosen by email can belong to a
              // different patient than the chart being written.
              relatedAppointmentId: context?.appointmentId ?? null,
            },
          );
        } catch (guardError) {
          if (guardError instanceof MedicalAccessDeniedError) {
            return reply.status(403).send(medicalAccessDeniedResponse(guardError));
          }
          throw guardError;
        }
      }
      // An anonymized chart is a retained clinical record whose personal data
      // was erased on a legal instruction. Writing it back would undo that.
      // Deliberately AFTER the guard, unlike the doctor portal: there
      // `resolveChartTarget` is narrowed by `doctorId`, so reaching this point
      // already proves a treatment relationship. The admin resolver narrows by
      // nothing, so answering 409 first told an out-of-scope LOCAL_ADMIN that a
      // record exists and is anonymized without ever passing the scope check
      // that is this route's only country boundary — and without logging the
      // attempt.
      if (resolved?.anonymizedAt) {
        return reply
          .status(409)
          .send(errorResponse("This record has been anonymized and can no longer be edited"));
      }
      try {
        const { dateOfBirth, ...rest } = body.data;
        const actor = resolveAdminSessionActor(request);
        const fields = {
          ...rest,
          ...(dateOfBirth !== undefined
            ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }
            : {}),
        };
        const { profile, alertChanges, alertPrevious } = await writePatientProfile(
          // The resolved id where there is one; otherwise the address is
          // genuinely unheld and this is the admin's long-standing
          // create-on-edit path, which stays as it was.
          resolvedId
            ? { kind: "id", patientProfileId: resolvedId }
            : { kind: "create", email },
          fields,
          {
            actor: { userId: actor?.userId ?? null, role: actor?.role ?? "ADMIN" },
            ipAddress: request.ip,
          },
        );
        // Always audit the edit. Record only the changed FIELD NAMES, never
        // the values — the values are PHI/PII and must not land in the audit
        // log. The alert-specific event below keeps its existing shape.
        recordAudit({
          actorUserId: actor?.userId ?? null,
          actorRole: actor?.role ?? "ADMIN",
          action: "PATIENT_PROFILE_UPDATED",
          entityType: "PatientProfile",
          // The chart that was actually written, never the address that was
          // typed — at a reused address the two name different people.
          entityId: profile?.id ?? "unknown",
          metadata: {
            patientProfileId: profile?.id ?? null,
            changedFields: Object.keys(body.data),
          },
          request,
        }).catch(() => {});
        if ((alertChanges.statusAlert || alertChanges.clinicAlert) && profile) {
          // Chart-visible history, same rows the doctor portal reads. REMOVED
          // rows only ever come from the remove endpoint below.
          void recordAlertChanges({
            patientProfileId: profile.id,
            actor: {
              userId: actor?.userId ?? null,
              role: actor?.role ?? "ADMIN",
              name: null,
            },
            before: alertPrevious,
            after: {
              statusAlert: profile.statusAlert,
              clinicAlert: profile.clinicAlert,
            },
          });
        }
        if (alertChanges.statusAlert || alertChanges.clinicAlert) {
          recordAudit({
            actorUserId: actor?.userId ?? null,
            actorRole: actor?.role ?? "ADMIN",
            action: "PATIENT_ALERT_UPDATED",
            entityType: "PatientProfile",
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
          }).catch(() => {});
        }
        return okResponse({
          profile: serializeProfile(profile, { includeAlerts: true }),
        });
      } catch (error) {
        if (error instanceof AlertRemovalRequiresNoteError) {
          return reply.status(400).send(errorResponse(error.message));
        }
        if (error instanceof PricingPlanCountryMismatchError) {
          return reply.status(400).send(errorResponse(error.message));
        }
        // The resolved chart went away, or the address was claimed, between the
        // resolution above and the write — the patient this edit was aimed at
        // is no longer the one a retry would reach.
        if (error instanceof PatientProfileNotFoundError) {
          return reply.status(404).send(errorResponse("Patient profile not found"));
        }
        if (error instanceof PatientProfileAnonymizedError) {
          return reply
            .status(409)
            .send(errorResponse("This record has been anonymized and can no longer be edited"));
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
  // ─── GHN search ────────────────────────────────────────────────────────────

  app.get("/api/admin/patients/search", async (request, reply) => {
    const query = z
      .object({
        ghn: z.string().trim().optional(),
        email: z.string().trim().optional(),
        phone: z.string().trim().max(32).optional(),
        taxId: z.string().trim().max(64).optional(),
        name: z.string().trim().max(200).optional(),
        idNumber: z.string().trim().max(64).optional(),
        plan: z.string().trim().max(120).optional(),
        /// Country folder scope — the admin shell sends the picked country so
        /// Patients behaves like the other country-scoped sections.
        countryCode: z.string().trim().min(2).max(8).optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(50).default(20),
      })
      .safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid query", query.error.flatten()));
    }
    const { ghn, email, phone, taxId, name, idNumber, plan, countryCode, page, pageSize } =
      query.data;
    try {
      // LOCAL_ADMIN is country-scoped: clamp the result set to the folders they
      // are allowed, server-side. Without this a country-scoped admin could
      // enumerate every patient globally by simply dropping the countryCode
      // param (the UI treats country as a default, not a restriction).
      // Role/folders are re-read from the DB, never trusted from the JWT.
      const actor = resolveAdminSessionActor(request);
      let folderClamp: string[] | null = null;
      if (actor?.role === "LOCAL_ADMIN") {
        const u = await prisma.user.findUnique({
          where: { id: actor.userId },
          select: { allowedCountryFolders: true },
        });
        folderClamp = (u?.allowedCountryFolders ?? []).map((f) => f.trim().toLowerCase());
        if (folderClamp.length === 0) {
          return okResponse({
            items: [],
            pagination: { page, pageSize, total: 0, totalPages: 0 },
          });
        }
      }
      const requested = countryCode?.trim().toLowerCase();
      if (requested && folderClamp && !folderClamp.includes(requested)) {
        return reply.status(403).send(errorResponse("Country is outside your admin scope"));
      }

      const where: Record<string, unknown> = {};
      // A merged duplicate is not a patient any more — its records now live on
      // the surviving profile. `isMerged` was being written by the merge
      // service and read by nothing, so a completed merge left both copies in
      // this list and the duplicate stayed bookable. Set as its own key rather
      // than folded into `where.OR`, which the ID-number filter below owns.
      where.isMerged = false;
      // Country folder codes are stored lowercase (matching Country.code);
      // match case-insensitively so a stray legacy uppercase row still hits.
      if (requested) where.countryFolderCode = { equals: requested, mode: "insensitive" };
      else if (folderClamp) where.countryFolderCode = { in: folderClamp };
      if (ghn) where.globalHealthNumber = { contains: ghn, mode: "insensitive" };
      if (email) where.email = { contains: email, mode: "insensitive" };
      if (phone) where.phone = { contains: phone, mode: "insensitive" };
      if (name) where.fullName = { contains: name, mode: "insensitive" };
      // Fiscal / tax ID (NIF/PPS/CPF). Substring match works while PHI
      // encryption is off (the default). When PHI_ENCRYPTION_KEY is set the
      // column holds AES ciphertext, so a DB substring match can't hit — a
      // decrypt-then-scan search would be needed for that mode.
      if (taxId) where.taxIdNumber = { contains: taxId, mode: "insensitive" };
      // ID card: match either national ID or passport (same PHI caveat).
      if (idNumber) {
        where.OR = [
          { nationalIdNumber: { contains: idNumber, mode: "insensitive" } },
          { passportNumber: { contains: idNumber, mode: "insensitive" } },
        ];
      }
      // Healthcare plan by name (the enrolled PricingPlan).
      if (plan) where.pricingPlan = { name: { contains: plan, mode: "insensitive" } };

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
  //
  // It returns ONLY what a booking form selects on — email, name, date of
  // birth, phone and the booking counters. It deliberately does NOT return the
  // decrypted identity surface (national ID, tax ID, passport, utente number,
  // postal address, insurance policy number) it used to: this fires per
  // keystroke and hands back up to 50 patients at a time, so those documents
  // were being disclosed in bulk for patients nobody chose to open, with no
  // `MedicalAccessLog` row behind any of it. Guarding it per row is not the
  // answer either — 50 guard calls per keystroke would bury the access log in
  // rows nobody read and make the trail useless. The identity prefill belongs
  // on `GET /api/admin/patients/:email/profile`, which already runs
  // `guardMedicalRead` and writes exactly one log row for the one patient the
  // admin actually selected; the booking forms call it from `selectPatient`.
  //
  // With nothing sensitive left in the response there is nothing here for
  // `MedicalAccessLog` to record, which is why this handler stays unguarded.
  // It is still country-clamped: a LOCAL_ADMIN must not even be offered a
  // patient from a folder they do not administer, the same clamp the sibling
  // `/api/admin/patients/search` applies.
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
      // Same country clamp the rest of the admin lists use: null for
      // ADMIN / SUPER_ADMIN, who legitimately reach every folder, and the
      // assigned folders for a LOCAL_ADMIN. An empty array is a country-scoped
      // admin with no folders assigned — `{ in: [] }` correctly matches
      // nothing rather than falling open.
      const scopedFolders = await resolveAdminListCountryFolders(request);
      const [appointments, profiles] = await Promise.all([
        prisma.appointment.findMany({
          // Both legs have to be clamped: a patient is reachable through their
          // appointment history as well as their profile row, so clamping only
          // one still offers the other.
          where: {
            email: { contains: q, mode: "insensitive" },
            ...(scopedFolders ? { countryCode: { in: scopedFolders } } : {}),
          },
          select: { email: true, fullName: true, dateOfBirth: true, phone: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 300,
        }),
        prisma.patientProfile.findMany({
          // Never offer a merged duplicate as a booking target — picking it
          // would start building a record on a profile that has already been
          // folded into someone else.
          where: {
            email: { contains: q, mode: "insensitive" },
            isMerged: false,
            ...(scopedFolders ? { countryFolderCode: { in: scopedFolders } } : {}),
          },
          select: {
            email: true,
            fullName: true,
            dateOfBirth: true,
            phone: true,
          },
          take: 50,
        }),
      ]);

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
            return reply.status(403).send(medicalAccessDeniedResponse(guardError));
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
          return reply.status(403).send(medicalAccessDeniedResponse(guardError));
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
          return reply.status(403).send(medicalAccessDeniedResponse(guardError));
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
  // ─── Alert history + removal (mirrors the doctor portal) ───────────────────

  app.get<{ Params: { email: string } }>(
    "/api/admin/patients/:email/alert-log",
    async (request, reply) => {
      let email: string;
      try {
        email = decodeURIComponent(request.params.email).trim().toLowerCase();
      } catch {
        return reply.status(400).send(errorResponse("Invalid email param"));
      }
      try {
        // Identity before authorization. This endpoint used to read the live
        // holder of the address directly, which is wrong in both directions:
        // anonymization tombstones `PatientProfile.email`, so a retained
        // patient's own history became unreachable, while the address it
        // released now answers for whoever registered with it next.
        const context = await resolvePatientContextByPatientEmail(email);
        // Nobody the address can be shown to identify — an empty list, not a
        // 404, so the chart card renders its empty state. Nothing is
        // authorized here and nothing is disclosed, so nothing is logged.
        if (!context) return okResponse({ entries: [] });

        // The alert log is verbatim clinical free-text (the alert wording plus
        // the removal rationale) and went out with no guard call at all — no
        // decision, no MedicalAccessLog row, and a LOCAL_ADMIN's country scope
        // unenforced. Guarded BEFORE the rows are read, so a denial carries no
        // alert content.
        const actor = resolveAdminSessionActor(request);
        try {
          await guardMedicalRead(
            request,
            { userId: actor?.userId ?? "", role: actor?.role ?? "ADMIN" },
            {
              patientProfileId: context.patientProfileId,
              resourceType: "SENSITIVE_PROFILE",
              accessAction: "VIEWED",
              relatedAppointmentId: context.appointmentId,
            },
          );
        } catch (guardError) {
          if (guardError instanceof MedicalAccessDeniedError) {
            return reply.status(403).send(medicalAccessDeniedResponse(guardError));
          }
          throw guardError;
        }
        return okResponse({ entries: await listPatientAlertLog(context.patientProfileId) });
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
    "/api/admin/patients/:email/alerts/:type/remove",
    async (request, reply) => {
      let email: string;
      try {
        email = decodeURIComponent(request.params.email).trim().toLowerCase();
      } catch {
        return reply.status(400).send(errorResponse("Invalid email param"));
      }
      const alertType = adminAlertTypeParam.safeParse(request.params.type);
      if (!alertType.success) {
        return reply.status(400).send(errorResponse("Unknown alert type"));
      }
      const body = adminRemoveAlertSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply
          .status(400)
          .send(errorResponse("A removal note is required", body.error.flatten()));
      }
      const actor = resolveAdminSessionActor(request);
      // Same resolver as the read above, for the same reason: the raw
      // address lookup this replaced missed a retained patient's own alerts
      // and hit whoever holds the released address now.
      const context = await resolvePatientContextByPatientEmail(email);
      const existing = context
        ? await prisma.patientProfile.findUnique({
            where: { id: context.patientProfileId },
            select: { id: true, anonymizedAt: true },
          })
        : null;
      if (!existing) {
        return reply.status(404).send(errorResponse("No alert to remove"));
      }
      try {
        await guardMedicalRead(
          request,
          { userId: actor?.userId ?? "", role: actor?.role ?? "ADMIN" },
          {
            patientProfileId: existing.id,
            resourceType: "SENSITIVE_PROFILE",
            accessAction: "UPDATED",
            relatedAppointmentId: context?.appointmentId ?? null,
          },
        );
      } catch (guardError) {
        if (guardError instanceof MedicalAccessDeniedError) {
          return reply.status(403).send(medicalAccessDeniedResponse(guardError));
        }
        throw guardError;
      }
      // An anonymized chart is a retained clinical record whose personal data
      // was erased on a legal instruction; clearing a banner off it is a write
      // that would undo part of that. Reads still work. Checked AFTER the guard
      // for the same reason as the profile PATCH above — the admin resolver
      // proves no relationship, so a 409 ahead of the scope check would answer
      // an out-of-scope LOCAL_ADMIN's probe and log nothing.
      if (existing.anonymizedAt) {
        return reply
          .status(409)
          .send(errorResponse("This record has been anonymized and can no longer be edited"));
      }

      try {
        const { profile, previousValue } = await removePatientAlert({
          // The id the guard above authorized, not the address it came from.
          patientProfileId: existing.id,
          alertType: alertType.data,
          note: body.data.note,
          actor: {
            userId: actor?.userId ?? null,
            role: actor?.role ?? "ADMIN",
            name: null,
          },
        });
        recordAudit({
          actorUserId: actor?.userId ?? null,
          actorRole: actor?.role ?? "ADMIN",
          action: "PATIENT_ALERT_UPDATED",
          entityType: "PatientProfile",
          entityId: profile.id,
          // Values stay out of the audit log (they are clinical free-text);
          // the text + note live on PatientAlertLog. Keyed on the chart, not
          // the address it was reached by — an address is reassignable.
          metadata: {
            patientProfileId: profile.id,
            removed: alertType.data,
            hadValue: previousValue !== null,
          },
          request,
        }).catch(() => {});
        return okResponse({
          profile: serializeProfile(profile, { includeAlerts: true }),
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

export default adminPatientProfileRoute;
