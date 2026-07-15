import type { FastifyPluginAsync } from "fastify";
import { LocaleCode, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { sanitizeRichHtml } from "../utils/sanitize-html.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import {
  profilePatchBodySchema,
  type DoctorProfilePatchBody,
} from "../validations/doctor-profile.schema.js";
import { encryptPhi } from "../lib/crypto/phi-crypto.js";
import {
  ibanLast4,
  maskIban,
  normalizeIban,
} from "../utils/iban.js";
import {
  listDoctorSelectableServices,
  saveDoctorServiceSelections,
} from "../modules/doctor-services/doctor-services.service.js";
import { normalizeDoctorWhatsAppForStorage } from "../lib/whatsapp/resolve-doctor-contact.js";
import {
  DoctorMarketAccessDeniedError,
  DoctorMarketNotFoundError,
  listDoctorSelfMarkets,
  updateDoctorSelfMarket,
} from "../modules/doctor-market-profiles/doctor-market-profiles.service.js";
import {
  doctorMarketPatchBodySchema,
} from "../validations/doctor-market-profiles.schema.js";

/**
 * Doctor portal API. Every endpoint here is scoped to the logged-in
 * doctor's own profile + appointments. The `verifyDoctorAccess` helper
 * resolves `User.doctorId` from the session and returns 401/403 before
 * any DB query runs.
 *
 * Surfaces shipped in this MVP:
 *   GET  /api/doctor/me          — profile + stats (today/week appointment counts)
 *   GET  /api/doctor/appointments — list assigned appointments with filters
 *   GET  /api/doctor/patients    — distinct patients with at least one appointment
 *   PATCH /api/doctor/profile    — self-edit name, bio, qualifications, languages
 *
 * Deferred (documented in roadmap as Doctor Dashboard Phase 4):
 *   - Consultation notes / documents
 *   - Forms management
 *   - Exam results
 *   - Services-used tracking
 *   - Invoices visibility
 *   - Reports
 *   - Internal messaging
 */

const listAppointmentsQuerySchema = z.object({
  status: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z
      .enum([
        "REQUEST_RECEIVED",
        "UNDER_REVIEW",
        "CONTACTED",
        "COMPLETED",
        "CANCELLED",
      ])
      .optional(),
  ),
  /**
   * Doctor-portal lifecycle view — the plan exposes exactly four statuses
   * (see appointment-status-labels.ts on the frontend). Maps to the
   * internal enum + PaymentStatus:
   *   waiting_payment → active & unpaid   confirmed → active & PAID
   *   cancelled       → CANCELLED         concluded → COMPLETED
   */
  view: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.enum(["waiting_payment", "confirmed", "cancelled", "concluded"]).optional(),
  ),
  search: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "from must be YYYY-MM-DD")
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "to must be YYYY-MM-DD")
    .optional(),
  consultationType: z.string().trim().min(1).max(64).optional(),
  finalized: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
  /** Legacy open window: non-finalized with scheduledAt within last 30h (or recent unscheduled). */
  openOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

type DoctorProfileCountryLocales = {
  defaultLocale: LocaleCode;
  countryLocales: Array<{ locale: LocaleCode }>;
};

function supportedDoctorLocales(country: DoctorProfileCountryLocales): LocaleCode[] {
  const seen = new Set<LocaleCode>([country.defaultLocale]);
  for (const row of country.countryLocales) {
    seen.add(row.locale);
  }
  return Array.from(seen);
}

function normalizeProfileTranslations(
  body: DoctorProfilePatchBody,
  defaultLocale: LocaleCode,
): Array<{ locale: LocaleCode; bio: string | null }> | undefined {
  if (!body.translations) return undefined;
  const sanitized = body.translations.map((entry) => ({
    locale: entry.locale,
    bio: sanitizeRichHtml(entry.bio),
  }));
  if (body.bio === undefined) return sanitized;
  const defaultBio = sanitizeRichHtml(body.bio);
  return sanitized.map((entry) =>
    entry.locale === defaultLocale ? { ...entry, bio: defaultBio } : entry,
  );
}

const doctorServicesBodySchema = z.object({
  serviceIds: z.array(z.string().trim().min(1)).max(100),
});

const doctorMarketCountryParamsSchema = z.object({
  countryId: z.string().trim().min(1).max(64),
});

const doctorRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/doctor/me", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
    try {
      // Profile + lightweight stats. `appointmentCount` excludes
      // CANCELLED so the overview tile mirrors the working list.
      const doctor = await prisma.doctor.findUnique({
        where: { id: auth.doctorId },
        select: {
          id: true,
          slug: true,
          fullName: true,
          title: true,
          bio: true,
          qualifications: true,
          languages: true,
          whatsappNumber: true,
          country: {
            select: {
              code: true,
              name: true,
              slug: true,
              defaultLocale: true,
              countryLocales: {
                select: { locale: true, isDefault: true },
                orderBy: [{ isDefault: "desc" }, { locale: "asc" }],
              },
            },
          },
          additionalCountries: {
            include: {
              country: { select: { code: true, name: true, slug: true } },
            },
          },
          specialties: {
            include: { specialty: { select: { name: true, slug: true } } },
          },
          assets: {
            where: { kind: "IMAGE", isActive: true },
            select: { path: true, focalX: true, focalY: true, zoom: true },
            orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
            take: 1,
          },
          // Payout bank details — return masked only (never the full IBAN).
          bankAccount: {
            select: { accountHolder: true, ibanLast4: true, bic: true, ibanEncrypted: true },
          },
          translations: {
            select: { locale: true, bio: true },
            orderBy: { locale: "asc" },
          },
        },
      });
      if (!doctor) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }

      const now = new Date();
      const startOfDay = new Date(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
      );
      const startOfTomorrow = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      const endOfWeek = new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);

      const [todayCount, weekCount, totalActive] = await prisma.$transaction([
        prisma.appointment.count({
          where: {
            doctorId: auth.doctorId,
            scheduledAt: { gte: startOfDay, lt: startOfTomorrow },
            status: { notIn: ["CANCELLED"] },
          },
        }),
        prisma.appointment.count({
          where: {
            doctorId: auth.doctorId,
            scheduledAt: { gte: startOfDay, lt: endOfWeek },
            status: { notIn: ["CANCELLED"] },
          },
        }),
        prisma.appointment.count({
          where: { doctorId: auth.doctorId, status: { notIn: ["CANCELLED", "COMPLETED"] } },
        }),
      ]);
      const markets = await listDoctorSelfMarkets(auth.doctorId);

      const { bankAccount, assets, country, translations, ...doctorRest } = doctor;
      const supportedLocales = supportedDoctorLocales(country);
      const translationByLocale = new Map(
        translations.map((entry) => [entry.locale, entry.bio]),
      );
      return okResponse({
        doctor: {
          ...doctorRest,
          country: {
            code: country.code,
            name: country.name,
            slug: country.slug,
            defaultLocale: country.defaultLocale,
          },
          supportedLocales: supportedLocales.map((code) => ({
            code,
            isDefault: code === country.defaultLocale,
          })),
          translations: supportedLocales.map((code) => ({
            locale: code,
            bio:
              translationByLocale.get(code) ??
              (code === country.defaultLocale ? doctor.bio : null),
          })),
          profileImagePath: assets[0]?.path ?? null,
          profileImageFocalX: assets[0]?.focalX ?? 50,
          profileImageFocalY: assets[0]?.focalY ?? 50,
          profileImageZoom: assets[0]?.zoom ?? 1,
          // Masked payout details — full IBAN never leaves the server.
          bank: {
            accountHolder: bankAccount?.accountHolder ?? null,
            bic: bankAccount?.bic ?? null,
            ibanLast4: bankAccount?.ibanLast4 ?? null,
            ibanMasked: maskIban(bankAccount?.ibanLast4),
            ibanSet: Boolean(bankAccount?.ibanEncrypted),
          },
          markets,
        },
        stats: { todayCount, weekCount, totalActive },
      });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load doctor profile"));
    }
  });

  app.get("/api/doctor/appointments", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
    const query = listAppointmentsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid query", query.error.flatten()));
    }
    const { status, view, search, from, to, consultationType, finalized, openOnly, page, pageSize } =
      query.data;
    const fromUtc = from ? new Date(`${from}T00:00:00.000Z`) : undefined;
    const toUtc = to ? new Date(`${to}T23:59:59.999Z`) : undefined;
    const openWindowStart = new Date(Date.now() - 30 * 60 * 60 * 1000);
    // Four-status doctor view → (status, paymentStatus) constraints. Kept in
    // an AND array so it composes with the openOnly/search/date clauses
    // without clobbering their top-level `status` key.
    const viewFilters: Prisma.AppointmentWhereInput[] = [];
    if (view === "concluded") {
      viewFilters.push({ status: "COMPLETED" });
    } else if (view === "cancelled") {
      viewFilters.push({ status: "CANCELLED" });
    } else if (view === "confirmed") {
      viewFilters.push({ status: { notIn: ["CANCELLED", "COMPLETED"] }, paymentStatus: "PAID" });
    } else if (view === "waiting_payment") {
      viewFilters.push({
        status: { notIn: ["CANCELLED", "COMPLETED"] },
        paymentStatus: { not: "PAID" },
      });
    }
    try {
      const where: Prisma.AppointmentWhereInput = {
        doctorId: auth.doctorId,
        ...(status ? { status } : {}),
        ...(viewFilters.length ? { AND: viewFilters } : {}),
        ...(consultationType ? { consultationType } : {}),
        ...(finalized !== undefined ? { finalized } : {}),
        ...(openOnly
          ? {
              finalized: false,
              status: { notIn: ["CANCELLED"] },
              OR: [
                { scheduledAt: { gte: openWindowStart } },
                {
                  AND: [
                    { scheduledAt: null },
                    { createdAt: { gte: openWindowStart } },
                  ],
                },
              ],
            }
          : {}),
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" as const } },
                { email: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
        // Filter on scheduledAt when present, fall back to createdAt
        // so a brand-new unscheduled booking still shows in "today".
        ...(fromUtc || toUtc
          ? {
              OR: [
                {
                  scheduledAt: {
                    ...(fromUtc ? { gte: fromUtc } : {}),
                    ...(toUtc ? { lte: toUtc } : {}),
                  },
                },
                {
                  AND: [
                    { scheduledAt: null },
                    {
                      createdAt: {
                        ...(fromUtc ? { gte: fromUtc } : {}),
                        ...(toUtc ? { lte: toUtc } : {}),
                      },
                    },
                  ],
                },
              ],
            }
          : {}),
      };
      const [total, rows] = await prisma.$transaction([
        prisma.appointment.count({ where }),
        prisma.appointment.findMany({
          where,
          orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            consultationType: true,
            countryCode: true,
            status: true,
            paymentStatus: true,
            scheduledAt: true,
            meetingUrl: true,
            createdAt: true,
            notes: true,
            finalized: true,
            manualEntry: true,
          },
        }),
      ]);
      return okResponse({
        items: rows.map((r) => ({
          ...r,
          scheduledAt: r.scheduledAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
          notesPreview: r.notes ? r.notes.slice(0, 200) : null,
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
        },
      });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply
        .status(500)
        .send(errorResponse("Could not load appointments"));
    }
  });

  app.get("/api/doctor/patients", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
    try {
      // Distinct patients (by email since guest bookings may not have
      // a userId) who have at least one appointment with this doctor.
      // The aggregation is a JS groupBy because Prisma's distinct +
      // count is awkward; the per-doctor scope keeps row count small.
      // GDPR plan: email + phone never surface to the doctor portal.
      // Email is still used internally as the dedupe key + URL slug for
      // /doctor/patients/[email] navigation, but it is masked in the
      // outbound DTO. Admins keep raw values via /admin/users.
      const rows = await prisma.appointment.findMany({
        where: { doctorId: auth.doctorId },
        select: {
          email: true,
          fullName: true,
          countryCode: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      });
      const map = new Map<
        string,
        {
          /** URL-safe email (lowercased) — used for navigation only.
           *  Frontend MUST NOT render this value as visible text. */
          email: string;
          fullName: string;
          countryCode: string;
          firstSeen: string;
          appointmentCount: number;
        }
      >();
      for (const r of rows) {
        const key = r.email.toLowerCase();
        const existing = map.get(key);
        if (existing) {
          existing.appointmentCount += 1;
        } else {
          map.set(key, {
            email: key,
            fullName: r.fullName,
            countryCode: r.countryCode,
            firstSeen: r.createdAt.toISOString(),
            appointmentCount: 1,
          });
        }
      }
      return okResponse({ items: Array.from(map.values()) });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load patients"));
    }
  });

  app.patch("/api/doctor/profile", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
    const body = profilePatchBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid profile update", body.error.flatten()));
    }
    try {
      const doctorMeta = await prisma.doctor.findUnique({
        where: { id: auth.doctorId },
        select: {
          slug: true,
          title: true,
          seoTitle: true,
          seoDescription: true,
          country: {
            select: {
              id: true,
              code: true,
              defaultLocale: true,
              countryLocales: { select: { locale: true } },
            },
          },
          additionalCountries: {
            select: { country: { select: { code: true } } },
          },
          translations: {
            select: {
              locale: true,
              title: true,
              seoTitle: true,
              seoDescription: true,
            },
          },
        },
      });
      if (!doctorMeta) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }
      const supportedLocales = new Set(supportedDoctorLocales(doctorMeta.country));
      const translationUpdates = normalizeProfileTranslations(
        body.data,
        doctorMeta.country.defaultLocale,
      );
      const unsupportedLocale = translationUpdates?.find(
        (entry) => !supportedLocales.has(entry.locale),
      );
      if (unsupportedLocale) {
        return reply
          .status(400)
          .send(errorResponse("Locale is not enabled for this doctor profile"));
      }
      const defaultTranslationBio = translationUpdates?.find(
        (entry) => entry.locale === doctorMeta.country.defaultLocale,
      )?.bio;
      const nextBaseBio =
        body.data.bio !== undefined ? sanitizeRichHtml(body.data.bio) : defaultTranslationBio;
      const updated = await prisma.$transaction(async (tx) => {
        const updatedDoctor = await tx.doctor.update({
          where: { id: auth.doctorId },
          data: {
            ...(body.data.fullName !== undefined && { fullName: body.data.fullName }),
            ...(nextBaseBio !== undefined && { bio: nextBaseBio }),
            ...(body.data.qualifications !== undefined && {
              qualifications: body.data.qualifications,
            }),
            ...(body.data.languages !== undefined && { languages: body.data.languages }),
            ...(body.data.whatsappNumber !== undefined && {
              whatsappNumber: normalizeDoctorWhatsAppForStorage(
                body.data.whatsappNumber,
                doctorMeta.country.code,
              ),
            }),
          },
          select: {
            id: true,
            fullName: true,
            bio: true,
            qualifications: true,
            languages: true,
            whatsappNumber: true,
          },
        });

        const existingTranslations = new Map(
          doctorMeta.translations.map((entry) => [entry.locale, entry]),
        );
        const rowsToUpsert =
          translationUpdates ??
          (nextBaseBio !== undefined
            ? [{ locale: doctorMeta.country.defaultLocale, bio: updatedDoctor.bio }]
            : []);

        for (const entry of rowsToUpsert) {
          const existing = existingTranslations.get(entry.locale);
          await tx.doctorTranslation.upsert({
            where: {
              doctorId_locale: {
                doctorId: auth.doctorId,
                locale: entry.locale,
              },
            },
            create: {
              doctorId: auth.doctorId,
              locale: entry.locale,
              title: existing?.title ?? doctorMeta.title,
              bio: entry.bio,
              seoTitle:
                existing?.seoTitle ??
                (entry.locale === doctorMeta.country.defaultLocale
                  ? doctorMeta.seoTitle
                  : null),
              seoDescription:
                existing?.seoDescription ??
                (entry.locale === doctorMeta.country.defaultLocale
                  ? doctorMeta.seoDescription
                  : null),
            },
            update: {
              bio: entry.bio,
            },
          });
        }

        return updatedDoctor;
      });

      // Payout bank details live on the separate DoctorBankAccount table so
      // the encrypted IBAN never rides along on the public/admin doctor
      // payloads. IBAN blank still means "keep current"; account holder and
      // BIC blanks clear the corresponding optional field.
      const { bankAccountHolder, bankBic, bankIban } = body.data;
      const ibanProvided = typeof bankIban === "string" && bankIban.trim() !== "";
      const normalizedIban = ibanProvided ? normalizeIban(bankIban) : null;

      const bankData: Record<string, string | null> = {};
      if (bankAccountHolder !== undefined) {
        const value = bankAccountHolder?.trim() ?? "";
        bankData.accountHolder = value === "" ? null : value;
      }
      if (bankBic !== undefined) {
        const value = bankBic?.trim() ?? "";
        bankData.bic = value === "" ? null : value.toUpperCase();
      }
      if (ibanProvided && normalizedIban) {
        bankData.ibanEncrypted = encryptPhi(normalizedIban);
        bankData.ibanLast4 = ibanLast4(normalizedIban);
      }

      // Only touch the bank table when there is something meaningful to write
      if (Object.keys(bankData).length > 0) {
        try {
          await prisma.doctorBankAccount.upsert({
            where: { doctorId: auth.doctorId },
            create: { doctorId: auth.doctorId, ...bankData },
            update: bankData,
          });
        } catch (bankError) {
          app.log.error(bankError, "Bank account upsert failed for doctor %s", auth.doctorId);
          return okResponse(
            { doctor: updated },
            "Profile updated — bank details could not be saved, please try again",
          );
        }
      }

      recordAudit({
        actorUserId: auth.userId,
        actorRole: "DOCTOR",
        action: "DOCTOR_UPDATED",
        entityType: "Doctor",
        entityId: auth.doctorId,
        metadata: { changed: Object.keys(body.data) },
        request,
      }).catch(() => {});

      return okResponse(
        {
          doctor: updated,
          cache: {
            countryCode: doctorMeta.country.code,
            slug: doctorMeta.slug,
            additionalCountryCodes: doctorMeta.additionalCountries.map(
              (link) => link.country.code,
            ),
          },
        },
        "Profile updated",
      );
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not update profile"));
    }
  });

  app.patch("/api/doctor/profile/markets/:countryId", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
    const params = doctorMarketCountryParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid market", params.error.flatten()));
    }
    const body = doctorMarketPatchBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid market profile update", body.error.flatten()));
    }

    try {
      const market = await updateDoctorSelfMarket(
        auth.doctorId,
        params.data.countryId,
        body.data,
      );
      recordAudit({
        actorUserId: auth.userId,
        actorRole: "DOCTOR",
        action: "DOCTOR_UPDATED",
        entityType: "Doctor",
        entityId: auth.doctorId,
        metadata: {
          marketCountryId: params.data.countryId,
          changed: Object.keys(body.data),
          registrationNeedsReverification:
            body.data.chamberEntity !== undefined ||
            body.data.registrationNumber !== undefined ||
            body.data.division !== undefined,
        },
        request,
      }).catch(() => {});
      return okResponse({ market }, "Market profile updated");
    } catch (error) {
      if (error instanceof DoctorMarketAccessDeniedError) {
        return reply.status(403).send(errorResponse(error.message));
      }
      if (error instanceof DoctorMarketNotFoundError) {
        return reply.status(404).send(errorResponse(error.message));
      }
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not update market profile"));
    }
  });

  app.get("/api/doctor/services", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
    // .catch(undefined): an unknown locale falls back to the country default
    // instead of failing the request.
    const localeSchema = z
      .preprocess(
        (v) => (typeof v === "string" ? v.toUpperCase() : v),
        z.nativeEnum(LocaleCode).optional(),
      )
      .catch(undefined);
    const locale = localeSchema.parse(
      (request.query as { locale?: string } | undefined)?.locale,
    );
    try {
      const data = await listDoctorSelectableServices(auth.doctorId, locale);
      return okResponse(data);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load services"));
    }
  });

  app.get("/api/doctor/services/approval-required", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
    try {
      const data = await listDoctorSelectableServices(auth.doctorId);
      return okResponse({ approvalRequired: data.approvalRequired });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply
        .status(500)
        .send(errorResponse("Could not load approval settings"));
    }
  });

  // Doctors self-select the services they want to provide. New
  // selections are recorded as `pending` and surfaced to admins for
  // approval (admin approve -> active, reject -> rejected). Admin-set
  // assignments can never be overridden or removed by the doctor.
  app.post("/api/doctor/services", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
    const body = doctorServicesBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid service selection", body.error.flatten()));
    }
    try {
      const data = await saveDoctorServiceSelections(
        auth.doctorId,
        body.data.serviceIds,
      );
      return okResponse(data, "Service selections saved");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply
        .status(500)
        .send(errorResponse("Could not save service selections"));
    }
  });
};

export default doctorRoute;
