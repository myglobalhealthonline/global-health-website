/**
 * Repair regulator-name mistranslations introduced by
 * backfill-doctor-content-translations.ts (2026-07-16 run).
 *
 * Root cause: when translating a doctor's FAQ into another locale, the
 * model sometimes localized the regulator PROPER NAME itself (e.g. turned
 * "Irish Medical Council" into "Ordem dos Médicos" for a PT translation of
 * an Irish doctor's FAQ) while leaving the registration number/abbreviation
 * untouched — producing sentences like "registada na Ordem dos Médicos —
 * número IMC 408777", which names the wrong country's regulator.
 *
 * Ground truth = the doctor's own SOURCE-locale FAQ sibling row (paired by
 * ordinal position within each locale's FAQ list, matching how the backfill
 * created rows). A regulator full name is "expected" for a target row if it
 * (or its abbreviation, near a number) appears in the paired source row. Any
 * OTHER known regulator full name appearing alone (not as a translated
 * descriptor next to an expected name) in the target row is flagged and
 * replaced with the exact name used in the source row.
 *
 * Usage (run from backend/):
 *   node --env-file=.env --import tsx scripts/repair-faq-regulator-names.ts            # dry-run (default)
 *   node --env-file=.env --import tsx scripts/repair-faq-regulator-names.ts --apply    # writes
 */
import { prisma } from "../src/db/prisma.js";
import type { LocaleCode } from "@prisma/client";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const APPLY = process.argv.includes("--apply");
const LOG_PATH = path.resolve(process.cwd(), "scripts/repair-faq-regulator-names.dryrun.log");

// Known regulator bodies. `abbrevs` only match near a digit or inside
// parens (registration-number context) — short abbreviations like "OM"/"ON"
// are too collision-prone to match as free text.
const REGULATORS: { id: string; fullNames: string[]; abbrevs: string[] }[] = [
  { id: "ie-imc", fullNames: ["Irish Medical Council"], abbrevs: ["IMC"] },
  { id: "ie-psi", fullNames: ["Psychological Society of Ireland"], abbrevs: ["PSI"] },
  { id: "ie-coru", fullNames: [], abbrevs: ["CORU"] },
  { id: "ie-ntoi", fullNames: [], abbrevs: ["NTOI"] },
  { id: "pt-om", fullNames: ["Ordem dos Médicos"], abbrevs: ["OM"] },
  { id: "pt-opp", fullNames: ["Ordem dos Psicólogos Portugueses"], abbrevs: ["OPP"] },
  { id: "cz-clk", fullNames: ["Česká lékařská komora"], abbrevs: ["ČLK", "CLK"] },
  { id: "ro-cmr", fullNames: ["Colegiul Medicilor din România"], abbrevs: ["CMR"] },
  { id: "es-omc", fullNames: ["Organización Médica Colegial de España", "Consejo General de Colegios Oficiales de Médicos"], abbrevs: ["OMC", "CGCOM"] },
  { id: "es-cop", fullNames: ["Colegio Oficial de Psicólogos"], abbrevs: ["COP"] },
  { id: "br-crm", fullNames: ["Conselho Federal de Medicina", "Conselho Regional de Medicina"], abbrevs: ["CFM", "CRM"] },
];

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// `\b` is ASCII-only in JS — it never fires around letters like Č/Š/ș, so
// abbreviation matching needs an explicit Unicode-aware boundary instead.
const NB = "(?<![\\p{L}\\p{N}])";
const NA = "(?![\\p{L}\\p{N}])";

/** Regulator groups whose FULL NAME appears verbatim in `text`. */
function fullNameGroupsIn(text: string): { id: string; name: string; index: number }[] {
  const hits: { id: string; name: string; index: number }[] = [];
  for (const reg of REGULATORS) {
    for (const name of reg.fullNames) {
      const re = new RegExp(escapeRe(name), "g");
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) hits.push({ id: reg.id, name, index: m.index });
    }
  }
  return hits;
}

