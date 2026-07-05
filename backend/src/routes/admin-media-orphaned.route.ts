import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { listObjects, isObjectStorageConfigured } from "../services/object-storage.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { buildPublicMediaUrl } from "../utils/public-media-url.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Post-incident recovery tool (2026-07-05 Service-table wipe cascaded and
 * hard-deleted every Asset row tied to a service — see
 * docs/plans/... memory `project_db_wipe_recovery_july2026`). The image
 * FILES survived in the bucket; only the DB link to "which service used
 * this" was lost. This lists bucket objects under `media/` that no current
 * Asset row or Service.galleryImagePaths entry references, so an admin can
 * eyeball and manually re-attach them via the picker UI. `media/doctors/*`
 * is excluded — those are doctor photos, a separate (intact) concern.
 */
const adminMediaOrphanedRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get("/api/admin/media/orphaned", async (request, reply) => {
    if (!isObjectStorageConfigured()) {
      return reply.status(503).send(errorResponse("Object storage is not configured"));
    }
    try {
      const [objects, assets, services] = await Promise.all([
        listObjects("media/"),
        prisma.asset.findMany({ select: { path: true } }),
        prisma.service.findMany({ select: { galleryImagePaths: true } }),
      ]);
      const referencedKeys = new Set<string>();
      for (const a of assets) {
        if (a.path) referencedKeys.add(a.path);
      }
      for (const s of services) {
        for (const p of s.galleryImagePaths) referencedKeys.add(p);
      }
      const orphaned = objects
        .filter((o) => !o.key.startsWith("media/doctors/"))
        .map((o) => ({
          key: o.key,
          size: o.size,
          lastModified: o.lastModified ? o.lastModified.toISOString() : null,
          publicUrl: buildPublicMediaUrl(request, o.key),
        }))
        // A referenced Asset/gallery entry stores the FULL public URL, not
        // the bare key — match on that, not the raw key.
        .filter((o) => !referencedKeys.has(o.publicUrl));
      return okResponse({ orphaned, total: objects.length, unmatched: orphaned.length });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not list orphaned media"));
    }
  });
};

export default adminMediaOrphanedRoute;
