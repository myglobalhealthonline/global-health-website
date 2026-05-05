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