/** True if `reg`'s own abbreviation appears in "(ABBR)" or "ABBR ... 12345" form. */
function abbrevNearNumber(text: string, reg: (typeof REGULATORS)[number]): boolean {
  return reg.abbrevs.some((abbr) => {
    const a = escapeRe(abbr);
    const re = new RegExp(`(?:\\(\\s*${a}${NA})|(?:${NB}${a}${NA}[^\\d]{0,25}\\d)`, "gu");
    return re.test(text);
  });
}

/** Regulator groups mentioned at all (full name, or abbreviation near a digit/parens) — used to compute "expected" set from the source row. */
function expectedGroupsIn(text: string): Set<string> {
  const set = new Set<string>();
  for (const reg of REGULATORS) {
    for (const name of reg.fullNames) {
      if (text.includes(name)) set.add(reg.id);
    }
    if (abbrevNearNumber(text, reg)) set.add(reg.id);
  }
  return set;
}

/** Verbatim substring from the source row representing `groupId` (prefer full name). */
function sourceMentionFor(sourceText: string, groupId: string): string | null {
  const reg = REGULATORS.find((r) => r.id === groupId)!;
  for (const name of reg.fullNames) {
    if (sourceText.includes(name)) return name;
  }
  for (const abbr of reg.abbrevs) {
    if (new RegExp(`${NB}${escapeRe(abbr)}${NA}`, "u").test(sourceText)) return abbr;
  }
  return null;
}

// PT-specific light grammar cleanup: foreign-language org names conventionally
// take "no" in this corpus (e.g. "registado no Irish Medical Council").
// Drop a redundant trailing nationality qualifier once the name is replaced.
const PT_PREPOSITIONS = /\b(na|no|da|do|à|ao)\s+$/i;
const PT_TRAILING_QUALIFIER = /^\s*(irlandes[ao]|portugu[eê]s[ao]?|check?[ao]|roman[ao]|espanhol[ao]|d[ae]\s+(Irlanda|Portugal|República\s+Checa|Rom[eé]nia|Espanha))\b/iu;

/** Replace every occurrence of `wrongName` in `text` with `correctName`,
 * fixing the preceding PT preposition and dropping a redundant trailing
 * nationality qualifier (PT only — see PT_PREPOSITIONS/PT_TRAILING_QUALIFIER). */
function rebuild(text: string, wrongName: string, correctName: string, targetLocale: LocaleCode): string {
  const re = new RegExp(escapeRe(wrongName), "g");
  let result = "";
  let cursor = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const beforeSegment = text.slice(cursor, m.index);
    let prefixTail = beforeSegment;
    let afterSegment = text.slice(m.index + wrongName.length);
    if (targetLocale === "PT") {
      const prepMatch = beforeSegment.match(PT_PREPOSITIONS);
      if (prepMatch) {
        prefixTail = beforeSegment.slice(0, beforeSegment.length - prepMatch[0].length) + "no ";
        afterSegment = afterSegment.replace(PT_TRAILING_QUALIFIER, "");
      }
    }
    result += prefixTail + correctName;
    cursor = m.index + wrongName.length;
    // recompute afterSegment consumption: only the qualifier strip should
    // advance the cursor past the stripped words, so re-derive cursor.
    const strippedLen = text.slice(cursor).length - afterSegment.length;
    cursor += strippedLen;
  }
  result += text.slice(cursor);
  return result;
}

type FaqRow = { id: string; doctorId: string; locale: LocaleCode; question: string; answer: string; sortOrder: number; createdAt: Date };

