import type { FastifyPluginAsync } from "fastify";
import { recordEntityPurge } from "../modules/audit/audit.service.js";
import { Prisma } from "@prisma/client";
import {
  BlogCountryNotFoundError,
  createAdminBlogPost,
  disableAdminBlogPost,
  getAdminBlogPostById,
  listAdminBlogPosts,
  purgeAdminBlogPost,
  updateAdminBlogPost,
  listBlogTranslations,
  upsertBlogTranslation,
  deleteBlogTranslation,
  setBlogPostCountries,
} from "../modules/blog/blog.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  adminBlogCreateBodySchema,
  adminBlogQuerySchema,
  adminBlogUpdateBodySchema,
  blogIdParamsSchema,
  blogTranslationParamsSchema,
  blogTranslationBodySchema,
  blogPostCountriesBodySchema,
} from "../validations/admin-blog.schema.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

function handleBlogWriteError(
  app: { log: { error: (e: unknown) => void } },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  error: unknown,
) {
  if (error instanceof BlogCountryNotFoundError) {
    return reply.status(400).send(errorResponse(error.message));
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return reply
      .status(409)
      .send(errorResponse("A blog post already exists with this slug, locale, and country"));
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse("Unexpected admin blog error"));
}

const adminBlogRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get("/api/admin/blog", async (request, reply) => {
    const query = adminBlogQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid admin blog query", query.error.flatten()));
    }
    try {
      const data = await listAdminBlogPosts(query.data);
      return okResponse(data);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin blog error"));
    }
  });

  app.get("/api/admin/blog/:id", async (request, reply) => {
    const params = blogIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid blog id", params.error.flatten()));
    }
    try {
      const post = await getAdminBlogPostById(params.data.id);
      if (!post) {
        return reply.status(404).send(errorResponse("Blog post not found"));
      }
      return okResponse({ post });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin blog error"));
    }
  });

  app.post("/api/admin/blog", async (request, reply) => {
    const body = adminBlogCreateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid blog payload", body.error.flatten()));
    }
    try {
      const post = await createAdminBlogPost(body.data);
      return reply.status(201).send(okResponse({ post }));
    } catch (error) {
      return handleBlogWriteError(app, reply, error);
    }
  });

  app.patch("/api/admin/blog/:id", async (request, reply) => {
    const params = blogIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid blog id", params.error.flatten()));
    }
    const body = adminBlogUpdateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid blog payload", body.error.flatten()));
    }
    try {
      const post = await updateAdminBlogPost(params.data.id, body.data);
      if (!post) {
        return reply.status(404).send(errorResponse("Blog post not found"));
      }
      return okResponse({ post });
    } catch (error) {
      return handleBlogWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/blog/:id", async (request, reply) => {
    const params = blogIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid blog id", params.error.flatten()));
    }
    try {
      const post = await disableAdminBlogPost(params.data.id);
      if (!post) {
        return reply.status(404).send(errorResponse("Blog post not found"));
      }
      return okResponse({ post });
    } catch (error) {
      return handleBlogWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/blog/:id/purge", async (request, reply) => {
    const params = blogIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid blog id", params.error.flatten()));
    }
    try {
      const ok = await purgeAdminBlogPost(params.data.id);
      if (!ok) {
        return reply.status(404).send(errorResponse("Blog post not found"));
      }
      recordEntityPurge(request, "BlogPost", params.data.id);
      return okResponse({ deleted: true });
    } catch (error) {
      return handleBlogWriteError(app, reply, error);
    }
  });

  // ── BlogTranslation ────────────────────────────────────────────────────────

  app.get("/api/admin/blog/:id/translations", async (request, reply) => {
    const params = blogIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid blog id", params.error.flatten()));
    }
    try {
      const translations = await listBlogTranslations(params.data.id);
      return okResponse({ translations });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected translation error"));
    }
  });

  app.put("/api/admin/blog/:id/translations/:locale", async (request, reply) => {
    const params = blogTranslationParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid params", params.error.flatten()));
    }
    const body = blogTranslationBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid translation payload", body.error.flatten()));
    }
    try {
      const translation = await upsertBlogTranslation(params.data.id, params.data.locale, body.data);
      return okResponse({ translation }, "Translation saved");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected translation error"));
    }
  });

  app.delete("/api/admin/blog/:id/translations/:locale", async (request, reply) => {
    const params = blogTranslationParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid params", params.error.flatten()));
    }
    try {
      const deleted = await deleteBlogTranslation(params.data.id, params.data.locale);
      if (!deleted) {
        return reply.status(404).send(errorResponse("Translation not found"));
      }
      return okResponse({}, "Translation deleted");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected translation error"));
    }
  });

  // ── BlogPostCountry ────────────────────────────────────────────────────────

  app.put("/api/admin/blog/:id/countries", async (request, reply) => {
    const params = blogIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid blog id", params.error.flatten()));
    }
    const body = blogPostCountriesBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid countries payload", body.error.flatten()));
    }
    try {
      await setBlogPostCountries(params.data.id, body.data.countryIds);
      return okResponse({}, "Countries updated");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected error updating countries"));
    }
  });
};

export default adminBlogRoute;
