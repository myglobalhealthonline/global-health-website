/**
 * Article builder for the 2026-08 SEO blog batch.
 *
 * Every article in this batch is authored as structured data and rendered
 * through `renderArticle` so all 66 locale rows share one markup contract:
 *
 *  - the `.gh-blog` class system already shipped by scripts/seed-blog-drafts.ts
 *    (STYLE is a verbatim copy — see style.ts),
 *  - the exact `<details class="faq-item"><summary class="faq-q">…` shape that
 *    frontend/lib/seo/article-faqs.ts matches to emit FAQPage schema,
 *  - a sticky in-article nav generated from the section ids, so the nav can
 *    never drift from the sections that actually exist.
 */
import { STYLE } from "./style.js";

export type Block = string;

/** Paragraph. `text` is trusted HTML — inline <strong>/<a> are expected. */
export const p = (text: string): Block => `<p>${text}</p>`;

/** Lead paragraph directly under an H2. */
export const lead = (text: string): Block => `<p class="section-lead">${text}</p>`;

/** Checklist — the ivory/forest tick list used by the exemplar articles. */
export const ul = (items: string[]): Block =>
  `<ul class="check-list">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;

/** Amber callout for a legal caveat or a safety warning. */
export const warn = (title: string, text: string): Block =>
  `<div class="alert-warn"><strong>${title}</strong>${text}</div>`;

/** Small-print source note under a section. */
export const cite = (text: string): Block => `<p class="cite-note">${text}</p>`;

export type Section = {
  /** Anchor id — also the sticky nav target. */
  id: string;
  /** Short nav label (2-3 words). */
  nav: string;
  eyebrow: string;
  h2: string;
  blocks: Block[];
};

export type Faq = { q: string; a: string };

export type SourceLink = { label: string; href: string };

export type Article = {
  /** BCP-47 tag for the <main lang> attribute, e.g. "cs-CZ". */
  lang: string;
  /** Hero brandline tagline, in-language. */
  tagline: string;
  /** Category chip in the brandline + its href. */
  categoryLabel: string;
  categoryHref: string;
  /** "Ireland · Employee guide" style eyebrow. */
  eyebrow: string;
  h1: string;
  /** Bold deck under the H1. */
  deck: string;
  /** The answer-first paragraph. Must answer the query inside 100 words. */
  intro: string;
  /** Pill facts in the hero. */
  facts: string[];
  primaryCta: SourceLink;
  secondaryCta: SourceLink;
  /** Hero side panel. */
  panelChip: string;
  panelParas: string[];
  author: { initials: string; name: string; line: string };
  /** Optional "Clinically reviewed by …" line under the author. */
  reviewLine?: string;
  navLabel: string;
  sections: Section[];
  /** Internal links block — service, doctors, contact. */
  linksEyebrow: string;
  linksH2: string;
  linksLead: string;
  links: SourceLink[];
  ctaBox: { h3: string; text: string; primary: SourceLink; secondary: SourceLink };
  sourcesEyebrow: string;
  sourcesH2: string;
  sourcesLead: string;
  sources: SourceLink[];
  sourcesNote: string;
  faqEyebrow: string;
  faqH2: string;
  faqs: Faq[];
  /** Full disclaimer body (in-language), rendered after the FAQs. */
  disclaimerTitle: string;
  disclaimer: string;
};

function section(s: Section, index: number): string {
  const tone = index % 2 === 0 ? "section-ivory" : "section-forest";
  return (
    `<section class="article-section ${tone}"><div class="section-inner">` +
    `<hr class="section-anchor" id="${s.id}" />` +
    `<span class="eyebrow">${s.eyebrow}</span>` +
    `<h2>${s.h2}</h2>` +
    s.blocks.join("") +
    `</div></section>`
  );
}

function faqBlock(a: Article, tone: string): string {
  const items = a.faqs
    .map(
      (f) =>
        `<details class="faq-item"><summary class="faq-q">${f.q}</summary>` +
        `<div class="faq-a"><p>${f.a}</p></div></details>`,
    )
    .join("");
  return (
    `<section class="article-section ${tone}"><div class="section-inner">` +
    `<hr class="section-anchor" id="faq" />` +
    `<span class="eyebrow">${a.faqEyebrow}</span>` +
    `<h2>${a.faqH2}</h2>` +
    `<div class="faq-section">${items}</div>` +
    `</div></section>`
  );
}

export function renderArticle(a: Article): string {
  const navItems = [...a.sections.map((s) => ({ id: s.id, nav: s.nav })), { id: "faq", nav: a.faqEyebrow }];

  const hero =
    `<header class="article-intro"><div class="hero-copy">` +
    `<div class="hero-brandline"><strong>Global Health</strong> · ${a.tagline} ` +
    `<a href="${a.categoryHref}">${a.categoryLabel}</a></div>` +
    `<span class="eyebrow">${a.eyebrow}</span>` +
    `<h1>${a.h1}</h1>` +
    `<p class="hero-deck">${a.deck}</p>` +
    `<p class="intro-lead">${a.intro}</p>` +
    `<div class="hero-facts">${a.facts.map((f) => `<span class="hero-fact">${f}</span>`).join("")}</div>` +
    `<div class="hero-actions"><a class="btn-lime" href="${a.primaryCta.href}">${a.primaryCta.label}</a>` +
    `<a class="btn-ghost" href="${a.secondaryCta.href}">${a.secondaryCta.label}</a></div>` +
    `</div><aside class="hero-panel"><span class="meta-chip">${a.panelChip}</span>` +
    a.panelParas.map((t) => `<p class="intro-support">${t}</p>`).join("") +
    `<div class="hero-author"><div aria-hidden="true" class="hero-author-mark">GH</div>` +
    `<div><strong>Global Health Medical Team</strong></div></div>` +
    (a.reviewLine ? `<span class="hero-review-line">${a.reviewLine}</span>` : "") +
    `</aside></header>`;

  const nav =
    `<nav class="article-nav"><div class="article-nav-inner">` +
    `<span class="article-nav-label">${a.navLabel}</span>` +
    `<div class="article-nav-list">` +
    navItems.map((n) => `<a href="#${n.id}">${n.nav}</a>`).join("") +
    `</div></div></nav>`;

  const body = a.sections.map(section).join("");

  // Continue the ivory/forest alternation past the authored sections.
  let tone = a.sections.length % 2 === 0 ? "section-ivory" : "section-forest";
  const flip = () => (tone = tone === "section-ivory" ? "section-forest" : "section-ivory");

  const linksSection =
    `<section class="article-section ${tone}"><div class="section-inner">` +
    `<hr class="section-anchor" id="global-health" />` +
    `<span class="eyebrow">${a.linksEyebrow}</span><h2>${a.linksH2}</h2>` +
    `<p class="section-lead">${a.linksLead}</p>` +
    `<ul class="check-list">${a.links.map((l) => `<li><a href="${l.href}">${l.label}</a></li>`).join("")}</ul>` +
    `<div class="cta-box"><h3>${a.ctaBox.h3}</h3><p>${a.ctaBox.text}</p>` +
    `<div class="cta-btns"><a class="btn-primary" href="${a.ctaBox.primary.href}">${a.ctaBox.primary.label}</a>` +
    `<a class="btn-secondary" href="${a.ctaBox.secondary.href}">${a.ctaBox.secondary.label}</a></div></div>` +
    `</div></section>`;
  flip();

  const sourcesSection =
    `<section class="article-section ${tone}"><div class="section-inner">` +
    `<hr class="section-anchor" id="sources" />` +
    `<span class="eyebrow">${a.sourcesEyebrow}</span><h2>${a.sourcesH2}</h2>` +
    `<p class="section-lead">${a.sourcesLead}</p>` +
    `<div class="institution-bar">` +
    a.sources.map((s) => `<a class="inst-link" href="${s.href}" rel="nofollow noopener" target="_blank">${s.label}</a>`).join("") +
    `</div><p class="cite-note">${a.sourcesNote}</p>` +
    `</div></section>`;
  flip();

  const faqs = faqBlock(a, tone);
  flip();

  const disclaimer =
    `<section class="article-section ${tone}"><div class="section-inner">` +
    `<div class="disclaimer"><strong>${a.disclaimerTitle}</strong>${a.disclaimer}</div>` +
    `</div></section>`;

  return `${STYLE}<main class="gh-blog" lang="${a.lang}">${hero}${nav}${body}${linksSection}${sourcesSection}${faqs}${disclaimer}</main>`;
}

/** Word count of the rendered body, ignoring markup and the CSS block. */
export function wordCount(html: string): number {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}
