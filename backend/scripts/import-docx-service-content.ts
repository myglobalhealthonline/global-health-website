/**
 * Fill-only import of docx-parsed service content (see
 * scripts/data or backend/tmp/docx-import for the JSON produced by the
 * one-off parser) into existing Service rows, matched by slug + country.
 *
 * Only ever FILLS currently-empty fields — never overwrites existing content.
 * "Empty" = null, whitespace-only, or HTML with no visible text (e.g.
 * `<p><br /></p>`).
 *
 * Usage:
 *   npx tsx scripts/import-docx-service-content.ts --file=tmp/docx-import/ireland-services-import.json --country=ie
 *   I18N_SNAPSHOT_CONFIRMED=1 npx tsx scripts/import-docx-service-content.ts --file=... --country=ie --apply
 *
 * Dry-run (default, no flags needed beyond --file/--country) writes NOTHING —
 * it prints per-service: matched Y/N, which fields would be filled, which are
 * skipped because a value already exists. A real write requires BOTH --apply
 * and env I18N_SNAPSHOT_CONFIRMED=1.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma, disconnectDb } from "../src/db/prisma.js";
import { sanitizeRichHtml } from "../src/utils/sanitize-html.js";

const APPLY = process.argv.includes("--apply");
const CONFIRMED = process.env.I18N_SNAPSHOT_CONFIRMED === "1";
const DRY_RUN = !(APPLY && CONFIRMED);

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg?.slice(prefix.length);
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

// Text field: empty if null/undefined/whitespace-only.
function isEmptyText(v: string | null | undefined): boolean {
  return v == null || v.trim() === "";
}

// HTML field: empty if it has no visible text once tags are stripped
// (catches docx-export artifacts like `<p><br /></p>` or `<p></p>`).
function isEmptyHtml(v: string | null | undefined): boolean {
  if (v == null) return true;
  const text = v.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim();
  return text === "";
}

/**
 * Docx slug → live DB slug, keyed per country (same convention as
 * DOC_TO_DB_SLUG in import-ireland-service-content.ts). Slugs absent here
 * match the DB as-is.
 */
const DOC_TO_DB_SLUG: Record<string, Record<string, string>> = {
  ie: {
    "geriatrics-consultation": "geriatric-consultation",
    "immunology-allergy-consultation": "immunoalergology-consultation",
    // DB slug carries this typo ("reumathology") — confirmed live.
    "rheumatology-consultation": "reumathology-consultation",
    "sexual-health-consultation": "venereology-consultation",
  },
  pt: {
    "consulta-endocrinologia": "consulta-de-endocrinologia",
    "consulta-gastroenterologia": "consulta-de-gastroenterologia",
    "consulta-genetica": "consulta-de-genetica",
    "consulta-geriatria": "consulta-de-geriatria",
    "consulta-saude-sexual": "consulta-de-venereologia",
  },
  // BR/RO/ES/CZ live DB catalogs are mostly a *different*, generic
  // "online GP" service list, not the specialist-consultation roster the
  // docx covers — so most docx slugs have no confident DB counterpart
  // (verified against live DB 2026-07-12; see docx-import dry-run output).
  // Only same-specialty, unambiguous matches are remapped below.
  br: {
    // DB has a single generic "Pediatria" (pediatria-online) — exact
    // specialty-name match, only entry confident enough to remap.
    "consulta-pediatria": "pediatria-online",
  },
  // No confident matches found — RO's live catalog (skin-consultation-romania,
  // mental-health-romania, specialist-pain-assessment-romania, etc.) is a
  // generic GP-style roster with no 1:1 specialty correspondence to the
  // docx's dermatology/endocrinology/rheumatology/etc. content.
  ro: {},
  es: {
    // DB slug carries this typo ("diagnotico") — confirmed live.
    "consulta-diagnostico-vascular": "consulta-diagnotico-vascular",
    "consulta-flebologia-linfologia": "consulta-flebologia-y-linfologia",
  },
  cz: {
    "konzultace-dermatologie": "dermatologicka-konsultace",
    "konzultace-endokrinologie": "konsultace-s-endokrinologem",
    "konzultace-gastroenterologie": "konsultace-s-gastroenterologem",
    "konzultace-genetika": "konsultace-s-genetikem",
    "konzultace-geriatrie": "geriatricka-konsultace",
    "konzultace-alergologie-imunologie": "imunoalergologicka-konsultace",
    "konzultace-onkologie": "onkologicka-konsultace",
    "konzultace-pneumologie": "konsultace-v-oblasti-pneumologie",
    "konzultace-revmatologie": "revmatologicka-konsultace",
    "konzultace-urologie": "urologicka-konsultace",
    "konzultace-venerologie": "konsultace-venerologa",
    "konzultace-plodnost-reprodukcni-medicina": "konsultace-v-oblasti-plodnosti-a-reprodukni-mediciny",
  },
};

