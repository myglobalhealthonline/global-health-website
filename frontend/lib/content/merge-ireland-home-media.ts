import {
  findAssetByKey,
  pickSafeAssetPath,
  type PublicAssetRecord,
} from "@/lib/content/get-public-assets";
import { PUBLIC_ASSET_KEYS } from "@/lib/content/public-asset-slots";

const IMAGE_OR_LOGO = new Set(["IMAGE", "LOGO"]);

function mediaPair(
  asset: PublicAssetRecord,
  fallbackAlt: string,
): { src: string; alt: string } | undefined {
  const src = pickSafeAssetPath(asset.path);
  if (!src) return undefined;
  const alt = asset.altText?.trim() || fallbackAlt;
  return { src, alt };
}

export function resolveSiteLogoAsset(assets: PublicAssetRecord[]): { src: string; alt: string } | undefined {
  const a = findAssetByKey(assets, PUBLIC_ASSET_KEYS.global.siteLogo, IMAGE_OR_LOGO);
  if (!a) return undefined;
  return mediaPair(a, "Global Health logo");
}

export function resolveFooterCtaDecorAsset(
  assets: PublicAssetRecord[],
): { src: string; alt: string } | undefined {
  const a = findAssetByKey(assets, PUBLIC_ASSET_KEYS.global.footerCta, IMAGE_OR_LOGO);
  if (!a) return undefined;
  return mediaPair(a, "Online consultation");
}

export function resolveHomepageHeroAsset(
  assets: PublicAssetRecord[],
): { src: string; alt: string } | undefined {
  const a = findAssetByKey(assets, PUBLIC_ASSET_KEYS.global.homepageHero, IMAGE_OR_LOGO);
  if (!a) return undefined;
  return mediaPair(a, "Global Health platform hero");
}
