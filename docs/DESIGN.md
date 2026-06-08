# Design System: Global Health — Country Homepage

## 1. Visual Theme & Atmosphere

A European telemedicine platform serving patients who book GP and specialist consultations from their phone or laptop. The target user is a 30–50-year-old in Dublin or Lisbon at midday, deciding whether to skip the waiting room and book an online appointment instead.

**The one-sentence scene:** "A professional patient in a bright city apartment, midday light coming through a window, opening a health platform that should feel as calm and trustworthy as their bank, not as dramatic as a crypto launchpad."

**Atmosphere calibration:**
- Density: 5/10 — Balanced. Enough information to convey medical seriousness; enough space to stay calm.
- Variance: 6/10 — Offset asymmetric layouts, not rigid symmetry. The hero uses a bold left-text-right-panel split.
- Motion: 4/10 — Fluid, restrained CSS transitions. No choreography. Spring physics on cards; fade-up on hero headline.

**Core design philosophy:** The dark forest night hero is ONE deliberate dark moment — the threshold into the platform. Every subsequent section surfaces to light. The page rhythm is dark → light → soft → dark (closer). The lime accent is earned; it appears only where it carries signal (available now dot, active state, closing callout). It does not decorate.

The site is NOT a startup. It is NOT a fintech dashboard. It is NOT a dark editorial magazine. It is a calm, authoritative clinical platform that happens to be digital-first. Restraint is how it earns trust.

---

## 2. Color Palette & Roles

