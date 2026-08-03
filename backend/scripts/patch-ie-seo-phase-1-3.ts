/**
 * SEO fix (2026-08-04, OpenSEO live-data pass — Phases 1 and 3).
 *
 * PHASE 1 — sick-leave head terms.
 * `/ireland/en/blog/sick-certificate-ireland-employee-rights` is a 4,245-word
 * post with the right structure (statutory entitlement, eligibility, Illness
 * Benefit, employer obligations) sitting at #75 for "sick leave ireland"
 * (5,400/mo, KD 15, €4.16 CPC) and "long term sick leave rights ireland"
 * (320/mo, KD 0). Its title leads with "Sick Certificate Ireland" — the head
 * term it actually ranks for appears nowhere in it — and at 67 chars it
 * renders truncated. Retitled to lead with the head term; the description was
 * already inside budget and is only re-fronted, not rewritten.
 *
 * PHASE 3 — brand-query CTR on the Ireland home page.
 * Five of six locale titles overrun the ~60-char budget (PT 82, ES 86, CS 80,
 * RO 84, DE 71) and four descriptions overrun ~155 (163-174), so they render
 * clipped mid-phrase. EN (58/146) is already correct and is left alone.
 * Each replacement keeps the literal "Global Health" clause, which is what
 * makes buildPublicMetadata treat the title as absolute instead of appending
 * the layout's " · Global Health" and blowing the budget again.
 *
 * Idempotent and guarded: a field is written only when the stored value still
 * equals the BEFORE string captured from prod on 2026-08-04. Rows edited in
 * the admin UI since then are reported SKIPPED, never overwritten.
 *
 *   node --env-file=.env --import tsx scripts/patch-ie-seo-phase-1-3.ts           # dry-run
 *   node --env-file=.env --import tsx scripts/patch-ie-seo-phase-1-3.ts --apply   # write
 */
import "dotenv/config";
import { LocaleCode } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const COUNTRY = "ie";
const BLOG_SLUG = "sick-certificate-ireland-employee-rights";

const TITLE_BUDGET = 60;
const DESC_BUDGET = 155;

const len = (v: string) => Array.from(v).length;

type Pair = { before: string; after: string };

const BLOG: { title: Pair; desc: Pair } = {
  title: {
    before: "Sick Certificate Ireland: Employee Rights & Statutory Sick Pay 2026",
    after: "Sick Leave Ireland 2026: Entitlements & Sick Certs",
  },
  desc: {
    before:
      "Your statutory sick leave entitlement in Ireland for 2026 (5 days, 70% pay, €110 cap), when a medical cert is required, and how online sick certs work.",
    after:
      "Sick leave in Ireland 2026: your statutory entitlement (5 days, 70% pay, €110 cap), when a medical cert is required, and how online sick certs work.",
  },
};

/** EN is already inside both budgets and is deliberately absent. */
const HOME: Array<{ locale: LocaleCode; title: Pair; desc: Pair | null }> = [
  {
    locale: "PT",
    title: {
      before: "Médico Online Irlanda | Clínicos Gerais e Especialistas Registados | Global Health",
      after: "Médico Online Irlanda | No mesmo dia | Global Health",
    },
    desc: {
      before:
        "Consulte hoje um médico registado por videochamada — consultas de clínica geral, atestados médicos, referenciações para especialistas. Consultas no mesmo dia em Irlanda.",
      after:
        "Consulte hoje um médico registado por videochamada na Irlanda — clínica geral, atestados médicos, referenciações. Consultas no mesmo dia.",
    },
  },
  {
    locale: "ES",
    title: {
      before:
        "Médico Online Irlanda | Médicos de Cabecera y Especialistas Colegiados | Global Health",
      after: "Médico Online Irlanda | Mismo día | Global Health",
    },
    desc: {
      before:
        "Consulte hoy con un médico colegiado por videollamada — consultas de medicina general, certificados médicos, derivaciones a especialistas. Citas el mismo día en Irlanda.",
      after:
        "Consulte hoy con un médico colegiado por videollamada en Irlanda — medicina general, certificados médicos, derivaciones. Citas el mismo día.",
    },
  },
  {
    locale: "CS",
    title: {
      before: "Online lékař Irsko | Registrovaní praktičtí lékaři a specialisté | Global Health",
      after: "Online lékař Irsko | Tentýž den | Global Health",
    },
    desc: {
      before:
        "Promluvte si ještě dnes s registrovaným lékařem přes videohovor — konzultace s praktickým lékařem, potvrzení, odeslání ke specialistovi. Termíny tentýž den, Irsko.",
      after:
        "Promluvte si dnes s registrovaným lékařem v Irsku přes videohovor — praktický lékař, potvrzení, odeslání ke specialistovi. Termíny tentýž den.",
    },
  },
  {
    locale: "RO",
    title: {
      before: "Medic Online Irlanda | Medici de Familie și Specialiști Înregistrați | Global Health",
      after: "Medic Online Irlanda | Aceeași zi | Global Health",
    },
    desc: {
      before:
        "Vorbiți azi cu un medic înregistrat prin apel video — consultații de medicină de familie, adeverințe medicale, trimiteri către specialiști. Programări în aceeași zi, Irlanda.",
      after:
        "Vorbiți azi prin apel video cu un medic înregistrat în Irlanda — medicină de familie, adeverințe medicale, trimiteri. Programări în aceeași zi.",
    },
  },
  {
    locale: "DE",
    title: {
      before: "Online-Arzt Irland | Registrierte Hausärzte & Fachärzte | Global Health",
      after: "Online-Arzt Irland | Am selben Tag | Global Health",
    },
    // 149 chars — already inside budget, left as-is.
    desc: null,
  },
];

