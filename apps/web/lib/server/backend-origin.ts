import "server-only";

/**
 * Origin for server-side calls from Next.js to the Fastify API (Route Handlers, Server Actions).
 * Prefer API_BASE_URL for private/internal URLs on hosts like Railway; fall back to NEXT_PUBLIC_API_URL.
 */
export function getBackendOrigin(): string {
  const raw =
    process.env.API_BASE_URL?.trim() ?? process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";
  return raw.replace(/\/+$/, "");
}
