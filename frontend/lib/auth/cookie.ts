/**
 * Resolved session cookie name. Must match the backend's
 * `AUTH_COOKIE_NAME` env var so the proxy + layouts agree on which
 * cookie carries the JWT. Falls back to `gh_auth` (the backend's
 * default) when the env var is unset.
 *
 * No `"server-only"` import — the value is read from `process.env`
 * which Next.js inlines at build time for non-`NEXT_PUBLIC_` keys, so
 * client modules referencing this constant won't accidentally drag a
 * server import in.
 */
export const AUTH_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME?.trim() || "gh_auth";
