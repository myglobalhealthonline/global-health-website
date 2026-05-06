import type { FastifyPluginAsync } from "fastify";
import { Prisma } from "@prisma/client";
import {
  AssetAltRequiredError,
  AssetCountryNotFoundError,
  AssetDoctorInvalidError,
  createAdminAsset,
  disableAdminAsset,
  getAdminAssetById,
  listAdminAssets,
  updateAdminAsset,
} from "../modules/assets/assets.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  adminAssetCreateBodySchema,
  adminAssetsQuerySchema,
  adminAssetUpdateBodySchema,
  assetIdParamsSchema,
} from "../validations/admin-assets.schema.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

function handleAssetWriteError(
  app: { log: { error: (e: unknown) => void } },
  reply: {
    status: (code: number) => { send: (body: unknown) => unknown };
  },
  error: unknown,
) {
  if (
    error instanceof AssetCountryNotFoundError ||
    error instanceof AssetDoctorInvalidError ||
    error instanceof AssetAltRequiredError
  ) {
    return reply.status(400).send(errorResponse(error.message));
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return reply.status(409).send(errorResponse("Duplicate kind + key for an asset"));
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse("Unexpected admin assets error"));
}

const adminAssetsRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get("/api/admin/assets", async (request, reply) => {
    const query = adminAssetsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid admin assets query", query.error.flatten()));
    }

    try {
      const data = await listAdminAssets(query.data);
      return okResponse(data);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin assets error"));
    }
  });

  app.get("/api/admin/assets/:id", async (request, reply) => {
    const params = assetIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid asset id", params.error.flatten()));
    }

    try {
      const asset = await getAdminAssetById(params.data.id);
      if (!asset) {
        return reply.status(404).send(errorResponse("Asset not found"));
      }
      return okResponse({ asset });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin asset error"));
    }
  });

  app.post("/api/admin/assets", async (request, reply) => {
    const body = adminAssetCreateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid asset payload", body.error.flatten()));
    }

    try {
      const asset = await createAdminAsset(body.data);
      return okResponse({ asset }, "Asset created");
    } catch (error) {
      return handleAssetWriteError(app, reply, error);
    }
  });

  app.patch("/api/admin/assets/:id", async (request, reply) => {
    const params = assetIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid asset id", params.error.flatten()));
    }

    const body = adminAssetUpdateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid asset update", body.error.flatten()));
    }

    if (Object.keys(body.data).length === 0) {
      return reply.status(400).send(errorResponse("No fields to update"));
    }

    try {
      const asset = await updateAdminAsset(params.data.id, body.data);
      if (!asset) {
        return reply.status(404).send(errorResponse("Asset not found"));
      }
      return okResponse({ asset }, "Asset updated");
    } catch (error) {
      return handleAssetWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/assets/:id", async (request, reply) => {
    const params = assetIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid asset id", params.error.flatten()));
    }

    try {
      const asset = await disableAdminAsset(params.data.id);
      if (!asset) {
        return reply.status(404).send(errorResponse("Asset not found"));
      }
      return okResponse({ asset }, "Asset deactivated");
    } catch (error) {
      return handleAssetWriteError(app, reply, error);
    }
  });
};

export default adminAssetsRoute;
