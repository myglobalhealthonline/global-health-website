# Phase 2 — Direction

**Aesthetic** Minimalist + health-trust. Locked at Phase 1 boundary.
**Skill** `minimalist-skill` primary; `soft-skill` consulted only for surface polish (shadows, hover states); `taste-skill` baseline rules applied throughout.
**Register** Brand (marketing surface — design IS the product).
**Scope** Public marketing site only. `app/(site)/**` and the section + card + layout components it consumes.

---

## Why this direction

The site is a multi-country telemedicine + clinic-services platform (IE, PT, ES, CZ, RO, BR). Patients arrive considering whether to trust their health to a website. Trust is built by restraint, not bravado — calm typography, a single committed brand colour (forest), generous whitespace, and zero ornament. Minimalist is the *only* defensible direction. `soft-skill` would push toward "premium-warm-agency" which reads as upsell pressure; `brutalist` and `stitch` are tonal mismatches.

The existing `globals.css` already commits to this: forest #1B4D3E primary, mint/lime accents, light mode only, fluid type via `clamp()`, forest-tinted shadows (no neutral black). The job of Phase 3 is to **apply this system consistently** — the audit found seven+ surfaces hand-rolling grid + padding instead of consuming the tokens.

---

## Product context (inlined — no PRODUCT.md run this round)

**Users** Patients across IE / PT / ES / CZ / RO / BR booking online consultations, in-person clinic visits, prescriptions, lab tests. Country + language are mandatory routing dimensions (`/{country}/{lang}/*`).

**Voice** Plain. Specific. Calm. No sales adjectives. The site never says "elevate," "seamless," "unleash," "powerful," "next-gen," or "transform your health journey." It says what the doctor will do, when, where, and what it costs.

**Anti-references** Avoid the SaaS-cream-with-purple-gradient look. Avoid pharma-corporate stock-photo-of-diverse-doctor-shaking-hands look. Avoid wellness-app pastel-blob look.

**Closest reference points (precise prose)**

- *Stripe Docs meets Bulletin Healthcare's print issues:* legible serif-adjacent display, lots of room around each block, one calm green accent, a clear sense that someone proofread every paragraph.
- *Linear's editorial discipline transplanted from dark/lavender into a sunlit forest:* aggressive negative tracking on display sizes, single accent used sparingly, surface ladders carry hierarchy without shadow theatre — but everything light, mint-cream surfaces instead of #010102 canvas.

---

## Engineering rules locked in (from taste-skill, scoped to this site)

| Rule | Applied as |
|---|---|
| Visual Density | **3** — calm > daily-app default. Generous section gaps. |
| Motion Intensity | **4** — CSS transitions only, exp ease-out curves. No motion library exists; none will be added. |
| Design Variance | **7** — asymmetric grids permitted on `lg:`, collapse to single column under 768px (`md:`). Centred hero allowed once (homepage) for trust gravity; banned everywhere else. |
| Viewport stability | All full-height surfaces use `min-h-[100dvh]`. `h-screen` banned. |
| Container | `max-w-[1280px]` (existing `--container-width`). Never `max-w-7xl` ad-hoc. |
| Cards | Single-level only. Nested cards banned. Cards live on `--color-background-soft` (mint-cream) or `--color-background-page` (white) — never on another card. |
| Cards (continued) | Use card containers ONLY when elevation communicates hierarchy. Prefer `border-t` dividers + spacing for service / specialty grids. |
| Hero rule | Asymmetric (text + media split) is the default; centred only when content is single-block (privacy, contact). |
| 3-up identical card grid | **Banned.** Replace with 2-up zig-zag, or asymmetric grid (`grid-cols-[2fr_1fr_1fr]`), or a featured-first-then-flat-grid composition. |
| Body line length | Cap at `max-w-[65ch]`. |
| Tactile feedback | Buttons + clickable cards: `active:scale-[0.98]` or `active:translate-y-[1px]`. |
| Hardware accel | Only `transform` + `opacity`. Never animate `width`, `height`, `top`, `left`. |
| Reduced motion | Every `transition-*`, `animate-*`, or hover-`translate-*` ships with a `motion-reduce:` neutral variant. Global guard is fallback, not primary. |
| Font | `Geist` (sans + mono) via `next/font/local` or `next/font/google`. Inter is banned. Default body weight 400, display 500–600. |
| Icons | `lucide-react` (already in deps). `strokeWidth={1.5}` globally. No emoji. |

