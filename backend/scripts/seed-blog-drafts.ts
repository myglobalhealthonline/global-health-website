/**
 * DRAFT — REQUIRES CLINICAL REVIEW BEFORE PUBLISHING
 *
 * Seeds 2 new blog posts as DRAFT (status: "DRAFT", isActive: true,
 * publishedAt: null, lastReviewedAt: null — unreviewed) mirroring the
 * structure of the exemplar article "diabetes-a-silent-disease" (EN):
 * hero + sticky article-nav + alternating H2 sections + institution links +
 * FAQ accordion + medical disclaimer + related-articles block, all using the
 * same inline `.gh-blog` CSS system so it renders correctly if/when
 * published.
 *
 *   1. when-to-see-a-gp-online-vs-in-person
 *   2. sick-certificate-ireland-employee-rights
 *
 * Author/reviewer linkage: BOTH posts use authorDoctorId for the SAME real
 * doctor record the diabetes article links (Dr Tiago Miguel Figueira,
 * cmp5r0if3002kssjug743x0p6) — verified by reading that row, not invented.
 * reviewerDoctorId is left null, matching the diabetes row itself (it also
 * has no reviewerDoctorId set) and matching "unreviewed draft" intent.
 *
 * Citations: every external URL below was checked with WebFetch (July 2026)
 * and confirmed reachable (200). citizensinformation.ie and two gov.ie
 * publication URLs returned 403 to WebFetch (bot-blocking, not necessarily
 * broken) and were deliberately dropped rather than cited unverified —
 * workplacerelations.ie (WRC) and enterprise.gov.ie cover the same statutory
 * sick leave facts and did verify at 200.
 *
 * Idempotent by slug — safe to re-run; upserts on [slug, locale, countryId].
 *
 *   node --env-file=.env --import tsx scripts/seed-blog-drafts.ts            # dry-run
 *   node --env-file=.env --import tsx scripts/seed-blog-drafts.ts --apply    # write
 *
 * DO NOT RUN without clinical sign-off on the medical content below.
 */
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");

const AUTHOR_DOCTOR_ID = "cmp5r0if3002kssjug743x0p6"; // Dr Tiago Miguel Figueira — same as diabetes-a-silent-disease

