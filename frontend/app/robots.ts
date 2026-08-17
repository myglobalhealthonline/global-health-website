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
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/", disallow: DISALLOW })),
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}

