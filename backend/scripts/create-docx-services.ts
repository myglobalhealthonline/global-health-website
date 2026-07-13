/**
 * Create NEW draft Service rows from docx-parsed specialist-consultation
 * content (see backend/tmp/docx-import/*-services-import.json) for
 * countries whose live catalog has no matching service yet (BR/RO/ES —
 * see DOC_TO_DB_SLUG in import-docx-service-content.ts for why those
 * countries' generic "online GP" catalogs don't 1:1 match this content).
 *
 * NEVER touches an existing slug — if a Service row already exists for
 * {countryId, slug} it is skipped and reported, not updated (use
 * import-docx-service-content.ts to fill an existing row instead).
 *
 * Convention (matches scripts/import-portugal-service-content.ts, the
 * established precedent for docx-sourced draft specialist services in
 * this repo): kind=SPECIALIST, currencyCode=country's currency,
 * isActive=false, basePriceCents/durationMinutes/ctaLabel left unset
 * (null) for the admin to fill in before publishing. visibility defaults
 * to PUBLIC (schema default, not overridden).
 *
 * Usage:
 *   npx tsx scripts/create-docx-services.ts --file=tmp/docx-import/brazil-services-import.json --country=br            # dry-run
 *   I18N_SNAPSHOT_CONFIRMED=1 npx tsx scripts/create-docx-services.ts --file=... --country=br --apply                  # real write
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { ServiceKind } from "@prisma/client";
import { prisma, disconnectDb } from "../src/db/prisma.js";
import { sanitizeRichHtml } from "../src/utils/sanitize-html.js";

const APPLY = process.argv.includes("--apply");
const CONFIRMED = process.env.I18N_SNAPSHOT_CONFIRMED === "1";
const DRY_RUN = !(APPLY && CONFIRMED);

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
}

const FILE = argValue("file");
const COUNTRY = argValue("country");

type Entry = {
  slug: string;
  countryCode: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  heroTitle: string;
  heroDescription: string;
  summary: string;
  detailBodyHtml: string;
  language: string;
};

// Docx slugs already matched onto an existing service by a prior pass
// (import-docx-service-content.ts's DOC_TO_DB_SLUG remap) — must NOT get
// a duplicate new row here.
const ALREADY_HANDLED: Record<string, string[]> = {
  es: ["consulta-diagnostico-vascular", "consulta-flebologia-linfologia"],
};

async function main() {
  if (!FILE || !COUNTRY) {
    console.error("Usage: --file=<json path> --country=<code> [--apply]");
    process.exit(1);
  }

  const entries = JSON.parse(readFileSync(FILE, "utf-8")) as Entry[];
  const skip = new Set(ALREADY_HANDLED[COUNTRY] ?? []);

  const country = await prisma.country.findUnique({
    where: { code: COUNTRY },
    select: { id: true, currency: { select: { code: true } } },
  });
  if (!country) throw new Error(`Country ${COUNTRY} not found`);

  const existing = await prisma.service.findMany({
    where: { countryId: country.id },
    select: { slug: true },
  });
  const existingSlugs = new Set(existing.map((s) => s.slug));

  let willCreate = 0;
  let skippedDuplicate = 0;
  let skippedHandled = 0;

  for (const e of entries) {
    if (skip.has(e.slug)) {
      skippedHandled += 1;
      console.log(`ALREADY-HANDLED ${e.slug}`);
      continue;
    }
    if (existingSlugs.has(e.slug)) {
      skippedDuplicate += 1;
      console.log(`SKIP-DUPLICATE   ${e.slug} (Service row already exists)`);
      continue;
    }

    const name = e.heroTitle.slice(0, 200);
    const detailBody = sanitizeRichHtml(e.detailBodyHtml);
    console.log(
      `CREATE           ${e.slug.padEnd(40)} name="${name}" body=${detailBody.length}chars kw=${e.seoKeywords.length}`,
    );
    willCreate += 1;

    if (DRY_RUN) continue;

    await prisma.service.create({
      data: {
        countryId: country.id,
        kind: ServiceKind.SPECIALIST,
        slug: e.slug,
        name,
        summary: e.summary,
        seoTitle: e.seoTitle,
        seoDescription: e.seoDescription,
        seoKeywords: e.seoKeywords,
        heroTitle: e.heroTitle,
        heroDescription: e.heroDescription,
        detailBody,
        currencyCode: country.currency.code,
        isActive: false, // draft — admin sets price/duration before publishing
      },
    });
  }

  console.log("\n────────────");
  console.log(
    `${COUNTRY}: entries ${entries.length}  would-create ${willCreate}  skipped-duplicate ${skippedDuplicate}  already-handled ${skippedHandled}`,
  );
  console.log(
    DRY_RUN
      ? "DRY-RUN (no writes). Re-run with --apply and env I18N_SNAPSHOT_CONFIRMED=1 to write."
      : `APPLIED: created ${willCreate}.`,
  );

  await disconnectDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
