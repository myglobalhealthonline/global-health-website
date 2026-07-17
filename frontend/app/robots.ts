import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/site-url";

const DISALLOW = [
  "/admin",
  "/admin/*",
  "/account",
  "/account/*",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/api/",
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
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/", disallow: DISALLOW })),
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}

