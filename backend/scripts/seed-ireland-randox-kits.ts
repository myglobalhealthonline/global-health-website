/**
 * Ireland — seed the Randox home test kit catalogue (14 new HealthTest rows +
 * a copy refresh on the existing thyroid row). IRELAND (ie) + ENGLISH (EN)
 * only; health kits are an IE-only product line.
 *
 * Two phases, both idempotent:
 *   1. images — download each kit photo from Randox's CDN, upload it to our
 *      object storage, and record the key in scripts/data/randox-kit-images.json.
 *      Already-recorded images are skipped, so re-runs cost nothing.
 *   2. rows   — upsert HealthTest + HealthTestTranslation(EN) + FAQs.
 *
 * Every new row seeds with isActive: false, priced at Randox's own IE retail
 * price plus a 10% margin. Activate each row in Admin → Health Tests.
 *
 *   npx tsx scripts/seed-ireland-randox-kits.ts                  # dry run, both phases
 *   npx tsx scripts/seed-ireland-randox-kits.ts --apply --images # upload images only
 *   npx tsx scripts/seed-ireland-randox-kits.ts --apply          # images + DB rows (PROD)
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { prisma } from "../src/db/prisma.js";
import { putObject, isObjectStorageConfigured } from "../src/services/object-storage.js";
import { IRELAND_RANDOX_KITS, THYROID_REFRESH, buildExtraSections } from "./data/ireland-randox-kits.js";

const APPLY = process.argv.includes("--apply");
const IMAGES_ONLY = process.argv.includes("--images");
const LOCALE = "EN" as const;

/**
 * Our margin over Randox's own IE retail price (owner-set, 2026-08-06).
 *
 * Rounded to whole euro on purpose: every public price on the site renders
 * through `formatPriceRounded`, which drops the cents. A price of €128.70
 * would display as "€129" and charge €128.70 — a displayed price that is not
 * the price charged. Whole euros keep the two identical.
 */
const MARKUP = 1.1;
const ourPriceCents = (randoxCents: number): number =>
  Math.round((randoxCents * MARKUP) / 100) * 100;

const here = path.dirname(fileURLToPath(import.meta.url));
const MAP_PATH = path.join(here, "data", "randox-kit-images.json");

type ImageMap = Record<string, string>; // our slug -> "/api/media/<key>"

function readMap(): ImageMap {
  if (!fs.existsSync(MAP_PATH)) return {};
  return JSON.parse(fs.readFileSync(MAP_PATH, "utf8")) as ImageMap;
}

function writeMap(map: ImageMap): void {
  fs.writeFileSync(MAP_PATH, `${JSON.stringify(map, null, 2)}\n`);
}

async function uploadImages(): Promise<ImageMap> {
  const map = readMap();
  const jobs = [
    ...IRELAND_RANDOX_KITS.map((k) => ({ slug: k.slug, url: k.imageUrl })),
    { slug: THYROID_REFRESH.slug, url: THYROID_REFRESH.imageUrl },
  ];

  for (const job of jobs) {
    if (map[job.slug]) {
      console.log(`  = ${job.slug} — already uploaded (${map[job.slug]})`);
      continue;
    }
    if (!APPLY) {
      console.log(`  + ${job.slug} — would download ${job.url.split("/").pop()}`);
      continue;
    }
    const res = await fetch(job.url, { headers: { "user-agent": "Mozilla/5.0" } });
    if (!res.ok) {
      console.log(`  !! ${job.slug} — download failed (HTTP ${res.status}) — skipped`);
      continue;
    }
    const source = Buffer.from(await res.arrayBuffer());
    // Source images are inconsistent — one is 3.6MB. Cap the long edge so a
    // product card never ships a multi-megabyte hero.
    const buffer = await sharp(source)
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    const key = `media/${randomUUID()}-${job.slug}.webp`;
    await putObject(key, buffer, "image/webp");
    map[job.slug] = `/api/media/${key}`;
    writeMap(map);
    console.log(
      `  + ${job.slug} — ${(source.length / 1024).toFixed(0)}KB → ${(buffer.length / 1024).toFixed(0)}KB → ${key}`,
    );
  }
  return map;
}

