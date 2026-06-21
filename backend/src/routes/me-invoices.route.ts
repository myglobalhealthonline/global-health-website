import type { FastifyPluginAsync } from "fastify";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { listUserSubscriptionInvoices } from "../modules/subscriptions/subscription-invoice.service.js";

/**
 * GET /api/me/invoices — the patient's subscription invoices for the account
 * payments page (§38.1 mirror). Read-only, scoped to the owning user. Stripe
 * stays the system of record (numbering, VAT, PDF); this only links them.
 */
const meInvoicesRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/me/invoices", async (request, reply) => {
    const user = await resolveOptionalAuthUser(request);
    if (!user || user.role !== "PATIENT") {
      return reply.status(401).send(errorResponse("Authentication required"));
    }
    try {
      return okResponse(await listUserSubscriptionInvoices(user.id));
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not load invoices"));
    }
  });
};

export default meInvoicesRoute;