---

## Tokens (canonical — finalising what `globals.css` already declares)

### Color

Source: `frontend/app/globals.css:36–82`. No additions, two clarifications.

| Token | Value | Role |
|---|---|---|
| `--color-brand-primary` | `#1B4D3E` | Forest. The single committed brand colour. CTA bg, link emphasis, focus rings. |
| `--color-brand-primary-hover` | `#143B30` | Darker forest. Hover state of primary CTA. |
| `--color-accent` | `#C8E6A0` | UI mint. Icon tiles, badges. Safe on light backgrounds. |
| `--color-accent-soft` | `rgba(200,230,160,0.30)` | Mint at 30% — outline / chip backgrounds. |
| `--color-accent-dim` | `rgba(200,230,160,0.16)` | Mint at 16% — section ribbon backgrounds. |
| `--color-brand-accent` | `#B0F122` | Marketing lime. **Use sparingly** — hero highlight, "live now" dot. Banned for body text. |
| `--color-background-page` | `#FFFFFF` | Page canvas. |
| `--color-background-soft` | `#F4F8F4` | Mint-cream surface. Section alternation. |
| `--color-background-panel` | `#EDF2ED` | Panel surface — slightly deeper than soft. Featured slots. |
| `--color-background-dark` | `#0F2E25` | Forest night. Footer + CTAFooter + admin sidebar. Marketing surface uses sparingly (one section per page max). |
| `--color-text-primary` | `#0F2E25` | Headlines. |
| `--color-text-body` | `#2D3B36` | Body. |
| `--color-text-muted` | `#5A6B64` | Captions, meta. |
| `--color-text-placeholder` | `#8A9A92` | Form placeholders. |
| `--color-border` | `#D8E0D8` | Hairline borders. |
| `--color-border-strong` | `#B8C8B8` | Focused / featured borders. |

**Strategy** Committed (one saturated forest carries ≥40% of accent surface) — not Restrained, because the brand IS the colour. Mint + lime are tinted derivatives, not a second hue. No off-palette colours allowed; semantic status colours (`--color-status-error/success/warning/info`) appear only on system messages, not in marketing composition.

### Type (Geist via next/font)

Building on existing `--text-*` clamp values + adding weight + tracking decisions taste-skill mandates. Ratio between adjacent steps ≥1.3.

| Token | clamp() | Weight | Tracking | Use |
|---|---|---|---|---|
| `--text-display` | `clamp(3rem, 7vw + 1rem, 6rem)` | 600 | `-0.04em` | Country home hero only. One per page. |
| `--text-h1` | `clamp(2.25rem, 5vw + 0.5rem, 4.25rem)` | 600 | `-0.03em` | Page heros (service pages, doctors index). |
| `--text-h2` | `clamp(1.75rem, 3.5vw + 0.4rem, 3rem)` | 600 | `-0.02em` | Section titles. |
| `--text-h3` | `clamp(1.25rem, 2vw + 0.3rem, 1.75rem)` | 500 | `-0.01em` | Card titles, sub-section headings. |
| `--text-eyebrow` | `0.8125rem` (13px fixed) | 500 | `+0.06em` (uppercase) | Section eyebrow labels. Sole positive-tracking token. |
| `--text-body-lg` | `clamp(1.05rem, 1vw + 0.6rem, 1.25rem)` | 400 | `-0.005em` | Lead paragraphs under hero. Max-w 65ch. |
| `--text-body` | `clamp(0.95rem, 0.5vw + 0.7rem, 1.05rem)` | 400 | `0` | Default body. Max-w 65ch. |
| `--text-meta` | `0.875rem` (14px fixed) | 500 | `0` | Pricing labels, metadata rows. |

**Geist** loaded via `next/font/google` (already a project pattern — `lucide-react`, `flag-icons` are CDN-free). Geist Mono reserved for one place only: appointment IDs / prescription numbers in receipts.

### Spacing

Existing `--section-padding-y` 112px is too big for mobile. Replace with token-driven clamp:

```css
--space-section: clamp(64px, 8vw, 112px);  /* section block padding */
--space-section-tight: clamp(40px, 5vw, 64px);  /* between sub-sections of one topic */
--space-stack: clamp(16px, 1.5vw, 24px);  /* between stacked blocks within a section */
--space-inset: clamp(20px, 3vw, 32px);  /* card / panel inner padding */
```

Component-level: keep `gap-4 / gap-6 / gap-8` Tailwind defaults inside grids.

