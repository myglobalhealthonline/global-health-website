export const ADMIN_AUTH_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME?.trim() || "gh_admin_session";

export function adminAuthCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}
