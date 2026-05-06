import type { FastifyPluginAsync } from "fastify";
import { Prisma } from "@prisma/client";
import {
  BlogCountryNotFoundError,
  BlogCoverAssetInvalidError,
  createAdminBlogPost,
  disableAdminBlogPost,
  getAdminBlogPostById,
  listAdminBlogPosts,
  updateAdminBlogPost,
} from "../modules/blog/blog.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  adminBlogPostCreateBodySchema,
  adminBlogPostsQuerySchema,
  adminBlogPostUpdateBodySchema,
  blogPostIdParamsSchema,
} from "../validations/admin-blog-posts.schema.js";
import { verifyAdminToken } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

function handleWriteError(
  app: { log: { error: (e: unknown) => void } },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  error: unknown,
) {
  if (error instanceof BlogCountryNotFoundError || error instanceof BlogCoverAssetInvalidError) {
    return reply.status(400).send(errorResponse(error.message));
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return reply.status(409).send(errorResponse("Duplicate value for unique blog post fields"));
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse("Unexpected admin blog posts error"));
}

const adminBlogPostsRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = verifyAdminToken(request.headers.authorization);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get("/api/admin/blog-posts", async (request, reply) => {
    const query = adminBlogPostsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid blog post query", query.error.flatten()));
    }
    try {
      const data = await listAdminBlogPosts(query.data);
      return okResponse(data);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin blog posts error"));
    }
  });

  app.get("/api/admin/blog-posts/:id", async (request, reply) => {
    const params = blogPostIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid blog post id", params.error.flatten()));
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
      return reply.status(500).send(errorResponse("Unexpected admin blog post error"));
    }
  });

  app.post("/api/admin/blog-posts", async (request, reply) => {
    const body = adminBlogPostCreateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid blog post payload", body.error.flatten()));
    }
    try {
      const post = await createAdminBlogPost(body.data);
      return okResponse({ post }, "Blog post created");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });

  app.patch("/api/admin/blog-posts/:id", async (request, reply) => {
    const params = blogPostIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid blog post id", params.error.flatten()));
    }
    const body = adminBlogPostUpdateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid blog post update", body.error.flatten()));
    }
    if (Object.keys(body.data).length === 0) {
      return reply.status(400).send(errorResponse("No fields to update"));
    }
    try {
      const post = await updateAdminBlogPost(params.data.id, body.data);
      if (!post) {
        return reply.status(404).send(errorResponse("Blog post not found"));
      }
      return okResponse({ post }, "Blog post updated");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/blog-posts/:id", async (request, reply) => {
    const params = blogPostIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid blog post id", params.error.flatten()));
    }
    try {
      const post = await disableAdminBlogPost(params.data.id);
      if (!post) {
        return reply.status(404).send(errorResponse("Blog post not found"));
      }
      return okResponse({ post }, "Blog post deactivated");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });
};

export default adminBlogPostsRoute;
