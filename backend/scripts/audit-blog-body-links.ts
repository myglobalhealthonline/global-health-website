/**
 * Read-only: extract every href="..." from published blog post bodies and
 * classify it — internal route that resolves, internal route that 404s
 * (dead service/blog/doctor slug, or a country the post's countries don't
 * serve), or external (reported separately, not fetched).
 *
 * Complements audit-blog-legacy-links.ts, which only checks the old
 * /post/<slug> href shape. This checks every href, including the current
 * /{country}/{lang}/... shape and https://www.myglobalhealth.online/... absolute
 * hrefs to internal pages.
 *
 * Writes nothing. Run:
 *   node --env-file=.env --import tsx scripts/audit-blog-body-links.ts
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

const DOMAIN = "myglobalhealth.online";

async function main() {
  const [posts, services, countries] = await Promise.all([
    prisma.blogPost.findMany({
      where: { status: "PUBLISHED", isActive: true },
      select: {
        id: true,
        slug: true,
        locale: true,
        title: true,
        body: true,
        countryId: true,
        country: { select: { code: true, slug: true } },
        countries: { select: { country: { select: { slug: true } } } },
      },
    }),
    prisma.service.findMany({
      where: { isActive: true },
      select: { slug: true, countryId: true, country: { select: { slug: true } } },
    }),
    prisma.country.findMany({ select: { slug: true, isActive: true } }),
  ]);

  console.log(`${posts.length} published post(s), ${services.length} active service(s), ${countries.length} countr(y/ies).\n`);

  const activeCountrySlugs = new Set(countries.filter((c) => c.isActive).map((c) => c.slug));
  const serviceSlugsByCountry = new Map<string, Set<string>>();
  for (const s of services) {
    const key = s.country.slug;
    if (!serviceSlugsByCountry.has(key)) serviceSlugsByCountry.set(key, new Set());
    serviceSlugsByCountry.get(key)!.add(s.slug);
  }
  const blogSlugsByCountry = new Map<string, Set<string>>();
  for (const p of posts) {
    const countrySlugs = p.countries.length ? p.countries.map((c) => c.country.slug) : p.country ? [p.country.slug] : [];
    for (const cs of countrySlugs) {
      if (!blogSlugsByCountry.has(cs)) blogSlugsByCountry.set(cs, new Set());
      blogSlugsByCountry.get(cs)!.add(p.slug);
    }
  }

  const STATIC_LEAVES = new Set(["doctors", "contact", "blog", "about", "services", ""]);

  let brokenCount = 0;
  let externalCount = 0;
  const externalLinks = new Map<string, Set<string>>();

  for (const p of posts) {
    const hrefs = new Set<string>();
    for (const m of p.body.matchAll(/href="([^"]+)"/g)) hrefs.add(m[1]);

    for (const raw of hrefs) {
      if (raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("#")) continue;

      let path = raw;
      let isInternal = false;
      if (raw.includes(DOMAIN)) {
        isInternal = true;
        path = raw.replace(/^https?:\/\/(www\.)?myglobalhealth\.online/, "");
      } else if (raw.startsWith("/")) {
        isInternal = true;
        path = raw;
      }

      if (!isInternal) {
        if (!externalLinks.has(raw)) externalLinks.set(raw, new Set());
        externalLinks.get(raw)!.add(`${p.locale}/${p.slug}`);
        externalCount++;
        continue;
      }

      const clean = path.split(/[?#]/)[0].replace(/\/$/, "");
      const segments = clean.split("/").filter(Boolean);
      if (segments.length === 0) continue; // homepage

      const [countrySlug, lang, section, slug] = segments;

      if (!activeCountrySlugs.has(countrySlug)) {
        console.log(`BROKEN  [${p.locale}/${p.slug}] ${raw}  — unknown/inactive country "${countrySlug}"`);
        brokenCount++;
        continue;
      }
      if (!section) continue; // just /{country}/{lang}
      if (STATIC_LEAVES.has(section) && !slug) continue; // /doctors, /contact, /blog hub, /about

      if (section === "services") {
        if (!slug) continue;
        const known = serviceSlugsByCountry.get(countrySlug)?.has(slug);
        if (!known) {
          console.log(`BROKEN  [${p.locale}/${p.slug}] ${raw}  — no active Service "${slug}" in ${countrySlug}`);
          brokenCount++;
        }
      } else if (section === "blog") {
        if (!slug) continue;
        const known = blogSlugsByCountry.get(countrySlug)?.has(slug);
        if (!known) {
          console.log(`BROKEN  [${p.locale}/${p.slug}] ${raw}  — no published BlogPost "${slug}" in ${countrySlug}`);
          brokenCount++;
        }
      }
      // doctors/{slug}, contact/*, about/* etc: not validated here (no cheap lookup table) — skipped.
    }
  }

  console.log(`\n${brokenCount} broken internal link(s) found across ${posts.length} posts.`);
  console.log(`${externalCount} external link reference(s) (${externalLinks.size} distinct URLs) — not fetched, listed below for manual/HTTP check:\n`);
  for (const [url, sources] of [...externalLinks].sort()) {
    console.log(`  ${url}`);
    console.log(`      from: ${[...sources].join(", ")}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
