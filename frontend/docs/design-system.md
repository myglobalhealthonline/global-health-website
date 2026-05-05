# Global Health Design System

## Brand Direction
- Healthcare-first, trust-focused, and calm.
- Inspired by the existing site structure and journey, not pixel-cloned visuals.
- Built for country expansion: each country can override content, language, assets, doctors, services, and legal copy through adapters/data.

## Color Tokens
- Primary CTA and trust blocks: `--color-brand-primary`
- Primary hover: `--color-brand-primary-hover`
- Page background: `--color-background-page`
- Soft section background: `--color-background-soft`
- Panel/muted surfaces: `--color-background-panel`
- Primary text: `--color-text-primary`
- Secondary text: `--color-text-muted`
- Borders: `--color-border`

## Typography Scale
- Display hero: `--text-display`
- Page h1: `--text-h1`
- Section h2: `--text-h2`
- Card/row h3: `--text-h3`
- Lead/body large: `--text-body-lg`
- Body: `--text-body`
- Small meta/body: `--text-body-sm`

Shared utility classes:
- `gh-h1`, `gh-h2`, `gh-h3`
- `gh-body-lg`, `gh-body`, `gh-body-sm`
- `gh-heading-eyebrow`

## Spacing Scale
- Section vertical rhythm:
  - mobile `--section-padding-y-xs`
  - tablet `--section-padding-y-sm`
  - desktop `--section-padding-y`
- Global spacing tokens: `--space-1` to `--space-9`
- Container width: `--container-width`

## Card System
- Shared class: `gh-card`
- Standardized:
  - border: `1px solid var(--color-border)`
  - radius: `--radius-card`
  - shadow: `--shadow-soft`
  - background: `--color-brand-secondary`

Applied to service, specialist, doctor, blog, pricing, health-test, FAQ, and several content panels.

## Button System
- Base: `gh-btn`
- Variants:
  - `gh-btn-primary` (dark green pill)
  - `gh-btn-outline` (outline pill)
  - `gh-btn-soft` (soft background button)
  - `gh-link-arrow` (text link with directional affordance)

## Section System
Each major section follows:
1. optional eyebrow
2. heading
3. description
4. grid/content
5. optional CTA

This pattern is used across home, listing, blog, legal, FAQ, trust, and doctors sections.

## Responsive Rules
- Mobile-first stack behavior for all grids.
- Recommended breakpoints for checks:
  - `320`, `390`, `768`, `1024`, `1280`, `1440`
- Required outcomes:
  - no horizontal scrolling
  - readable headings at each viewport
  - CTA buttons wrap or stack cleanly
  - consistent grid/card spacing
  - stable header/footer readability

## Asset Rules
- No hotlinked Wix assets.
- No random stock imagery.
- Use local placeholders or adapter-provided assets only.
- All country imagery enters through data adapters, not shared component hardcoding.

## Country Expansion Rules
- Shared templates/components remain prop-driven only.
- Country-specific content lives in:
  - content/data adapters (`lib/content/*`)
  - locale files (`locales/*`)
  - future backend/admin APIs
- New country onboarding should reuse existing templates and pass localized props, not fork UI components.

## Browser QA Notes
- Pass date: 2026-05-05
- Routes inspected: `/`, `/home`, `/home-pt`, `/general-consultation-ie`, `/specialty-ie`, `/ireland/medical-consultation`, `/ireland-team`, `/blog`, `/post/how-online-medical-consultations-work`, `/privacy`
- Viewports checked: `320`, `390`, `768`, `1024`, `1280`, `1440`
- Regression found:
  - At `320px` on `/`, trust-signal card text could overlap/wrap poorly.
- Fix applied:
  - `TrustSignals` grid explicitly uses `grid-cols-1` baseline.
  - Trust cards were updated to maintain readable wrapping at narrow widths.
- Remaining concerns:
  - None critical from this pass; continue checking copy length growth as locale content expands.

## Healthcare UX Pass 1 Notes
- **Booking CTA rules**
  - Every key page should expose one obvious primary action (book/start consultation).
  - Secondary actions should reduce anxiety and support orientation (`Meet doctors`, `Contact clinic`, `View services`).
  - CTA labels should be patient-friendly and avoid technical wording.

- **Service card rules**
  - Each service card should help quick comparison with:
    - what it is (title + plain-language description)
    - type (`general` / `specialist`)
    - who it is for
    - estimated duration (placeholder-safe when needed)
    - starting price (placeholder-safe when needed)
    - clear next action
  - No medical claims beyond approved/source-backed content.

- **Doctor credibility rules**
  - Doctor cards should support:
    - name
    - title/specialty
    - country
    - languages
    - short bio
    - image placeholder
    - profile/contact CTA (when available)
  - Keep scanability high and text plain.

- **Mobile usability rules**
  - Validate at `320`, `390`, `768`, `1024`, `1280`, `1440`.
  - Must maintain:
    - no horizontal scrolling
    - tap-friendly CTA buttons
    - readable card content
    - stable header/footer
    - consistent section spacing

- **Data-driven country behavior reminder**
  - Shared components remain country-agnostic.
  - Country differences (services, doctors, prices, imagery, CTAs, availability) come from content adapters now and backend/admin data later.
  - Locale/static copy continues through locale files.

## Public Website QA Pass 1 Clarifications
- Avoid rendering `TODO` text in patient-facing route content.
- If final approved copy is not available, use safe neutral guidance and keep policy-sensitive details as adapter-managed pending copy.
- Keep one clear page-level primary CTA for booking or next-step action on all high-intent pages.
