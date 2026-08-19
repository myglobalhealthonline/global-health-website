import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/site-url";

/**
 * Crawl policy.
 *
 * The auth pages (`/login`, `/register`, `/forgot-password`, `/reset-password`,
 * `/verify-email`) and `/account` are DELIBERATELY NOT listed here even though
 * they must never be indexed. They already serve `noindex, nofollow` from the
 * `(portal)/(auth)` layouts, and a `Disallow` would stop Googlebot from ever
 * fetching the page that carries it — the classic robots.txt/noindex conflict.
 * Blocked-but-linked URLs get indexed URL-only, and `/login` alone carries
 * ~1,000 internal links from the site header, so it is the single most likely
 * URL on the site to pick up a bare SERP entry. Crawlable + `noindex` is the
 * only combination that actually keeps them out of the index.
 *
 * `/account/*` stays blocked: those are gated deep pages that 307 to `/login`
 * for anonymous crawlers, so crawling them buys nothing. `/admin*` has no
 * public inlinks and stays blocked as defence in depth.
 */
const DISALLOW = ["/admin", "/admin/*", "/account/*", "/api/"];

/**
 * Read-only public API prefixes that must stay crawlable despite the blanket
 * `/api/` disallow. Longest-match wins in Google's robots parser, so these
 * `Allow` lines beat `Disallow: /api/`.
 *
 * - `/api/media/` serves EVERY CMS image (doctor photos, service art). Blocking
 *   it kept the whole library out of Google Images and made Googlebot render
 *   the doctor pages with broken portraits.
 * - `/api/og` is the `og:image` endpoint referenced by every page's metadata.
 * - The two availability endpoints are the anonymous reads the rendered
 *   booking sections make client-side; without them Googlebot renders those
 *   sections empty.
 *
 * Deliberately NOT allowed: the rest of `/api/public/*` (brazil-consent,
 * reviews/rate, patient-upload, cross-border-rx-consent). Those are
 * token-gated consent/upload surfaces reached from emailed links, carry no
 * indexable content, and there is no upside to inviting a crawler in.
 */
const ALLOW = [
  "/",
  "/api/media/",
  "/api/og",
  "/api/public/gp-availability",
  "/api/public/booking-availability",
];

/** AI answer-engine crawlers (AEO) — explicitly allowed so the site is
 *  eligible for ChatGPT search, Claude, Gemini/AI Overviews, and Perplexity
 *  citations. Same portal/auth disallows as everyone else. */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "Google-Extended",
  "Gemini-Deep-Research",
  "PerplexityBot",
  "Perplexity-User",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: ALLOW, disallow: DISALLOW },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: ALLOW, disallow: DISALLOW })),
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}