const STYLE = `<style>
:root {
  --gh-font-sans: "Aptos", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --gh-text-display: clamp(2.65rem, 6vw + .7rem, 5.65rem);
  --gh-text-h2: clamp(2rem, 3.7vw + .35rem, 3.35rem);
  --gh-text-h3: clamp(1.3rem, 1.7vw + .3rem, 1.8rem);
  --gh-text-body-lg: clamp(1.08rem, .85vw + .76rem, 1.28rem);
  --gh-text-body: clamp(.98rem, .42vw + .76rem, 1.08rem);
  --gh-text-eyebrow: .8125rem;
  --gh-text-meta: .875rem;
  --gh-forest: #1D4B36;
  --gh-forest-hover: #163826;
  --gh-mint: #8FB021;
  --gh-lime: #B0F122;
  --gh-accent-soft: rgba(176,241,34,.20);
  --gh-accent-dim: rgba(176,241,34,.10);
  --gh-page: #FFFFFF;
  --gh-soft: #F6F8F1;
  --gh-panel: #EDF2E2;
  --gh-text: #2D3B36;
  --gh-muted: #6D6D6D;
  --gh-on-dark-muted: rgba(255,255,255,.72);
  --gh-on-dark-faint: rgba(255,255,255,.60);
  --gh-border: #E4E7DD;
  --gh-border-strong: #C3CCB5;
  --gh-radius-card: 20px;
  --gh-radius-small: 12px;
  --gh-radius-pill: 999px;
  --gh-shadow-card: 0 1px 3px rgba(29,75,54,.08), 0 4px 12px rgba(29,75,54,.04);
  --gh-shadow-hover: 0 4px 12px rgba(29,75,54,.12), 0 8px 24px rgba(29,75,54,.08);
  --gh-shadow-elevated: 0 8px 30px rgba(29,75,54,.14), 0 2px 8px rgba(29,75,54,.08);
  --gh-shadow-focus: 0 0 0 3px rgba(29,75,54,.28);
  --gh-container: 1180px;
  --gh-section-space: clamp(4.25rem, calc(2.5rem + 3vw), 7.5rem);
  --gh-inset: clamp(20px, 3vw, 36px);
  --gh-glass-border: 1px solid rgba(176,241,34,.22);
  --gh-glass-filter: blur(18px) saturate(170%) brightness(1.05);
}
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--gh-page); }
.gh-blog, .gh-blog * { box-sizing: border-box; }
.gh-blog { width: 100%; overflow: clip; font-family: var(--gh-font-sans); color: var(--gh-text); background: var(--gh-page); line-height: 1.65; -webkit-font-smoothing: antialiased; }
.gh-blog h1, .gh-blog h2, .gh-blog h3, .gh-blog p { margin-top: 0; }
.gh-blog h1, .gh-blog h2, .gh-blog h3 { font-family: var(--gh-font-sans); font-weight: 800; letter-spacing: -.02em; line-height: 1.08; }
.gh-blog a:focus-visible, .gh-blog summary:focus-visible { outline: none; box-shadow: var(--gh-shadow-focus); }
.gh-blog .article-intro { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(340px, .7fr); gap: clamp(2rem, 5vw, 5.5rem); align-items: center; padding: clamp(4.5rem, 8vw, 8rem) max(var(--gh-inset), calc((100vw - var(--gh-container)) / 2)); background: linear-gradient(178deg, #12342A 0%, #0F2E25 100%); color: #FFFFFF; }
.gh-blog .hero-copy { min-width: 0; }
.gh-blog .hero-brandline { display: flex; align-items: center; flex-wrap: wrap; gap: .65rem; margin-bottom: 1.1rem; color: var(--gh-on-dark-faint); font-size: .82rem; font-weight: 700; }
.gh-blog .hero-brandline strong { color: #FFFFFF; }
.gh-blog .hero-brandline a { display: inline-flex; align-items: center; min-height: 32px; padding: .3rem .7rem; border: 1px solid rgba(176,241,34,.18); border-radius: var(--gh-radius-pill); color: var(--gh-lime); background: var(--gh-accent-dim); font-size: .75rem; text-decoration: none; }
.gh-blog .eyebrow { display: inline-flex; align-items: center; gap: .6rem; min-height: 32px; margin: 0 0 1rem; padding: .32rem .76rem; border: 1px solid rgba(29,75,54,.10); border-radius: var(--gh-radius-pill); color: var(--gh-forest); background: rgba(29,75,54,.06); font-size: var(--gh-text-eyebrow); font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
.gh-blog .eyebrow::before { content: ""; width: 8px; height: 8px; flex: 0 0 auto; border-radius: var(--gh-radius-pill); background: var(--gh-mint); }
.gh-blog .article-intro .eyebrow, .gh-blog .section-forest .eyebrow { color: var(--gh-lime); background: var(--gh-accent-dim); border-color: rgba(176,241,34,.18); }
.gh-blog .article-intro .eyebrow::before, .gh-blog .section-forest .eyebrow::before { background: var(--gh-lime); }
.gh-blog h1 { max-width: 14ch; margin-bottom: 1rem; color: #FFFFFF; font-size: var(--gh-text-display); }
.gh-blog .hero-deck { max-width: 48ch; margin-bottom: 1.75rem; color: #FFFFFF; font-size: var(--gh-text-body-lg); font-weight: 600; line-height: 1.55; }
.gh-blog .intro-lead { max-width: 64ch; margin-bottom: 2rem; color: var(--gh-on-dark-muted); font-size: var(--gh-text-body); line-height: 1.78; }
.gh-blog .hero-facts { display: flex; flex-wrap: wrap; gap: .55rem; margin: 0 0 1.7rem; }
.gh-blog .hero-fact { display: inline-flex; align-items: center; min-height: 34px; padding: .35rem .72rem; border: 1px solid rgba(255,255,255,.15); border-radius: var(--gh-radius-pill); color: var(--gh-on-dark-muted); background: rgba(255,255,255,.06); font-size: .75rem; font-weight: 600; }
.gh-blog .hero-actions { display: flex; flex-wrap: wrap; gap: .8rem; }
.gh-blog .btn-lime, .gh-blog .btn-ghost { display: inline-flex; align-items: center; justify-content: center; min-height: 56px; padding: 0 1.7rem; border-radius: var(--gh-radius-pill); font-family: inherit; font-size: .95rem; font-weight: 800; text-decoration: none; transition: transform 200ms cubic-bezier(.16,1,.3,1), background-color 200ms ease, border-color 200ms ease, box-shadow 200ms ease; }
.gh-blog .btn-lime { border: 0; color: #0a1f14; background: var(--gh-lime); box-shadow: 0 4px 15px rgba(176,241,34,.14); }
.gh-blog .btn-lime:hover { transform: translateY(-2px); box-shadow: 0 7px 20px rgba(176,241,34,.14); }
.gh-blog .btn-ghost { border: 1px solid rgba(255,255,255,.22); color: rgba(255,255,255,.88); background: transparent; }
.gh-blog .btn-ghost:hover { transform: translateY(-2px); background: rgba(255,255,255,.13); border-color: rgba(255,255,255,.45); }
.gh-blog .hero-panel { padding: clamp(1.5rem, 3vw, 2.25rem); border: var(--gh-glass-border); border-radius: var(--gh-radius-card); color: #FFFFFF; background: rgba(4,32,24,.92); box-shadow: 0 18px 40px -18px rgba(4,24,18,.55); -webkit-backdrop-filter: var(--gh-glass-filter); backdrop-filter: var(--gh-glass-filter); }
.gh-blog .meta-chip, .gh-blog .meta-chip-lime { display: inline-flex; align-items: center; min-height: 30px; margin-bottom: 1.1rem; padding: .3rem .65rem; border: 1px solid rgba(176,241,34,.18); border-radius: var(--gh-radius-pill); color: var(--gh-lime); background: var(--gh-accent-dim); font-size: .75rem; font-weight: 600; }
.gh-blog .intro-support { max-width: 62ch; margin-bottom: 1.2rem; color: var(--gh-on-dark-muted); font-size: var(--gh-text-body); line-height: 1.75; }
.gh-blog .intro-support:last-child { margin-bottom: 0; }
.gh-blog .hero-author { display: grid; grid-template-columns: 48px minmax(0, 1fr); gap: .85rem; align-items: center; margin-top: 1.35rem; padding-top: 1.25rem; border-top: 1px solid rgba(255,255,255,.14); }
.gh-blog .hero-author-mark { display: grid; place-items: center; width: 48px; height: 48px; border: 1px solid rgba(176,241,34,.22); border-radius: var(--gh-radius-small); color: var(--gh-lime); background: var(--gh-accent-dim); font-size: .85rem; font-weight: 800; }
.gh-blog .hero-author strong { display: block; margin-bottom: .2rem; color: #FFFFFF; font-size: .92rem; }
.gh-blog .hero-author span, .gh-blog .hero-review-line { display: block; color: var(--gh-on-dark-faint); font-size: .78rem; line-height: 1.55; }
.gh-blog .hero-review-line { margin-top: .75rem; }
.gh-blog .article-nav { position: sticky; top: 0; z-index: 20; border-bottom: 1px solid rgba(29,75,54,.10); background: rgba(246,248,241,.96); box-shadow: 0 8px 30px rgba(29,75,54,.08); -webkit-backdrop-filter: blur(18px) saturate(170%); backdrop-filter: blur(18px) saturate(170%); }
.gh-blog .article-nav-inner { display: flex; align-items: center; gap: 1rem; max-width: var(--gh-container); margin: 0 auto; padding: .65rem var(--gh-inset); }
.gh-blog .article-nav-label { flex: 0 0 auto; color: var(--gh-forest); font-size: .8rem; font-weight: 800; }
.gh-blog .article-nav-list { display: flex; gap: .45rem; min-width: 0; overflow-x: auto; scrollbar-width: thin; padding-bottom: 2px; }
.gh-blog .article-nav-list a { display: inline-flex; align-items: center; min-height: 48px; flex: 0 0 auto; padding: .55rem .9rem; border: 1px solid rgba(29,75,54,.10); border-radius: var(--gh-radius-pill); color: var(--gh-forest); background: rgba(255,255,255,.72); font-size: .82rem; font-weight: 700; text-decoration: none; transition: transform 200ms ease, border-color 200ms ease, background-color 200ms ease; }
.gh-blog .article-nav-list a:hover { transform: translateY(-2px); border-color: rgba(29,75,54,.22); background: #FFFFFF; }
.gh-blog .article-section { position: relative; padding: var(--gh-section-space) 0; scroll-margin-top: 76px; }
.gh-blog .section-ivory { background: linear-gradient(180deg, #fffdf1 0%, #f6f8f1 52%, #edf2e2 100%); }
.gh-blog .section-forest { background: linear-gradient(178deg, #12342A 0%, #0F2E25 100%); color: #FFFFFF; }
.gh-blog .section-inner { width: min(100%, var(--gh-container)); margin: 0 auto; padding: 0 var(--gh-inset); }
.gh-blog .section-anchor { position: absolute; width: 1px; height: 1px; overflow: hidden; border: 0; margin: 0; padding: 0; }
.gh-blog h2 { max-width: 22ch; margin-bottom: 1.35rem; color: var(--gh-forest); font-size: var(--gh-text-h2); }
.gh-blog h2::after { content: ""; display: block; width: clamp(3.5rem, 8vw, 6rem); height: 5px; margin-top: 1rem; border-radius: var(--gh-radius-pill); background: var(--gh-mint); }
.gh-blog h3 { max-width: 34ch; margin: 2.6rem 0 .85rem; color: var(--gh-forest); font-size: var(--gh-text-h3); letter-spacing: -.01em; }
.gh-blog p { max-width: 78ch; margin-bottom: 1.3rem; color: var(--gh-text); font-size: var(--gh-text-body); line-height: 1.78; }
.gh-blog .section-lead { max-width: 68ch; margin-bottom: 1.8rem; color: var(--gh-forest); font-size: var(--gh-text-body-lg); font-weight: 600; line-height: 1.7; }
.gh-blog strong { font-weight: 800; }
.gh-blog a { color: var(--gh-forest); font-weight: 700; text-decoration-color: rgba(29,75,54,.34); text-underline-offset: .18em; transition: color 200ms ease, text-decoration-color 200ms ease; }
.gh-blog a:hover { color: var(--gh-forest-hover); text-decoration-color: var(--gh-forest-hover); }
.gh-blog .section-forest h2, .gh-blog .section-forest h3 { color: #FFFFFF; }
.gh-blog .section-forest h2::after { background: var(--gh-lime); }
.gh-blog .section-forest p { color: var(--gh-on-dark-muted); }
.gh-blog .section-forest .section-lead { color: #FFFFFF; }
.gh-blog .section-forest a { color: #FFFFFF; text-decoration-color: rgba(176,241,34,.58); }
.gh-blog .section-forest a:hover { text-decoration-color: var(--gh-lime); }
.gh-blog .alert-green, .gh-blog .alert-warn { position: relative; max-width: 92ch; margin: 2rem 0; padding: clamp(1.25rem, 2.5vw, 1.75rem) clamp(1.25rem, 3vw, 2rem) clamp(1.25rem, 2.5vw, 1.75rem) clamp(1.65rem, 4vw, 2.6rem); overflow: hidden; border: 1px solid rgba(29,75,54,.14); border-radius: var(--gh-radius-small); color: var(--gh-forest); background: rgba(29,75,54,.06); box-shadow: var(--gh-shadow-card); font-size: var(--gh-text-body); line-height: 1.68; }
.gh-blog .alert-green::before, .gh-blog .alert-warn::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 6px; background: var(--gh-mint); }
.gh-blog .alert-warn { background: var(--gh-accent-dim); border-color: rgba(176,241,34,.28); }
.gh-blog .alert-warn::before { background: var(--gh-lime); }
.gh-blog .alert-green strong, .gh-blog .alert-warn strong { display: block; margin-bottom: .4rem; }
.gh-blog .section-forest .alert-green, .gh-blog .section-forest .alert-warn { color: #FFFFFF; background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.18); }
.gh-blog .section-forest .alert-green::before, .gh-blog .section-forest .alert-warn::before { background: var(--gh-lime); }
.gh-blog .check-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .8rem; margin: 1.5rem 0 2rem; padding: 0; list-style: none; }
.gh-blog .check-list li { position: relative; min-height: 58px; padding: 1rem 1rem 1rem 3.25rem; border: 1px solid rgba(29,75,54,.10); border-radius: var(--gh-radius-small); color: var(--gh-text); background: linear-gradient(172deg, #ffffff 0%, #fbfcf8 100%); box-shadow: var(--gh-shadow-card); font-size: var(--gh-text-body); line-height: 1.52; }
.gh-blog .check-list li::before { content: "✓"; position: absolute; top: .92rem; left: 1rem; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: var(--gh-radius-pill); color: var(--gh-forest); background: rgba(143,176,33,.16); font-weight: 800; }
.gh-blog .section-forest .check-list li { border: var(--gh-glass-border); color: var(--gh-on-dark-muted); background: rgba(4,32,24,.92); box-shadow: 0 18px 40px -18px rgba(4,24,18,.55); -webkit-backdrop-filter: var(--gh-glass-filter); backdrop-filter: var(--gh-glass-filter); }
.gh-blog .section-forest .check-list li::before { color: var(--gh-lime); background: var(--gh-accent-dim); }
.gh-blog .institution-bar { display: flex; flex-wrap: wrap; gap: .7rem; margin: 1.4rem 0 2.25rem; }
.gh-blog .inst-link { display: inline-flex; align-items: center; gap: .55rem; min-height: 48px; padding: .7rem 1rem; border: 1px solid rgba(29,75,54,.10); border-radius: var(--gh-radius-pill); color: var(--gh-forest); background: rgba(29,75,54,.06); font-size: var(--gh-text-meta); font-weight: 700; text-decoration: none; transition: transform 200ms ease, background-color 200ms ease, border-color 200ms ease; }
.gh-blog .inst-link::before { content: ""; width: 8px; height: 8px; flex: 0 0 auto; border-radius: var(--gh-radius-pill); background: var(--gh-mint); }
.gh-blog .inst-link:hover { transform: translateY(-2px); background: rgba(143,176,33,.14); border-color: rgba(29,75,54,.22); }
.gh-blog .section-forest .inst-link { border-color: rgba(176,241,34,.18); color: #FFFFFF; background: var(--gh-accent-dim); }
.gh-blog .section-forest .inst-link:hover { border-color: rgba(176,241,34,.42); color: #FFFFFF; background: rgba(176,241,34,.16); }
.gh-blog .section-forest .inst-link::before { background: var(--gh-lime); }
.gh-blog .faq-section { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; margin: 1.9rem 0 2.25rem; }
.gh-blog .faq-item { align-self: start; overflow: hidden; border: 1px solid rgba(29,75,54,.10); border-radius: var(--gh-radius-card); background: linear-gradient(172deg, #ffffff 0%, #fbfcf8 100%); box-shadow: var(--gh-shadow-card); }
.gh-blog .faq-wide { grid-column: 1 / -1; }
.gh-blog .faq-q { position: relative; min-height: 64px; padding: 1.2rem 3.2rem 1.2rem 1.3rem; color: var(--gh-forest); font-size: 1.02rem; font-weight: 800; line-height: 1.45; cursor: pointer; list-style: none; }
.gh-blog .faq-q::-webkit-details-marker { display: none; }
.gh-blog .faq-q::after { content: "+"; position: absolute; top: 50%; right: 1.25rem; display: grid; place-items: center; width: 28px; height: 28px; transform: translateY(-50%); border-radius: var(--gh-radius-pill); color: var(--gh-forest); background: rgba(143,176,33,.16); font-size: 1.2rem; line-height: 1; }
.gh-blog .faq-item[open] .faq-q { border-bottom: 1px solid rgba(29,75,54,.10); }
.gh-blog .faq-item[open] .faq-q::after { content: "−"; }
.gh-blog .faq-a { padding: 1.15rem 1.3rem .15rem; }
.gh-blog .faq-a p { margin-bottom: 1.05rem; }
.gh-blog .section-forest .faq-q { color: #FFFFFF; }
.gh-blog .section-forest .faq-q::after { color: var(--gh-lime); background: var(--gh-accent-dim); }
.gh-blog .section-forest .faq-item[open] .faq-q { border-bottom-color: rgba(176,241,34,.18); }
.gh-blog .section-forest .faq-item { border: var(--gh-glass-border); color: #FFFFFF; background: rgba(4,32,24,.92); box-shadow: 0 18px 40px -18px rgba(4,24,18,.55); -webkit-backdrop-filter: var(--gh-glass-filter); backdrop-filter: var(--gh-glass-filter); }
.gh-blog .cite-note { max-width: 92ch; margin-top: -.55rem; color: var(--gh-muted); font-size: .82rem; font-style: italic; line-height: 1.58; }
.gh-blog .section-forest .cite-note { color: var(--gh-on-dark-faint); }
.gh-blog .disclaimer { position: relative; margin-top: 2rem; padding: clamp(1.4rem, 2.5vw, 1.9rem); border: 1px solid rgba(176,241,34,.18); border-radius: var(--gh-radius-small); color: var(--gh-on-dark-muted); background: rgba(4,32,24,.92); box-shadow: 0 18px 40px -18px rgba(4,24,18,.55); font-size: .9rem; line-height: 1.68; }
.gh-blog .disclaimer::before { content: ""; display: block; width: 46px; height: 5px; margin-bottom: 1rem; border-radius: var(--gh-radius-pill); background: var(--gh-lime); }
.gh-blog .disclaimer strong { display: block; margin-bottom: .45rem; color: #FFFFFF; font-size: 1rem; }
.gh-blog .cta-box { position: relative; overflow: hidden; margin: 2.25rem 0; padding: clamp(1.7rem, 4vw, 2.7rem); border: 1px solid rgba(176,241,34,.22); border-radius: var(--gh-radius-card); color: #FFFFFF; background: linear-gradient(178deg, #12342A 0%, #0F2E25 100%); box-shadow: var(--gh-shadow-elevated); }
.gh-blog .cta-box h3 { position: relative; z-index: 1; max-width: 26ch; margin: 0 0 .75rem; color: #FFFFFF; }
.gh-blog .cta-box p { position: relative; z-index: 1; max-width: 62ch; color: var(--gh-on-dark-muted); }
.gh-blog .cta-btns { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 1.35rem; }
.gh-blog .btn-primary, .gh-blog .btn-secondary { display: inline-flex; align-items: center; justify-content: center; min-height: 52px; padding: 0 1.45rem; border-radius: var(--gh-radius-pill); font-size: .92rem; font-weight: 800; text-decoration: none; transition: transform 200ms ease, background-color 200ms ease, border-color 200ms ease; }
.gh-blog .btn-primary { border: 0; color: #0a1f14; background: var(--gh-lime); }
.gh-blog .btn-secondary { border: 1px solid rgba(255,255,255,.22); color: #FFFFFF; background: transparent; }
.gh-blog .btn-primary:hover, .gh-blog .btn-secondary:hover { transform: translateY(-2px); }
.gh-blog .btn-secondary:hover { border-color: rgba(255,255,255,.45); background: rgba(255,255,255,.10); }
.gh-blog .related { margin-top: 2.6rem; padding-top: 2rem; border-top: 1px solid rgba(29,75,54,.12); }
.gh-blog .related h2 { max-width: none; margin-bottom: 1.25rem; font-size: var(--gh-text-h3); }
.gh-blog .related h2::after { width: 3.5rem; height: 4px; margin-top: .7rem; }
.gh-blog .related-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
.gh-blog .related-card { min-height: 100%; padding: 1.25rem; border: 1px solid rgba(29,75,54,.10); border-radius: var(--gh-radius-card); color: var(--gh-text); background: linear-gradient(172deg, #ffffff 0%, #fbfcf8 100%); box-shadow: var(--gh-shadow-card); text-decoration: none; transition: transform 250ms ease, border-color 250ms ease, box-shadow 250ms ease; }
.gh-blog .related-card:hover { transform: translateY(-3px); border-color: rgba(29,75,54,.22); box-shadow: var(--gh-shadow-hover); }
.gh-blog .rc-tag { display: inline-flex; min-height: 28px; align-items: center; margin-bottom: .8rem; padding: .28rem .62rem; border: 1px solid rgba(29,75,54,.10); border-radius: var(--gh-radius-pill); color: var(--gh-forest); background: rgba(29,75,54,.06); font-size: .72rem; font-weight: 700; }
.gh-blog .rc-title { color: var(--gh-forest); font-size: 1rem; font-weight: 800; line-height: 1.45; }
.gh-blog .section-ivory .disclaimer { border: 1px solid rgba(29,75,54,.12); color: var(--gh-text); background: linear-gradient(172deg, #ffffff 0%, #fbfcf8 100%); box-shadow: var(--gh-shadow-card); }
.gh-blog .section-ivory .disclaimer::before { background: var(--gh-mint); }
.gh-blog .section-ivory .disclaimer strong { color: var(--gh-forest); }
@media (max-width: 1050px) { .gh-blog .article-intro { grid-template-columns: 1fr; } .gh-blog .hero-panel { max-width: 760px; } }
@media (max-width: 900px) { .gh-blog .related-grid { grid-template-columns: 1fr; } }
@media (max-width: 760px) {
  .gh-blog .article-intro { padding-top: 4rem; padding-bottom: 4rem; }
  .gh-blog h1 { max-width: 14ch; }
  .gh-blog .article-nav-inner { align-items: flex-start; flex-direction: column; gap: .35rem; }
  .gh-blog .article-nav-list { width: 100%; }
  .gh-blog .check-list, .gh-blog .faq-section { grid-template-columns: 1fr; }
  .gh-blog .faq-wide { grid-column: auto; }
  .gh-blog .hero-brandline { align-items: flex-start; flex-direction: column; }
}
@media (max-width: 520px) {
  .gh-blog .hero-actions { flex-direction: column; }
  .gh-blog .btn-lime, .gh-blog .btn-ghost { width: 100%; }
  .gh-blog .article-nav-label { display: none; }
  .gh-blog .article-nav-inner { padding-top: .45rem; padding-bottom: .45rem; }
  .gh-blog .cta-btns { flex-direction: column; }
  .gh-blog .btn-primary, .gh-blog .btn-secondary { width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .gh-blog .btn-lime, .gh-blog .btn-ghost, .gh-blog .article-nav-list a, .gh-blog .inst-link { transform: none !important; transition: none !important; }
}
@media (pointer: coarse) {
  .gh-blog .hero-panel, .gh-blog .section-forest .faq-item { -webkit-backdrop-filter: none; backdrop-filter: none; background: #0F2E25; }
}
@supports not (backdrop-filter: blur(1px)) {
  .gh-blog .hero-panel, .gh-blog .section-forest .faq-item { -webkit-backdrop-filter: none; backdrop-filter: none; background: #0F2E25; }
}
</style>`;

