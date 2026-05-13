import type { HomeTemplateData } from "@/lib/content/template-page-data";
import {
  findAssetByKey,
  pickFirstAssetByKeys,
  pickSafeAssetPath,
  type PublicAssetRecord,
} from "@/lib/content/get-public-assets";
import {
  IRELAND_PARTNER_LOGO_KEYS,
  IRELAND_TRUST_IMAGE_SLOTS,
  PUBLIC_ASSET_KEYS,
} from "@/lib/content/public-asset-slots";

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

/** Applies active CMS assets for Ireland `/home` when paths are trusted (/… or API /api/media/…). */
export function mergeIrelandHomePublicAssets(
  countryHome: HomeTemplateData,
  assets: PublicAssetRecord[],
): HomeTemplateData {
  let next: HomeTemplateData = { ...countryHome };

  const heroA = findAssetByKey(assets, PUBLIC_ASSET_KEYS.irelandHome.hero, IMAGE_OR_LOGO);
  if (heroA) {
    const img = mediaPair(heroA, next.hero.heroImage.alt);
    if (img) next = { ...next, hero: { ...next.hero, heroImage: img } };
  }

  const deliveryA = findAssetByKey(assets, PUBLIC_ASSET_KEYS.irelandHome.homeDelivery, IMAGE_OR_LOGO);
  if (deliveryA) {
    const img = mediaPair(deliveryA, next.homeDelivery.image.alt);
    if (img) next = { ...next, homeDelivery: { ...next.homeDelivery, image: img } };
  }

  const spotlightA = pickFirstAssetByKeys(
    assets,
    [PUBLIC_ASSET_KEYS.irelandHome.doctorSpotlight, PUBLIC_ASSET_KEYS.doctors.khoiamulIslam],
    IMAGE_OR_LOGO,
  );
  if (spotlightA) {
    const img = mediaPair(spotlightA, next.doctorSpotlight.image.alt);
    if (img) next = { ...next, doctorSpotlight: { ...next.doctorSpotlight, image: img } };
  }

  const trustItems = next.trust.items.map((item) => ({ ...item }));
  for (const slot of IRELAND_TRUST_IMAGE_SLOTS) {
    const asset = findAssetByKey(assets, slot.assetKey, IMAGE_OR_LOGO);
    const row = trustItems[slot.itemIndex];
    if (!asset || !row) continue;
    const img = mediaPair(asset, row.title);
    if (img) trustItems[slot.itemIndex] = { ...row, image: img };
  }
  next = { ...next, trust: { ...next.trust, items: trustItems } };

  const ctaA = pickFirstAssetByKeys(
    assets,
    [PUBLIC_ASSET_KEYS.irelandHome.cta, PUBLIC_ASSET_KEYS.global.footerCta],
    IMAGE_OR_LOGO,
  );
  if (ctaA) {
    const img = mediaPair(ctaA, next.booking.title);
    if (img) next = { ...next, booking: { ...next.booking, asideImage: img } };
  }

  const partnerLogos: Array<{ src: string; alt: string }> = [];
  for (const key of IRELAND_PARTNER_LOGO_KEYS) {
    const a = findAssetByKey(assets, key, IMAGE_OR_LOGO);
    if (!a) continue;
    const img = mediaPair(a, key.replace(/^partner-logo-/i, "").replace(/-/g, " "));
    if (img) partnerLogos.push(img);
  }
  if (partnerLogos.length > 0) next = { ...next, partnerLogos };

  return next;
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