### Radius

| Token | Value | Use |
|---|---|---|
| `--radius-button` | `999px` (pill) | All CTAs, eyebrow chips, status pills. Existing. |
| `--radius-card` | `20px` | Featured cards, hero panels. Existing. |
| `--radius-card-sm` | `12px` | Default cards (service tiles, doctor cards). Existing. |
| `--radius-tile` | `16px` | Icon tiles, image holders. Existing. |
| `--radius-input` | `12px` | Form inputs. *New — currently inputs default to `--radius-card-sm` which is fine; alias for clarity.* |

### Shadow

Forest-tinted, never neutral. Existing scale is correct — keeping all five:

| Token | Use |
|---|---|
| `--shadow-soft` | Subtle resting elevation on light cards. |
| `--shadow-card` | Default card resting state. |
| `--shadow-card-hover` | Card hover lift. |
| `--shadow-elevated` | Modals, dropdowns, featured doctor card. |
| `--shadow-focus` | Focus ring at 3px / 15% forest. |

---

## Three component sketches

These are the canonical patterns Phase 3 should adapt every other page toward. Implementation-ready Tailwind v4 + Next 16 RSC.

### 1) Hero (asymmetric, split, `[country]/[lang]/page.tsx`)

```tsx
// frontend/components/sections/HomeHero.tsx — sketch
export function HomeHero({
  countryName,
  doctorCount,
  ctaHref,
  liveDoctors, // [{ name, country, specialty }]
}: HomeHeroProps) {
  return (
    <section
      aria-labelledby="hero-title"
      className="
        gh-section relative overflow-hidden
        bg-[var(--color-background-page)]
      "
    >
      <div
        className="
          mx-auto max-w-[var(--container-width)]
          px-5 md:px-8
          grid gap-10 md:gap-16
          md:grid-cols-[1.2fr_1fr]
          items-end
        "
      >
        {/* Left — text. Bottom-aligned to make the eye drop to the CTA, not the middle. */}
        <div className="max-w-[55ch]">
          <p
            className="
              text-[var(--text-eyebrow)] font-medium uppercase
              tracking-[0.06em] text-[var(--color-text-muted)]
            "
          >
            Online consultations · {countryName}
          </p>
          <h1
            id="hero-title"
            className="
              mt-4 font-semibold
              text-[length:var(--text-display)]
              leading-[0.95] tracking-[-0.04em]
              text-[var(--color-text-primary)]
            "
          >
            See a doctor.
            <br />
            <span className="text-[var(--color-brand-primary)]">From wherever.</span>
          </h1>
          <p
            className="
              mt-6 text-[length:var(--text-body-lg)]
              leading-relaxed text-[var(--color-text-body)]
              max-w-[60ch]
            "
          >
            Licensed clinicians, one-form booking, no clinic queues. Pay only
            after the call.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href={ctaHref}
              className="gh-btn gh-btn-primary active:scale-[0.98] motion-reduce:active:scale-100"
            >
              Book a consultation
              <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />
            </Link>
            <Link href="/[country]/[lang]/doctors" className="gh-btn gh-btn-ghost">
              Meet our doctors
            </Link>
          </div>
        </div>

        {/* Right — live doctor strip. Replaces the "metric tile" cliché.
            Real data, four rows max, one breathing live-dot total. */}
        <aside
          aria-label="Doctors available now"
          className="
            rounded-[var(--radius-card)]
            bg-[var(--color-background-soft)]
            border border-[var(--color-border)]
            p-[var(--space-inset)]
            divide-y divide-[var(--color-border)]
          "
        >
          <header className="pb-4 flex items-center gap-2">
            <span
              className="
                relative inline-flex size-2 rounded-full
                bg-[var(--color-brand-accent)]
                motion-reduce:bg-[var(--color-brand-accent)]
              "
            >
              <span
                aria-hidden
                className="
                  absolute inline-flex size-full rounded-full
                  bg-[var(--color-brand-accent)] opacity-60
                  animate-ping motion-reduce:animate-none
                "
              />
            </span>
            <p className="text-[var(--text-eyebrow)] font-medium uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
              {doctorCount} doctors live now
            </p>
          </header>
          {liveDoctors.slice(0, 4).map((d) => (
            <Row key={d.slug} doctor={d} />
          ))}
        </aside>
      </div>
    </section>
  );
}
```