const FILLABLE_TEXT_FIELDS = [
  "seoTitle",
  "seoDescription",
  "heroTitle",
  "heroDescription",
  "summary",
] as const;

async function main() {
  if (!FILE || !COUNTRY) {
    console.error("Usage: --file=<json path> --country=<code> [--apply]");
    process.exit(1);
  }

  const entries = JSON.parse(readFileSync(FILE, "utf-8")) as Entry[];

  const country = await prisma.country.findUnique({
    where: { code: COUNTRY },
    select: { id: true },
  });
  if (!country) throw new Error(`Country ${COUNTRY} not found`);

  const skippedExisting: Record<string, number> = {};
  const bump = (field: string) => {
    skippedExisting[field] = (skippedExisting[field] ?? 0) + 1;
  };

  let matched = 0;
  const unmatched: string[] = [];

  const remap = DOC_TO_DB_SLUG[COUNTRY] ?? {};

  for (const e of entries) {
    const targetSlug = remap[e.slug] ?? e.slug;
    const svc = await prisma.service.findFirst({
      where: { slug: targetSlug, countryId: country.id },
      select: {
        id: true,
        seoTitle: true,
        seoDescription: true,
        seoKeywords: true,
        heroTitle: true,
        heroDescription: true,
        summary: true,
        detailBody: true,
      },
    });

    if (!svc) {
      unmatched.push(targetSlug);
      console.log(`MISS  ${e.slug}${targetSlug !== e.slug ? ` → ${targetSlug}` : ""}`);
      continue;
    }
    matched += 1;

    const willFill: string[] = [];
    const willSkip: string[] = [];
    const data: Record<string, unknown> = {};

    const textSource: Record<(typeof FILLABLE_TEXT_FIELDS)[number], string> = {
      seoTitle: e.seoTitle,
      seoDescription: e.seoDescription,
      heroTitle: e.heroTitle,
      heroDescription: e.heroDescription,
      summary: e.summary,
    };
    for (const field of FILLABLE_TEXT_FIELDS) {
      if (isEmptyText(svc[field])) {
        if (!isEmptyText(textSource[field])) {
          data[field] = textSource[field];
          willFill.push(field);
        }
      } else {
        willSkip.push(field);
        bump(field);
      }
    }

    if (isEmptyHtml(svc.detailBody)) {
      const sanitized = sanitizeRichHtml(e.detailBodyHtml);
      if (!isEmptyHtml(sanitized)) {
        data.detailBody = sanitized;
        willFill.push("detailBody");
      }
    } else {
      willSkip.push("detailBody");
      bump("detailBody");
    }

    if (svc.seoKeywords.length === 0) {
      if (e.seoKeywords.length > 0) {
        data.seoKeywords = e.seoKeywords;
        willFill.push("seoKeywords");
      }
    } else {
      willSkip.push("seoKeywords");
      bump("seoKeywords");
    }

    console.log(
      `MATCH ${targetSlug.padEnd(40)} fill=[${willFill.join(",") || "-"}] skip-existing=[${willSkip.join(",") || "-"}]`,
    );

    if (!DRY_RUN && Object.keys(data).length > 0) {
      await prisma.service.update({ where: { id: svc.id }, data });
    }
  }

  console.log("\n────────────");
  console.log(`entries ${entries.length}  matched ${matched}  unmatched ${unmatched.length}`);
  if (unmatched.length > 0) console.log(`unmatched slugs: ${unmatched.join(", ")}`);
  console.log("skippedExisting (per field, count of services that already had a value):");
  console.log(skippedExisting);
  console.log(
    DRY_RUN
      ? "\nDRY-RUN (no writes). Re-run with --apply and env I18N_SNAPSHOT_CONFIRMED=1 to write."
      : "\nAPPLIED.",
  );

  await disconnectDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
