import type { FastifyPluginAsync } from "fastify";
import { LocaleCode } from "@prisma/client";
import { z } from "zod";
import {
  getPublicExamTypeBySlug,
  listPublicExamTypes,
  resolvePublicExamOffering,
} from "../modules/test-centers/test-centers.service.js";
import {
  ensureSlotsForRange,
  listOpenSlotsForTestCenter,
} from "../modules/test-center-availability/test-center-availability.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Public "Book a Test" catalogue.
 *
 * Every read goes through the same publication gate in the service layer: the
 * exam is active AND bookable AND carried by an active centre in a live market.
 * The three endpoints must agree exactly — a catalogue listing an exam whose
 * detail 404s, or whose slots are bookable while it is unpublished, is the
 * failure this shape prevents.
 */

const localeQuery = z
  .preprocess(
    (v) => (typeof v === "string" ? v.toUpperCase() : v),
    z.nativeEnum(LocaleCode).optional(),
  )
  // An unknown locale falls back to the country default rather than failing the
  // whole parse (which would silently drop the other params too).
  .catch(undefined);

const countryParams = z.object({
  countryCode: z.string().trim().min(1).max(8).toLowerCase(),
});

const examParams = countryParams.extend({
  examSlug: z.string().trim().min(1).max(200),
});

const availabilityParams = examParams.extend({
  centreSlug: z.string().trim().min(1).max(200),
});

const availabilityQuery = z.object({
  days: z.coerce.number().int().min(1).max(60).default(14),
});

/** Stable public content — same window the other catalogue GETs use. */
function applyPublicCache(reply: { header: (k: string, v: string) => void }) {
  reply.header(
    "Cache-Control",
    "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
  );
}

/** Slot inventory moves; cache it for seconds, not minutes. */
function applyAvailabilityCache(reply: { header: (k: string, v: string) => void }) {
  reply.header(
    "Cache-Control",
    "public, max-age=10, s-maxage=10, stale-while-revalidate=15",
  );
}

const publicTestsRoute: FastifyPluginAsync = async (app) => {
  /** Catalogue: bookable exams in this country, with a from-price. */
  app.get<{ Params: { countryCode: string } }>(
    "/api/tests/:countryCode",
    async (request, reply) => {
      applyPublicCache(reply);
      const params = countryParams.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send(errorResponse("Invalid country"));
      }
      const locale = localeQuery.parse(
        (request.query as { locale?: string } | undefined)?.locale,
      );
      try {
        const tests = await listPublicExamTypes(params.data.countryCode, locale);
        return okResponse({ tests });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load tests"));
      }
    },
  );

  /** Detail: one exam plus every centre in this country that performs it. */
  app.get<{ Params: { countryCode: string; examSlug: string } }>(
    "/api/tests/:countryCode/:examSlug",
    async (request, reply) => {
      applyPublicCache(reply);
      const params = examParams.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send(errorResponse("Invalid test path"));
      }
      const locale = localeQuery.parse(
        (request.query as { locale?: string } | undefined)?.locale,
      );
      try {
        const test = await getPublicExamTypeBySlug(
          params.data.countryCode,
          params.data.examSlug,
          locale,
        );
        // Same 404 whether the exam does not exist or is unpublished — an
        // unpublished exam must not be distinguishable from a missing one.
        if (!test) return reply.status(404).send(errorResponse("Test not found"));
        return okResponse({ test });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load test"));
      }
    },
  );

  /**
   * Open slots for one exam at one centre.
   *
   * Re-resolves the (exam, centre) pair rather than trusting the URL: a patient
   * could otherwise pull slots for a centre that no longer carries the exam,
   * book one, and arrive for a test nobody there performs.
   *
   * Slots are filtered to those with a long enough contiguous OPEN run for the
   * exam, so the picker never offers a start the claim would reject.
   */
  app.get<{
    Params: { countryCode: string; examSlug: string; centreSlug: string };
  }>(
    "/api/tests/:countryCode/:examSlug/centres/:centreSlug/availability",
    async (request, reply) => {
      applyAvailabilityCache(reply);
      const params = availabilityParams.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send(errorResponse("Invalid availability path"));
      }
      const query = availabilityQuery.safeParse(request.query);
      if (!query.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid availability query", query.error.flatten()));
      }
      try {
        const offering = await resolvePublicExamOffering(
          params.data.countryCode,
          params.data.examSlug,
          params.data.centreSlug,
        );
        if (!offering) {
          return reply.status(404).send(errorResponse("Test not available at that centre"));
        }

        const from = new Date();
        const to = new Date(from.getTime() + query.data.days * 24 * 60 * 60 * 1000);
        // Generate first so a centre nobody has viewed still offers its windows.
        await ensureSlotsForRange(offering.testCenterId, from, to);
        const slots = await listOpenSlotsForTestCenter(
          offering.testCenterId,
          from,
          to,
          offering.durationMinutes,
        );

        return okResponse({
          slots,
          testCenterId: offering.testCenterId,
          examTypeId: offering.examTypeId,
          durationMinutes: offering.durationMinutes,
          patientPriceCents: offering.patientPriceCents,
          currencyCode: offering.currencyCode,
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load availability"));
      }
    },
  );
};

export default publicTestsRoute;
