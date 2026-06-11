import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../utils/require-auth.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { generateGlobalHealthNumber } from "../lib/global-health-number.js";
import { computeEmailBlindIndex } from "../lib/blind-index.js";

const CONSENT_TYPES = [
  "STORE_MEDICAL",
  "SHARE_WITH_DOCTOR",
  "MARKETING",
  "THIRD_PARTY_LAB",
  "NOTIFICATIONS",
  "FOLLOW_UP",
  // Phase 2: medical access scope consents
  "MEDICAL_ACCESS_DIRECT",
  "MEDICAL_ACCESS_COUNTRY_CLINIC",
  "MEDICAL_ACCESS_GLOBAL_NETWORK",
] as const;

type ConsentType = (typeof CONSENT_TYPES)[number];

const CONSENT_LABELS: Record<ConsentType, { label: string; description: string }> = {
  STORE_MEDICAL: {
    label: "Store medical records",
    description: "Allow us to store your medical history and consultation records securely.",
  },
  SHARE_WITH_DOCTOR: {
    label: "Share with assigned doctor",
    description: "Allow your assigned doctor to access your medical records for consultations.",
  },
  MARKETING: {
    label: "Marketing communications",
    description: "Receive newsletters, health tips, and promotional offers via email.",
  },
  THIRD_PARTY_LAB: {
    label: "Share with third-party labs",
    description: "Allow exam requests and results to be shared with accredited laboratories.",
  },
  NOTIFICATIONS: {
    label: "Appointment & service notifications",
    description: "Receive reminders for appointments, prescriptions, and service updates.",
  },
  FOLLOW_UP: {
    label: "Follow-up & prescription processing",
    description: "Allow our team to contact you for follow-up care and prescription renewals.",
  },
  MEDICAL_ACCESS_DIRECT: {
    label: "Direct provider access",
    description: "Allow the doctor assigned to your consultation to access your medical records.",
  },
  MEDICAL_ACCESS_COUNTRY_CLINIC: {
    label: "Country clinic access",
    description: "Allow doctors in your registered country clinic to access your medical records for coordinated care.",
  },
  MEDICAL_ACCESS_GLOBAL_NETWORK: {
    label: "Global network access",
    description: "Allow MyGlobalHealth network doctors worldwide to access your records for second opinions and specialist referrals.",
  },
};

async function getLatestConsents(patientProfileId: string) {
  const rows = await prisma.patientConsent.findMany({
    where: { patientProfileId },
    orderBy: { createdAt: "asc" },
  });

  const latest = new Map<
    string,
    {
      id: string;
      consentType: string;
      consentValue: boolean;
      consentVersion: string | null;
      source: string;
      createdAt: Date;
    }
  >();

  for (const row of rows) {
    latest.set(row.consentType, row);
  }

  return CONSENT_TYPES.map((type) => {
    const row = latest.get(type);
    const meta = CONSENT_LABELS[type];
    return {
      consentType: type,
      label: meta.label,
      description: meta.description,
      consentValue: row?.consentValue ?? null,
      consentVersion: row?.consentVersion ?? null,
      lastUpdatedAt: row?.createdAt.toISOString() ?? null,
    };
  });
}

/** Consent catalog with all values unset — returned when a patient has no
 *  PatientProfile yet so the Privacy tab still renders the toggles instead
 *  of an empty panel. */
function emptyConsentCatalog() {
  return CONSENT_TYPES.map((type) => {
    const meta = CONSENT_LABELS[type];
    return {
      consentType: type,
      label: meta.label,
      description: meta.description,
      consentValue: null,
      consentVersion: null,
      lastUpdatedAt: null,
    };
  });
}

/** Find the caller's PatientProfile, creating a minimal one (with a Global
 *  Health Number) when it is missing. Every patient must have a profile so
 *  the portal's medical surfaces work; legacy accounts that predate
 *  registration-time profile creation are healed lazily here. */