const AUTHOR_LINE = `<div class="hero-author"><div aria-hidden="true" class="hero-author-mark">TF</div><div><strong>Dr Tiago Miguel Figueira</strong><span>IMC 523449 · Clinical Director, Global Health</span></div></div>`;

const DISCLAIMER_FOOTER = (topic: string) => `<div class="disclaimer"><strong>Medical Disclaimer</strong>Written by Dr Tiago Miguel Figueira (IMC 523449), Clinical Director at Global Health. This article is for general informational and educational purposes only and does not constitute personalised medical advice${topic}. If you are experiencing a medical emergency, call 999 or 112 immediately or attend your nearest Emergency Department.</div>`;

const RELATED_BLOCK = `<nav aria-label="Related articles" class="related"><h2>Related articles</h2><div class="related-grid"><a class="related-card" href="https://www.myglobalhealth.online/post/diabetes-a-silent-disease"><div class="rc-tag">Endocrinology</div><div class="rc-title">Diabetes in Ireland: Causes, Symptoms and Treatment</div></a><a class="related-card" href="https://www.myglobalhealth.online/post/global-health-your-one-stop-solution-for-quality-healthcare"><div class="rc-tag">General Practice</div><div class="rc-title">Global Health: Online Medical Consultations Across Europe and Brazil</div></a><a class="related-card" href="https://www.myglobalhealth.online/blog/categories/general-practice"><div class="rc-tag">General Practice</div><div class="rc-title">Browse all General Practice articles</div></a></div></nav>`;

