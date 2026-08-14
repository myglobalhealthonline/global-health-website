import type { FastifyPluginAsync } from "fastify";
import { LocaleCode, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import { resolveConsultationEndAt } from "../modules/appointments/consultation-end.js";
import { profilePatchBodySchema } from "../validations/doctor-profile.schema.js";
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
import {
  cancelDoctorProfileChangeRequest,
  listDoctorProfileChangeRequests,
  submitDoctorProfileChangeRequest,
  DoctorProfileChangeInvalidError,
  DoctorProfileChangeMarketDeniedError,
  DoctorProfileChangeNoopError,
  DoctorProfileChangeNotFoundError,
} from "../modules/doctor-profile-change-requests/doctor-profile-change-requests.service.js";
import {
  doctorProfileChangeRequestBodySchema,
  doctorProfileChangeRequestParamsSchema,
} from "../validations/doctor-profile-change-requests.schema.js";
import { LocaleNotSupportedError } from "../modules/shared/locale-support.js";

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
 *   PATCH /api/doctor/profile    — self-edit languages, WhatsApp, payout details
 *   POST /api/doctor/profile/change-requests — propose an admin-locked field edit
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

/** Maps the change-request service's errors onto HTTP. Returns null when the
 *  error isn't one of ours, so the caller can fall through to a 500. */
function doctorProfileChangeErrorReply(
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  error: unknown,
): unknown | null {
  if (
    error instanceof DoctorProfileChangeNoopError ||
    error instanceof DoctorProfileChangeInvalidError ||
    error instanceof LocaleNotSupportedError
  ) {
    return reply.status(400).send(errorResponse(error.message));
  }
  if (error instanceof DoctorProfileChangeMarketDeniedError) {
    return reply.status(403).send(errorResponse(error.message));
  }
  if (error instanceof DoctorProfileChangeNotFoundError) {
    return reply.status(404).send(errorResponse(error.message));
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  return null;
}

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
  /**
   * Hard lower bound on the queue: drop consultations scheduled before this
   * date (unscheduled rows fall back to createdAt). Applied to BOTH the list
   * and the summary-tile counts so the tiles stay equal to the list they open.
   * Not a user filter — the appointments page sends the fixed cutover date; the
   * calendar/availability callers omit it and are unaffected.
   */
  notBefore: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "notBefore must be YYYY-MM-DD")
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
  /**
   * Summary-tile filter: consultations still needing clinical attention
   * (`OPEN_CONSULT_WHERE`). NOT the same as `openOnly` — no 30h window and
   * COMPLETED is excluded rather than finalized=false.
   *
   * Implies `excludeLegacy`: the tile linking here counts non-legacy rows only,
   * so the filtered list must too or the number won't match what's on screen.
   */
  open: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  /** Summary-tile filter: `NOT_FINALIZED_WHERE`. Implies `excludeLegacy`, same reason as `open`. */
  notFinalized: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  /** Adds the `summary` block (queue-wide tile counts) to the response. */
  includeSummary: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  /**
   * Drop rows imported from the legacy Mongo system (`legacyMongoId` set).
   * The import flattened every historical booking to COMPLETED and carried its
   * original `scheduledAt` over, so those rows render as live calendar entries.
   * Calendar/availability views pass this; the appointments queue and patient
   * history do NOT — they should still show imported records.
   */
  excludeLegacy: z
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

const doctorServicesBodySchema = z.object({
  serviceIds: z.array(z.string().trim().min(1)).max(100),
});

const doctorMarketCountryParamsSchema = z.object({
  countryId: z.string().trim().min(1).max(64),
});

/**
 * Predicates behind the two doctor-queue summary tiles. Each one backs BOTH the
 * tile's count and the `?open=` / `?notFinalized=` filter the tile links to, so
 * the number and the list it opens cannot drift apart.
 */

/** "Open consults" — needs clinical attention. */
const OPEN_CONSULT_WHERE: Prisma.AppointmentWhereInput = {
  status: { notIn: ["COMPLETED", "CANCELLED"] },
};

/** "Not finalized" — notes or documents pending. Cancelled rows never get
 *  finalized, so counting them would leave a floor the doctor can't clear. */
const NOT_FINALIZED_WHERE: Prisma.AppointmentWhereInput = {
  finalized: false,
  status: { notIn: ["CANCELLED"] },
};

/** Excludes rows imported from the legacy Mongo system. */
const NON_LEGACY_WHERE: Prisma.AppointmentWhereInput = { legacyMongoId: null };

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
    const {
      status,
      view,
      search,
      from,
      to,
      consultationType,
      finalized,
      openOnly,
      open,
      notFinalized,
      includeSummary,
      excludeLegacy,
      notBefore,
      page,
      pageSize,
    } = query.data;
    const fromUtc = from ? new Date(`${from}T00:00:00.000Z`) : undefined;
    const toUtc = to ? new Date(`${to}T23:59:59.999Z`) : undefined;
    const openWindowStart = new Date(Date.now() - 30 * 60 * 60 * 1000);
    // Queue floor (see `notBefore` in the schema). Same OR shape as from/to so
    // unscheduled requests created after the cutover still surface.
    const notBeforeUtc = notBefore ? new Date(`${notBefore}T00:00:00.000Z`) : undefined;
    const queueFloorWhere: Prisma.AppointmentWhereInput | undefined = notBeforeUtc
      ? {
          OR: [
            { scheduledAt: { gte: notBeforeUtc } },
            { AND: [{ scheduledAt: null }, { createdAt: { gte: notBeforeUtc } }] },
          ],
        }
      : undefined;
    // Every status/finalized constraint goes in this AND array rather than at
    // the top level of `where`: several of these clauses key on `status`, and a
    // top-level spread lets the last one silently clobber the earlier ones.
    const andFilters: Prisma.AppointmentWhereInput[] = [];
    // Four-status doctor view → (status, paymentStatus) constraints.
    if (view === "concluded") {
      andFilters.push({ status: "COMPLETED" });
    } else if (view === "cancelled") {
      andFilters.push({ status: "CANCELLED" });
    } else if (view === "confirmed") {
      andFilters.push({ status: { notIn: ["CANCELLED", "COMPLETED"] }, paymentStatus: "PAID" });
    } else if (view === "waiting_payment") {
      andFilters.push({
        status: { notIn: ["CANCELLED", "COMPLETED"] },
        paymentStatus: { not: "PAID" },
      });
    }
    if (status) andFilters.push({ status });
    if (finalized !== undefined) andFilters.push({ finalized });
    // Summary-tile filters carry their own legacy exclusion so the row count
    // matches the tile that linked here.
    if (open) andFilters.push(OPEN_CONSULT_WHERE, NON_LEGACY_WHERE);
    if (notFinalized) andFilters.push(NOT_FINALIZED_WHERE, NON_LEGACY_WHERE);
    if (excludeLegacy) andFilters.push(NON_LEGACY_WHERE);
    if (queueFloorWhere) andFilters.push(queueFloorWhere);
    if (openOnly) {
      andFilters.push({
        finalized: false,
        status: { notIn: ["CANCELLED"] },
        OR: [
          { scheduledAt: { gte: openWindowStart } },
          {
            AND: [{ scheduledAt: null }, { createdAt: { gte: openWindowStart } }],
          },
        ],
      });
    }
    if (search) {
      andFilters.push({
        OR: [
          { fullName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      });
    }
    // Filter on scheduledAt when present, fall back to createdAt
    // so a brand-new unscheduled booking still shows in "today".
    if (fromUtc || toUtc) {
      andFilters.push({
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
      });
    }
    try {
      const where: Prisma.AppointmentWhereInput = {
        doctorId: auth.doctorId,
        ...(andFilters.length ? { AND: andFilters } : {}),
        ...(consultationType ? { consultationType } : {}),
      };
      const selectFields = {
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
        // Real consultation length for the calendar: the claimed slot already
        // spans it exactly; `service.durationMinutes` covers slot-less rows.
        timeSlot: { select: { endAt: true } },
        // `visibility` drives the corporate badge in the doctor queue — an
        // onboarding pre-assessment or a company-requested consultation reads
        // as an ordinary booking otherwise.
        service: { select: { durationMinutes: true, visibility: true, name: true } },
      } as const;

      // Doctor-queue ordering: UPCOMING consultations first (soonest at the
      // top), then PAST ones (most recent first), with unscheduled requests
      // last. A plain `scheduledAt asc` buried every future consultation under
      // a wall of old completed rows once a doctor had >1 page of history —
      // so the queue "showed no upcoming consultations" (bug report 2026-07-16).
      const nowTs = new Date();
      const upcomingWhere: Prisma.AppointmentWhereInput = {
        AND: [where, { scheduledAt: { gte: nowTs } }],
      };
      const pastWhere: Prisma.AppointmentWhereInput = {
        AND: [where, { OR: [{ scheduledAt: { lt: nowTs } }, { scheduledAt: null }] }],
      };

      // Summary tiles are queue-wide totals: they deliberately ignore every
      // list filter (including the ones the tiles themselves link to) so the
      // numbers hold still when a doctor clicks one. Legacy imports excluded.
      const summaryWhere: Prisma.AppointmentWhereInput = {
        doctorId: auth.doctorId,
        ...NON_LEGACY_WHERE,
        // Same queue floor as the list, so a tile count never includes rows the
        // list it links to would hide.
        ...(queueFloorWhere ? { AND: [queueFloorWhere] } : {}),
      };
      const [total, upcomingCount, openConsults, notFinalizedCount] = await Promise.all([
        prisma.appointment.count({ where }),
        prisma.appointment.count({ where: upcomingWhere }),
        includeSummary
          ? prisma.appointment.count({ where: { ...summaryWhere, ...OPEN_CONSULT_WHERE } })
          : 0,
        includeSummary
          ? prisma.appointment.count({ where: { ...summaryWhere, ...NOT_FINALIZED_WHERE } })
          : 0,
      ]);

      const skip = (page - 1) * pageSize;
      // Page window straddles the upcoming→past boundary: fill from the
      // upcoming bucket (asc) first, top up from the past bucket (desc) with
      // unscheduled rows sorted last.
      let rows;
      if (skip < upcomingCount) {
        const upcoming = await prisma.appointment.findMany({
          where: upcomingWhere,
          orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
          skip,
          take: pageSize,
          select: selectFields,
        });
        const remaining = pageSize - upcoming.length;
        const past =
          remaining > 0
            ? await prisma.appointment.findMany({
                where: pastWhere,
                orderBy: [{ scheduledAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
                take: remaining,
                select: selectFields,
              })
            : [];
        rows = [...upcoming, ...past];
      } else {
        rows = await prisma.appointment.findMany({
          where: pastWhere,
          orderBy: [{ scheduledAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
          skip: skip - upcomingCount,
          take: pageSize,
          select: selectFields,
        });
      }
      return okResponse({
        items: rows.map(({ timeSlot, service, ...r }) => ({
          ...r,
          scheduledAt: r.scheduledAt?.toISOString() ?? null,
          endAt: resolveConsultationEndAt({ ...r, timeSlot, service }),
          createdAt: r.createdAt.toISOString(),
          notesPreview: r.notes ? r.notes.slice(0, 200) : null,
          // Corporate context for the queue. No company name or medical
          // detail — just which private corporate flow this booking came
          // from, so the assigned doctor knows what is expected of it.
          corporateFlow:
            service?.visibility === "CORPORATE_ONLY"
              ? ("PRE_ASSESSMENT" as const)
              : service?.visibility === "CORPORATE_REQUEST_ONLY"
                ? ("COMPANY_REQUEST" as const)
                : null,
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
        },
        ...(includeSummary
          ? { summary: { openConsults, notFinalized: notFinalizedCount } }
          : {}),
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
          country: { select: { code: true } },
          additionalCountries: {
            select: { country: { select: { code: true } } },
          },
        },
      });
      if (!doctorMeta) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }
      // Name / bio / qualifications are admin-locked and rejected by the body
      // schema — they reach the live row only via an approved
      // DoctorProfileChangeRequest. What's left here is freely editable.
      const updated = await prisma.doctor.update({
        where: { id: auth.doctorId },
        data: {
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

  /**
   * Admin-locked profile fields (name, qualifications, per-market bio +
   * registration, photo) are proposed here rather than written directly. The
   * live profile keeps serving the public site until an admin approves.
   *
   * Photo proposals are raised by the /profile/photo routes instead — they
   * need the uploaded bytes, so they can't come through as JSON.
   *
   *   GET    /api/doctor/profile/change-requests       — latest per field/market
   *   POST   /api/doctor/profile/change-requests       — propose a change
   *   DELETE /api/doctor/profile/change-requests/:id   — withdraw a pending one
   */
  app.get("/api/doctor/profile/change-requests", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
    try {
      const items = await listDoctorProfileChangeRequests(auth.doctorId);
      return okResponse({ items });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load change requests"));
    }
  });

  app.post("/api/doctor/profile/change-requests", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
    const body = doctorProfileChangeRequestBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid change request", body.error.flatten()));
    }
    try {
      const changeRequest = await submitDoctorProfileChangeRequest(
        auth.doctorId,
        body.data,
      );
      recordAudit({
        actorUserId: auth.userId,
        actorRole: "DOCTOR",
        action: "DOCTOR_PROFILE_CHANGE_REQUESTED",
        entityType: "Doctor",
        entityId: auth.doctorId,
        metadata: {
          field: body.data.field,
          requestId: changeRequest.id,
          countryId: changeRequest.countryId,
        },
        request,
      }).catch(() => {});
      return okResponse(
        { request: changeRequest },
        "Change submitted for admin approval",
      );
    } catch (error) {
      const handled = doctorProfileChangeErrorReply(reply, error);
      if (handled) return handled;
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not submit the change request"));
    }
  });

  app.delete("/api/doctor/profile/change-requests/:requestId", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
    const params = doctorProfileChangeRequestParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid request id", params.error.flatten()));
    }
    try {
      const changeRequest = await cancelDoctorProfileChangeRequest(
        auth.doctorId,
        params.data.requestId,
      );
      recordAudit({
        actorUserId: auth.userId,
        actorRole: "DOCTOR",
        action: "DOCTOR_PROFILE_CHANGE_CANCELLED",
        entityType: "Doctor",
        entityId: auth.doctorId,
        metadata: { field: changeRequest.field, requestId: changeRequest.id },
        request,
      }).catch(() => {});
      return okResponse({ request: changeRequest }, "Change request withdrawn");
    } catch (error) {
      const handled = doctorProfileChangeErrorReply(reply, error);
      if (handled) return handled;
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not withdraw the change request"));
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
