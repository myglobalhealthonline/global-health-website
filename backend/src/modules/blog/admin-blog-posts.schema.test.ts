import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminBlogPostCreateBodySchema,
  adminBlogPostsQuerySchema,
  blogSlugSchema,
} from "../../validations/admin-blog-posts.schema.js";

describe("admin blog post validation", () => {
  it("rejects unsafe slug", () => {
    assert.equal(blogSlugSchema.safeParse("../oops").success, false);
    assert.equal(blogSlugSchema.safeParse("Hello World").success, false);
  });

  it("accepts url-safe slug", () => {
    assert.equal(blogSlugSchema.safeParse("how-online-consults-work").success, true);
  });

  it("rejects invalid locale", () => {
    const result = adminBlogPostCreateBodySchema.safeParse({
      slug: "sample-post",
      title: "Sample",
      body: "Body",
      status: "DRAFT",
      locale: "FR",
    });
    assert.equal(result.success, false);
  });

  it("requires body/content for published posts", () => {
    const result = adminBlogPostCreateBodySchema.safeParse({
      slug: "sample-post",
      title: "Sample",
      body: "",
      status: "PUBLISHED",
      locale: "EN",
    });
    assert.equal(result.success, false);
  });

  it("parses list query with status + active", () => {
    const result = adminBlogPostsQuerySchema.safeParse({
      page: "1",
      pageSize: "20",
      status: "PUBLISHED",
      isActive: "true",
      search: "clinic",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.status, "PUBLISHED");
      assert.equal(result.data.isActive, true);
    }
  });
});
