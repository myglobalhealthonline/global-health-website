/**
 * Repairs service detailBody paragraphs whose bold sub-heading lost its tag on
 * import and ran into the following sentence:
 *
 *   <p>Full Medical AssessmentYour doctor will review your symptoms…</p>
 *   -> <p><strong>Full Medical Assessment</strong><br />Your doctor will review…</p>
 *
 * The corruption is in the authored source, not the importer:
 * scripts/data/ireland-service-content.json carries it verbatim, and its FIRST
 * entry shows the intended shape (`<p>Same-day access:</p><p>No waiting…</p>`)
 * while later entries lost it. It renders as broken prose in all six locales.
 *
 * DELIBERATELY CONSERVATIVE. A blunt `[a-z][A-Z]` sweep matches 3,794
 * boundaries across 425 rows, and any false positive corrupts live clinical
 * copy in a language I cannot proofread. So a paragraph is only rewritten when
 * ALL of these hold:
 *   - the run-together boundary is the paragraph's FIRST characters (a heading
 *     leads the paragraph — mid-sentence boundaries are camelCase brand names
 *     or genuine prose and are left alone),
 *   - the heading is 3-120 chars and contains no sentence-ending punctuation
 *     (`.:!?` means it was authored correctly already) — the cap is generous
 *     because several real headings run past 70 chars
 *     ("Consulta de Psiquiatria — avaliação e gestão psiquiátrica especializada"),
 *   - the paragraph has no existing <strong> or <br> (already repaired), and
 *   - the sentence resumes with an initial-capital word, or a single capital
 *     letter followed by a space — the Portuguese/Spanish article in
 *     "…Avaliação Médica CompletaO seu médico…". Acronyms ("GDPR") are still
 *     excluded, since a second capital follows immediately.
 * Everything the rule does not match is reported as UNTOUCHED, with a count, so
 * the residue is visible rather than silently dropped.
 *
 * `<strong>` and `<br>` are both in the backend sanitizer's ALLOWED_TAGS
 * (src/utils/sanitize-html.ts) and in the frontend's scopeBlogHtml allow-list,
 * so the repaired markup survives a round-trip through the admin editor.
 *
 * Idempotent: a repaired paragraph no longer matches (it now contains <strong>).
 *
 *   node --env-file=.env --import tsx scripts/patch-service-run-together-headings.ts                 # dry-run, summary
 *   node --env-file=.env --import tsx scripts/patch-service-run-together-headings.ts --verbose       # every edit
 *   node --env-file=.env --import tsx scripts/patch-service-run-together-headings.ts --country ie    # one market
 *   node --env-file=.env --import tsx scripts/patch-service-run-together-headings.ts --apply         # write
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const VERBOSE = process.argv.includes("--verbose");
const COUNTRY_FILTER = (() => {
  const i = process.argv.indexOf("--country");
  return i === -1 ? null : (process.argv[i + 1] ?? null);
})();

const PARAGRAPH = /<p>([\s\S]*?)<\/p>/gi;

/**
 * Paragraph-initial heading running into the next sentence.
 *   group 1 — the heading (no sentence punctuation, so it was never a sentence)
 *   group 2 — first two chars of the sentence that follows
 *
 * The heading MUST end on a word character, never a space: the whole signal is
 * that the two words collided with no separator. Without that constraint the
 * non-greedy match stops at the first Title Case word instead and splits
 * "Full Medical AssessmentYour doctor…" into "Full" + "Medical Assessment…".
 */
const LEADING_HEADING =
  /^([\p{Lu}\p{Nd}][^<>.:!?]{1,118}?[\p{Ll},)])(\p{Lu}(?:\p{Ll}|(?=\s)))/u;

/** Any remaining boundary, used only to report what the strict rule skipped. */
const ANY_BOUNDARY = /[\p{Ll},)]\p{Lu}/u;

type Stats = { repaired: number; untouched: number };

function repairBody(html: string, stats: Stats, log: (msg: string) => void): string {
  return html.replace(PARAGRAPH, (whole, inner: string) => {
    if (/<strong|<br/i.test(inner)) return whole;

    const match = LEADING_HEADING.exec(inner);
    if (!match) {
      const text = inner.replace(/<[^>]+>/g, "");
      const boundary = ANY_BOUNDARY.exec(text);
      if (boundary) {
        stats.untouched += 1;
        const at = boundary.index;
        log(`      DECLINED  …${text.slice(Math.max(0, at - 40), at + 40).trim()}…`);
      }
      return whole;
    }

    const heading = match[1];
    const rest = inner.slice(heading.length);
    // A "heading" that is really the opening clause of a sentence would leave a
    // rest starting mid-thought; require the remainder to be a real sentence.
    if (rest.length < 20) {
      stats.untouched += 1;
      return whole;
    }

    stats.repaired += 1;
    log(`      ${heading}  ||  ${rest.slice(0, 60)}…`);
    return `<p><strong>${heading}</strong><br />${rest}</p>`;
  });
}

async function main() {
  const services = await prisma.service.findMany({
    where: COUNTRY_FILTER ? { country: { code: COUNTRY_FILTER } } : undefined,
    select: {
      id: true,
      slug: true,
      detailBody: true,
      country: { select: { code: true } },
      translations: { select: { id: true, locale: true, detailBody: true }, orderBy: { locale: "asc" } },
    },
    orderBy: { slug: "asc" },
  });

  const stats: Stats = { repaired: 0, untouched: 0 };
  let rowsChanged = 0;
  const perCountry = new Map<string, number>();

  for (const s of services) {
    const country = s.country?.code ?? "??";
    const rows = [
      { kind: "service" as const, id: s.id, label: "base", html: s.detailBody },
      ...s.translations.map((t) => ({
        kind: "translation" as const,
        id: t.id,
        label: String(t.locale),
        html: t.detailBody,
      })),
    ];

    for (const row of rows) {
      if (!row.html) continue;
      const before = stats.repaired;
      const lines: string[] = [];
      const next = repairBody(row.html, stats, (m) => lines.push(m));
      if (next === row.html) {
        // Rows the rule declined entirely still matter — that residue is the
        // part a human has to look at.
        if (VERBOSE && lines.length > 0) {
          console.log(`  ${country}/${s.slug} [${row.label}] — no change`);
          lines.forEach((l) => console.log(l));
        }
        continue;
      }

      rowsChanged += 1;
      const n = stats.repaired - before;
      perCountry.set(country, (perCountry.get(country) ?? 0) + n);
      console.log(`  ${country}/${s.slug} [${row.label}] — ${n} heading(s)`);
      if (VERBOSE) lines.forEach((l) => console.log(l));

      if (!APPLY) continue;
      if (row.kind === "service") {
        await prisma.service.update({ where: { id: row.id }, data: { detailBody: next } });
      } else {
        await prisma.serviceTranslation.update({ where: { id: row.id }, data: { detailBody: next } });
      }
    }
  }

  console.log(`\n${services.length} service(s) scanned${COUNTRY_FILTER ? ` (country=${COUNTRY_FILTER})` : ""}.`);
  console.log(`${APPLY ? "APPLIED" : "DRY-RUN"}: ${stats.repaired} heading(s) in ${rowsChanged} row(s).`);
  console.log(`UNTOUCHED: ${stats.untouched} paragraph(s) still hold a boundary the strict rule declined.`);
  for (const [code, n] of [...perCountry].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${code}  ${n}`);
  }
  if (!APPLY && stats.repaired > 0) console.log("\nRe-run with --apply to write.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
