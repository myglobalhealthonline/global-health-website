import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { ServiceKind } from "@prisma/client";
import { z } from "zod";
import { localeCodeSchema } from "../validations/admin-countries.schema.js";
import {
  getDoctorByCountryAndSlug,
  listDoctorsByCountry,
} from "../modules/doctors/doctors.service.js";
import {
  listServicesByCountry,
  listSpecialtiesByCountry,
} from "../modules/services/services.service.js";
import { listHealthTestsByCountry } from "../modules/health-tests/health-tests.service.js";
import { listPublicPlansByCountry } from "../modules/plans/public-plans.service.js";
import { getPublicCountryByCode } from "../modules/countries/countries.service.js";
import {
  listOpenSlotsForDoctorAndService,
  resolveDoctorTimeZone,
} from "../modules/doctor-availability/doctor-availability.service.js";
import {
  computeSlotPrice,
  getServicePeakConfig,
} from "../modules/pricing/peak-pricing.service.js";
import { getServiceAggregatedAvailability } from "../modules/service-booking/service-availability.service.js";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";

/** Returns true if the country exists; otherwise writes a 404 to `reply` and
 *  returns false so the handler can `return` immediately. */
async function ensureCountryExists(
  countryCode: string,
  reply: FastifyReply,
): Promise<boolean> {
  const country = await getPublicCountryByCode(countryCode);
  if (!country) {
    reply.status(404).send(errorResponse("Country not found"));
    return false;
  }
  return true;
}

const countryParamsSchema = z.object({
  countryCode: z.string().trim().min(1).max(8),
});

const countrySlugParamsSchema = z.object({
  countryCode: z.string().trim().min(1).max(8),
  slug: z.string().trim().min(1).max(160),
});

/** Optional locale (uppercase LocaleCode) — selects which translation the
 *  merged service display fields resolve to. Absent → country default. */
const localeQuerySchema = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : v),
  localeCodeSchema.optional(),
);

const servicesQuerySchema = z.object({
  kind: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.nativeEnum(ServiceKind).optional(),
  ),
  locale: localeQuerySchema,
});

const collectionLocaleQuerySchema = z.object({
  locale: localeQuerySchema,
});

const serviceAvailabilityParamsSchema = z.object({
  countryCode: z.string().trim().min(1).max(8),
  serviceSlug: z.string().trim().min(1).max(160),
  doctorSlug: z.string().trim().min(1).max(160),
});

const serviceAvailabilityQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(60).default(14),
});

function handleError(
  app: { log: { error: (e: unknown) => void } },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  error: unknown,
  fallback: string,
) {
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse(fallback));
}

/**
 * Cache-Control hint applied to every public country-scoped GET. Edge caches
 * (Vercel, Cloudflare) and the browser can hold the response for 60s and serve
 * stale for 5 minutes while revalidating in the background. Admin writes are
 * not cached (auth-gated routes don't pass through here).
 */
function applyPublicCache(reply: { header: (k: string, v: string) => void }) {
  reply.header(
    "Cache-Control",
    "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
  );
}

/**
 * Cache hint for slot-availability responses specifically. Booked slots must
 * not stay advertised as open for long — a short cap (worst case max-age +
 * SWR ≈ 25s) is enough to absorb the request bursts a single patient
 * navigating the booking flow generates, without the 5-minute stale window
 * `applyPublicCache` allows for genuinely stable content (doctors, services,
 * specialties...).
 */
function applyAvailabilityCache(reply: { header: (k: string, v: string) => void }) {
  reply.header(
    "Cache-Control",
    "public, max-age=10, s-maxage=10, stale-while-revalidate=15",
  );
}

const countryScopedRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/countries/:countryCode/doctors", async (request, reply) => {
    applyPublicCache(reply);
    const params = countryParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid country code", params.error.flatten()));
    }
    const query = collectionLocaleQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid doctors query", query.error.flatten()));
    }
    try {
      if (!(await ensureCountryExists(params.data.countryCode, reply))) return;
      const doctors = await listDoctorsByCountry(params.data.countryCode, query.data.locale);
      return okResponse(doctors);
    } catch (error) {
      return handleError(app, reply, error, "Unexpected doctors error");
    }
  });

  app.get("/api/countries/:countryCode/doctors/:slug", async (request, reply) => {
    applyPublicCache(reply);
    const params = countrySlugParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid doctor lookup", params.error.flatten()));
    }
    const query = collectionLocaleQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid doctor query", query.error.flatten()));
    }
    try {
      if (!(await ensureCountryExists(params.data.countryCode, reply))) return;
      const doctor = await getDoctorByCountryAndSlug(
        params.data.countryCode,
        params.data.slug,
        query.data.locale,
      );
      if (!doctor) {
        return reply.status(404).send(errorResponse("Doctor not found"));
      }
      return okResponse({ doctor });
    } catch (error) {
      return handleError(app, reply, error, "Unexpected doctor lookup error");
    }
  });

  app.get("/api/countries/:countryCode/specialties", async (request, reply) => {
    applyPublicCache(reply);
    const params = countryParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid country code", params.error.flatten()));
    }
    const query = collectionLocaleQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid specialties query", query.error.flatten()));
    }
    try {
      if (!(await ensureCountryExists(params.data.countryCode, reply))) return;
      const specialties = await listSpecialtiesByCountry(
        params.data.countryCode,
        query.data.locale,
      );
      return okResponse(specialties);
    } catch (error) {
      return handleError(app, reply, error, "Unexpected specialties error");
    }
  });

  app.get("/api/countries/:countryCode/health-tests", async (request, reply) => {
    applyPublicCache(reply);
    const params = countryParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid country code", params.error.flatten()));
    }
    const query = collectionLocaleQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid health-tests query", query.error.flatten()));
    }
    try {
      if (!(await ensureCountryExists(params.data.countryCode, reply))) return;
      const items = await listHealthTestsByCountry(params.data.countryCode, query.data.locale);
      return okResponse(items);
    } catch (error) {
      return handleError(app, reply, error, "Unexpected health-tests error");
    }
  });

  app.get("/api/countries/:countryCode/plans", async (request, reply) => {
    applyPublicCache(reply);
    const params = countryParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid country code", params.error.flatten()));
    }
    const query = collectionLocaleQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid plans query", query.error.flatten()));
    }
    try {
      // Subscriptions is strict opt-in (§36.15). A country that hasn't enabled
      // it 404s the pricing surface — defence in depth alongside the frontend
      // feature gate and POST /api/me/subscription.
      const result = await listPublicPlansByCountry(params.data.countryCode, query.data.locale);
      if (!result.enabled) {
        return reply.status(404).send(errorResponse("Subscriptions are not available in this country"));
      }
      return okResponse({ plans: result.plans });
    } catch (error) {
      return handleError(app, reply, error, "Unexpected plans error");
    }
  });

  app.get("/api/countries/:countryCode/services", async (request, reply) => {
    applyPublicCache(reply);
    const params = countryParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid country code", params.error.flatten()));
    }
    const query = servicesQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid services query", query.error.flatten()));
    }
    try {
      if (!(await ensureCountryExists(params.data.countryCode, reply))) return;
      const services = await listServicesByCountry(
        params.data.countryCode,
        query.data.kind,
        query.data.locale,
      );
      return okResponse(services);
    } catch (error) {
      return handleError(app, reply, error, "Unexpected services error");
    }
  });

  /**
   * Service-scoped availability — Phase 3 of the booking plan.
   *
   * Returns the OPEN slots a patient can book for a specific
   * (country, service, doctor) tuple, with the slot duration coming
   * from the service (so a 30-min general consult and a 60-min
   * specialist on the same doctor produce different slot grids).
   *
   * Validation chain mirrors the plan:
   *   - country active
   *   - service active + in country
   *   - doctor active + listed in country (primary or DoctorCountry)
   *   - ServiceDoctor row exists + isActive (the admin assignment)
   *
   * Past slots are filtered by clamping `fromUtc` to `now`.
   */
  app.get(
    "/api/services/:countryCode/:serviceSlug/doctors/:doctorSlug/availability",
    async (request, reply) => {
      applyAvailabilityCache(reply);
      const params = serviceAvailabilityParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid availability path", params.error.flatten()));
      }
      const query = serviceAvailabilityQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid availability query", query.error.flatten()));
      }
      const { countryCode, serviceSlug, doctorSlug } = params.data;
      const days = query.data.days;

      try {
        if (!(await ensureCountryExists(countryCode, reply))) return;

        // Service must exist + be active + scoped to this country.
        const service = await prisma.service.findFirst({
          where: {
            slug: serviceSlug,
            isActive: true,
            country: { code: countryCode, isActive: true },
          },
          select: {
            id: true,
            durationMinutes: true,
            basePriceCents: true,
            currencyCode: true,
            country: { select: { currency: { select: { code: true } } } },
          },
        });
        if (!service) {
          return reply.status(404).send(errorResponse("Service not found"));
        }

        // Doctor must exist + be active + reachable from this country
        // (primary OR DoctorCountry).
        const doctor = await prisma.doctor.findFirst({
          where: {
            slug: doctorSlug,
            active: true,
            OR: [
              { country: { code: countryCode, isActive: true } },
              {
                additionalCountries: {
                  some: {
                    active: true,
                    country: { code: countryCode, isActive: true },
                  },
                },
              },
            ],
          },
          select: { id: true },
        });
        if (!doctor) {
          return reply.status(404).send(errorResponse("Doctor not found"));
        }

        // ServiceDoctor assignment — the doctor must be bookable for
        // the chosen service.
        const assignment = await prisma.serviceDoctor.findFirst({
          where: {
            serviceId: service.id,
            doctorId: doctor.id,
            isActive: true,
          },
          select: { id: true },
        });
        if (!assignment) {
          return reply
            .status(404)
            .send(errorResponse("Doctor is not assigned to this service"));
        }

        const now = new Date();
        const toUtc = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        const slots = await listOpenSlotsForDoctorAndService(
          doctor.id,
          service.durationMinutes,
          now,
          toUtc,
        );
        // Same tz the slots were generated in — the patient sees clinic-local
        // times so "09:00" reads identically to the doctor and the patient.
        const clinicTimezone = await resolveDoctorTimeZone(doctor.id);

        // Attach the price each slot will be charged. Peak-hour pricing is
        // resolved server-side from the slot's clinic-local start time so the
        // displayed price always matches what checkout re-derives. Falls back
        // to the flat service price when no config / disabled. basePriceCents
        // can be null for not-yet-priced services → treat as 0.
        const peakConfig = await getServicePeakConfig(service.id);
        const basePriceCents = service.basePriceCents ?? 0;
        const fallbackCurrency =
          service.currencyCode ?? service.country.currency.code;
        const pricedSlots = slots.map((s) => {
          const priced = computeSlotPrice({
            config: peakConfig,
            basePriceCents,
            fallbackCurrency,
            slotStartUtc: new Date(s.startAt),
            clinicTimezone,
          });
          return {
            ...s,
            priceCents: priced.unitPriceCents,
            pricingType: priced.pricingType,
            currencyCode: priced.currencyCode,
          };
        });
        return okResponse({ slots: pricedSlots, clinicTimezone });
      } catch (error) {
        return handleError(app, reply, error, "Unexpected availability error");
      }
    },
  );

  /**
   * Aggregated availability for a service across ALL its assigned doctors.
   * Backs the service-first flow's TIME step (service → time → doctor): returns
   * the de-duplicated open times plus which doctors (+ their slot) can take
   * each time, so the next step can offer the doctor choice.
   */
  app.get(
    "/api/services/:countryCode/:serviceSlug/aggregated-availability",
    async (request, reply) => {
      applyAvailabilityCache(reply);
      const params = z
        .object({
          countryCode: z.string().trim().min(1).max(8),
          serviceSlug: z.string().trim().min(1).max(160),
        })
        .safeParse(request.params);
      if (!params.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid availability path", params.error.flatten()));
      }
      const query = serviceAvailabilityQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid availability query", query.error.flatten()));
      }
      try {
        if (!(await ensureCountryExists(params.data.countryCode, reply))) return;
        const result = await getServiceAggregatedAvailability(
          params.data.countryCode,
          params.data.serviceSlug,
          query.data.days,
        );
        return okResponse(result);
      } catch (error) {
        return handleError(app, reply, error, "Unexpected availability error");
      }
    },
  );
};

export default countryScopedRoute;
