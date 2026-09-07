/**
 * Remove "AI-assisted article … pending review" wording from every blog body
 * and translation, and normalise the author byline.
 *
 * Owner decision 2026-09-07: every article is reviewed by the Global Health
 * medical team, so no body may describe itself as AI-assisted or as awaiting
 * review. Only the authorship sentence is removed; the rest of each
 * medical/legal notice stays. Mentions of AI as a MEDICAL TOPIC (AI-guided
 * treatment in the diabetes articles) are untouched.
 *
 * Also rewrites the hidden hero review line ("clinical review required before
 * publication") to a plain reviewed-by line, and sets
 * BlogPost.authorDisplayName to "Global Health Medical Team" everywhere.
 *
 * Usage from backend/:
 *   node --env-file=.env --import tsx scripts/strip-blog-ai-disclaimers-2026-09.ts
 *   node --env-file=.env --import tsx scripts/strip-blog-ai-disclaimers-2026-09.ts --apply
 */
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const AUTHOR = "Global Health Medical Team";

/** Authorship-disclosure markers, all locales seen in production. */
const AI_MARKER =
  /^\s*(?:AI-assisted (?:article|článek)|Článek vytvořený s pomocí AI|KI-unterstützter Artikel|Artículo asistido por IA|Artículo elaborado con apoyo de IA|Artigo assistido por IA|Artigo elaborado com apoio de IA|Artigo desenvolvido com suporte de IA|Articol asistat de IA|Articol elaborat cu sprijin AI|Článek vznikl s podporou AI)/;
/** Loose pre-filter so text runs about AI as a medical topic are inspected but not cut. */
const AI_LOOSE = /AI|IA|KI-/;

const REVIEW_LINE: Record<string, string> = {
  EN: "Reviewed by the Global Health Medical Team.",
  PT: "Revisto pela equipa médica da Global Health.",
  ES: "Revisado por el equipo médico de Global Health.",
  CS: "Zkontrolováno lékařským týmem Global Health.",
  RO: "Revizuit de echipa medicală Global Health.",
  DE: "Geprüft vom medizinischen Team von Global Health.",
};

/**
 * Inside every text run that carries an AI marker, delete the sentence that
 * contains it. A sentence ends at ". " / ".<" / ";" / end of run. Works on the
 * raw HTML so markup and the remaining sentences are untouched.
 */
export function stripAiSentences(html: string): { html: string; removed: string[] } {
  const removed: string[] = [];
  const out = html.replace(/>([^<]*)</g, (whole, text: string) => {
    if (!AI_LOOSE.test(text)) return whole;
    // Split into sentences keeping delimiters.
    const parts = text.match(/[^.;]*[.;]+\s*|[^.;]+$/g) ?? [text];
    const kept = parts.filter((s) => {
      if (AI_MARKER.test(s)) { removed.push(s.trim()); return false; }
      return true;
    });
    if (kept.length === parts.length) return whole;
    let next = kept.join("").trim();
    if (next) next = next.charAt(0).toUpperCase() + next.slice(1);
    return `>${next}<`;
  });
  return { html: out, removed };
}

export function rewriteReviewLine(html: string, locale: string): string {
  const line = REVIEW_LINE[locale] ?? REVIEW_LINE.EN;
  return html.replace(
    /(<span class="hero-review-line">)[\s\S]*?(<\/span>)/g,
    (_m, open: string, close: string) => `${open}${line}${close}`,
  );
}

async function main() {
  const posts = await prisma.blogPost.findMany({
    select: { id: true, slug: true, locale: true, status: true, authorDisplayName: true, body: true, translations: { select: { id: true, locale: true, content: true } } },
  });
  console.log(`${APPLY ? "APPLY" : "DRY RUN"}: ${posts.length} posts`);
  let bodies = 0, translations = 0, authors = 0;
  const samples = new Set<string>();

  for (const post of posts) {
    const a = stripAiSentences(post.body);
    const body = rewriteReviewLine(a.html, post.locale);
    a.removed.forEach((s) => samples.add(`${post.locale}: ${s.slice(0, 110)}`));
    const authorChanged = post.authorDisplayName !== AUTHOR;
    if (body !== post.body || authorChanged) {
      if (body !== post.body) bodies++;
      if (authorChanged) authors++;
      if (APPLY) await prisma.blogPost.update({ where: { id: post.id }, data: { body, authorDisplayName: AUTHOR } });
    }
    for (const t of post.translations) {
      const b = stripAiSentences(t.content);
      const content = rewriteReviewLine(b.html, t.locale);
      b.removed.forEach((s) => samples.add(`${t.locale}: ${s.slice(0, 110)}`));
      if (content !== t.content) {
        translations++;
        if (APPLY) await prisma.blogTranslation.update({ where: { id: t.id }, data: { content } });
      }
    }
  }
  console.log(`bodies changed: ${bodies} · translations changed: ${translations} · author bylines normalised: ${authors}`);
  console.log("\nSentences removed:");
  for (const s of [...samples].sort()) console.log(" -", s);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
