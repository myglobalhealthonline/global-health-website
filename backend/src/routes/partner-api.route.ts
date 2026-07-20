import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  authenticatePartnerApiKey,
  callerMayAccessCountry,
  type PartnerApiCaller,
} from "../modules/partner-api/partner-api-key.service.js";
import {
  getPartnerCountryCatalog,
  listPartnerCountries,
  PartnerCountryNotFoundError,
} from "../modules/partner-api/partner-catalog.service.js";
import {
  getPartnerAvailability,
  PartnerDoctorNotFoundError,
  PartnerServiceNotFoundError,
} from "../modules/partner-api/partner-availability.service.js";
import { createPartnerBooking } from "../modules/partner-api/partner-booking.service.js";
import {
  DoctorNotAssignedToServiceError,
  DoctorNotAvailableInCountryError,
  DoctorNotFoundError,
  DoctorNotInInsuranceNetworkError,
  InsuranceNotCoveredError,
  ServiceNotFoundError,
  ServicePriceMissingError,
  SlotNotAvailableError,
} from "../modules/appointments/manual-booking.service.js";
import {
  partnerAvailabilityQuerySchema,
  partnerCatalogParamsSchema,
  partnerCreateBookingBodySchema,
} from "../validations/partner-api.schema.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Partner booking API — programmatic equivalent of an admin manual booking.
 *
 * Three calls, in order:
 *
 *   1. GET  /api/partner/v1/countries/:countryCode/catalog
 *        → services sellable in that market, their price, and the doctors
 *          who provide each one. Every id here feeds calls 2 and 3.
 *   2. GET  /api/partner/v1/availability?countryCode&serviceId&doctorId
 *        → that doctor's open slots for that service, priced per slot, plus
 *          the market's IANA timezone (each country runs its own).
 *   3. POST /api/partner/v1/bookings
 *        → claims the slot and creates the appointment + order.
 *
 * A `GET /api/partner/v1/countries` discovery call precedes all three so an
 * integrator can bootstrap without hardcoding country codes.
 *
 * Auth: `X-Api-Key: ghp_live_…`, one key per integrator
 * (`PartnerApiClient`). Enforced by a plugin-wide `onRequest` hook, so a new
 * handler added to this file is authenticated by default — the safe failure
 * mode. Keys can be scoped to specific countries; the scope is re-checked
 * against the country in the path/query/body of every single request, never
 * inferred from a previous call.
 *
 * Idempotency: the slot claim is atomic (OPEN → HELD under a unique
 * constraint). A retried or duplicated POST therefore returns 409, not a
 * second booking — the natural key is the time slot itself.
 */

/**
 * Hook→handler channel for the authenticated caller. A WeakMap avoids
 * decorating the global FastifyRequest type for one plugin's use, matching
 * `admin-doctor-time-slots.route.ts`.
 */
const callers = new WeakMap<FastifyRequest, PartnerApiCaller>();

function requireCaller(request: FastifyRequest): PartnerApiCaller {
  const caller = callers.get(request);
  // Unreachable: the onRequest hook 401s before any handler runs. Throwing
  // rather than silently proceeding means a future refactor that drops the
  // hook fails loudly instead of serving unauthenticated data.
  if (!caller) throw new Error("Partner API caller missing after auth hook");
  return caller;
}

/** Per-key rate limits. Generous for catalogue reads, tight for writes. */
const READ_RATE_LIMIT = { max: 120, timeWindow: "1 minute" };
const WRITE_RATE_LIMIT = { max: 30, timeWindow: "1 minute" };

const partnerApiRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const caller = await authenticatePartnerApiKey(request.headers["x-api-key"]);
    if (!caller) {
      // One undifferentiated 401 for missing / malformed / unknown / revoked.
      // Distinguishing them would let a caller probe which keys exist.
      return reply
        .status(401)
        .send(errorResponse("Invalid or missing API key"));
    }
    callers.set(request, caller);
    // Booking data is per-caller and time-sensitive; never let an
    // intermediary cache it. /api/partner/* is outside the automatic
    // no-store prefixes applied in app.ts, so set it here.
    reply.header("Cache-Control", "private, no-store");
  });

  /**
   * Discovery: the markets this key may operate in, with the timezone slot
   * times are expressed against and the market's currency.
   */
  app.get(
    "/api/partner/v1/countries",
    { config: { rateLimit: READ_RATE_LIMIT } },
    async (request, reply) => {
      const caller = requireCaller(request);
      try {
        const countries = await listPartnerCountries(caller.allowedCountryCodes);
        return okResponse({ countries });
      } catch (error) {
        return handleError(app, reply, error, "Could not load countries");
      }
    },
  );

  /**
   * Call #1 — what can be sold in this country: services, prices, and the
   * doctors providing each.
   */
  app.get<{ Params: { countryCode: string } }>(
    "/api/partner/v1/countries/:countryCode/catalog",
    { config: { rateLimit: READ_RATE_LIMIT } },
    async (request, reply) => {
      const caller = requireCaller(request);
      const params = partnerCatalogParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid country code", params.error.flatten()));
      }
      const scope = enforceCountryScope(caller, params.data.countryCode, reply);
      if (scope) return scope;

      try {
        const catalog = await getPartnerCountryCatalog(params.data.countryCode);
        return okResponse(catalog);
      } catch (error) {
        return handleError(app, reply, error, "Could not load catalogue");
      }
    },
  );

  /**
   * Call #2 — open slots for one (country, service, doctor) triple. Times are
   * UTC instants; render them in the returned `clinicTimezone`.
   *
   * Offered as BOTH `GET …?countryCode=…` and `POST` with a JSON body. The
   * GET is the canonical, cacheable form; the POST exists because four
   * query parameters are awkward to assemble in some clients and a GET
   * cannot reliably carry a body (Fastify does not parse one, and proxies
   * routinely strip it — it would fail silently rather than loudly).
   * Both forms share one schema and one service call, so they cannot drift.
   */
  const respondWithAvailability = async (
    request: FastifyRequest,
    reply: FastifyReply,
    input: unknown,
    invalidMessage: string,
  ) => {
    const caller = requireCaller(request);
    const parsed = partnerAvailabilityQuerySchema.safeParse(input);
    if (!parsed.success) {
      return reply
        .status(400)
        .send(errorResponse(invalidMessage, parsed.error.flatten()));
    }
    const scope = enforceCountryScope(caller, parsed.data.countryCode, reply);
    if (scope) return scope;

    try {
      const availability = await getPartnerAvailability(parsed.data);
      return okResponse(availability);
    } catch (error) {
      return handleError(app, reply, error, "Could not load availability");
    }
  };

  app.get<{ Querystring: Record<string, string | undefined> }>(
    "/api/partner/v1/availability",
    { config: { rateLimit: READ_RATE_LIMIT } },
    async (request, reply) =>
      respondWithAvailability(request, reply, request.query, "Invalid query"),
  );

  app.post(
    "/api/partner/v1/availability",
    { config: { rateLimit: READ_RATE_LIMIT } },
    async (request, reply) =>
      respondWithAvailability(
        request,
        reply,
        // An absent body arrives as null/undefined; hand the schema an object
        // so the caller gets field-level validation errors rather than a
        // confusing "expected object, received null".
        request.body ?? {},
        "Invalid body",
      ),
  );

  /**
   * Call #3 — create the booking. Mirrors the admin manual-booking pipeline:
   * the slot is claimed, a patient account is provisioned if the email is
   * new, an Order is raised, and the patient receives portal access plus a
   * payment link.
   */
  app.post(
    "/api/partner/v1/bookings",
    { config: { rateLimit: WRITE_RATE_LIMIT } },
    async (request, reply) => {
      const caller = requireCaller(request);
      const body = partnerCreateBookingBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid booking payload", body.error.flatten()));
      }
      const scope = enforceCountryScope(caller, body.data.countryCode, reply);
      if (scope) return scope;

      try {
        const booking = await createPartnerBooking({
          ...body.data,
          partnerClientId: caller.clientId,
          request,
        });
        return reply.status(201).send(okResponse(booking, "Booking created"));
      } catch (error) {
        // 409 is the one an integrator must handle in code: the slot went to
        // someone else between the availability read and this write, or this
        // request is a replay. Re-read availability and pick another slot.
        if (error instanceof SlotNotAvailableError) {
          return reply.status(409).send(errorResponse(error.message));
        }
        if (
          error instanceof ServiceNotFoundError ||
          error instanceof DoctorNotFoundError
        ) {
          return reply.status(404).send(errorResponse(error.message));
        }
        if (
          error instanceof ServicePriceMissingError ||
          error instanceof DoctorNotAvailableInCountryError ||
          error instanceof DoctorNotAssignedToServiceError ||
          error instanceof DoctorNotInInsuranceNetworkError ||
          error instanceof InsuranceNotCoveredError
        ) {
          return reply.status(422).send(errorResponse(error.message));
        }
        return handleError(app, reply, error, "Could not create booking");
      }
    },
  );
};

/**
 * Country-scope gate. Returns a reply when the caller is out of scope, or
 * undefined to continue. 404 rather than 403 on purpose — an out-of-scope
 * country should be indistinguishable from one that doesn't exist, so a key
 * scoped to `pt` can't enumerate which other markets are live.
 */
function enforceCountryScope(
  caller: PartnerApiCaller,
  countryCode: string,
  reply: FastifyReply,
) {
  if (callerMayAccessCountry(caller, countryCode)) return undefined;
  return reply.status(404).send(errorResponse("Country not found or inactive."));
}

function handleError(
  app: FastifyInstance,
  reply: FastifyReply,
  error: unknown,
  fallbackMessage: string,
) {
  if (
    error instanceof PartnerCountryNotFoundError ||
    error instanceof PartnerServiceNotFoundError ||
    error instanceof PartnerDoctorNotFoundError
  ) {
    return reply.status(404).send(errorResponse(error.message));
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse(fallbackMessage));
}

export default partnerApiRoute;