// ---------------------------------------------------------------------------
// Article 1 — when-to-see-a-gp-online-vs-in-person
// ---------------------------------------------------------------------------
const gpTriageBody = `${STYLE}<main class="gh-blog" lang="en-IE"><header class="article-intro"><div class="hero-copy"><div class="hero-brandline"><strong>Global Health</strong> · Medicine Anytime, Anywhere <a href="https://www.myglobalhealth.online/blog/categories/general-practice">General Practice</a></div><span class="eyebrow">Ireland · Clinical guide</span><h1>Online GP or In Person?</h1><p class="hero-deck">A symptom-based guide to telehealth, in-person GP care and emergency services.</p><p class="intro-lead">Telehealth has made seeing a doctor faster and more convenient than ever — but it is not the right choice for every symptom. Choosing the wrong care pathway can delay a diagnosis that needs to be made in person, or can mean an unnecessary trip to a busy Emergency Department for something that could have been resolved from home in fifteen minutes. This guide sets out, symptom by symptom, when an online consultation is appropriate, when you need to be examined in person, and when you should call 999/112 or go straight to the Emergency Department.</p><div class="hero-facts"><span class="hero-fact">Evidence-based</span><span class="hero-fact">Aligned with HSE and NHS guidance</span></div><div class="hero-actions"><a class="btn-lime" href="#overview">Explore the guide</a><a class="btn-ghost" href="#emergency">Emergency signs</a></div></div><aside aria-label="Article overview" class="hero-panel"><span class="meta-chip meta-chip-lime">Clinical overview</span><p class="intro-support">Telehealth is best suited to symptom review, medication management, sick certificates, follow-up care and conditions that don't require a physical examination or urgent diagnostic testing. In-person and emergency care remain essential wherever a hands-on examination, immediate testing or immediate treatment is needed.</p>${AUTHOR_LINE}<span class="hero-review-line">General information based on HSE, NHS and WHO telehealth guidance.</span></aside></header><nav aria-label="Article sections" class="article-nav"><div class="article-nav-inner"><span class="article-nav-label">In this guide</span><div class="article-nav-list"><a href="#overview">Why the Choice Matters</a><a href="#online">When Online Care Is Appropriate</a><a href="#inperson">When You Need to Be Seen in Person</a><a href="#emergency">Emergency Warning Signs — Call 999/112</a><a href="#children">Special Considerations for Children</a><a href="#howitworks">How an Online GP Consultation Works</a><a href="#institutions">Key Resources</a><a href="#faq">Frequently Asked Questions</a></div></div></nav><section class="article-section section-ivory"><div class="section-inner"><hr class="section-anchor" id="overview" /><span class="eyebrow">Section 01</span><h2>Why the Choice Matters</h2><p class="section-lead">Telehealth removed the biggest barrier to getting medical advice — availability — but it did not remove the need for a physical examination in many conditions.</p><p>Since the COVID-19 pandemic, online GP consultations have become a mainstream part of care across Ireland, the UK and the EU. The <a href="https://www.who.int/news/item/09-09-2024-who-and-itu-publish-new-guidance-to-make-telehealth-services-accessible" rel="noopener noreferrer" target="_blank">World Health Organization and the International Telecommunication Union</a> have jointly published implementation guidance recognising telemedicine as "an accessible, cost-effective approach" to extending care, provided it is deployed appropriately and does not replace examination-dependent care where one is needed.</p><p>The single most useful question to ask yourself before booking an online consultation is: <strong>"Does a doctor need to physically examine me, or run an immediate test, to work out what's wrong or to treat me safely?"</strong> If the answer is no — for example, a repeat prescription, a review of symptoms you can describe accurately, or a sick certificate for an illness you've already been diagnosed with — telehealth is usually the faster, more convenient option. If the answer is yes, or you are not sure, in-person care is the safer choice.</p><div class="alert-warn"><strong>When in doubt, don't guess.</strong> If your symptoms are severe, rapidly worsening, or you are simply unsure whether they're an emergency, do not wait for an online appointment — call 999/112 or attend your nearest Emergency Department. Online triage exists to help you make this decision faster, not to delay it.</div><p>It's also worth understanding what telehealth cannot do, so expectations are set correctly before you book. An online doctor cannot listen to your lungs with a stethoscope, palpate your abdomen, take your blood pressure, look inside your ear canal, or run a rapid strep or urine dipstick test in the room — all things a physical examination provides instantly. For a large share of everyday GP consultations, none of this changes the outcome: a repeat prescription, a follow-up review, or a sick certificate for a condition you've already been diagnosed with doesn't need any of it. But for a new, undiagnosed symptom, the absence of a hands-on exam is precisely why an online GP will sometimes tell you, part-way through a video call, that you need to be seen in person instead — and that referral back to in-person care is a feature of safe telehealth, not a failure of it.</p></div></section><section class="article-section section-forest"><div class="section-inner"><hr class="section-anchor" id="online" /><span class="eyebrow">Section 02</span><h2>When Online Care Is Appropriate</h2><p class="section-lead">Telehealth suits conditions that can be assessed through a conversation, photos, and your reported symptoms and history — where no hands-on examination or urgent diagnostic is required.</p><ul class="check-list"><li>Repeat prescriptions and medication reviews for a stable, previously diagnosed condition</li><li>Sick certificates for common, self-limiting illnesses (colds, flu, gastroenteritis, migraine)</li><li>Skin conditions that can be assessed from clear photographs (rashes, mild acne, eczema flare-ups)</li><li>Cold and flu symptoms, sore throat, sinus congestion without difficulty breathing</li><li>Follow-up reviews after a previous in-person diagnosis or hospital discharge</li><li>Mild, uncomplicated urinary tract infection symptoms in adults with no fever or flank pain</li><li>Contraception queries, repeat contraceptive prescriptions and general sexual health advice</li><li>Mental health check-ins, mild-to-moderate anxiety or low mood, medication reviews</li><li>Travel health advice and general lifestyle or preventive health questions</li><li>Referral letters for blood tests, imaging or specialist review where a physical exam isn't needed first</li></ul><p>The <a href="https://www2.hse.ie/emergencies/when-to-go-to-a-gp-out-of-hours/" rel="noopener noreferrer" target="_blank">HSE's own guidance on GP out-of-hours services</a> makes a similar distinction for phone-based care: it is intended for urgent matters that can be assessed and advised on remotely, not as a substitute for a hands-on examination when one is clinically necessary. An online GP will always tell you to seek in-person or emergency care if your symptoms fall outside what can be safely assessed remotely.</p><p>One of the most common reasons people delay seeking any care at all — online or in-person — is simply not being able to get an appointment quickly enough during a working day. Telehealth removes that barrier for the conditions listed above: a video consultation can typically be booked and completed within the hour, rather than waiting days for the next in-person GP slot, which matters most for time-sensitive but low-risk situations such as a sick certificate needed before a shift, or a repeat prescription running low over a bank holiday weekend. The convenience gain is real, but it should never be the reason a genuinely examination-dependent symptom gets treated online instead of in person — convenience is a tie-breaker between two safe options, not a reason to choose an unsafe one.</p></div></section><section class="article-section section-ivory"><div class="section-inner"><hr class="section-anchor" id="inperson" /><span class="eyebrow">Section 03</span><h2>When You Need to Be Seen in Person</h2><p class="section-lead">Some conditions genuinely require hands-on examination, in-clinic diagnostics, or same-day physical assessment — no amount of description or photographs can safely replace this.</p><ul class="check-list"><li>Abdominal pain that is severe, localised, or accompanied by fever or vomiting</li><li>Chest pain, palpitations, or any new cardiac symptom</li><li>A suspected fracture, dislocation, or deep wound needing sutures</li><li>Symptoms needing a physical exam to rule out something serious (e.g. testicular pain, unexplained lumps)</li><li>Ear pain in young children where the eardrum needs to be examined</li><li>Persistent high fever, especially in infants, older adults, or the immunocompromised</li><li>Any symptom that requires blood pressure, oxygen saturation, or auscultation to assess safely</li><li>Pregnancy-related bleeding, pain, or reduced fetal movement</li><li>Eye injuries, sudden vision changes, or a red, painful eye</li><li>Symptoms that have already been assessed online and the doctor has advised an in-person review</li></ul><p>Your GP surgery, or the <a href="https://www2.hse.ie/services/find-urgent-emergency-care/" rel="noopener noreferrer" target="_blank">HSE's urgent and emergency care service finder</a>, can help you locate the right in-person option — GP surgery, GP out-of-hours service, injury unit, or Emergency Department — based on how urgent your symptoms are.</p></div></section><section class="article-section section-forest"><div class="section-inner"><hr class="section-anchor" id="emergency" /><span class="eyebrow">Section 04</span><h2>Emergency Warning Signs — Call 999/112</h2><p class="section-lead">Some symptoms are never appropriate for an online consultation, and should never wait for any appointment at all.</p><div class="alert-warn"><strong>Call 999 or 112, or go straight to your nearest Emergency Department, if you or someone else has:</strong> chest pain or pressure lasting more than a few minutes; sudden difficulty breathing or severe breathlessness; sudden weakness, numbness or drooping on one side of the face or body, or slurred speech (possible stroke — act F.A.S.T.); severe or uncontrolled bleeding; loss of consciousness or a seizure; signs of anaphylaxis (swelling of the face/throat, difficulty breathing after a known allergen exposure); a serious injury, suspected poisoning, or a suicidal crisis. The <a href="https://www2.hse.ie/emergencies/the-emergency-department-ed/" rel="noopener noreferrer" target="_blank">HSE Emergency Department guidance</a> confirms that EDs "deal with life-threatening emergencies" and exist for exactly these situations.</div><p>In the UK, the equivalent guidance from the <a href="https://www.nhs.uk/nhs-services/urgent-and-emergency-care-services/when-to-use-111/" rel="noopener noreferrer" target="_blank">NHS on when to use 111 versus 999</a> draws the same line: 999 is reserved for life-threatening emergencies, while non-urgent-but-can't-wait symptoms are triaged through 111 or an equivalent out-of-hours service, and routine care goes through your usual GP.</p></div></section><section class="article-section section-ivory"><div class="section-inner"><hr class="section-anchor" id="children" /><span class="eyebrow">Section 05</span><h2>Special Considerations for Children</h2><p class="section-lead">Children can deteriorate quickly, and their symptoms are harder to self-report accurately — err on the side of a lower threshold for in-person review.</p><p>An online consultation can be appropriate for a child with a mild cold, a stable skin rash, or a straightforward medication query. However, parents and carers should seek in-person or emergency care without delay for a baby or young child who has: a high fever that doesn't settle with paracetamol or ibuprofen, especially under 3 months old; reduced feeding, persistent vomiting, or signs of dehydration (fewer wet nappies, sunken eyes); unusual drowsiness, floppiness, or difficulty waking; a rash that doesn't fade under pressure (the "glass test"); difficulty breathing, grunting, or blue lips; or a seizure. If you are ever unsure with a child, the safer choice is always an in-person assessment or a call to 999/112.</p><div class="alert-warn"><strong>Trust your instincts.</strong> Parents and carers often notice something is "not right" before they can articulate exactly why. If that's how you feel, seek in-person care rather than waiting for an online appointment.</div></div></section><section class="article-section section-forest"><div class="section-inner"><hr class="section-anchor" id="howitworks" /><span class="eyebrow">Section 06</span><h2>How an Online GP Consultation Works</h2><p class="section-lead">A good telehealth service triages you first, so you're only offered an online appointment when it's genuinely appropriate.</p><p>At Global Health, every booking begins with a short symptom questionnaire. If your symptoms suggest you need to be seen in person or require emergency care, you're told this immediately, before any appointment is booked — an online consultation should never be a barrier that delays appropriate escalation. Where an online consultation is appropriate, an Irish Medical Council-registered GP reviews your history over video or phone, can issue prescriptions electronically to your local pharmacy, issue sick certificates where clinically appropriate, and refer you for blood tests, imaging or specialist review when needed.</p><div class="cta-box"><h3>Not sure which type of care you need?</h3><p>Global Health's online GP service triages every booking by symptom first, so you're only offered a video consultation when it's clinically appropriate — and directed to in-person or emergency care immediately when it isn't.</p><div class="cta-btns"><a class="btn-primary" href="https://www.myglobalhealth.online">Book an online GP consultation</a><a class="btn-secondary" href="https://www2.hse.ie/services/find-urgent-emergency-care/">Find in-person care near you</a></div></div></div></section><section class="article-section section-ivory"><div class="section-inner"><hr class="section-anchor" id="institutions" /><span class="eyebrow">Section 07</span><h2>Key Resources</h2><p class="section-lead">These official sources set the guidance this article is based on.</p><div class="institution-bar"><a class="inst-link" href="https://www2.hse.ie/services/find-urgent-emergency-care/" rel="noopener noreferrer" target="_blank">HSE — Find Urgent &amp; Emergency Care</a><a class="inst-link" href="https://www2.hse.ie/emergencies/when-to-go-to-a-gp-out-of-hours/" rel="noopener noreferrer" target="_blank">HSE — When to Go to a GP Out of Hours</a><a class="inst-link" href="https://www2.hse.ie/emergencies/the-emergency-department-ed/" rel="noopener noreferrer" target="_blank">HSE — The Emergency Department</a><a class="inst-link" href="https://www.nhs.uk/nhs-services/urgent-and-emergency-care-services/when-to-use-111/" rel="noopener noreferrer" target="_blank">NHS — When to Use 111</a><a class="inst-link" href="https://www.who.int/news/item/09-09-2024-who-and-itu-publish-new-guidance-to-make-telehealth-services-accessible" rel="noopener noreferrer" target="_blank">WHO/ITU — Accessible Telehealth Guidance</a></div><p class="cite-note">Source: HSE urgent and emergency care guidance; NHS 111 service guidance; WHO/ITU joint telehealth accessibility guidance (2024).</p></div></section><section class="article-section section-forest"><div class="section-inner"><hr class="section-anchor" id="faq" /><span class="eyebrow">Section 08</span><h2>Frequently Asked Questions</h2><div class="faq-section"><details class="faq-item"><summary class="faq-q">Can an online GP diagnose me as accurately as an in-person visit?</summary><div class="faq-a"><p>For many conditions — medication reviews, follow-ups, skin conditions visible on camera, and symptom-based illnesses like colds or migraines — yes. But some diagnoses depend on physical findings (listening to your chest, feeling your abdomen, checking your ears) that simply cannot be replicated remotely. A responsible online GP will always tell you when an in-person examination is needed rather than guessing.</p></div></details><details class="faq-item"><summary class="faq-q">Can an online doctor issue a sick certificate?</summary><div class="faq-a"><p>Yes, where clinically appropriate for the condition described. Sick certificates for online consultations are treated the same as those from an in-person GP visit for employment purposes in Ireland.</p></div></details><details class="faq-item"><summary class="faq-q">What should I do if I'm not sure whether my symptoms are an emergency?</summary><div class="faq-a"><p>If you're unsure, treat it as urgent: call 999/112 or attend your nearest Emergency Department. It is always safer to be assessed and told you didn't need to come in than to wait at home with something serious.</p></div></details><details class="faq-item"><summary class="faq-q">Will an online GP refer me for blood tests or imaging?</summary><div class="faq-a"><p>Yes. Online GPs can issue referrals for blood tests, imaging and specialist review in the same way an in-person GP can, without requiring you to first be examined in person, unless your specific symptoms require it.</p></div></details><details class="faq-item"><summary class="faq-q">Is online GP care suitable for children?</summary><div class="faq-a"><p>It can be, for mild, stable conditions. However, because children can deteriorate quickly and are harder to assess remotely, parents should have a lower threshold for seeking in-person or emergency care — particularly for infants under 3 months, high fevers, breathing difficulty, or reduced responsiveness.</p></div></details><details class="faq-item faq-wide"><summary class="faq-q">How quickly can I get an online GP appointment with Global Health?</summary><div class="faq-a"><p>Global Health offers online GP consultations with Irish Medical Council-registered doctors, often on the same day, from €39. Every booking starts with a short symptom triage so you're only offered a video consultation when it's the right choice — and pointed to in-person or emergency care immediately if it isn't. Book at myglobalhealth.online or email globalhealth@myglobalhealth.online.</p></div></details></div></section><div class="section-inner">${DISCLAIMER_FOOTER(
  ". Information is based on HSE, NHS and WHO/ITU telehealth guidance current as of July 2026",
)}${RELATED_BLOCK}</div></main>`;

