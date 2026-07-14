import "server-only";

/**
 * Origin for server-side calls from Next.js to the Fastify API (Route Handlers,
 * Server Actions). Single source of truth: NEXT_PUBLIC_API_URL — the former
 * API_BASE_URL / ADMIN_API_BASE_URL overrides were never set to anything
 * different in any environment and were dropped to stop config drift.
 */
export function getBackendOrigin(): string {
  return (process.env.NEXT_PUBLIC_API_URL?.trim() ?? "").replace(/\/+$/, "");
}
