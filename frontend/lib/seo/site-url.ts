const PROD_SITE_URL = "https://www.myglobalhealth.online";
const DEV_SITE_URL = "http://localhost:3000";

export function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  // No env var set. In production builds default to the canonical production
  // domain so canonical/OG URLs never fall back to localhost or a staging
  // subdomain (e.g. *.up.railway.app). Local dev keeps localhost so dev
  // canonicals don't leak the production domain.
  return process.env.NODE_ENV === "production" ? PROD_SITE_URL : DEV_SITE_URL;
}

