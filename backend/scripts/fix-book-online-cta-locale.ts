import { prisma, disconnectDb } from "../src/db/prisma";

/**
 * Correction to fix-book-online-cta.ts: ctaHref on PageContent has no locale
 * column (one row per country+pageKey), so hardcoding "/ireland/en/book" /
 * "/portugal/pt/book" fixed the redirect but left every OTHER locale's
 * homepage (e.g. /ireland/pt, /portugal/en) linking cross-locale into the
 * country's default-locale booking flow. Null lets page.tsx fall back to its
 * already-locale-aware `buildBookHref({ country: slug, lang })`.
 */
const IDS = ["cmrij9reg000078juaikntcgd", "cmrij9xjc000878juunc9qo09"];

async function main() {
  for (const id of IDS) {
    const before = await prisma.pageContent.findUniqueOrThrow({ where: { id } });
    if (before.ctaHref !== "/ireland/en/book" && before.ctaHref !== "/portugal/pt/book") {
      throw new Error(`${id} ctaHref unexpected (now ${before.ctaHref}) — aborting`);
    }
    const after = await prisma.pageContent.update({ where: { id }, data: { ctaHref: null } });
    console.log(`${after.id}: ${before.ctaHref} -> null`);
  }
}

main().finally(() => disconnectDb());