async function seedRows(map: ImageMap): Promise<void> {
  const ie = await prisma.country.findUnique({ where: { code: "ie" }, select: { id: true } });
  if (!ie) throw new Error("IE country not found");

  const summary: Array<{ slug: string; action: string; price: string; image: string }> = [];

  for (const kit of IRELAND_RANDOX_KITS) {
    const image = map[kit.slug];
    const existing = await prisma.healthTest.findUnique({
      where: { countryId_slug: { countryId: ie.id, slug: kit.slug } },
      select: { id: true, isActive: true, priceCents: true },
    });

    summary.push({
      slug: kit.slug,
      action: existing ? "update" : "create",
      price: `€${(ourPriceCents(kit.priceCents) / 100).toFixed(2)} (Randox €${(kit.priceCents / 100).toFixed(2)})`,
      image: image ? "ok" : "MISSING",
    });

    if (!APPLY) continue;
    if (!image) {
      console.log(`  !! ${kit.slug} — no uploaded image, row skipped`);
      continue;
    }

    const translated = {
      title: kit.title,
      shortDescription: kit.shortDescription,
      sampleType: kit.sampleType,
      resultsTimeline: kit.resultsTimeline,
      heroButtonLabel: "Order Test",
      detailIntro: kit.detailIntro,
      whatThisTestCovers: kit.whatThisTestCovers,
      whyGetTested: kit.whyGetTested,
      extraSections: buildExtraSections(kit.slug),
      seoTitle: kit.seoTitle,
      seoDescription: kit.seoDescription,
    };

    const ht = await prisma.healthTest.upsert({
      where: { countryId_slug: { countryId: ie.id, slug: kit.slug } },
      create: {
        countryId: ie.id,
        slug: kit.slug,
        ...translated,
        priceCents: ourPriceCents(kit.priceCents),
        currencyCode: "EUR",
        productImagePath: image,
        sortOrder: kit.sortOrder,
        // Seeded dark — the owner activates each row in admin after review.
        isActive: false,
      },
      // Never re-dark or re-price a row an admin has already published.
      update: { ...translated, productImagePath: image, sortOrder: kit.sortOrder },
      select: { id: true },
    });

    await prisma.healthTestTranslation.upsert({
      where: { healthTestId_locale: { healthTestId: ht.id, locale: LOCALE } },
      create: { healthTestId: ht.id, locale: LOCALE, ...translated },
      update: translated,
    });

    // ponytail: FAQs have no natural key — replace the set so re-runs stay idempotent.
    await prisma.healthTestFaq.deleteMany({ where: { healthTestId: ht.id } });
    await prisma.healthTestFaq.createMany({
      data: kit.faqs.map((f, i) => ({
        healthTestId: ht.id,
        question: f.question,
        answer: f.answer,
        sortOrder: i,
      })),
    });
  }

  // Existing thyroid row — refresh the product facts only. Price and isActive
  // stay as the admin set them; Randox's own IE price is €52.00 for reference.
  const thyroid = await prisma.healthTest.findUnique({
    where: { countryId_slug: { countryId: ie.id, slug: THYROID_REFRESH.slug } },
    select: { id: true, priceCents: true },
  });
  if (!thyroid) {
    console.log(`\n  !! ${THYROID_REFRESH.slug} not found — copy refresh skipped`);
  } else {
    summary.push({
      slug: THYROID_REFRESH.slug,
      action: "copy refresh (price untouched)",
      price: `€${(thyroid.priceCents / 100).toFixed(2)} (Randox IE: €52.00)`,
      image: map[THYROID_REFRESH.slug] ? "ok" : "MISSING",
    });
    if (APPLY) {
      const data = {
        shortDescription: THYROID_REFRESH.shortDescription,
        sampleType: THYROID_REFRESH.sampleType,
        resultsTimeline: THYROID_REFRESH.resultsTimeline,
        whatThisTestCovers: THYROID_REFRESH.whatThisTestCovers,
        extraSections: buildExtraSections(THYROID_REFRESH.slug),
      };
      await prisma.healthTest.update({ where: { id: thyroid.id }, data });
      await prisma.healthTestTranslation.updateMany({
        where: { healthTestId: thyroid.id, locale: LOCALE },
        data,
      });
    }
  }

  console.log(`\nHealthTest rows — ${APPLY ? "APPLIED" : "DRY RUN"}:`);
  console.table(summary);
}

async function main(): Promise<void> {
  if (APPLY && !isObjectStorageConfigured()) {
    throw new Error("Object storage is not configured — check S3_* in .env");
  }

  console.log(`\nImages — ${APPLY ? "UPLOADING" : "DRY RUN"}:`);
  const map = await uploadImages();

  if (IMAGES_ONLY) {
    console.log("\n--images given: stopping before DB writes.");
    return;
  }

  await seedRows(map);

  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply to write to PROD.");
  } else {
    console.log(
      "\n✅ Applied. Every new row is INACTIVE and priced at Randox IE +10% — activate each one in Admin → Health Tests.",
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