**Why** Asymmetric grid (1.2fr / 1fr) breaks the centred-hero AI default. Bottom-aligned text + top-anchored aside reads as editorial print. Live-doctor aside replaces the banned "Hero Metric Template" with real, mutable data. The lime pulse is the only motion on the entire hero — earned.

### 2) Card (service tile, used by `ServicesGrid` + `SpecialtiesGrid`)

```tsx
// frontend/components/cards/ServiceCard.tsx — sketch
type Variant = "default" | "featured";

export function ServiceCard({
  href,
  title,
  description,
  durationMinutes,
  priceLabel,
  variant = "default",
}: ServiceCardProps & { variant?: Variant }) {
  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-[var(--radius-card-sm)]",
        "border border-[var(--color-border)]",
        "p-[var(--space-inset)]",
        "transition-[transform,box-shadow,border-color]",
        "duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]",
        "hover:border-[var(--color-border-strong)]",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        "active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
        variant === "featured"
          ? "bg-[var(--color-background-soft)] md:row-span-2 md:col-span-2"
          : "bg-[var(--color-background-page)]",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <h3
          className="
            text-[length:var(--text-h3)] font-medium leading-tight
            tracking-[-0.01em] text-[var(--color-text-primary)]
          "
        >
          {title}
        </h3>
        <span className="text-[length:var(--text-meta)] font-medium text-[var(--color-text-primary)]">
          {priceLabel}
        </span>
      </div>

      <p className="mt-3 text-[length:var(--text-body)] leading-relaxed text-[var(--color-text-body)] line-clamp-3">
        {description}
      </p>

      <footer className="mt-6 flex items-center justify-between text-[length:var(--text-meta)]">
        <span className="text-[var(--color-text-muted)]">
          <Clock className="inline size-3.5 -mt-0.5 mr-1.5" strokeWidth={1.5} aria-hidden />
          {durationMinutes} min
        </span>
        <span
          className="
            inline-flex items-center gap-1
            text-[var(--color-brand-primary)] font-medium
            transition-transform duration-200
            group-hover:translate-x-1
            motion-reduce:group-hover:translate-x-0
          "
        >
          Book
          <ArrowRight className="size-3.5" strokeWidth={1.5} aria-hidden />
        </span>
      </footer>
    </Link>
  );
}
```

Grid usage (replaces the banned 3-up identical layout):

```tsx
<div className="
  grid gap-4 sm:gap-6
  grid-cols-1 sm:grid-cols-2
  lg:grid-cols-3
  lg:auto-rows-[1fr]
">
  <ServiceCard variant="featured" {...mostBookedService} />
  {otherServices.map((s) => <ServiceCard key={s.id} {...s} />)}
</div>
```

**Why** One card spans `2x2`, the rest flow in a 3-up below it. Asymmetric without being chaotic. Single-level (no nested cards). The arrow translates only on hover and only by `4px` — the entire interaction budget for the card. Featured variant uses the mint-cream surface to lift, no shadow.

### 3) CTA (primary button + ghost pair)

```tsx
// frontend/components/ui/Btn.tsx — sketch
const VARIANTS = {
  primary: "
    bg-[var(--color-brand-primary)] text-white
    hover:bg-[var(--color-brand-primary-hover)]
    shadow-[var(--shadow-soft)]
  ",
  ghost: "
    bg-transparent text-[var(--color-text-primary)]
    border border-[var(--color-border)]
    hover:border-[var(--color-border-strong)]
    hover:bg-[var(--color-background-soft)]
  ",
  inverse: "
    bg-white text-[var(--color-text-primary)]
    hover:bg-[var(--color-background-soft)]
  ",
} as const;

export function Btn({ variant = "primary", children, ...props }: BtnProps) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2",
        "rounded-[var(--radius-button)]",
        "px-5 py-3 text-[length:var(--text-meta)] font-medium",
        "transition-[background-color,border-color,transform]",
        "duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "motion-reduce:transition-none",
        "active:scale-[0.98] motion-reduce:active:scale-100",
        "focus-visible:outline-none",
        "focus-visible:shadow-[var(--shadow-focus)]",
        "disabled:opacity-50 disabled:pointer-events-none",
        VARIANTS[variant],
        props.className,
      )}
    >
      {children}
    </button>
  );
}
```

**Why** Pill radius is non-negotiable (existing `--radius-button: 999px`). Forest on hover deepens — never lightens (avoids the "pastel hover" AI tell). Active state communicates tactility with `scale-[0.98]`. Three variants cover every CTA pattern on the site; a fourth ("destructive") doesn't exist on the marketing surface and won't be added.

