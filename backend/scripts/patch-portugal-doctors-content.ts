/**
 * Patch Portugal /portugal/pt/doctors (DOCTORS_INDEX) page content per the
 * July 2026 "Dr portugal seo.docx" brief. Mirrors
 * scripts/patch-spain-doctors-content.ts / patch-romania-doctors-content.ts.
 * PT locale only — the brief supplies no EN/ES copy for this page.
 *
 *   node --env-file=.env --import tsx scripts/patch-portugal-doctors-content.ts            # dry-run
 *   node --env-file=.env --import tsx scripts/patch-portugal-doctors-content.ts --apply    # write
 *
 * Deliberately NOT covered here: the H1 subheading / breadcrumb / stat-bar
 * text — investigation found those live in a shared i18n bundle + a
 * per-country override file, NOT PageContent, so they're out of scope for a
 * PageContent-level script. Nothing else in the brief is confirmed to live
 * on PageContentTranslation for this page beyond seoTitle/seoDescription/faq
 * (whyChoose/intro/whoFor/disclaimer fields exist on the model but the brief
 * supplies no Portugal copy for them — not touched here, not fabricated).
 *
 * SAFE BY DESIGN: every write matches on the *current* text, so re-running is
 * a no-op. Dry-run (default) prints exactly what would change; nothing is
 * written until you pass --apply.
 */
import { LocaleCode, Prisma } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const COUNTRY_CODE = "pt";
const LOCALE: LocaleCode = "PT";
const PAGE_KEY = "DOCTORS_INDEX";
const APPLY = process.argv.includes("--apply");

const log: string[] = [];
const note = (m: string) => {
  log.push(m);
  console.log(m);
};

// ── Brief content ────────────────────────────────────────────────────────────

const SEO_TITLE = "Médicos e Especialistas em Portugal | Global Health";
const SEO_DESCRIPTION =
  "Consulte médicos e especialistas registados na Ordem dos Médicos disponíveis online em Portugal. Clínica geral, oncologia, cardiologia, psiquiatria e mais. Marque no mesmo dia.";

// Q2 rewrite: try the brief's quoted text first, then accented/unaccented
// fallback variants, in case the live DB row differs slightly from the brief.
const FAQ2_MATCH_CANDIDATES = [
  "Como sei que um clínico está devidamente qualificado?",
  "Como sei que um médico está devidamente qualificado?",
  "Como sei que um clinico esta devidamente qualificado?",
];
const FAQ2_ANSWER =
  "Cada perfil exibe os dados de registo do clínico. Os médicos da Global Health Portugal estão registados na Ordem dos Médicos (OM). A nossa psicóloga está registada na Ordem dos Psicólogos Portugueses (OPP). A nossa nutricionista está registada na Ordem dos Nutricionistas (ON). Pode verificar qualquer registo de forma independente em ordemdosmedicos.pt, ordemdospsicologos.pt ou ordemdosnutricionistas.pt.";

const Q_RX = "Os médicos da Global Health Portugal podem emitir receitas válidas em farmácias portuguesas?";
const A_RX =
  "Sim. Os médicos registados na Ordem dos Médicos na plataforma Global Health podem emitir receitas eletrónicas válidas em qualquer farmácia em Portugal, sempre que clinicamente indicado, ao critério do médico assistente após avaliação. As receitas são enviadas por e-mail após a consulta.";

const Q_SPECIALIST = "Posso consultar um especialista sem referenciação do médico de família?";
const A_SPECIALIST =
  "Sim. Através da Global Health Portugal pode marcar diretamente uma consulta com qualquer um dos nossos especialistas — oncologista, cardiologista, pediatra, psiquiatra ou nutricionista — sem necessidade de referenciação prévia. Se tiver relatórios, análises ou cartas médicas anteriores relevantes, partilhe-os antes da consulta para uma avaliação mais completa.";

const Q_LANGUAGES = "Em que idiomas posso consultar com os clínicos da Global Health Portugal?";
const A_LANGUAGES =
  "Os clínicos da Global Health Portugal oferecem consultas em português, inglês, espanhol e francês, entre outros, de acordo com a disponibilidade de cada clínico. Ao consultar o perfil de cada clínico, pode ver os idiomas em que consulta. Para pacientes internacionais em Portugal — comunidades britânica, brasileira, espanhola, francesa e outras — há clínicos disponíveis no seu idioma.";

// ── FAQ helper ───────────────────────────────────────────────────────────────

type Faq = { question: string; answer: string };

function patchFaq(faq: Faq[]): { next: Faq[]; changed: string[] } {
  const changed: string[] = [];
  let next = [...faq];

  const q2Match = FAQ2_MATCH_CANDIDATES.find((cand) => next.some((f) => f.question === cand));
  if (q2Match) {
    next = next.map((f) => {
      if (f.question === q2Match && f.answer !== FAQ2_ANSWER) {
        changed.push(`FAQ Q2 answer rewritten (matched: "${q2Match}")`);
        return { ...f, answer: FAQ2_ANSWER };
      }
      return f;
    });
  } else {
    note(`⚠ None of the Q2 match candidates found in the live faq array — Q2 rewrite skipped.`);
  }

  for (const [q, a] of [
    [Q_RX, A_RX],
    [Q_SPECIALIST, A_SPECIALIST],
    [Q_LANGUAGES, A_LANGUAGES],
  ] as const) {
    if (!next.some((f) => f.question === q)) {
      next = [...next, { question: q, answer: a }];
      changed.push(`FAQ appended: ${q}`);
    }
  }

  return { next, changed };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const country = await prisma.country.findUnique({ where: { code: COUNTRY_CODE }, select: { id: true } });
  if (!country) throw new Error(`Country ${COUNTRY_CODE} not found`);
  const countryId = country.id;

  await prisma.$transaction(
    async (tx) => {
      const pc = await tx.pageContent.findUnique({
        where: { countryId_pageKey: { countryId, pageKey: PAGE_KEY } },
        select: { id: true, translations: { where: { locale: LOCALE } } },
      });
      if (!pc) {
        note(`⚠ No PageContent row for PT/${PAGE_KEY} — skipping.`);
      } else if (pc.translations.length === 0) {
        note(`⚠ No PT PageContentTranslation for PT/${PAGE_KEY} — skipping.`);
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
          const { next, changed } = patchFaq(t.faq as unknown as Faq[]);
          if (changed.length) {
            data.faq = next as unknown as Prisma.InputJsonValue;
            changed.forEach(note);
          }
        } else {
          note("⚠ faq field empty/not an array — FAQ edits skipped.");
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
      ? `APPLIED: ${log.length} change(s) written for Portugal doctors page.`
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
