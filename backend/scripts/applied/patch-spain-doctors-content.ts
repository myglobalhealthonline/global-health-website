/**
 * Patch Spain /spain/es/doctors (DOCTORS_INDEX) page content per the July
 * 2026 "GlobalHealth_Spain_DoctorsPage_Brief" SEO Content Changes Brief.
 * Mirrors scripts/patch-ireland-doctors-content.ts.
 *
 *   node --import tsx scripts/patch-spain-doctors-content.ts            # dry-run
 *   node --import tsx scripts/patch-spain-doctors-content.ts --apply    # write
 *
 * Canonical URL / OG URL and the og:locale:alternate "de_ES" bug (items
 * 1.3–1.5 of the brief) are NOT touched here — they're config/env-driven
 * (NEXT_PUBLIC_SITE_URL) and a shared hreflang.ts fix respectively, not
 * per-page CMS content. See frontend/lib/seo/hreflang.ts.
 *
 * SAFE BY DESIGN: every write matches on the *current* text, so re-running is
 * a no-op. Dry-run (default) prints exactly what would change; nothing is
 * written until you pass --apply.
 */
import { LocaleCode, Prisma } from "@prisma/client";
import { prisma } from "../../src/db/prisma.js";

const COUNTRY_CODE = "es";
const LOCALE: LocaleCode = "ES";
const PAGE_KEY = "DOCTORS_INDEX";
const APPLY = process.argv.includes("--apply");

const log: string[] = [];
const note = (m: string) => {
  log.push(m);
  console.log(m);
};

// ── Brief content (current -> new) ───────────────────────────────────────────

// Stored WITHOUT the "| Global Health" suffix — resolveBrandTitle appends the
// site suffix. OG title/description reuse these same two fields (no separate
// OG columns exist), so this single pair covers brief items 1.1, 1.2, 1.4 and
// (via reuse) the OG description too.
const SEO_TITLE = "Médicos y especialistas colegiados en España";
const SEO_DESCRIPTION =
  "Explore 14 médicos y especialistas colegiados en España disponibles online. Dermatología, cardiología, psiquiatría, psicología, urgencias y más. Reserve el mismo día.";

// FAQ edits — Q2 rewritten, Q3-Q5 appended. Preserve Q1 untouched.
const FAQ2_MATCH = "cualificado";
const FAQ2_ANSWER =
  "Cada perfil muestra los datos de colegiación del médico. Todos los médicos de Global Health están colegiados con el Consejo General de Colegios Oficiales de Médicos (CGCOM). Para los psicólogos, el registro es con el Consejo General de la Psicología (COP). Puede verificar cualquier colegiación de forma independiente en cgcom.es o cop.es.";

const Q3 = "¿Necesito una derivación del médico de cabecera para ver a un especialista?";
const A3 =
  "No. A través de Global Health España puedes reservar directamente una consulta con cualquiera de nuestros especialistas — dermatólogo, cardiólogo, especialista cardiovascular, psiquiatra o psicólogos — sin necesidad de derivación previa. Si tienes informes médicos anteriores, resultados de pruebas o cartas de tu médico habitual, puedes compartirlos antes de la consulta para una evaluación más completa.";

const Q4 = "¿En qué idiomas puedo consultar con los médicos de Global Health España?";
const A4 =
  "Los médicos de Global Health España ofrecen consultas en español, inglés, alemán, húngaro, hindi, urdu, neerlandés e italiano, según la disponibilidad de cada médico. Al revisar el perfil de cada médico puedes ver los idiomas en los que ofrece consultas. Para pacientes internacionales en España — comunidades latinoamericana, británica, alemana, neerlandesa, húngara, pakistaní, india o italiana — hay médicos disponibles en tu idioma.";

const Q5 = "¿Pueden los médicos de Global Health España emitir informes médicos y bajas laborales?";
const A5 =
  "Sí. Los médicos colegiados en España a través de Global Health pueden emitir informes médicos, certificados y cartas clínicas donde esté clínicamente indicado, a criterio profesional del médico tras la evaluación. Tras cada consulta recibirás por correo electrónico las notas clínicas del médico con sus conclusiones y recomendaciones.";

// ── FAQ helper ───────────────────────────────────────────────────────────────

type Faq = { question: string; answer: string };

function patchFaq(faq: Faq[]): { next: Faq[]; changed: string[] } {
  const changed: string[] = [];
  let next = faq.map((f) => {
    if (f.question.toLowerCase().includes(FAQ2_MATCH) && f.answer !== FAQ2_ANSWER) {
      changed.push(`FAQ Q2 answer -> "${f.question}"`);
      return { ...f, answer: FAQ2_ANSWER };
    }
    return f;
  });
  if (!next.some((f) => f.question === Q3)) {
    next = [...next, { question: Q3, answer: A3 }];
    changed.push("FAQ appended: Q3 (especialista sin derivación)");
  }
  if (!next.some((f) => f.question === Q4)) {
    next = [...next, { question: Q4, answer: A4 }];
    changed.push("FAQ appended: Q4 (idiomas disponibles)");
  }
  if (!next.some((f) => f.question === Q5)) {
    next = [...next, { question: Q5, answer: A5 }];
    changed.push("FAQ appended: Q5 (informes médicos y bajas)");
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
        select: { id: true, showFaq: true, translations: { where: { locale: LOCALE } } },
      });
      if (!pc) {
        note(`⚠ No PageContent row for ES/${PAGE_KEY} — skipping.`);
      } else {
        if (!pc.showFaq) {
          note(`showFaq: false -> true`);
          if (APPLY) await tx.pageContent.update({ where: { id: pc.id }, data: { showFaq: true } });
        }

        if (pc.translations.length === 0) {
          note(`⚠ No ES PageContentTranslation for ES/${PAGE_KEY} — skipping seoTitle/seoDescription/faq.`);
        } else {
          const t = pc.translations[0];
          const data: Prisma.PageContentTranslationUpdateInput = {};

          if (t.seoTitle !== SEO_TITLE) { data.seoTitle = SEO_TITLE; note(`seoTitle: ${t.seoTitle ?? "∅"} -> ${SEO_TITLE}`); }
          if (t.seoDescription !== SEO_DESCRIPTION) { data.seoDescription = SEO_DESCRIPTION; note("seoDescription updated"); }

          if (Array.isArray(t.faq)) {
            const { next, changed } = patchFaq(t.faq as unknown as Faq[]);
            if (changed.length) { data.faq = next as unknown as Prisma.InputJsonValue; changed.forEach(note); }
          } else {
            note("⚠ faq field empty/not an array — starting fresh with Q3-Q5 only (Q1/Q2 from brief section 5 lost, verify in admin).");
            data.faq = [
              { question: Q3, answer: A3 },
              { question: Q4, answer: A4 },
              { question: Q5, answer: A5 },
            ] as unknown as Prisma.InputJsonValue;
          }

          if (Object.keys(data).length && APPLY) {
            await tx.pageContentTranslation.update({ where: { id: t.id }, data });
          }
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
      ? `APPLIED: ${log.length} change(s) written for Spain doctors page.`
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
