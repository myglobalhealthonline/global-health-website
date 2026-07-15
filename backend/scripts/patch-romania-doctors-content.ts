/**
 * Patch Romania /romania/ro/doctors (DOCTORS_INDEX) page content per the
 * July 2026 SEO Content Changes Brief.
 *
 *   node --import tsx scripts/patch-romania-doctors-content.ts            # dry-run
 *   node --import tsx scripts/patch-romania-doctors-content.ts --apply    # write
 *
 * SAFE BY DESIGN: every write matches on the *current* text, so re-running is a
 * no-op and a wrong target simply matches 0 rows instead of corrupting data.
 * Dry-run (default) prints exactly what would change; nothing is written until
 * you pass --apply.
 */
import { LocaleCode, Prisma } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const COUNTRY_CODE = "ro";
const LOCALE: LocaleCode = "RO";
const PAGE_KEY = "DOCTORS_INDEX";
const APPLY = process.argv.includes("--apply");

const log: string[] = [];
const note = (m: string) => {
  log.push(m);
  console.log(m);
};

// ── Brief content (current -> new) ───────────────────────────────────────────

// PageContentTranslation scalar overrides. Stored WITHOUT the "| Global
// Health" suffix — resolveBrandTitle appends the site suffix, so storing it
// here would double it.
const SEO_TITLE = "Medici înregistrați CMR | Consultații online în România";
const SEO_DESCRIPTION =
  "Răsfoiți 3 medici și specialiști înregistrați la CMR disponibili online în România. Vizualizați profiluri, specializări și limbi. Rezervați în aceeași zi.";

// FAQ additions — Q1-Q5 already correct per the brief ("keep exactly");
// Q6/Q7 appended.
const Q6 = "Pot consulta un specialist fără trimitere de la medicul de familie?";
const A6 =
  "Da. Prin Global Health România puteți rezerva direct o consultație cu specialiștii noștri — neurolog, pediatru sau medic de familie — fără a fi necesară o trimitere de la medicul de familie. Dacă aveți scrisori medicale sau investigații anterioare relevante, vă rugăm să le transmiteți înainte de consultație pentru o evaluare mai precisă.";

const Q7 = "Medicii de pe Global Health România pot elibera scrisori medicale și trimiteri?";
const A7 =
  "Da. Medicii înregistrați la CMR pe platforma Global Health pot elibera scrisori medicale, bilete de trimitere și recomandări clinice acolo unde este clinic indicat, la discreția profesională a medicului după evaluare. După fiecare consultație primiți prin email o notă clinică cu concluziile și recomandările medicului.";

// ── FAQ helper ───────────────────────────────────────────────────────────────

type Faq = { question: string; answer: string };

function appendFaq(faq: Faq[]): { next: Faq[]; changed: string[] } {
  const changed: string[] = [];
  let next = faq;
  if (!next.some((f) => f.question === Q6)) {
    next = [...next, { question: Q6, answer: A6 }];
    changed.push("FAQ appended: Q6 (specialist consultation without referral)");
  }
  if (!next.some((f) => f.question === Q7)) {
    next = [...next, { question: Q7, answer: A7 }];
    changed.push("FAQ appended: Q7 (medical letters and referrals)");
  }
  return { next, changed };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const country = await prisma.country.findUnique({
    where: { code: COUNTRY_CODE },
    select: { id: true },
  });
  if (!country) throw new Error(`Country ${COUNTRY_CODE} not found`);
  const countryId = country.id;

  await prisma.$transaction(
    async (tx) => {
      const pc = await tx.pageContent.findUnique({
        where: { countryId_pageKey: { countryId, pageKey: PAGE_KEY } },
        select: { id: true, translations: { where: { locale: LOCALE } } },
      });
      if (!pc) {
        note(`⚠ No PageContent row for RO/${PAGE_KEY} — skipping page copy.`);
      } else if (pc.translations.length === 0) {
        note(`⚠ No RO PageContentTranslation for RO/${PAGE_KEY} — skipping page copy.`);
      } else {
        const t = pc.translations[0];
        const data: Prisma.PageContentTranslationUpdateInput = {};

        if (t.seoTitle !== SEO_TITLE) {
          data.seoTitle = SEO_TITLE;
          note(`seoTitle: ${t.seoTitle ?? "∅"} -> ${SEO_TITLE}`);
        }
        if (t.seoDescription !== SEO_DESCRIPTION) {
          data.seoDescription = SEO_DESCRIPTION;
          note("seoDescription updated");
        }

        if (Array.isArray(t.faq)) {
          const { next, changed } = appendFaq(t.faq as unknown as Faq[]);
          if (changed.length) {
            data.faq = next as unknown as Prisma.InputJsonValue;
            changed.forEach(note);
          }
        } else {
          note("⚠ faq field empty/not an array — FAQ append skipped.");
        }

        if (Object.keys(data).length && APPLY) {
          await tx.pageContentTranslation.update({ where: { id: t.id }, data });
        }
      }

      if (!APPLY) throw new ROLLBACK();
    },
    { timeout: 30_000 },
  ).catch((e) => {
    if (e instanceof ROLLBACK) return; // dry-run: intentional rollback
    throw e;
  });

  console.log("\n────────────");
  console.log(
    APPLY
      ? `APPLIED: ${log.length} change(s) written for Romania doctors page.`
      : `DRY-RUN: ${log.length} change(s) would be written. Pass --apply to persist.`,
  );
  await prisma.$disconnect();
}

/** Sentinel to roll back the whole dry-run transaction. */
class ROLLBACK extends Error {}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