async function resolveOrCreatePatientProfile(
  userId: string,
  email: string,
): Promise<{ id: string; globalHealthNumber: string | null }> {
  const existing = await prisma.patientProfile.findUnique({
    where: { email },
    select: { id: true, globalHealthNumber: true },
  });
  if (existing) return existing;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true, phone: true },
  });

  let ghn: string | null = null;
  try {
    ghn = await generateGlobalHealthNumber();
  } catch {
    ghn = null; // Counter unavailable — a backfill job assigns one later.
  }

  return prisma.patientProfile.create({
    data: {
      email,
      userId,
      fullName: user?.fullName ?? email,
      phone: user?.phone ?? null,
      globalHealthNumber: ghn,
      emailHash: computeEmailBlindIndex(email),
    },
    select: { id: true, globalHealthNumber: true },
  });
}

const consentsRoute: FastifyPluginAsync = async (app) => {
  // ─── Patient: read latest ─────────────────────────────────────────────────

  app.get(
    "/api/account/consents",
    { preHandler: requireAuth },
    async (request, reply) => {
      if (!request.authUser || request.authUser.role !== "PATIENT") {
        return reply.status(403).send(errorResponse("Patient access required"));
      }
      const profile = await prisma.patientProfile.findUnique({
        where: { email: request.authUser.email },
        select: { id: true },
      });
      // No profile yet (legacy account) — return the unset catalog so the
      // Privacy tab renders its toggles. Saving creates the profile.
      if (!profile) return okResponse({ consents: emptyConsentCatalog() });

      try {
        const consents = await getLatestConsents(profile.id);
        return okResponse({ consents });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load consents"));
      }
    },
  );

  // ─── Patient: update one or more ─────────────────────────────────────────

  app.put(
    "/api/account/consents",
    { preHandler: requireAuth },
    async (request, reply) => {
      if (!request.authUser || request.authUser.role !== "PATIENT") {
        return reply.status(403).send(errorResponse("Patient access required"));
      }

      const bodySchema = z.object({
        consents: z
          .array(
            z.object({
              consentType: z.enum(CONSENT_TYPES),
              consentValue: z.boolean(),
              consentVersion: z.string().max(50).optional(),
            }),
          )
          .min(1)
          .max(CONSENT_TYPES.length),
      });

      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send(errorResponse("Invalid consent data"));
      }

      let profile: { id: string; globalHealthNumber: string | null };
      try {
        profile = await resolveOrCreatePatientProfile(
          request.authUser.sub,
          request.authUser.email,
        );
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not save consents"));
      }

      try {
        await prisma.patientConsent.createMany({
          data: parsed.data.consents.map((c) => ({
            patientProfileId: profile.id,
            globalHealthNumber: profile.globalHealthNumber ?? null,
            consentType: c.consentType,
            consentValue: c.consentValue,
            consentVersion: c.consentVersion ?? null,
            source: "PATIENT_PORTAL",
            changedByUserId: request.authUser!.sub,
            changedByRole: "PATIENT",
          })),
        });

        const updated = await getLatestConsents(profile.id);
        return okResponse({ consents: updated }, "Consent preferences saved");
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not save consents"));
      }
    },
  );

  // ─── Admin: read latest + history ────────────────────────────────────────

  app.get<{ Params: { email: string } }>(
    "/api/admin/patients/:email/consents",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      let email: string;
      try {
        email = decodeURIComponent(request.params.email).trim().toLowerCase();
      } catch {
        return reply.status(400).send(errorResponse("Invalid email param"));
      }

      const profile = await prisma.patientProfile.findUnique({
        where: { email },
        select: { id: true },
      });
      if (!profile) return reply.status(404).send(errorResponse("Patient not found"));

      try {
        const [latest, history] = await Promise.all([
          getLatestConsents(profile.id),
          prisma.patientConsent.findMany({
            where: { patientProfileId: profile.id },
            orderBy: { createdAt: "desc" },
          }),
        ]);

        return okResponse({
          consents: latest,
          history: history.map((h) => ({
            ...h,
            createdAt: h.createdAt.toISOString(),
          })),
        });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load consents"));
      }
    },
  );
};

export default consentsRoute;
