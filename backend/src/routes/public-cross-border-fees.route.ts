import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError, normalizeDbError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Public read of the cross-border prescription fee per market — the patient
 * price a locally registered prescriber charges to review a case referred from
 * another jurisdiction.
 *
 * Same availability rule as the doctor-facing picker
 * (`listCrossBorderRxTargets`): a country only counts when at least one
 * enabled + active doctor has a COMPLETE config row for it (price > 0 AND
 * payout set). Countries without one are simply absent from the payload, which
 * is what marketing pages render as "coming soon" — so the public copy can
 * never advertise a market the booking flow would refuse.
 *
 * When several prescribers serve one market the lowest configured price wins
 * (the "from" figure).
 */
const publicCrossBorderFeesRoute: FastifyPluginAsync = async (app) => {
  app.get(
    "/api/public/cross-border-rx/fees",
    { config: { rateLimit: { max: 300, timeWindow: "1 minute" } } },
    async (_request, reply) => {
      reply.header(
        "Cache-Control",
        "public, max-age=300, s-maxage=300, stale-while-revalidate=1800",
      );
      try {
        const configs = await prisma.doctorCrossBorderRxCountry.findMany({
          where: {
            priceCents: { gt: 0 },
            payoutCents: { not: null },
            doctor: { crossBorderRxEnabled: true, active: true },
            country: { isActive: true },
          },
          select: {
            priceCents: true,
            country: {
              select: { code: true, name: true, currency: { select: { code: true } } },
            },
          },
        });

        const byCountry = new Map<
          string,
          { countryCode: string; countryName: string; currencyCode: string; priceCents: number }
        >();
        for (const row of configs) {
          const key = row.country.code.toLowerCase();
          const current = byCountry.get(key);
          if (!current || row.priceCents! < current.priceCents) {
            byCountry.set(key, {
              countryCode: row.country.code,
              countryName: row.country.name,
              currencyCode: row.country.currency.code,
              priceCents: row.priceCents!,
            });
          }
        }

        return okResponse({
          fees: Array.from(byCountry.values()).sort((a, b) =>
            a.countryName.localeCompare(b.countryName),
          ),
        });
      } catch (error) {
        const normalized = normalizeDbError(error, "Cross-border fees are unavailable");
        if (normalized instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(normalized.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load cross-border fees"));
      }
    },
  );
};

export default publicCrossBorderFeesRoute;