// ---------------------------------------------------------------------------
// Article 2 — sick-certificate-ireland-employee-rights
// ---------------------------------------------------------------------------
const sickCertBody = `${STYLE}<main class="gh-blog" lang="en-IE"><header class="article-intro"><div class="hero-copy"><div class="hero-brandline"><strong>Global Health</strong> · Medicine Anytime, Anywhere <a href="https://www.myglobalhealth.online/blog/categories/general-practice">General Practice</a></div><span class="eyebrow">Ireland · Employee guide</span><h1>Sick Certificates in Ireland</h1><p class="hero-deck">What the law entitles you to, when a medical cert is required, and how online certs work.</p><p class="intro-lead">The Sick Leave Act 2022 gave Irish employees a statutory right to paid sick leave for the first time — but the rules around how many days, at what rate, and when a medical certificate is actually required are widely misunderstood. This guide sets out your current entitlement, your employer's obligations, and how a same-day online GP consultation can get you a valid medical certificate without needing to visit a clinic in person.</p><div class="hero-facts"><span class="hero-fact">Sick Leave Act 2022</span><span class="hero-fact">Aligned with WRC and DETE guidance</span></div><div class="hero-actions"><a class="btn-lime" href="#entitlement">Explore the guide</a><a class="btn-ghost" href="#certs">When you need a cert</a></div></div><aside aria-label="Article overview" class="hero-panel"><span class="meta-chip meta-chip-lime">Employment overview</span><p class="intro-support">As of 2026, employees with at least 13 weeks' continuous service are entitled to 5 statutory sick leave days per calendar year, paid at 70% of usual earnings up to €110 a day. This is separate from, and can run alongside, Illness Benefit from the Department of Social Protection and any enhanced contractual sick pay your employer offers.</p>${AUTHOR_LINE}<span class="hero-review-line">General information based on the Sick Leave Act 2022, Workplace Relations Commission guidance and DETE publications.</span></aside></header><nav aria-label="Article sections" class="article-nav"><div class="article-nav-inner"><span class="article-nav-label">In this guide</span><div class="article-nav-list"><a href="#entitlement">Your Statutory Sick Leave Entitlement</a><a href="#eligibility">Who Is Eligible</a><a href="#certs">When a Medical Certificate Is Required</a><a href="#illnessbenefit">Statutory Sick Leave vs Illness Benefit</a><a href="#employer">Employer Obligations and Disputes</a><a href="#online">How Online Medical Certificates Work</a><a href="#institutions">Key Resources</a><a href="#faq">Frequently Asked Questions</a></div></div></nav><section class="article-section section-ivory"><div class="section-inner"><hr class="section-anchor" id="entitlement" /><span class="eyebrow">Section 01</span><h2>Your Statutory Sick Leave Entitlement</h2><p class="section-lead">The Sick Leave Act 2022 introduced Ireland's first-ever statutory right to employer-paid sick leave, phased in gradually from 2023.</p><p>The Act originally planned a phased increase — 3 days in 2023, 5 days in 2024, 7 days in 2025, and 10 days in 2026. However, in April 2025 the Government confirmed that the planned increase to 7 days would not proceed, citing research from the ESRI showing the increase would disproportionately affect sectors such as retail and hospitality. As a result, the entitlement has remained at <strong>5 statutory sick leave days per calendar year</strong> since 1 January 2024, and this remains unchanged for 2026, according to the <a href="https://enterprise.gov.ie/en/news-and-events/department-news/2025/april/20250414.html" rel="noopener noreferrer" target="_blank">Department of Enterprise, Trade and Employment</a>.</p><div class="alert-warn"><strong>Key figures for 2026.</strong> 5 paid statutory sick leave days per calendar year · paid at 70% of your usual daily earnings, up to a maximum of €110 per day · unused days do not carry over and expire at the end of the calendar year · applies to employees on probation, in training, and under apprenticeship contracts.</div><p>Before 2023, Ireland was one of the few EU member states with no statutory right to paid sick leave at all — whether you were paid while out sick depended entirely on your employer's own policy or your contract of employment, and many lower-paid and part-time workers had no paid sick leave whatsoever. The Sick Leave Act 2022 changed that baseline for every employee who meets the service requirement, regardless of what their individual contract says, though a contract can always improve on the statutory minimum — it can never reduce it. If your contract is silent on sick pay, or offers less than the statutory scheme, the statutory entitlement still applies as a legal floor.</p><p class="cite-note">Source: Workplace Relations Commission (WRC) sick leave guidance; Department of Enterprise, Trade and Employment (DETE), April 2025.</p></div></section><section class="article-section section-forest"><div class="section-inner"><hr class="section-anchor" id="eligibility" /><span class="eyebrow">Section 02</span><h2>Who Is Eligible</h2><p class="section-lead">Statutory sick pay applies to almost all employees, but there is a minimum service requirement.</p><ul class="check-list"><li>You must have completed at least 13 weeks' continuous service with your current employer</li><li>You must be incapable of working due to illness or injury on a day you would ordinarily have worked</li><li>You must be certified by a registered medical practitioner as unable to work</li><li>Sick leave days can be taken consecutively or as separate single days</li><li>The entitlement applies to full-time, part-time, probationary, and apprenticeship employees alike</li></ul><p>According to the <a href="https://www.workplacerelations.ie/en/what_you_should_know/leave/sick-leave/" rel="noopener noreferrer" target="_blank">Workplace Relations Commission</a>, employees who have not yet completed 13 weeks' service are not entitled to statutory sick pay, though many employers choose to offer sick pay from day one as part of their own contractual terms — check your contract of employment or staff handbook, as many employers provide more generous terms than the statutory minimum.</p><p>The 13-week clock counts continuous service with your current employer, not your total years in the workforce — starting a new job resets it, even after decades with a previous employer. Continuous service is not broken by taking annual leave, public holidays, or approved leave such as maternity or parental leave, but a genuine gap between two separate jobs does reset the count. If you're within your first 13 weeks in a new role and become unwell, you may still have cover under your employer's own contractual sick pay policy even though the statutory scheme hasn't yet kicked in — check your contract rather than assuming you have no cover at all.</p></div></section><section class="article-section section-ivory"><div class="section-inner"><hr class="section-anchor" id="certs" /><span class="eyebrow">Section 03</span><h2>When a Medical Certificate Is Required</h2><p class="section-lead">A medical certificate from a registered medical practitioner is a legal requirement to claim statutory sick leave — it is not optional paperwork.</p><p>To avail of statutory sick pay under the Sick Leave Act 2022, you must provide your employer with a certificate from a registered medical practitioner confirming that you are unable to work due to illness or injury. Many employers also require a certificate for any absence beyond a short threshold set out in their own sick leave policy (commonly after one to three days), even for absences that don't rely on the statutory scheme — this is a matter of company policy rather than law, so check your contract or employee handbook.</p><ul class="check-list"><li>Single-day absences: many employers accept self-certification, but check your contract</li><li>Absences claiming statutory sick pay: a medical certificate is legally required regardless of length</li><li>Extended absences: your employer may request updated certificates at intervals they specify</li><li>Certified absences are paid at 70% of usual earnings up to €110/day for statutory sick leave days</li></ul><div class="alert-warn"><strong>Keep a record.</strong> Retain a copy of every medical certificate you submit, along with the dates of absence, in case of any dispute with your employer about your sick pay entitlement.</div></div></section><section class="article-section section-forest"><div class="section-inner"><hr class="section-anchor" id="illnessbenefit" /><span class="eyebrow">Section 04</span><h2>Statutory Sick Leave vs Illness Benefit</h2><p class="section-lead">These are two separate schemes, and understanding the difference matters for how much you're paid and by whom.</p><p><strong>Statutory sick leave</strong> is paid directly by your employer, for up to 5 days per year, at 70% of your usual earnings (capped at €110/day). <strong>Illness Benefit</strong> is a separate payment from the Department of Social Protection for PRSI-paying employees who are out of work due to illness, typically becoming relevant once your statutory or contractual sick pay is exhausted, or if you don't qualify for employer-paid sick leave (for example, if you have less than 13 weeks' service). Illness Benefit has its own qualifying PRSI contribution conditions and a separate certification process, generally managed through your GP and the Department of Social Protection's online certification system.</p><p>Some employers integrate the two — reducing contractual sick pay by the amount of Illness Benefit received — so check your contract of employment to understand exactly how your employer handles this overlap.</p></div></section><section class="article-section section-ivory"><div class="section-inner"><hr class="section-anchor" id="employer" /><span class="eyebrow">Section 05</span><h2>Employer Obligations and Disputes</h2><p class="section-lead">Employers cannot penalise you for taking statutory sick leave, and there is a clear complaints process if they do.</p><p>Your employer must pay statutory sick leave for eligible absences and cannot dismiss you, or treat you unfavourably, for exercising your right to take it. If you believe your employer has wrongly refused or withheld statutory sick pay, you can raise a complaint with the <a href="https://www.workplacerelations.ie/en/what_you_should_know/leave/sick-leave/" rel="noopener noreferrer" target="_blank">Workplace Relations Commission (WRC)</a>, which can investigate and adjudicate disputes over statutory entitlements, including sick leave.</p><p>In practice, most sick pay disputes come down to a disagreement over one of three things: whether the 13-week service requirement was met, whether a valid medical certificate was provided in time, or how an employer's own enhanced scheme interacts with the statutory floor. Before escalating to the WRC, it's usually faster to raise the issue directly with HR or your manager in writing, referencing the specific pay period and certificate in question — many disputes are resolved at this stage once the paperwork is checked. If that doesn't resolve things, a WRC complaint can be lodged online, and adjudication decisions are legally binding on both parties.</p></div></section><section class="article-section section-forest"><div class="section-inner"><hr class="section-anchor" id="online" /><span class="eyebrow">Section 06</span><h2>How Online Medical Certificates Work</h2><p class="section-lead">A same-day online GP consultation can issue a valid medical certificate without the need to travel to a clinic while unwell.</p><p>An online medical certificate issued by an Irish Medical Council-registered GP carries the same legal standing as one issued in person, provided the consultation was conducted appropriately for your symptoms (see our companion guide on <a href="https://www.myglobalhealth.online/post/when-to-see-a-gp-online-vs-in-person">when online care is and isn't appropriate</a>). This is particularly useful for common, self-limiting illnesses — colds, flu, migraines, gastroenteritis — where you need documentation for your employer but do not need, or are not well enough for, an in-person visit.</p><div class="cta-box"><h3>Need a sick certificate today?</h3><p>Global Health's online GP consultations are available the same day from €39, with Irish Medical Council-registered doctors who can issue a sick certificate where clinically appropriate, without you needing to leave the house.</p><div class="cta-btns"><a class="btn-primary" href="https://www.myglobalhealth.online">Book an online GP consultation</a><a class="btn-secondary" href="https://www.workplacerelations.ie/en/what_you_should_know/leave/sick-leave/">Read the WRC sick leave guidance</a></div></div></div></section><section class="article-section section-ivory"><div class="section-inner"><hr class="section-anchor" id="institutions" /><span class="eyebrow">Section 07</span><h2>Key Resources</h2><p class="section-lead">These official sources set out the entitlements described in this article.</p><div class="institution-bar"><a class="inst-link" href="https://www.workplacerelations.ie/en/what_you_should_know/leave/sick-leave/" rel="noopener noreferrer" target="_blank">Workplace Relations Commission — Sick Leave</a><a class="inst-link" href="https://enterprise.gov.ie/en/news-and-events/department-news/2025/april/20250414.html" rel="noopener noreferrer" target="_blank">DETE — Statutory Sick Leave Update (April 2025)</a></div><p class="cite-note">Source: Workplace Relations Commission sick leave guidance; Department of Enterprise, Trade and Employment, "Entitlement to statutory sick leave to remain unchanged at 5 days" (April 2025).</p></div></section><section class="article-section section-forest"><div class="section-inner"><hr class="section-anchor" id="faq" /><span class="eyebrow">Section 08</span><h2>Frequently Asked Questions</h2><div class="faq-section"><details class="faq-item"><summary class="faq-q">How many statutory sick days am I entitled to in 2026?</summary><div class="faq-a"><p>5 days per calendar year, paid at 70% of your usual daily earnings up to a maximum of €110 a day, provided you have at least 13 weeks' continuous service with your employer. This has been the entitlement since 1 January 2024 and remains unchanged for 2026.</p></div></details><details class="faq-item"><summary class="faq-q">Do I need a medical certificate for a single sick day?</summary><div class="faq-a"><p>To claim statutory sick pay, a medical certificate from a registered medical practitioner is legally required regardless of how many days you're absent. Some employers accept self-certification for very short absences as a matter of company policy — check your contract or staff handbook.</p></div></details><details class="faq-item"><summary class="faq-q">What's the difference between statutory sick pay and Illness Benefit?</summary><div class="faq-a"><p>Statutory sick pay is paid by your employer for up to 5 days a year. Illness Benefit is a separate PRSI-based payment from the Department of Social Protection, usually relevant once employer-paid sick leave is exhausted or if you don't meet the 13-week service requirement.</p></div></details><details class="faq-item"><summary class="faq-q">Can my employer refuse to pay me for a certified sick day?</summary><div class="faq-a"><p>Not if you meet the eligibility criteria — 13 weeks' service, a valid medical certificate, and an absence due to illness or injury on a day you'd normally work. If your employer wrongly withholds statutory sick pay, you can raise a complaint with the Workplace Relations Commission.</p></div></details><details class="faq-item"><summary class="faq-q">Do unused sick days carry over to the next year?</summary><div class="faq-a"><p>No. Statutory sick leave days are calculated per calendar year and any unused days expire at the end of that year — they do not roll over or accumulate.</p></div></details><details class="faq-item faq-wide"><summary class="faq-q">Can I get a sick certificate from an online GP consultation in Ireland?</summary><div class="faq-a"><p>Yes. Global Health offers same-day online GP consultations with Irish Medical Council-registered doctors from €39, who can issue a medical certificate where clinically appropriate for your symptoms — carrying the same legal standing as an in-person certificate for statutory sick leave purposes. Book at myglobalhealth.online or email globalhealth@myglobalhealth.online.</p></div></details></div></section><div class="section-inner">${DISCLAIMER_FOOTER(
  ", and does not constitute legal advice. Information is based on the Sick Leave Act 2022, Workplace Relations Commission guidance and Department of Enterprise, Trade and Employment publications current as of July 2026",
)}${RELATED_BLOCK}</div></main>`;

