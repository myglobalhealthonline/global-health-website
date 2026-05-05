# Global Health Design System

## UI/UX Pro Max Pass

### Approved Color Palette
- Primary Dark: `#1B4D3E`
- Primary Dark Hover: `#143B30`
- Primary Light: `#C8E6A0`
- Background: `#FFFFFF`
- Soft Background: `#F7FBF4`
- Soft Panel: `#F9FAF8`
- Hero Overlay: `rgba(27, 77, 62, 0.65)`
- Body Text: `#333333`
- Muted Text: `#666666`
- Borders: `#E5E5E5`

### Typography Hierarchy
- Font family: `Plus Jakarta Sans`
- Hero / display: `--text-display`
- Page H1: `--text-h1`
- Section H2: `--text-h2`
- Card H3: `--text-h3`
- Body large: `--text-body-lg`
- Body: `--text-body`
- Captions / labels: `--text-body-sm`

Shared classes:
- `gh-h1`
- `gh-h2`
- `gh-h3`
- `gh-body-lg`
- `gh-body`
- `gh-body-sm`
- `gh-kicker`
- `gh-heading-eyebrow`

### Button System
- `gh-btn`: shared size, tap target, pill radius, shadow
- `gh-btn-primary`: dark green background, white text
- `gh-btn-outline`: white background, dark green text and border
- `gh-btn-soft`: soft panel treatment for low-emphasis actions
- `gh-link-arrow`: text CTA for secondary navigation

Rules:
- one obvious primary action per high-intent page
- secondary actions should orient, not compete
- hover and keyboard focus must stay visible

### Card System
- Shared base: `gh-card`
- Radius: `--radius-card`
- Border: `1px solid var(--color-border)`
- Shadow: `--shadow-soft`
- Background: `--color-brand-secondary`

Applied to:
- service cards
- doctor cards
- blog cards
- pricing cards
- health test cards
- FAQ rows
- intro/content panels

### Form UX Rules
- Use visible labels, not placeholder-only fields
- Inputs/selects/textareas use shared classes:
  - `gh-input`
  - `gh-select`
  - `gh-textarea`
- Minimum mobile-friendly field height: `48px`
- Consent/privacy helper text must stay visible near the submit action
- Forms should feel low-anxiety and clear about next steps
- No fake completion claims and no backend-dependent promises

### Mobile UX Rules
- Primary breakpoints reviewed: `320`, `390`, `768`, `1024`, `1280`, `1440`
- No horizontal scroll
- Buttons remain tap-safe
- Card grids stack cleanly
- Mobile navigation must be easy to scan in one hand
- Footer columns must collapse without losing legal discoverability

### Healthcare Trust Rules
- Emphasize:
  - secure online consultations
  - licensed clinicians
  - confidentiality
  - clear process
  - patient-first clarity
- Avoid:
  - unsupported medical claims
  - vague jargon
  - pushy CTA overload

### Navigation Preservation Rule
- Keep existing route map and nav structure
- Improve spacing, contrast, touch targets, dropdown clarity, and CTA emphasis only
- Do not hardcode country/service/doctor copy inside shared components

## Shared Tokens In Code
- `frontend/app/globals.css` is the source of truth for palette, radius, spacing, button, and form tokens
- Shared layout components consume those tokens through:
  - `Container`
  - `Section`
  - `SiteHeader`
  - `DesktopNav`
  - `MobileNav`
  - `ClinicsDropdown`
  - `SiteFooter`
  - `CTAFooter`

## Current UI Focus
- calmer healthcare presentation
- stronger booking clarity
- less visual clutter
- more consistent card and template hierarchy
- better mobile tap/readability on high-intent pages

## Final Frontend Polish Notes
- Shared navigation stays unchanged in structure; polish is limited to spacing, contrast, CTA visibility, and dropdown/menu readability.
- Public pages should feel production-ready even while backend/admin integration is still pending.
- Booking forms must be honest about current capability:
  - frontend preview only
  - no silent fake success
  - clear consent and helper text
- Placeholder imagery is acceptable only when:
  - dimensions are stable
  - layout remains professional
  - docs clearly mark the asset as temporary or approval-blocked
