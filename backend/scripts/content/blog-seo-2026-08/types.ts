import type { Article } from "./template.js";

export type Locale = "EN" | "PT" | "ES" | "CS" | "RO" | "DE";

export type LocalePost = {
  locale: Locale;
  /** Native-language slug. Each locale is its own BlogPost row, because the
   *  public renderer resolves a post by slug and filters on BlogPost.locale —
   *  BlogTranslation rows are never read (see blog-post-page.tsx). */
  slug: string;
  title: string;
  excerpt: string;
  /** Hard limit 60 characters — enforced by the seed script, not by hand. */
  seoTitle: string;
  /** Hard limit 155 characters — enforced by the seed script, not by hand. */
  seoDescription: string;
  category: string;
  article: Article;
};

export type PostSet = {
  /** Stable identifier used in dry-run output. */
  key: string;
  /** Country.code as stored in the DB (lowercase, e.g. "ie"). */
  countryCode: string;
  /** Research provenance, printed in the dry-run and kept in the script header. */
  targetKeyword: string;
  searchVolume: number | null;
  keywordDifficulty: number | null;
  evidence: string;
  /** Service.slug in that country — resolved to ctaServiceId at run time so a
   *  renamed or deleted service fails loudly instead of seeding a dangling FK. */
  serviceSlug: string;
  authorDoctorId: string;
  authorDisplayName: string;
  reviewerDoctorId?: string;
  reviewerDisplayName?: string;
  posts: LocalePost[];
};
