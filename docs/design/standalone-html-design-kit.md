# Standalone HTML — Global Health design kit

Purpose: when generating a self-contained HTML document (email preview, one-off
landing section, PDF source, mockup) that must look like the live site, paste
the `<style>` block below into the document and follow the rules. Values are
extracted verbatim from `frontend/app/globals.css` (brand spec: Manual da
Marca) — do NOT invent new colors, radii, or shadows.

## Rules (read first)

1. **Palette is closed.** Only the five brand swatches + tints below. Forest
   `#1D4B36` is the primary; lime `#B0F122` is the loud accent (CTAs, dots,
   highlights only — never body text); mid-mint `#8FB021` for icon tiles and
   secondary accents. No blues, no purples, no gradients outside the two
   section-band gradients given.
2. **Shadows are forest-tinted**, never neutral black (`rgba(29,75,54,…)`).
3. **Buttons are pills** (`border-radius: 999px`). Primary = lime on forest
   ink; secondary on dark = ghost (white hairline). Hierarchy: lime > ghost.
4. **Cards**: light sections use the ivory card (warm white gradient + inset
   top highlight); dark sections use forest glass (translucent + blur + lime
   hairline). Radius 20px (`--radius-card`), small 12px.
5. **Sections alternate bands**: ivory band ↔ forest band. Never flat
   `#fff` page-length white; use the gradients.
6. **Type**: one family (Aptos/Segoe stack). Headlines: tight negative
   tracking (-0.02em), weight 800, fluid clamp sizes. The ONLY positive
   letter-spacing in the system is the uppercase eyebrow (+0.06em).
   Eyebrow = small uppercase lime/forest label above every section headline.
7. **Muted text on dark** is `rgba(255,255,255,.72)` (AA floor), never `.5`.
8. **Chips/badges** are pill meta-chips (12px, 600 weight, faint forest or
   lime tint).
9. Tap targets ≥ 48px; hover lifts are `translateY(-2/-3px)` with eased
   200–250ms transitions; respect `prefers-reduced-motion`.

## Drop-in `<style>` block