---

## Anti-patterns this direction forbids

The Phase 1 audit found these in the wild. They're forbidden going forward.

1. **3-up identical card grids** (`grid gap-6 sm:grid-cols-2 lg:grid-cols-3` with no variant). Use the asymmetric pattern in sketch 2.
2. **Centred hero with text over image overlay.** Use asymmetric split.
3. **Hero metric template** (giant number / small label / gradient accent). Replace with editorial structure + real data.
4. **Gradient text** via `background-clip: text`. Single solid colour. Emphasis by weight + leading colour shift only.
5. **Glassmorphism as default.** One header blur is allowed, intentional. Nothing else.
6. **Inline padding values** (`padding: "112px 0"`). Always token-driven.
7. **Hand-coded grid in `<style>` tags inside components.** Live in `globals.css`.
8. **`#000` or `#fff` literals** in component code. Every neutral tints to forest.
9. **Hover-scale on cards** (`scale-[1.05]`). Use `-translate-y-0.5` + border-strong + shadow lift.
10. **Cards inside cards.** Single level. If structure requires more depth, the inner element is a list row, not a card.
11. **Fade-on-mount of static content.** Static page content appears instantly. Only interaction-triggered transitions allowed.
12. **Stagger-spam.** The site has no list that needs to reveal one-by-one. Banned.
13. **Side-stripe borders >1px as decorative accent.**
14. **Modal as a first thought.** Booking pages already use full-page route. Modals only for: image lightbox (none on marketing currently), confirm-cancel (already correct).
15. **Inter font.** Geist.
16. **Filler verbs.** "Elevate," "seamless," "unleash," "next-gen," "transform your health" — banned. Replace with concrete language.
17. **Fake metrics.** "Trusted by 10,000+ patients" without a real source: banned.
18. **`h-screen` on heroes.** Always `min-h-[100dvh]`.
19. **Animating layout properties** (`width`, `height`, `top`, `left`). Only `transform` + `opacity`.
20. **3-equal-cards followed by 3-equal-cards followed by 3-equal-cards.** Each section needs a distinct *form* — symmetric grid, asymmetric grid, list, single-column prose, sticky-scroll narrative. No more than two adjacent sections share the same form.

---

## Moodboards (precise prose)

### Moodboard A — "Stripe Docs meets a Bulletin Healthcare print issue"

A landing page that loads at 1440px and renders at 95% legibility before any image arrives. The headline is forest-green sitting on warm white, set in a humanist sans at 84px with letters pulled in by 4%. The eyebrow above it reads "Online consultations · Ireland" in 13px medium uppercase with a hairsbreadth of positive tracking — the only place on the page where letters open up. To the right of the headline, a mint-cream panel lists four doctors who are currently online: photo, full name, country flag, specialty, the time of their next available slot. Above the panel, a single lime dot pulses once per two seconds. Nothing else on the screen moves. Scrolling down reveals a service grid where the most-booked consultation occupies the top-left and is twice the size of the others. The cards have no shadows; they sit on a mint-cream background separated from white by a 1px hairline. When the cursor enters a card, the card lifts 2px and the arrow icon glides 4px to the right. Page rhythm is sectional and unhurried — 8% of viewport height between sections — and section backgrounds alternate white / mint-cream / white / forest-night / white.

### Moodboard B — "Linear's editorial discipline transplanted from dark/lavender into sunlit forest"