function assertBudgets() {
  const over: string[] = [];
  const check = (label: string, title: string, desc?: string) => {
    if (len(title) > TITLE_BUDGET) over.push(`${label} title ${len(title)} > ${TITLE_BUDGET}`);
    if (desc && len(desc) > DESC_BUDGET) {
      over.push(`${label} description ${len(desc)} > ${DESC_BUDGET}`);
    }
  };
  check("blog", BLOG.title.after, BLOG.desc.after);
  for (const h of HOME) check(`home:${h.locale}`, h.title.after, h.desc?.after);
  if (over.length > 0) throw new Error(`Proposed copy over budget:\n  ${over.join("\n  ")}`);
}

/** Prints the diff and returns whether this row should be written. */
function planField(label: string, field: string, current: string | null, pair: Pair): boolean {
  if (current === pair.after) {
    console.log(`[${label}] ${field}: already patched`);
    return false;
  }
  if (current !== pair.before) {
    console.log(
      `[${label}] ${field}: SKIPPED — differs from the 2026-08-04 baseline\n    now: ${current ?? "(null)"}`,
    );
    return false;
  }
  console.log(`[${label}] ${field}`);
  console.log(`  [${len(pair.before)}] ${pair.before}`);
  console.log(`  -> [${len(pair.after)}] ${pair.after}`);
  return true;
}

async function main() {
  assertBudgets();
  let planned = 0;

  console.log("--- PHASE 1: blog post\n");
  const post = await prisma.blogPost.findFirst({
    where: { slug: BLOG_SLUG, locale: "EN" },
    select: { id: true, seoTitle: true, seoDescription: true },
  });
  if (!post) {
    console.log(`SKIPPED — no EN BlogPost with slug ${BLOG_SLUG}`);
  } else {
    const writeTitle = planField("blog", "seoTitle", post.seoTitle, BLOG.title);
    const writeDesc = planField("blog", "seoDescription", post.seoDescription, BLOG.desc);
    if (writeTitle || writeDesc) {
      planned += 1;
      if (APPLY) {
        await prisma.blogPost.update({
          where: { id: post.id },
          data: {
            ...(writeTitle ? { seoTitle: BLOG.title.after } : {}),
            ...(writeDesc ? { seoDescription: BLOG.desc.after } : {}),
          },
        });
      }
    }
  }

  console.log("\n--- PHASE 3: Ireland HOME\n");
  const rows = await prisma.pageContentTranslation.findMany({
    where: { pageContent: { country: { code: COUNTRY }, pageKey: "HOME" } },
    select: { id: true, locale: true, seoTitle: true, seoDescription: true },
  });

  for (const h of HOME) {
    const row = rows.find((r) => r.locale === h.locale);
    if (!row) {
      console.log(`[home:${h.locale}] SKIPPED — no row`);
      continue;
    }
    const writeTitle = planField(`home:${h.locale}`, "seoTitle", row.seoTitle, h.title);
    const writeDesc = h.desc
      ? planField(`home:${h.locale}`, "seoDescription", row.seoDescription, h.desc)
      : false;
    if (!writeTitle && !writeDesc) continue;
    planned += 1;
    if (APPLY) {
      await prisma.pageContentTranslation.update({
        where: { id: row.id },
        data: {
          ...(writeTitle ? { seoTitle: h.title.after } : {}),
          ...(writeDesc && h.desc ? { seoDescription: h.desc.after } : {}),
        },
      });
    }
  }

  console.log(`\n${APPLY ? "APPLIED" : "DRY-RUN"}: ${planned} row(s) ${APPLY ? "written" : "would change"}.`);
  if (!APPLY && planned > 0) console.log("Re-run with --apply to write.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
