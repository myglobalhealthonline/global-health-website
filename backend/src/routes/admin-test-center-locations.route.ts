import type { FastifyPluginAsync } from "fastify";
import { Prisma } from "@prisma/client";
import {
  LastTestCenterLocationError,
  TestCenterNotFoundError,
  createTestCenterLocation,
  deleteTestCenterLocation,
  listTestCenterLocations,
  updateTestCenterLocation,
} from "../modules/test-centers/test-centers.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  adminTestCenterLocationCreateBodySchema,
  adminTestCenterLocationUpdateBodySchema,
  testCenterIdParamsSchema,
  testCenterLocationIdParamsSchema,
} from "../validations/admin-test-centers.schema.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Admin CRUD for a test centre's physical branches.
 *
 * A centre is the provider; a location is the site a patient travels to. The
 * calendar and the address both live on the location, which is why every
 * availability and slot route sits under `/locations/:locationId`.
 */
const adminTestCenterLocationsRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  function handleError(
    reply: { status: (c: number) => { send: (b: unknown) => unknown } },
    error: unknown,
    message: string,
  ) {
    if (error instanceof TestCenterNotFoundError) {
      return reply.status(404).send(errorResponse(error.message));
    }
    // Refused: the centre would be left with no branch, or the branch still
    // holds live bookings. Both are 409 — the request is well-formed, the
    // state says no.
    if (error instanceof LastTestCenterLocationError) {
      return reply.status(409).send(errorResponse(error.message));
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return reply
        .status(409)
        .send(errorResponse("Another location of this centre already uses that slug"));
    }
    if (error instanceof DatabaseUnavailableError) {
      return reply.status(503).send(errorResponse(error.message));
    }
    app.log.error(error);
    return reply.status(500).send(errorResponse(message));
  }

  app.get<{ Params: { id: string } }>(
    "/api/admin/test-centers/:id/locations",
    async (request, reply) => {
      const params = testCenterIdParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send(errorResponse("Invalid test center id"));
      }
      try {
        const locations = await listTestCenterLocations(params.data.id);
        return okResponse({ locations });
      } catch (error) {
        return handleError(reply, error, "Could not load locations");
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/admin/test-centers/:id/locations",
    async (request, reply) => {
      const params = testCenterIdParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send(errorResponse("Invalid test center id"));
      }
      const body = adminTestCenterLocationCreateBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid location", body.error.flatten()));
      }
      try {
        const location = await createTestCenterLocation(params.data.id, body.data);
        return reply.status(201).send(okResponse({ location }));
      } catch (error) {
        return handleError(reply, error, "Could not create the location");
      }
    },
  );

  app.patch<{ Params: { id: string; locationId: string } }>(
    "/api/admin/test-centers/:id/locations/:locationId",
    async (request, reply) => {
      const params = testCenterLocationIdParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send(errorResponse("Invalid location id"));
      }
      const body = adminTestCenterLocationUpdateBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid location", body.error.flatten()));
      }
      try {
        const location = await updateTestCenterLocation(
          params.data.id,
          params.data.locationId,
          body.data,
        );
        // Null means "no such location on THIS centre" — scoping the lookup by
        // centre is what stops one centre editing another's branch.
        if (!location) {
          return reply.status(404).send(errorResponse("Location not found"));
        }
        return okResponse({ location });
      } catch (error) {
        return handleError(reply, error, "Could not update the location");
      }
    },
  );

  app.delete<{ Params: { id: string; locationId: string } }>(
    "/api/admin/test-centers/:id/locations/:locationId",
    async (request, reply) => {
      const params = testCenterLocationIdParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send(errorResponse("Invalid location id"));
      }
      try {
        const removed = await deleteTestCenterLocation(
          params.data.id,
          params.data.locationId,
        );
        if (!removed) {
          return reply.status(404).send(errorResponse("Location not found"));
        }
        return okResponse({ deleted: true });
      } catch (error) {
        return handleError(reply, error, "Could not delete the location");
      }
    },
  );
};

export default adminTestCenterLocationsRoute;
