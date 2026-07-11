// Pure helper shared by server pages and client components — must stay free
// of "server-only" imports (admin-api/core.ts is server-only).
export type AdminAssetKind = "IMAGE" | "ICON" | "LOGO" | "BADGE" | "SOCIAL";

export function adminAssetPreviewable(kind: AdminAssetKind, path: string): boolean {
  if (kind !== "IMAGE" && kind !== "LOGO") return false;
  return path.startsWith("/") || path.startsWith("https://");
}
