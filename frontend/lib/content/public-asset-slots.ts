/**
 * Canonical admin asset keys for public pages (create in Admin → Assets with matching keys).
 * Upload via Admin asset form → “Upload image to bucket”, then save path as returned HTTPS URL.
 */

export const PUBLIC_ASSET_KEYS = {
  global: {
    siteLogo: "site-logo",
    footerCta: "footer-cta",
    homepageHero: "homepage-hero",
  },
  irelandHome: {
    hero: "ireland-hero",
    doctorSpotlight: "ireland-doctor-spotlight",
    homeDelivery: "ireland-home-delivery",
    cta: "ireland-cta",
    partnerLevelHealth: "partner-logo-level-health",
    partnerIp: "partner-logo-ip",
    partnerPharmacy: "partner-logo-pharmacy",
    partnerDoctify: "partner-logo-doctify",
  },
  trust: {
    secure: "trust-secure",
    licensed: "trust-licensed",
    fastAccess: "trust-fast-access",
    europe: "trust-europe",
  },
  doctors: {
    khoiamulIslam: "doctor-dr-khoiamul-islam",
    mirzaAunMohammad: "doctor-dr-mirza-aun-mohammad",
    irelandClinicTeam: "ireland-clinic-team",
  },
} as const;

/** Partner logos in display order (only rendered when uploaded & active). */
export const IRELAND_PARTNER_LOGO_KEYS = [
  PUBLIC_ASSET_KEYS.irelandHome.partnerLevelHealth,
  PUBLIC_ASSET_KEYS.irelandHome.partnerIp,
  PUBLIC_ASSET_KEYS.irelandHome.partnerPharmacy,
  PUBLIC_ASSET_KEYS.irelandHome.partnerDoctify,
] as const;

/** Trust row images for Ireland home (index aligns with default trust copy rows). */
export const IRELAND_TRUST_IMAGE_SLOTS: ReadonlyArray<{ assetKey: string; itemIndex: number }> = [
  { assetKey: PUBLIC_ASSET_KEYS.trust.licensed, itemIndex: 0 },
  { assetKey: PUBLIC_ASSET_KEYS.trust.secure, itemIndex: 1 },
  { assetKey: PUBLIC_ASSET_KEYS.trust.fastAccess, itemIndex: 2 },
  { assetKey: PUBLIC_ASSET_KEYS.trust.europe, itemIndex: 3 },
];
