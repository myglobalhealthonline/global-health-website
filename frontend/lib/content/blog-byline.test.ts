import { describe, expect, it } from "vitest";

import { BLOG_AUTHOR_NAME, resolveBlogAuthorByline } from "./blog-byline";

describe("resolveBlogAuthorByline", () => {
  it("always returns the canonical team byline, even when a named author doctor remains linked", () => {
    const linkedAuthorDoctor = {
      name: "Dr Stored Author",
      slug: "stored-author",
      countryCode: "IE",
      countrySlug: "ireland",
      registrationNumber: "12345",
      chamberEntity: "Medical Council",
    };

    expect(
      resolveBlogAuthorByline({
        storedAuthor: "A legacy free-text author",
        authorDoctor: linkedAuthorDoctor,
      }),
    ).toEqual({ name: "Global Health Medical Team", href: null });
    expect(BLOG_AUTHOR_NAME).toBe("Global Health Medical Team");

    // The presentation helper consumes the linked relationship but does not
    // mutate or discard it; the production update remains display-name-only.
    expect(linkedAuthorDoctor).toEqual({
      name: "Dr Stored Author",
      slug: "stored-author",
      countryCode: "IE",
      countrySlug: "ireland",
      registrationNumber: "12345",
      chamberEntity: "Medical Council",
    });
  });
});
