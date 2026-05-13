---
name: global-health-design
description: Use this skill to generate well-branded interfaces and assets for Global Health (myglobalhealth.online — a telemedicine platform offering online doctor consultations across Ireland, Portugal, Spain, Czechia, and Romania), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill first — it covers the
company context, content fundamentals (voice, tone, casing, person,
emoji usage), and visual foundations (palette, type, backgrounds,
borders, shadows, animation rules). Then explore the other available
files:

- `colors_and_type.css` — the canonical CSS variables for color, type,
  spacing, radii, and shadows. **Always `@import` this** at the top of
  any stylesheet you write for Global Health.
- `fonts/fonts.css` — webfont imports (Plus Jakarta Sans + Cormorant
  Garamond). Note: Gilroy is the **specified** brand display font but
  is not web-licensed; we substitute Plus Jakarta Sans by default. Flag
  this if the user wants pixel-perfect brand match.
- `assets/logo/` — the primary Global Health logo PNG (transparent,
  500×500). Use `filter: brightness(0) invert(1)` to render in white on
  dark surfaces.
- `assets/brand/` — reference rasters from the brand manual (mockups,
  full-color logo).
- `assets/countries/` — country menu badges used in the country picker.
- `code-reference/components/` — production TSX components. Read these
  when you need to match a specific section exactly (HomeHero,
  CountryHomeTemplate, TrustBar, CTAFooter, SiteHeader, ServiceCard, …).
- `preview/` — design-system cards demonstrating each token in use.
- `ui_kits/website/` — a complete click-through React UI kit recreating
  the marketing site (home → country home → booking modal). Use as a
  template for new full-screen mocks or to harvest specific components.

If creating visual artifacts (slides, mocks, throwaway prototypes,
etc.), copy assets out and create static HTML files for the user to
view. Reach for `ui_kits/website/Components.jsx` and `Sections.jsx` for
ready-made `Btn`, `Eyebrow`, `Chip`, `Stars`, `IconTile`, `Container`,
`Section`, `TrustBar`, `BookingCTA`, `Footer`, etc.

If working on production code, you can copy assets and read the rules
in `README.md` to become an expert in designing with this brand. The
production codebase uses Next.js 16, React 19, Tailwind CSS 4, and
Lucide for icons — but our tokens map cleanly to plain CSS variables.

If the user invokes this skill without any other guidance, ask them
what they want to build or design, ask some questions (audience,
country, language, surface — marketing page vs in-product screen vs
slide deck vs single component), and act as an expert designer who
outputs HTML artifacts _or_ production code, depending on the need.

## Hard rules

1. **Greens, not blues.** Forest deep (`#1B4D3E`) and a mint/lime
   accent are the brand. No blue-purple healthcare gradients.
2. **Tone is local-clinic, not health-tech.** Short, plain sentences.
   "Book a consultation", not "Empower your wellness journey."
3. **Eyebrow → H2 → lede** is the section header pattern. Always.
4. **Buttons are pills** (`border-radius: 999px`, `min-height: 48px`,
   sentence case, no terminal punctuation).
5. **Shadows are forest-tinted**, never neutral black. Hover lifts
   `translateY(-1px)`, never scales up.
6. **No emoji** in body or buttons. (The homepage stat-chip exception
   exists, but treat it as a one-off.)
7. **Medical-claim copy is business-owned** — leave TODO comments for
   anything clinical you can't verify.
