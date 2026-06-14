import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { absoluteSiteUrl } from "./send-email.js";

/** Same default as frontend `DEFAULT_BRAND_LOGO_LIGHT` (dark/green email header). */
export const DEFAULT_EMAIL_LOGO_PATH = "/logos/global-health-light.png";

const SITE_LOGO_KEY = "site-logo";

function toAbsoluteAssetUrl(path: string): string | null {
  const t = path.trim();
  if (!t) return null;

  if (t.startsWith("/") && !t.startsWith("//") && !t.includes("..") && !/[\s<>"]/.test(t)) {
    if (t.startsWith("/api/media/")) {
      const origin = env.PUBLIC_MEDIA_ORIGIN?.trim().replace(/\/+$/, "");
      return origin ? `${origin}${t}` : null;
    }
    return absoluteSiteUrl(t);
  }

  if (/^https:\/\//i.test(t) && !/^https:\/\/[^/]*\.wixstatic\.com/i.test(t)) {
    return t;
  }

  return null;
}

/** Resolve the site logo URL used in transactional emails (CMS override or frontend default). */
export async function resolveEmailLogoUrl(): Promise<string> {
  try {
    const asset = await prisma.asset.findFirst({
      where: {
        isActive: true,
        key: SITE_LOGO_KEY,
        kind: { in: ["LOGO", "IMAGE"] },
        countryId: null,
      },
      select: { path: true },
      orderBy: { updatedAt: "desc" },
    });
    if (asset?.path) {
      const url = toAbsoluteAssetUrl(asset.path);
      if (url) return url;
    }
  } catch {
    /* fall through to default */
  }
  return absoluteSiteUrl(DEFAULT_EMAIL_LOGO_PATH);
}