```html
<style>
:root {
  /* Type */
  --font-sans: "Aptos", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: "Cascadia Code", Consolas, Menlo, monospace;
  --text-display: clamp(2.5rem, 7vw + 1rem, 6rem);
  --text-h1: clamp(2.25rem, 5vw + 0.5rem, 4.25rem);
  --text-h2: clamp(1.75rem, 3.5vw + 0.4rem, 3rem);
  --text-h3: clamp(1.25rem, 2vw + 0.3rem, 1.75rem);
  --text-body-lg: clamp(1.05rem, 1vw + 0.6rem, 1.25rem);
  --text-body: clamp(0.95rem, 0.5vw + 0.7rem, 1.05rem);
  --text-eyebrow: 0.8125rem;
  --text-meta: 0.875rem;

  /* Brand (exact — Manual da Marca) */
  --color-brand-primary: #1D4B36;
  --color-brand-primary-hover: #163826;
  --color-brand-mint: #8FB021;
  --color-brand-accent: #B0F122;
  --color-accent-soft: rgba(176,241,34,0.20);
  --color-accent-dim: rgba(176,241,34,0.10);

  /* Surfaces */
  --color-background-page: #FFFFFF;
  --color-background-soft: #F6F8F1;
  --color-background-panel: #EDF2E2;
  --color-background-dark: #1D4B36;

  /* Text */
  --color-text-primary: #1D4B36;
  --color-text-body: #2D3B36;
  --color-text-muted: #6D6D6D;
  --on-dark-muted: rgba(255,255,255,0.72);
  --on-dark-faint: rgba(255,255,255,0.60);

  /* Borders */
  --color-border: #E4E7DD;
  --color-border-strong: #C3CCB5;

  /* Radius */
  --radius-card: 20px;
  --radius-card-sm: 12px;
  --radius-input: 12px;
  --radius-button: 999px;

  /* Shadows — forest-tinted */
  --shadow-card: 0 1px 3px rgba(29,75,54,0.08), 0 4px 12px rgba(29,75,54,0.04);
  --shadow-card-hover: 0 4px 12px rgba(29,75,54,0.12), 0 8px 24px rgba(29,75,54,0.08);
  --shadow-elevated: 0 8px 30px rgba(29,75,54,0.14), 0 2px 8px rgba(29,75,54,0.08);
  --shadow-focus: 0 0 0 3px rgba(29,75,54,0.28);

  /* Layout */
  --container-width: 1280px;
  --space-section: clamp(4rem, calc(2.5rem + 3vw), 7.5rem);
  --space-inset: clamp(20px, 3vw, 32px);

  /* Glass chrome */
  --gh-chrome: rgba(4,32,24,0.78);
  --gh-chrome-border: 1px solid rgba(167,243,11,0.22);
  --gh-chrome-filter: blur(18px) saturate(170%) brightness(1.05);
}

* { box-sizing: border-box; margin: 0; }
body {
  font-family: var(--font-sans);
  color: var(--color-text-body);
  background: var(--color-background-page);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3 {
  color: var(--color-text-primary);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
h1 { font-size: var(--text-h1); }
h2 { font-size: var(--text-h2); }
h3 { font-size: var(--text-h3); letter-spacing: -0.01em; }

.container { max-width: var(--container-width); margin: 0 auto; padding: 0 var(--space-inset); }
.section { padding: var(--space-section) 0; }

/* Section bands — alternate these, never flat white page-length */
.section-ivory  { background: linear-gradient(180deg, #fffdf1 0%, #f6f8f1 52%, #edf2e2 100%); }
.section-forest { background: linear-gradient(178deg, #12342A 0%, #0F2E25 100%); color: #fff; }
.section-forest h1, .section-forest h2, .section-forest h3 { color: #fff; }
.section-forest p { color: var(--on-dark-muted); }

/* Eyebrow — uppercase label above every section headline */
.eyebrow {
  display: inline-block;
  font-size: var(--text-eyebrow);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-brand-mint);
  margin-bottom: 14px;
}
.section-forest .eyebrow { color: var(--color-brand-accent); }

/* Buttons — always pills */
.btn-lime {
  display: inline-flex; align-items: center; gap: 10px;
  height: 56px; min-height: 48px; padding: 0 30px;
  border-radius: 999px; border: 0; cursor: pointer;
  background: var(--color-brand-accent); color: #0a1f14;
  font-family: inherit; font-weight: 800; font-size: 15px; letter-spacing: -0.01em;
  text-decoration: none;
  box-shadow: 0 4px 15px rgba(176,241,34,0.14);
  transition: transform 200ms cubic-bezier(0.16,1,0.3,1), box-shadow 200ms ease-out;
}
.btn-lime:hover { transform: translateY(-2px); box-shadow: 0 7px 20px rgba(176,241,34,0.14); }
.btn-lime:active { transform: translateY(0) scale(0.98); }
.btn-ghost { /* secondary, dark surfaces only */
  display: inline-flex; align-items: center; gap: 10px;
  height: 56px; padding: 0 26px;
  border-radius: 999px; cursor: pointer; background: transparent;
  border: 1px solid rgba(255,255,255,0.22); color: rgba(255,255,255,0.85);
  font-family: inherit; font-weight: 600; font-size: 15px; text-decoration: none;
  transition: background-color 200ms ease-out, border-color 200ms ease-out;
}
.btn-ghost:hover { background: rgba(255,255,255,0.13); border-color: rgba(255,255,255,0.45); }

/* Ivory card — light sections */
.card-ivory {
  background: linear-gradient(172deg, #ffffff 0%, #fbfcf8 100%);
  border: 1px solid rgba(29,75,54,0.10);
  border-radius: var(--radius-card);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.9),
    0 1px 2px rgba(16,44,34,0.05), 0 12px 32px -16px rgba(16,44,34,0.14);
  padding: var(--space-inset);
}
.card-hover { transition: transform .25s ease, box-shadow .25s, border-color .25s; }
.card-hover:hover {
  transform: translateY(-3px);
  border-color: rgba(29,75,54,0.22);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.9),
    0 2px 4px rgba(16,44,34,.06), 0 20px 44px -18px rgba(16,44,34,.20);
}

/* Forest glass card — dark sections */
.glass-forest {
  background: rgba(4,32,24,0.92);
  border: var(--gh-chrome-border);
  border-radius: var(--radius-card);
  -webkit-backdrop-filter: var(--gh-chrome-filter);
  backdrop-filter: var(--gh-chrome-filter);
  box-shadow: 0 18px 40px -18px rgba(4,24,18,0.55);
  padding: var(--space-inset);
  color: #fff;
}

/* Meta chip — price/duration/credential badges */
.meta-chip {
  display: inline-flex; align-items: center; gap: .4rem;
  padding: .3rem .65rem; border-radius: 999px;
  font-size: 12px; font-weight: 600;
  color: var(--color-text-primary);
  background: rgba(29,75,54,.06); border: 1px solid rgba(29,75,54,.10);
}
.meta-chip-lime {
  color: var(--color-brand-accent);
  background: rgba(176,241,34,0.10); border: 1px solid rgba(176,241,34,0.18);
}

/* Inputs */
.input {
  width: 100%; height: 48px; padding: 0 14px;
  font-family: inherit; font-size: var(--text-body);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-input);
  background: #fff; color: var(--color-text-body);
}
.input:focus { outline: none; border-color: var(--color-brand-primary); box-shadow: var(--shadow-focus); }

@media (prefers-reduced-motion: reduce) {
  .btn-lime, .btn-lime:hover, .card-hover, .card-hover:hover { transform: none; transition: none; }
}
/* Glass fallback (touch / no backdrop-filter) */
@media (pointer: coarse) { .glass-forest { backdrop-filter: none; -webkit-backdrop-filter: none; background: #0b2a20; } }
@supports not (backdrop-filter: blur(1px)) { .glass-forest { backdrop-filter: none; -webkit-backdrop-filter: none; background: #0b2a20; } }
</style>
```

## Section skeleton

```html
<section class="section section-ivory">
  <div class="container">
    <span class="eyebrow">Our services</span>
    <h2>Section headline here</h2>
    <p style="max-width:60ch; margin-top:16px;">Supporting copy…</p>
    <div style="margin-top:28px; display:flex; gap:14px; flex-wrap:wrap;">
      <a class="btn-lime" href="#">Book appointment</a>
    </div>
  </div>
</section>

<section class="section section-forest">
  <div class="container">
    <span class="eyebrow">Why us</span>
    <h2>Dark band headline</h2>
    <div class="glass-forest" style="margin-top:32px;">
      <span class="meta-chip meta-chip-lime">GMC registered</span>
      <h3 style="margin-top:12px;">Card title</h3>
      <p>Card body copy…</p>
      <a class="btn-ghost" href="#" style="margin-top:20px;">Learn more</a>
    </div>
  </div>
</section>
```

## Don'ts

- No blue/purple/orange, no rainbow gradients, no gradient-blob heroes.
- No neutral-black shadows, no square buttons, no border-radius other than
  20 / 12 / 999px.
- No positive letter-spacing except the eyebrow; no thin (300) weights.
- No uniform 3-col card grids for every section — vary layout per band.
- Lime is an accent: never lime body text, never lime backgrounds at 100%
  behind paragraphs.