**Surfaces:**
- **Forest Night** (#0F2E25) — Hero section background + Final CTA background only. The two dark moments that bookend the page.
- **Warm Off-White** (#F6F8F1) — Primary section background for mid-page sections (TrustRibbon, DoctorWall, HowItWorks). Tinted slightly toward forest hue, not pure white.
- **Mint Panel** (#EDF2E2) — Alternate soft surface for FeaturedDoctor section. Warmer than off-white, reads as a breath of calm.
- **Pure Canvas** (#FFFFFF) — ServiceCatalog and StatsBand sections. High-contrast zone between soft sections.

**Brand:**
- **Forest Deep** (#1D4B36) — Primary text on light surfaces, icon fills, primary CTA button background. Authoritative brand color.
- **Bright Lime** (#B0F122) — The ONE loud accent. Used only for: available-now pulse dot, active filter pill, "24h" callout in FinalCTA, hover CTA state on service cards. Never used for decoration. Saturation is intentional — use sparingly or it loses power.
- **Mid-Mint** (#8FB021) — Secondary accent for icon tiles, non-urgent indicators. Less aggressive than lime.
- **Pastel Mint** (#C8E6A0) — Tint-level only. Background for icon bubbles, soft chip fills.

**Text (on light surfaces):**
- **Ink** (#0F2E25) — Primary text. Forest-toned near-black. Never `#000000`.
- **Body** (#2D3B36) — Body copy. Dark forest, slightly lifted.
- **Muted** (#6D6D6D) — Secondary labels, metadata, captions.
- **Ghost** (#9A9A9A) — Placeholder, disabled states.

**Text (on dark hero/CTA surface):**
- **White 85%** (rgba(255,255,255,0.85)) — Primary text on dark.
- **White 60%** (rgba(255,255,255,0.60)) — Secondary labels on dark.
- **White 28%** (rgba(255,255,255,0.28)) — Ghost/deemphasised on dark.
- **Lime** (#B0F122) — Eyebrow labels, pulse dots, callout numbers on dark surfaces.

**Borders:**
- **Light border** (#E4E7DD) — 1px structural lines on light surfaces.
- **Dark surface border** (rgba(255,255,255,0.09)) — 1px card borders on dark sections.

**Shadows (forest-tinted, never neutral gray):**
- **Card resting:** `0 1px 3px rgba(15,46,37,0.08), 0 4px 12px rgba(15,46,37,0.04)`
- **Card hover:** `0 4px 12px rgba(15,46,37,0.12), 0 8px 24px rgba(15,46,37,0.08)`

---

## 3. Typography Rules

**Font family:**
- **Display + Body:** Manrope — variable weight (400–800). Used for all headings and body copy. Geometric, modern, warm — the brand font. Inter is strictly banned.
- **Mono:** JetBrains Mono — for registration numbers, metadata codes, timestamped meta only.

**Type scale (strict token system — no hand-rolled clamps):**
- **Display** `clamp(3rem, 7vw + 1rem, 6rem)` — Used ONCE per page, for the hero h1. Maximum 6rem. Never 11rem on a health platform.
- **H1** `clamp(2.25rem, 5vw + 0.5rem, 4.25rem)` — Section lead headlines (DoctorWall h2, FinalCTA h2).
- **H2** `clamp(1.75rem, 3.5vw + 0.4rem, 3rem)` — ServiceCatalog, StatsBand section heads.
- **H3** `clamp(1.25rem, 2vw + 0.3rem, 1.75rem)` — Card titles, sub-section labels.
- **Body Large** `clamp(1.05rem, 1vw + 0.6rem, 1.25rem)` — Lead paragraph, hero lede.
- **Body** `clamp(0.95rem, 0.5vw + 0.7rem, 1.05rem)` — Regular body copy, card descriptions.
- **Meta** `0.8125rem` — Fixed. Tags, timestamps, eyebrow caps.

**Rules:**
- Tracking: All headlines use `letter-spacing: -0.035em` to -0.045em. Negative track on large type only.
- Uppercase tracking: Eyebrow labels only, `tracking-[0.18em]`, `font-size: 0.6875rem` (11px), `font-weight: 700`. Uppercase + positive tracking confined to eyebrows — never on headlines.
- Line length: Body copy max 65 characters (44ch for lede, 58ch for sections).
- Line height: Headlines `line-height: 0.95–1.05`. Body `line-height: 1.6–1.7`.
- Weight hierarchy: Display/H1 = `font-weight: 800`. H2 = 700. H3 = 600. Body = 400. Meta = 600.

**Banned:**
- Inter font.
- `font-size` values exceeding the token maximum at any viewport.
- Gradient text (`background-clip: text` with gradient). All text is solid color.
- Centered hero headlines (variance is 6/10 — force left-aligned or asymmetric).

---

## 4. Hero Section (HomeHero)

The hero is the ONE dark moment. It sets tone. Everything after it lightens.

**Layout:** Left-weighted asymmetric split on desktop. Text column left (max 720px, `grid-col: 1fr`). Availability panel right (`width: 296px`, fixed shrink-0, `grid-col: auto`). Two-column CSS grid with `clamp(32px, 4vw, 72px)` gap. On mobile: single column, panel hidden.

**Background:** Forest Night (#0F2E25). Medical cross dot texture overlay at 4% opacity (the `gh-medical-pattern-dark` texture). One lime radial bloom: `radial-gradient(ellipse 700px 500px at 105% -5%, rgba(176,241,34,0.07), transparent 50%)`. This glow is at 7% max — warmth, not spotlight. It is the ONLY glow on the entire page.

**Type column (left):**
- Eyebrow row: Country flag icon + country name in lime (#B0F122), 11px caps. Adjacent: "N available" in white/28, with a 6px lime pulse dot.
- H1 headline: `font-size: var(--text-display)` (max 6rem). `font-weight: 800`. `letter-spacing: -0.045em`. `line-height: 0.91`. White. Max 14 characters per line. Two lines ideally. Example: "See a doctor, **from anywhere.**" — accent phrase in Lime.
- Lede: `font-size: var(--text-body-lg)`. `color: rgba(255,255,255,0.75)`. Max 44ch. Relaxed line-height.
- Primary CTA: Rounded-full pill, `border: 1px solid rgba(255,255,255,0.22)`, transparent background, white text. On hover: `background: rgba(255,255,255,0.10)`. No filled lime button on dark hero — the outline reads as more premium.
- Secondary CTA: Plain text link "Browse services", white/60 color.
- Trust strip: 3 inline items below CTAs. Small lock/clock/stethoscope icons in Lime. 11px caps, white/58 text.

**Availability panel (right, desktop only):**
- Frosted glass card: `background: rgba(255,255,255,0.03)`, `border: 1px solid rgba(255,255,255,0.09)`, `border-radius: 20px`, `backdrop-filter: blur(16px)`.
- "Available now" in lime, 10px caps, with pulse dot.
- List of up to 4 doctors: Avatar bubble (initials, solid white/07 background — NO gradient), doctor name in white/85, specialty in white/62.
- Footer: Doctor count across Europe text in white/28. "Book now" outline pill button.

**What is banned in the hero:**
- Gradient avatar bubbles. Use solid rgba(255,255,255,0.07).
- Any second radial glow or decorative overlay.
- Centered text on desktop.
- "Scroll to explore" text or scroll arrows.

---

## 5. CountryMarquee Section

Immediately after the hero. This is a **thin light divider strip**, not a second dark section. It signals coverage breadth.

**Surface:** Warm Off-White (#F6F8F1). `border-top: 1px solid #E4E7DD`. `border-bottom: 1px solid #E4E7DD`. Vertical padding: 16–20px max.

**Content:** A horizontal scroll ticker of country flags + country names + doctor counts. Low opacity. Reads as a "coverage band". Font: 12px, Manrope, #6D6D6D. Each item: flag emoji/icon + Country Name + "N doctors" in a lighter tone.

**What is banned:** Dark background (#0F2E25) on this strip. Radial lime glows. Full-section treatment. This is a divider, not a feature.

---

## 6. TrustRibbon Section

Four credential items on a light surface.

**Surface:** #FFFFFF with `border-bottom: 1px solid #E4E7DD`. Generous vertical padding `clamp(40px, 5vw, 64px)`.

**Layout:** 4-column grid on desktop (`grid-cols-4`), 2-column on tablet, single column on mobile.

**Each item:** Forest-circle icon bubble (40px, `background: #F6F8F1`, `border: 1px solid #E4E7DD`, icon in `#1D4B36`). Below: Large number/value in `color: #0F2E25`, `font-size: var(--text-h2)`, `font-weight: 800`. Below: Label in 11px caps, `color: #6D6D6D`, tracking-[0.12em].

**Data:** Doctor count, European market count, "GDPR", "24h" same-day.

---

## 7. ServiceCatalog Section

Dark. This is the service browse section — it warrants the dark surface because it is the commercial heart of the page.

**Surface:** Forest Night (#0F2E25). No lime glow. The lime is reserved for the hero and FinalCTA. `padding: clamp(64px, 8vw, 120px) 0`.

**Header:** Lime eyebrow "What we treat". H2 in white. Filter pills on right: active pill = lime fill (#B0F122) + dark text (#0a1f14). Inactive pill = white/06 background + white/60 text + white/12 border.

**Card grid:** CSS grid with featured-first layout (first card 2×2 on desktop, remaining in equal columns). No gradient stripe card tops. Each card: `background: rgba(255,255,255,0.04)`, `border: 1px solid rgba(255,255,255,0.09)`, `border-radius: 20px`.

**Card top:** Icon tile (square area, 88–120px tall). Icon in lime. Small type tag (uppercase) top-right. NO gradient stripe backgrounds.

**Card body:** H3 title in white/88. Price row: "From" label + price (white/88, tabular nums) + duration. CTA pseudo-button: outline pill, on hover fills to Lime (#B0F122) with dark (#0a1f14) text.

---

## 8. StatsBand Section

Four data points. Light surface. NOT a hero-metric template.

**Surface:** #FFFFFF. `padding: clamp(48px, 6vw, 80px) 0`. `border-top: 1px solid #E4E7DD`.

**Layout:** 4 columns. NOT using the large display number as the visual anchor. Instead: editorial rows with label first, value prominent but capped at `var(--text-h2)`. Add one-line caption below value. This distinguishes it from the hero.

---

## 9. FeaturedDoctor Section

One highlighted doctor breaks the grid monotony.

**Surface:** Mint Panel (#EDF2E2). `padding: clamp(56px, 7vw, 96px) 0`.

**Layout:** Asymmetric 2-column on desktop. Portrait left (rounded-full or rounded-2xl image, max 300px). Info right: Name in `#0F2E25` extrabold. Specialty chip. Bio excerpt (3–4 lines). Primary CTA "Book with [Name]" in Forest green (#1D4B36), filled rounded-full button.

**Languages:** Small row of language tags below name.

---

## 10. DoctorWall Section

The doctor grid. LIGHT surface — this breaks the "consecutive dark sections" problem.

**Surface:** Warm Off-White (#F6F8F1). `padding: clamp(64px, 8vw, 112px) 0`.

**Section header:** Eyebrow in #1D4B36 (not lime). H2 in #0F2E25, left-aligned. Doctor count as plain text, not a 128px display number.

**Doctor cards:** White (#FFFFFF) background. `border: 1px solid #E4E7DD`. `border-radius: 20px`. `box-shadow: var(--shadow-card)`.

**Card layout:** Portrait top (1:1.1 aspect ratio, full-width, object-cover). Below: Name in #0F2E25, bold. Specialty tag chip in #EDF2E2 with #1D4B36 text. Registration row in #6D6D6D, 12px. Languages row in #6D6D6D, 12px. ONE primary CTA "Book Appointment" in Forest green filled pill. Secondary: "View profile" text link, muted.

**Filter buttons:** Token-driven, NOT inline style objects. Use Tailwind classes.

---

## 11. HowItWorksNarrative Section

Step-by-step walkthrough. Soft surface, editorial spacing.

**Surface:** #FFFFFF or #F6F8F1. Sticky illustration on desktop, intersecting-step highlight.

**Steps:** Numbered (1, 2, 3) in Forest primary, large. Each step: H3 title, body copy, no icons competing with the numbers.

---

## 12. FinalCTA Section (Closer)

The second dark moment. Bookends the page. It is earned.

**Surface:** Forest Night (#0F2E25). Medical cross dot texture. One lime radial bloom top-right at 10% max opacity. This is the ONLY other place lime appears as a glow.

**Layout:** Asymmetric 2-column. Left: "Tomorrow, not next month" eyebrow in lime. "24h" in `var(--text-display)` (6rem max), lime, tabular-nums. "Average to first slot" in white/55 caps. Right: H2 in white, body lede in white/75. Two CTA buttons: Ghost outline primary ("Book a consultation"), secondary border pill ("Talk to our team"). Three trust icons below (Stethoscope, ShieldCheck, Clock) in lime.

---

## 13. Layout Principles

- CSS Grid for all multi-column layouts. No `calc()` percentage hacks or `flex-basis` math.
- Max-width container: `--container-width` (1400px). Centered.
- Section padding: `clamp(64px, 8vw, 120px)` vertical. Never fixed pixel padding for sections.
- No overlapping elements. No `position: absolute` stacking text on text.
- Hero uses `min-height: calc(100svh - var(--header-height))`. Never `h-screen` (iOS Safari viewport jump).
- Mobile-first: all multi-column grids collapse to single column below 768px.
- Section rhythm (top to bottom): Dark → Light → Light → Dark → Soft → Light → Soft → Light → Dark. Maximum 2 adjacent dark sections on any page.

---

## 14. Component Stylings

**Primary CTA Button (on light surfaces):**
Forest green (#1D4B36) fill. White text. `border-radius: 999px`. `padding: 14px 32px`. On hover: `background: #163826` (darker forest). No outer glow. Active state: -1px translate-y. `transition: background 200ms, transform 150ms`.

**Primary CTA Button (on dark surfaces):**
Outline pill: `border: 1px solid rgba(255,255,255,0.22)`, transparent fill, white text. On hover: `background: rgba(255,255,255,0.10)`. No lime-filled CTA on dark hero — outline is more premium.

**Service Card hover CTA:** Outline pill fills to Lime (#B0F122) on hover. Text changes to dark forest (#0a1f14). Arrow icon translates +0.5px. No outer glow shadow.

**Doctor Cards:** White fill. 1px #E4E7DD border. 20px radius. Forest-tinted shadow at rest. Shadow lifts on hover. No hover scale — only shadow depth change.

**Filter Pills:** Active = Lime fill (#B0F122), dark text. Inactive = white/06 bg + white/60 text on dark; #F6F8F1 bg + #6D6D6D text on light.

**Skeleton Loaders:** Match exact layout dimensions of the content they replace. No circular spinners.

**Pulse dot:** 6px circle. `background: #B0F122`. `animation: pulse 2s ease-in-out infinite`. CSS keyframe: `opacity 0.5 → 1 → 0.5`, `scale 0.85 → 1 → 0.85`. Hardware-accelerated (`transform` + `opacity` only).

---

## 15. Motion & Interaction

- **Spring physics feel:** CSS transitions with `cubic-bezier(0.16, 1, 0.3, 1)` — weighted, organic, premium.
- **Hero headline entrance:** Single `fade + translateY(12px → 0)`, 500ms, `cubic-bezier(0.16,1,0.3,1)`. Instant with `prefers-reduced-motion`.
- **Section cards:** No stagger animation unless content is server-rendered and visible. Cards are static at mount.
- **Hover transitions:** 200–300ms on all interactive elements. Only `transform` and `opacity` — never `height`, `width`, `top`, `background-size`.
- **Pulse dot:** Infinite loop at 2s. Only the available-now indicator uses a perpetual animation.
- **No:** Framer Motion. No GSAP. CSS and Web Animations API only.

---

## 16. Anti-Patterns (Banned)

### Hard bans — never write these:
- Lime radial glow on ANY section other than HomeHero and FinalCTA.
- Dark forest night background (#0F2E25) on more than 2 sections per page.
- `font-size` exceeding `var(--text-display)` max (6rem / 96px) at any viewport.
- Gradient text (`background-clip: text` + gradient background). Solid colors only.
- Gradient avatar bubble backgrounds. Initials in solid rgba(255,255,255,0.07).
- Gradient stripe card tops in ServiceCatalog. Icon tiles only.
- Three CTA buttons on a single DoctorCard. One primary + one muted secondary maximum.
- Identical card grids (all same size). Use featured-first, zigzag, or size variety.
- `Inter` font anywhere.
- Pure `#000000` or `#FFFFFF` — use tinted near-black (#0F2E25) and warm off-white (#F6F8F1).
- Inline `style={}` objects for design values — use CSS custom properties or Tailwind classes.
- `h-screen` — use `min-h-[100svh]` or `min-h-[calc(100svh-var(--header-height))]`.
- Scroll arrows, bouncing chevrons, "Scroll to explore" copy.
- Custom mouse cursors.
- Neon/outer glow box-shadows.
- Glassmorphism used decoratively — the hero availability panel is the one purposeful use.
- AI copywriting words: "Elevate", "Seamless", "Unleash", "Next-Gen", "Revolutionize".
- Fake round stats: "99.99%", "50,000+" when real data is available.
- Generic names: "John Doe", "Dr. Smith", "Acme Medical".
- Emojis anywhere in the UI.
- Broken Unsplash image URLs — use `picsum.photos` or real assets.
- Section counts exceeding the budget: max 1 eyebrow per section, max 1 H2 per section.
- Centered hero headlines on desktop (variance > 4 — use left-aligned or asymmetric split).
