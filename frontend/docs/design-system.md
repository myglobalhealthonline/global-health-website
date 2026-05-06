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

## Auth + Admin UI tokens (2026-05-06)

### Auth shell guidance

- Login uses two-column desktop structure and single-column mobile stack.
- Register/forgot/account keep card-first composition with calm healthcare tone.
- Success/error system uses bordered status blocks for better readability and trust.

### Admin shell guidance

- Admin UI is visually distinct from public site while staying on the same token system.
- Added admin-specific utility classes:
  - `gh-admin-nav-link`
  - `gh-admin-main` table typography/spacing rules
- Goal: improve table readability and quick scanning without rewriting CRUD logic.

### Palette compliance

- Maintained approved palette intent:
  - dark green primary action focus
  - light green soft contexts
  - white/soft background cards
  - neutral borders
  - muted body copy for secondary guidance

## UI/UX Polish Pass (2026-05-06)

### Status tokens added

To eliminate hardcoded Tailwind semantic colors (red, emerald, amber, rose, sky), the following tokens were added to `globals.css`:

- `--color-status-error`: #dc2626
- `--color-status-error-bg`: #fef2f2
- `--color-status-error-text`: #991b1b
- `--color-status-error-border`: #fecaca
- `--color-status-success-bg`: #f0fdf4
- `--color-status-success-text`: #166534
- `--color-status-success-border`: #bbf7d0
- `--color-status-warning-bg`: #fffbeb
- `--color-status-warning-text`: #78350f
- `--color-status-warning-border`: #fde68a
- `--color-status-info-bg`: #f0f9ff
- `--color-status-info-text`: #075985
- `--color-status-info-border`: #bae6fd

### Utility classes added

- `.gh-status-error` — bordered error alert block
- `.gh-status-success` — bordered success alert block
- `.gh-status-warning` — bordered warning alert block
- `.gh-status-info` — bordered info alert block
- `.gh-badge` — pill badge base
- `.gh-badge-error` — error badge
- `.gh-badge-success` — success badge
- `.gh-badge-warning` — warning badge
- `.gh-badge-info` — info badge
- `.gh-badge-neutral` — neutral badge
- `.gh-btn-danger` — destructive action button

### Reduced motion

Added `prefers-reduced-motion` media query to disable animations for users who need it.

### Token compliance fixes applied

- Replaced all `bg-white` hardcodes in admin dashboard with `var(--color-brand-secondary)`.
- Replaced all `text-white/72` and `text-white/82` with `text-white/90` for better contrast on dark green backgrounds.
- Removed decorative linear gradients from `DoctorCard` and `DoctorProfileTemplate`.
- Replaced hardcoded `slate-*`, `teal-*`, `white` in `PageShell` with design tokens.
- Replaced hardcoded `red-*` / `emerald-*` status colors in auth forms with token utilities.
- Replaced hardcoded `amber-*` / `emerald-*` / `rose-*` / `sky-*` in admin pages with token utilities.
- Fixed BookingForm `aria-invalid` and `aria-describedby` linking for validation errors.
- Fixed admin pagination disabled links with `tabIndex={-1}`.
- Fixed mobile nav close button focus ring.
- Fixed account page "Account settings (coming soon)" from `<Link>` to `<button disabled>`.
- Fixed `BlogCard` spacing between eyebrow and heading.


## UI/UX Pro Max Visual Rescue Pass (2026-05-06)

### Scope
Complete visual redesign of auth, admin dashboard, patient account, and design foundation. No route changes, no backend changes, no feature additions.

See also: `frontend/docs/ui-ux-pro-max-design-system.md` for the full design system specification.

### Design direction
- **Category:** Medical Clinic / Healthcare SaaS
- **Pattern:** Trust & Authority + Conversion
- **Style:** Accessible & Ethical + Minimalism with Soft UI touches

### Foundation redesigned
- `frontend/app/globals.css` completely rewritten:
  - Premium card shadows with hover lift
  - Improved button system (primary, outline, soft, danger, ghost-dark)
  - Form focus rings with brand color
  - Error focus rings with red
  - Admin table hover highlighting
  - Status badge utilities
  - Icon circle utilities
  - Dark panel utilities
  - Reduced motion support

### Auth pages completely redesigned
- **Login:** True two-column layout with dark green trust panel (secure, licensed, clear next steps) and white form card with password visibility toggle
- **Register:** Two-column with strong headline, clean form, trust panel
- **Forgot-password:** Centered card with back navigation, calm reassuring copy
- All auth pages have branded header, soft background, premium spacing

### Admin dashboard completely redesigned
- `frontend/app/(admin)/admin/page.tsx` — no longer a button list
- Dashboard hero with dark green background, admin session badge, scope disclaimers
- 9 large action cards with icon circles, titles, descriptions, hover states
- Clear scope messaging: doctors are public profiles, payments not enabled

### Admin layout redesigned
- `frontend/app/(admin)/admin/layout.tsx` — clean white header with brand + admin label
- User name/email visible
- Sticky sidebar navigation
- `gh-admin-main` restored for table styling

### Patient account redesigned
- **Account page:** Profile summary card with avatar placeholder, name, email, role badge
- Action grid: My bookings, Book consultation, Settings (disabled)
- **Bookings page:** Booking history cards with status badges, country, consultation type, notes
- Empty state with icon and CTA
- Soft background throughout

### Public pages
- Shared components (HeroSection, CountrySelector, BookingCTA) benefit from improved globals.css
- No public page routes changed

### Accessibility improvements
- `aria-invalid` + `aria-describedby` on booking form fields
- Disabled pagination links removed from tab order
- Mobile nav close button has focus ring
- Account "coming soon" is semantic disabled button
- `prefers-reduced-motion` support
- Improved contrast on dark green text overlays

### Validation results
- `pnpm lint` — pass
- `pnpm typecheck` — pass
- `pnpm build` — pass (113 pages)
- `pnpm --filter backend test` — pass (79 tests)

### Remaining visual gaps
- Official final logo still pending approval
- Approved footer CTA art still pending
- Real doctor/team imagery optional pending approval
- Some service/doctor/blog pages use safe generalized fallback copy until CMS content is finalized
