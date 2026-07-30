/**
 * Idempotent patch: per-country footer social URLs (2026-07-24 brief).
 *
 * - Adds the `tiktokUrl` column if the migration hasn't run yet.
 * - Upserts CountryFooter rows for ie/es/ro/pt/cz with the official
 *   Instagram + Facebook (per-country) and TikTok/LinkedIn/YouTube
 *   (shared brand accounts).
 *
 * Run: node --env-file=.env --import tsx scripts/patch-country-footer-socials.ts
 */
import { prisma } from "../../src/db/prisma.js";

const SHARED = {
  tiktokUrl: "https://www.tiktok.com/@globalhealth.online",
  linkedinUrl: "https://www.linkedin.com/company/myglobalhealth.online",
  youtubeUrl: "https://www.youtube.com/@GlobalHealth-y9o",
};

// Facebook page IDs verified against the live pages' titles
// ("Global Health Ireland", "… Czechia", "… Portugal", "… Romania", "… España").
const PER_COUNTRY: Record<string, { instagramUrl: string; facebookUrl: string }> = {
  ie: {
    instagramUrl: "https://www.instagram.com/globalhealth_ie/",
    facebookUrl: "https://www.facebook.com/profile.php?id=61569767053593",
  },
  es: {
    instagramUrl: "https://www.instagram.com/globalhealth_es/",
    facebookUrl: "https://www.facebook.com/profile.php?id=61585243681654",
  },
  ro: {
    instagramUrl: "https://www.instagram.com/globalhealth_ro/",
    facebookUrl: "https://www.facebook.com/profile.php?id=61589328584369",
  },
  pt: {
    instagramUrl: "https://www.instagram.com/globalhealth_pt/",
    facebookUrl: "https://www.facebook.com/profile.php?id=61585376995035",
  },
  cz: {
    instagramUrl: "https://www.instagram.com/globalhealth_cz/",
    facebookUrl: "https://www.facebook.com/profile.php?id=61585332477146",
  },
};

async function main() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "CountryFooter" ADD COLUMN IF NOT EXISTS "tiktokUrl" TEXT`,
  );

  for (const [code, socials] of Object.entries(PER_COUNTRY)) {
    const country = await prisma.country.findFirst({
      where: { code: { equals: code, mode: "insensitive" } },
      select: { id: true, code: true },
    });
    if (!country) {
      console.warn(`SKIP ${code}: country row not found`);
      continue;
    }
    const data = { ...socials, ...SHARED };
    await prisma.countryFooter.upsert({
      where: { countryId: country.id },
      update: data,
      create: { countryId: country.id, ...data },
    });
    console.log(`OK ${code}: footer socials set`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