A second iteration that pulls more from Linear's typographic system than Stripe's. Display sizes hit harder — 96px on the largest hero, 64px on inner page heroes — with the same brutal negative tracking. Surfaces alternate two steps: white canvas → mint-cream lifted surface → white canvas. Cards have 12px corners (Linear's pricing-card spec) and 1px borders the same colour as the surface a step down. No drop shadows on cards; only on the floating booking CTA when it sticks at the bottom on mobile. The lime accent appears exactly once per page — as the "available now" dot, or as an underline on the linked country name in the breadcrumb. Every CTA is a forest pill with 14px medium body text inside, 12px vertical / 20px horizontal padding. The lime is never used as a button colour. Section eyebrows use `+0.06em` tracking — the only place positive tracking exists in the whole system. Doctor cards run a 3:4 portrait above name, registration number, and one inline language flag. The country gate that currently dominates `/` collapses to a single 480px-tall section: country flag tiles in a 3-wide grid, no second step, language inferred from `Accept-Language` and revealed only as a footer pill ("EN · change") so it isn't a barrier.

---

## What changes vs. the existing `globals.css`

Six small additions / clarifications. No tokens removed.

```css
:root {
  /* New — spacing tokens that drive .gh-section + card insets */
  --space-section: clamp(64px, 8vw, 112px);
  --space-section-tight: clamp(40px, 5vw, 64px);
  --space-stack: clamp(16px, 1.5vw, 24px);
  --space-inset: clamp(20px, 3vw, 32px);

  /* New — eyebrow type token (currently hand-rolled per component) */
  --text-eyebrow: 0.8125rem;
  --text-meta: 0.875rem;

  /* Alias — radius for inputs (currently using card-sm) */
  --radius-input: 12px;
}

/* New utility classes — used by every section + every card grid */

.gh-section {
  padding-block: var(--space-section);
}

.gh-section-tight {
  padding-block: var(--space-section-tight);
}

.gh-card-grid {
  display: grid;
  gap: var(--space-stack);
  grid-template-columns: 1fr;
}
@media (min-width: 640px) {
  .gh-card-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1024px) {
  .gh-card-grid { grid-template-columns: repeat(3, 1fr); }
}

/* Asymmetric variant — featured card spans 2x2 on lg */
.gh-card-grid--featured {
  /* used together with .gh-card-grid */
}
@media (min-width: 1024px) {
  .gh-card-grid--featured > :first-child {
    grid-column: span 2;
    grid-row: span 2;
  }
}

.gh-header-sticky {
  position: sticky;
  top: 0;
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  background-color: rgb(255 255 255 / 0.92);
  border-bottom: 1px solid var(--color-border);
  z-index: 40;
}
```

Stripped from components:

- `SiteFooter.tsx` inline `<style>` grid block → `.gh-footer-grid` utility (new).
- `SiteHeader.tsx` inline `backdropFilter` → `.gh-header-sticky`.
- `FinalCTA.tsx`, `CTAFooter.tsx` inline `padding: "112px 0"` → `.gh-section`.
- `HomeHero.tsx` inline `<style>` block + `@keyframes` → utility + Tailwind `animate-ping motion-reduce:animate-none`.

---

## Phase 3 ordering (locked from audit, re-confirmed)

Each row = one commit. Commit messages follow the pattern `ui(<surface>): <verb> minimalist direction, <one-liner>`.

| # | Surface | Reasoning |
|---|---|---|
| 1 | `globals.css` + Geist font wiring | Foundation. Adds the new spacing / type tokens + `.gh-section` + `.gh-card-grid`. Phase 3 reads these. |
| 2 | `components/ui/Flag.tsx` + replace 4 call sites | Tiny win. Unblocks (3). |
| 3 | `SiteHeader.tsx` | Every page. Migrate switchers to Radix `DropdownMenu`. Extract `.gh-header-sticky`. |
| 4 | `SiteFooter.tsx` | Same. Remove inline `<style>`. |
| 5 | `HomeHero.tsx` + `[country]/[lang]/page.tsx` | Highest-traffic page. Apply asymmetric hero (sketch 1). Wire `FeaturedDoctor`. Break `ServiceCatalog` symmetry. |
| 6 | `general-consultation` + `specialist-consultation` | Apply featured-card grid (sketch 2). Collapse specialty + service grids into one progressive surface. |
| 7 | `tests/page.tsx` | Fold stock state into CTA button. Strip badges. |
| 8 | `consult/[serviceSlug]/page.tsx` | Promote doctor card primary CTA. Show "next available slot" preview. |
| 9 | `blog/*` | Featured-post layout. Fix non-locale-aware `/book-online` CTA. |
| 10 | `brazil/consent/page.tsx` | Single styling system. Tighten consent block hierarchy. |
| 11 | A11y pass — `motion-reduce:` guards across `DoctorCard`, `ServiceCard`, `DoctorWall`, `HomeHero` pulse | Safety polish. |

Phase 4 (motion) addresses one signature moment — likely the live-doctor pulse + one scroll-triggered headline reveal on the country home. No motion library added.

---

## Awaiting approval

This is the lock for Phase 3. If approved as-is, me begin with commit (1) — `globals.css` additions + Geist font wiring. If anything in the tokens, sketches, or anti-pattern list needs softening or hardening before mass changes, flag it now — much cheaper than rolling it back across 11 commits.
