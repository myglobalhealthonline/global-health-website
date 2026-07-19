import type { FastifyPluginAsync } from "fastify";
import {
  getPublicBlogPostBySlug,
  getPublicBlogPosts,
} from "../modules/blog/blog.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  publicBlogParamsSchema,
  publicBlogQuerySchema,
} from "../validations/admin-blog.schema.js";
import { errorResponse, okResponse } from "../utils/response.js";

const blogRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/blog", async (request, reply) => {
    reply.header(
      "Cache-Control",
      "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
    );
    const query = publicBlogQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid blog query", query.error.flatten()));
    }
    try {
      const posts = await getPublicBlogPosts(query.data.locale, query.data.countryCode);
      return okResponse({ posts });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected blog error"));
    }
  });

  app.get("/api/blog/:slug", async (request, reply) => {
    reply.header(
      "Cache-Control",
      "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
    );
    const params = publicBlogParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid blog slug", params.error.flatten()));
    }
    const query = publicBlogQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid blog query", query.error.flatten()));
    }
    try {
      const post = await getPublicBlogPostBySlug(params.data.slug, query.data.locale, query.data.countryCode);
      if (!post) {
        return reply.status(404).send(errorResponse("Blog post not found"));
      }
      return okResponse({ post });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected blog error"));
    }
  });
};

export default blogRoute;