type DraftPost = {
  slug: string;
  title: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  category: string;
  body: string;
};

const DRAFTS: DraftPost[] = [
  {
    slug: "when-to-see-a-gp-online-vs-in-person",
    title: "Online GP or In Person? A Symptom-Based Guide to Telehealth and Emergency Care",
    excerpt:
      "A symptom-by-symptom guide to when an online GP consultation is appropriate, when you need to be examined in person, and the warning signs that mean you should call 999/112 or go to the Emergency Department.",
    seoTitle: "Online GP or In Person? When to See a Doctor Online vs In Person (2026)",
    seoDescription:
      "Evidence-based guide to choosing between telehealth, in-person GP care and emergency services in Ireland, aligned with HSE, NHS and WHO telehealth guidance.",
    category: "General Practice",
    body: gpTriageBody,
  },
  {
    slug: "sick-certificate-ireland-employee-rights",
    title: "Sick Certificates in Ireland: Your Employee Rights Under the Sick Leave Act 2022",
    excerpt:
      "What Irish employees are entitled to under the Sick Leave Act 2022 in 2026, when a medical certificate is legally required, and how a same-day online GP consultation can issue one.",
    seoTitle: "Sick Certificate Ireland: Employee Rights & Statutory Sick Pay 2026",
    seoDescription:
      "Your statutory sick leave entitlement in Ireland for 2026 (5 days, 70% pay, €110 cap), when a medical cert is required, and how online sick certs work.",
    category: "General Practice",
    body: sickCertBody,
  },
];

