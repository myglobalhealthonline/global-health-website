import { PROD_SITE_URL } from "@/lib/seo/site-url";

// IndexNow key — verified via /public/<KEY>.txt served at the site root.
// Shared across Bing + Seznam (Czechia); both read the same protocol.
export const INDEXNOW_KEY = "2b7f7c129e4df9753043da11ba9e32ff";

const INDEXNOW_HOST = new URL(PROD_SITE_URL).host;
const KEY_LOCATION = `${PROD_SITE_URL}/${INDEXNOW_KEY}.txt`;

/**
 * Fire-and-forget IndexNow submission. Never throws — a failed ping should
 * never break the caller's flow (publish, cron, script).
 */
export async function submitToIndexNow(urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  try {
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: INDEXNOW_HOST,
        key: INDEXNOW_KEY,
        keyLocation: KEY_LOCATION,
        urlList: urls,
      }),
    });
  } catch {
    // ponytail: best-effort ping, no retry/backoff — add if submissions
    // are ever found to silently fail in practice.
  }
}
