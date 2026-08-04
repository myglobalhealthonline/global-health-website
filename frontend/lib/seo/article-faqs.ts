/**
 * Pulls the Q&A pairs out of a designed article body so the page can emit
 * `FAQPage` schema for FAQs that are already visible on it.
 *
 * Articles author their FAQs as the markup the blog editor produces:
 *
 *   <details class="faq-item">
 *     <summary class="faq-q">Question?</summary>
 *     <div class="faq-a"><p>Answer.</p></div>
 *   </details>
 *
 * Only that shape is matched. Google requires FAQ schema to reflect content the
 * user can actually see, and `<details>` content is visible on expand — so this
 * never invents entries, it only mirrors what the body already renders.
 */

export type ArticleFaq = { question: string; answer: string };

const FAQ_ITEM =
  /<details[^>]*class="[^"]*\bfaq-item\b[^"]*"[^>]*>\s*<summary[^>]*class="[^"]*\bfaq-q\b[^"]*"[^>]*>([\s\S]*?)<\/summary>\s*<div[^>]*class="[^"]*\bfaq-a\b[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/details>/gi;

/** Tags to plain text: drop markup, decode the few entities the editor emits. */
function toText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|li|div|h[1-6])>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&hellip;/gi, "…")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    // `&amp;` last, so "&amp;lt;" decodes to the literal "&lt;", not "<".
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractArticleFaqs(bodyHtml: string | null | undefined): ArticleFaq[] {
  if (!bodyHtml) return [];
  const faqs: ArticleFaq[] = [];
  const seen = new Set<string>();

  for (const match of bodyHtml.matchAll(FAQ_ITEM)) {
    const question = toText(match[1]);
    const answer = toText(match[2]);
    // A Question with no answer is invalid schema; a duplicate question makes
    // the whole FAQPage ineligible for rich results.
    if (!question || !answer) continue;
    const key = question.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    faqs.push({ question, answer });
  }

  return faqs;
}