async function main() {
  const log: string[] = [];
  const print = (line: string) => {
    log.push(line);
    console.log(line);
  };

  const countries = await prisma.country.findMany({ select: { id: true, defaultLocale: true } });
  const defaultLocaleOf = new Map(countries.map((c) => [c.id, c.defaultLocale]));

  const doctors = await prisma.doctor.findMany({ select: { id: true, fullName: true, countryId: true } });
  const allFaqs = (await prisma.doctorFaq.findMany({
    select: { id: true, doctorId: true, locale: true, question: true, answer: true, sortOrder: true, createdAt: true },
  })) as FaqRow[];
  const faqsByDoctor = new Map<string, FaqRow[]>();
  for (const f of allFaqs) {
    if (!faqsByDoctor.has(f.doctorId)) faqsByDoctor.set(f.doctorId, []);
    faqsByDoctor.get(f.doctorId)!.push(f);
  }

  type Fix = { faqId: string; field: "question" | "answer"; before: string; after: string; doctor: string; locale: LocaleCode; wrongName: string; correctName: string };
  const fixes: Fix[] = [];
  const ambiguous: string[] = [];
  let legitDual = 0;

  for (const doctor of doctors) {
    const rows = faqsByDoctor.get(doctor.id);
    if (!rows || !rows.length) continue;
    const byLocale = new Map<LocaleCode, FaqRow[]>();
    for (const r of rows) {
      if (!byLocale.has(r.locale)) byLocale.set(r.locale, []);
      byLocale.get(r.locale)!.push(r);
    }
    for (const list of byLocale.values()) list.sort((a, b) => a.sortOrder - b.sortOrder);

    const defaultLocale = defaultLocaleOf.get(doctor.countryId);
    let sourceLocale: LocaleCode | undefined =
      defaultLocale && byLocale.has(defaultLocale) ? defaultLocale : undefined;
    if (!sourceLocale) {
      // Pick the locale with the most rows (earliest-authored set); tie-break by earliest createdAt.
      let best: LocaleCode | undefined;
      let bestScore = [-1, Infinity] as [number, number];
      for (const [locale, list] of byLocale) {
        const minCreated = Math.min(...list.map((r) => r.createdAt.getTime()));
        const score: [number, number] = [list.length, -minCreated];
        if (score[0] > bestScore[0] || (score[0] === bestScore[0] && score[1] > bestScore[1])) {
          best = locale;
          bestScore = score;
        }
      }
      sourceLocale = best;
    }
    if (!sourceLocale) continue;
    const sourceRows = byLocale.get(sourceLocale)!;

    for (const [locale, targetRows] of byLocale) {
      if (locale === sourceLocale) continue;
      const n = Math.min(sourceRows.length, targetRows.length);
      for (let i = 0; i < n; i++) {
        const src = sourceRows[i];
        const tgt = targetRows[i];
        const srcText = `${src.question} ${src.answer}`;
        const expected = expectedGroupsIn(srcText);
        const tgtRowText = `${tgt.question} ${tgt.answer}`; // whole-row context for the deeper-corruption guard below

        for (const field of ["question", "answer"] as const) {
          const tgtText = tgt[field];
          const found = fullNameGroupsIn(tgtText);
          for (const hit of found) {
            if (expected.has(hit.id)) continue; // legitimately mentioned (dual/multi registration)

            // Skip if an expected group's own marker sits right next to this
            // mention — a translated descriptor alongside the kept official
            // name (e.g. "Conselho Médico Irlandês (Irish Medical Council)").
            const window = tgtText.slice(Math.max(0, hit.index - 10), hit.index + hit.name.length + 60);
            const isDescriptor = [...expected].some((eid) => {
              const reg = REGULATORS.find((r) => r.id === eid)!;
              return [...reg.fullNames, ...reg.abbrevs].some((alias) => window.includes(alias));
            });
            if (isDescriptor) continue;

            // The wrong group's OWN abbreviation+number also appears anywhere
            // in this FAQ row (question or answer) — e.g. "ČLK — IMC number
            // 542074". The corruption goes deeper than a name swap (a
            // number/URL was fabricated too). Fixing only the name would
            // leave a self-contradictory row, so skip the whole row's fields
            // for this group.
            const wrongReg = REGULATORS.find((r) => r.id === hit.id)!;
            if (abbrevNearNumber(tgtRowText, wrongReg)) {
              ambiguous.push(`${doctor.fullName} [${sourceLocale}->${locale}] faq ${tgt.id} ${field}: found "${hit.name}" with its own abbreviation+number still present — likely a fabricated registration, not just a name swap; skipping`);
              continue;
            }

            if (expected.size === 0) {
              ambiguous.push(`${doctor.fullName} [${sourceLocale}->${locale}] faq ${tgt.id} ${field}: found "${hit.name}" but source row mentions no known regulator`);
              continue;
            }
            if (expected.size > 1) {
              legitDual++;
              ambiguous.push(`${doctor.fullName} [${sourceLocale}->${locale}] faq ${tgt.id} ${field}: found "${hit.name}", doctor has ${expected.size} legitimate registrations in this row — cannot confidently map, skipping`);
              continue;
            }

            const [onlyExpected] = expected;
            const correctName = sourceMentionFor(srcText, onlyExpected);
            if (!correctName) {
              ambiguous.push(`${doctor.fullName} [${sourceLocale}->${locale}] faq ${tgt.id} ${field}: expected group ${onlyExpected} but couldn't extract a verbatim source mention`);
              continue;
            }

            const after = rebuild(tgtText, hit.name, correctName, locale);
            if (after === tgtText) continue;
            fixes.push({
              faqId: tgt.id,
              field,
              before: tgtText,
              after,
              doctor: doctor.fullName,
              locale,
              wrongName: hit.name,
              correctName,
            });
          }
        }
      }
    }
  }

  // Merge per-row fixes (question+answer may both change) into one update per faq id.
  const byFaqId = new Map<string, Fix[]>();
  for (const f of fixes) {
    if (!byFaqId.has(f.faqId)) byFaqId.set(f.faqId, []);
    byFaqId.get(f.faqId)!.push(f);
  }

  print(`${APPLY ? "APPLYING" : "DRY RUN"} — repair-faq-regulator-names\n`);
  for (const [faqId, fs] of byFaqId) {
    for (const f of fs) {
      const bIdx = f.before.indexOf(f.wrongName);
      const beforeSnip = f.before.slice(Math.max(0, bIdx - 60), bIdx + f.wrongName.length + 60);
      const aIdx = f.after.indexOf(f.correctName, Math.max(0, bIdx - 5));
      const afterSnip = f.after.slice(Math.max(0, aIdx - 60), aIdx + f.correctName.length + 60);
      print(`--- ${f.doctor} [${f.locale}] faq ${faqId} .${f.field}`);
      print(`  before: ...${beforeSnip}...`);
      print(`  after:  ...${afterSnip}...`);
    }
    if (APPLY) {
      const fs2 = byFaqId.get(faqId)!;
      const data: Record<string, string> = {};
      for (const f of fs2) data[f.field] = f.after;
      await prisma.$transaction(async (tx) => {
        const current = await tx.doctorFaq.findUnique({ where: { id: faqId }, select: { question: true, answer: true } });
        if (!current) return;
        // Idempotent: only write fields that still equal our recorded "before" (not changed concurrently since).
        const patch: Record<string, string> = {};
        for (const f of fs2) {
          if (current[f.field as "question" | "answer"] === f.before) patch[f.field] = f.after;
        }
        if (Object.keys(patch).length) {
          await tx.doctorFaq.update({ where: { id: faqId }, data: patch });
        }
      });
    }
  }

  print(`\nSummary:`);
  print(`  Rows fixed: ${byFaqId.size} (${fixes.length} field change(s))`);
  print(`  Skipped as ambiguous / dual-registration-uncertain: ${ambiguous.length}`);
  print(`  Of which multi-registration (legit, can't map): ${legitDual}`);
  if (ambiguous.length) {
    print(`\nAmbiguous (skipped):`);
    for (const a of ambiguous) print(`  - ${a}`);
  }
  if (!APPLY) print("\nDry run only — pass --apply to write.");

  await writeFile(LOG_PATH, log.join("\n") + "\n", "utf8");
  console.log(`\nFull log written to ${LOG_PATH}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
