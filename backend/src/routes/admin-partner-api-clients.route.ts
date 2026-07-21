import type { FastifyPluginAsync } from "fastify";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  listPartnerApiClients,
  mintPartnerApiKey,
  revokePartnerApiClient,
} from "../modules/partner-api/partner-api-key.service.js";
import { createPartnerApiClientBodySchema } from "../validations/partner-api.schema.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { resolveAdminSessionActor, verifyAdminAccess } from "../utils/admin-auth.js";
import { recordAudit } from "../modules/audit/audit.service.js";

/**
 * Admin management of partner booking API credentials.
 *
 * Minting and revoking keys is an admin action, not a partner one — the
 * partner API itself (`/api/partner/v1/*`) has no route that can create or
 * escalate a credential.
 */
const adminPartnerApiClientsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/admin/partner-api-clients", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
    try {
      const clients = await listPartnerApiClients();
      return okResponse({ clients });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load API clients"));
    }
  });

  /**
   * Mint a client + its key. The plaintext key is in this response and
   * NOWHERE else, ever — it is not stored, not logged, and not recoverable.
   * The admin UI must present it as copy-once.
   */
  app.post("/api/admin/partner-api-clients", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
    const body = createPartnerApiClientBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid payload", body.error.flatten()));
    }
    // Token-fallback callers have no User row to attribute to; the audit row
    // still records the IP + role. Mirrors admin-appointments.route.ts.
    const adminUserId = resolveAdminSessionActor(request)?.userId ?? null;
    try {
      const { client, key } = await mintPartnerApiKey({
        name: body.data.name,
        allowedCountryCodes: body.data.allowedCountryCodes,
        createdByUserId: adminUserId,
      });
      recordAudit({
        actorUserId: adminUserId,
        actorRole: "ADMIN",
        action: "PARTNER_API_CLIENT_CREATED",
        entityType: "PartnerApiClient",
        entityId: client.id,
        metadata: {
          name: client.name,
          // Prefix only — never the key itself.
          keyPrefix: client.keyPrefix,
          allowedCountryCodes: client.allowedCountryCodes,
        },
        request,
      }).catch(() => {});
      return reply.status(201).send(
        okResponse(
          { client, key },
          "API key created. Copy it now — it cannot be shown again.",
        ),
      );
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not create API client"));
    }
  });

  /** Revoke (soft): the key stops authenticating immediately. */
  app.delete<{ Params: { id: string } }>(
    "/api/admin/partner-api-clients/:id",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) {
        return reply.status(auth.status).send(errorResponse(auth.message));
      }
      try {
        const client = await revokePartnerApiClient(request.params.id);
        if (!client) {
          return reply.status(404).send(errorResponse("API client not found"));
        }
        recordAudit({
          actorUserId: resolveAdminSessionActor(request)?.userId ?? null,
          actorRole: "ADMIN",
          action: "PARTNER_API_CLIENT_REVOKED",
          entityType: "PartnerApiClient",
          entityId: client.id,
          metadata: { revoked: true, keyPrefix: client.keyPrefix },
          request,
        }).catch(() => {});
        return okResponse({ client }, "API key revoked");
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not revoke API client"));
      }
    },
  );
};

export default adminPartnerApiClientsRoute;