async function main() {
  const author = await prisma.doctor.findUnique({ where: { id: AUTHOR_DOCTOR_ID }, select: { id: true, fullName: true } });
  if (!author) throw new Error(`Author doctor ${AUTHOR_DOCTOR_ID} not found — refusing to seed with a dangling FK.`);

  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — seeding ${DRAFTS.length} DRAFT blog post(s), author: ${author.fullName} (${author.id})\n`);

  for (const draft of DRAFTS) {
    const existing = await prisma.blogPost.findFirst({
      where: { slug: draft.slug, locale: "EN", countryId: null },
      select: { id: true, status: true },
    });

    console.log(`slug: ${draft.slug}`);
    console.log(existing ? `  existing post found (id ${existing.id}, status ${existing.status}) — will upsert.` : `  no existing post — will create.`);
    console.log(`  title: ${draft.title}`);
    console.log(`  words (approx): ${draft.body.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length}`);
    console.log("");

    if (!APPLY) continue;

    await prisma.blogPost.upsert({
      where: { slug_locale_countryId: { slug: draft.slug, locale: "EN", countryId: null as unknown as string } },
      create: {
        slug: draft.slug,
        title: draft.title,
        excerpt: draft.excerpt,
        body: draft.body,
        status: "DRAFT",
        locale: "EN",
        category: draft.category,
        authorDoctorId: AUTHOR_DOCTOR_ID,
        seoTitle: draft.seoTitle,
        seoDescription: draft.seoDescription,
        publishedAt: null,
        lastReviewedAt: null,
        isActive: true,
      },
      update: {
        title: draft.title,
        excerpt: draft.excerpt,
        body: draft.body,
        category: draft.category,
        authorDoctorId: AUTHOR_DOCTOR_ID,
        seoTitle: draft.seoTitle,
        seoDescription: draft.seoDescription,
        // Deliberately do NOT touch status/publishedAt/lastReviewedAt on
        // re-run — if a reviewer already progressed the post, re-running
        // this seed must not silently revert it back to an unreviewed draft.
      },
    });
    console.log(`  upserted.\n`);
  }

  if (!APPLY) {
    console.log("Dry run only — pass --apply to write.");
    return;
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
