export const BLOG_AUTHOR_NAME = "Global Health Medical Team";

type StoredAuthorDoctor = {
  name: string;
  slug: string;
  countryCode: string | null;
  countrySlug: string | null;
};

export type BlogAuthorByline = {
  name: typeof BLOG_AUTHOR_NAME;
  href: null;
};

/**
 * Blog articles use one consistent editorial byline. The linked doctor remains
 * available on the post for clinical provenance, but is not presented as the
 * editorial author.
 */
export function resolveBlogAuthorByline(_input: {
  storedAuthor: string | null;
  authorDoctor: StoredAuthorDoctor | null;
}): BlogAuthorByline {
  return { name: BLOG_AUTHOR_NAME, href: null };
}
