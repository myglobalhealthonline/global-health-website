/**
 * Read-only audit: which doctors are missing a page-level meta description
 * (Doctor.seoDescription and its per-locale / per-country overrides), and
 * which profile-image assets are missing altText / caption / description.
 *
 * Run: node --env-file=.env --import tsx scripts/audit-doctor-seo-descriptions.ts
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

const blank = (v: string | null | undefined) => !v || v.trim() === '';

async function main() {
  const doctors = await prisma.doctor.findMany({
    select: {
      slug: true,
      fullName: true,
      seoTitle: true,
      seoDescription: true,
      active: true,
      country: { select: { code: true } },
      translations: { select: { locale: true, seoDescription: true } },
      additionalCountries: {
        select: {
          country: { select: { code: true } },
          translations: { select: { locale: true, seoDescription: true } },
        },
      },
    },
    orderBy: [{ country: { code: 'asc' } }, { slug: 'asc' }],
  });

  console.log(`\n=== Doctor.seoDescription (base row) — ${doctors.length} doctors ===`);
  let missingBase = 0;
  for (const d of doctors) {
    const locales = d.translations.map((t) => t.locale).sort().join(',') || '-';
    const localesMissing = d.translations
      .filter((t) => blank(t.seoDescription))
      .map((t) => t.locale)
      .sort();
    const marketMissing = d.additionalCountries
      .map((dc) => {
        const miss = dc.translations.filter((t) => blank(t.seoDescription)).map((t) => t.locale);
        return miss.length ? `${dc.country.code}:${miss.sort().join('/')}` : null;
      })
      .filter(Boolean);
    if (blank(d.seoDescription)) missingBase += 1;
    console.log(
      [
        blank(d.seoDescription) ? 'MISSING' : 'ok     ',
        d.active ? '  ' : 'IN',
        (d.country?.code ?? '--').padEnd(3),
        d.slug.padEnd(34),
        `title:${blank(d.seoTitle) ? 'MISSING' : 'ok'}`,
        `locales[${locales}]`,
        localesMissing.length ? `transMissing:${localesMissing.join('/')}` : '',
        marketMissing.length ? `marketMissing:${marketMissing.join(' ')}` : '',
      ].join(' '),
    );
  }
  console.log(`\nbase seoDescription missing: ${missingBase}/${doctors.length}`);

  const assets = await prisma.asset.findMany({
    where: { doctorId: { not: null } },
    select: {
      key: true,
      altText: true,
      caption: true,
      description: true,
      doctor: { select: { slug: true } },
    },
    orderBy: { key: 'asc' },
  });

  console.log(`\n=== Doctor profile image assets — ${assets.length} rows ===`);
  const counts = { alt: 0, caption: 0, description: 0 };
  for (const a of assets) {
    if (blank(a.altText)) counts.alt += 1;
    if (blank(a.caption)) counts.caption += 1;
    if (blank(a.description)) counts.description += 1;
    console.log(
      [
        (a.doctor?.slug ?? '?').padEnd(34),
        `alt:${blank(a.altText) ? 'MISSING' : 'ok'}`,
        `caption:${blank(a.caption) ? 'MISSING' : 'ok'}`,
        `description:${blank(a.description) ? 'MISSING' : 'ok'}`,
      ].join(' '),
    );
  }
  console.log(
    `\nassets missing — altText: ${counts.alt}, caption: ${counts.caption}, description: ${counts.description} (of ${assets.length})`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
