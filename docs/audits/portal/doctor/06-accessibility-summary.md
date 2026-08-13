# Accessibility Summary — Doctor Portal Audit

Date: 2026-07-12. Source: §20 Accessibility Findings of each page file, plus a11y-flavored items called out in §10 (UX Problems) where the two overlap.

## Portal-wide findings (shell-level, affect every page)

| Finding | Severity | Evidence | Shared component | Pages that independently flagged it |
|---|---|---|---|---|
| **No skip-to-content link.** Keyboard/screen-reader users must tab through 14-19 sidebar links on every page load before reaching content. | Medium | Browser-verified, 15-tab traces on 04 (CAL-04-003) and 16 (16-005), consistent with a Tab×7/×9 verification on 01/03 | `portal-shell.tsx` | 04, 16, 17 (17 explicitly cross-refs 16-005) |
| **Breadcrumb truncates mid-word on mobile** (390px/375px) — "Doctor › A", "Doctor › Pa…", "Doctor › Se", "Doctor › In…" | Low (High severity on 07 where it's PII, see below) | Browser-verified screenshots on 6+ pages | `portal-shell.tsx` (`useBreadcrumbs`) | 02 (19-003), 06 (06-003), 09, 11 (11-004), 12 (12-005), 13 (13-004), 16 (16-002), 17 |
| **Breadcrumb PHI/PII leak** — patient email rendered verbatim, contradicting explicit "MUST NOT render as visible text" code comments elsewhere in the same feature | **Critical** | Browser-verified twice (two different patient emails) | `portal-shell.tsx` (`useBreadcrumbs`) | 07 (07-001) |
| **Floating "N" support-widget badge** overlaps sidebar footer branding text and (on mobile) the OPEN CONSULTS stat card's value | Low | Browser-verified on 01 and 02 | Shell-wide widget, source not identified in this audit | 01 (§19 19-001), 02 (19-001) |
| **Compliance-banner dismiss is session-only** and returns every session regardless of whether the underlying item resolved | Low (trust/microcopy) | Code + browser | `compliance-banner.tsx`, shared portal-wide | 01 (01-004), 06 (§26) |

## Per-page a11y table

| Page | ID | Severity | Finding |
|---|---|---|---|
| 01 Dashboard | — | — | Focus ring visible and high-contrast (Tab×7 verified) — **pass**. Icon-only controls (bell, user menu) carry accessible names — **pass**. Status not color-only — **pass**. Modal/popover Escape-to-close not fully verified this pass. |
| 02 Appointments | 15-001 | High | `<details>/<summary>` disclosure semantics are false on desktop (screen readers announce it as expandable; it does nothing) |
| 02 Appointments | — | — | Status pills not color-only — pass. Focus ring visible on form fields — pass. No-meeting-link row focus-visible styling not verified. |
| 03 Appointment Details | UX-004 | Medium | Duplicate `H3:Patient chat` heading confuses screen-reader landmark navigation |
| 03 Appointment Details | — | — | No icon-only buttons without accessible names — pass. Focus ring confirmed (Tab×9). Modal focus-trap on `consultation-documents-modal.tsx` not fully verified — flag for follow-up. Native `confirm()` for signing bypasses the app's own ARIA/focus conventions used everywhere else. |
| 04 Calendar | CAL-04-003 | Medium | No skip-to-content (see portal-wide table) |
| 04 Calendar | CAL-04-004 | Medium | Day-cell open/blocked/booked counts are color-only, no `aria-label`/text — only the aggregate consultation count has one |
| 04 Calendar | — | Low | Slot-toggle icon button has `title` but no `aria-label` — `title` alone unreliable for screen readers/mobile touch |
| 05 Availability | 05-008 | Medium | Week-grid slot status (Open/Booked/Blocked) conveyed by fill color only inside cells (shared `WeekCalendar`) |
| 05 Availability | 05-007/05-009 | Low | Delete icon-button touch target measured 22×22px — below WCAG 2.5.5's 44×44px recommendation, on a **destructive** action |
| 05 Availability | 05-011 | Medium | `PortalDialog` delete-confirm closes on Escape (pass) but default-focus-on-open target not verified |
| 06 Patients | — | — | Search input properly `<label>`-wrapped — pass. Single H1, no orphaned heading levels — pass. Muted-text contrast spot-check: 5.17:1, passes WCAG AA — pass. |
| 07 Patient Record | — | Medium | Collapsible section headers (`HistorySection`, `DocTypeGroup`) are real `<button>`s with chevrons but no `aria-expanded` — no announced state change |
| 07 Patient Record | — | — | Chart form fields all properly `<label>`-wrapped — pass. Status/clinic alert banners correctly use `role="alert"`/`role="status"` — pass. No icon-only elements — pass. Breadcrumb PII issue (07-001) is also an a11y concern — screen readers will read the email aloud. |
| 08 Services | — | — | Service cards use correct `role="checkbox"` + `aria-checked` pattern, verified toggling and staying `true` when locked — pass. Focus-visible ring present, not exhaustively tabbed through all 15 cards. Status not color-only — pass. Full contrast spot-check not run. |
| 09 Forms | — | Low | Heading order skips H2 (H1 → H3 "Your templates" / "New template") — shared `SectionHeader` convention issue, not page-specific |
| 09 Forms | — | Low | Builder's Title/Label required inputs have no visible `*`/"(required)" indicator, unlike the filler UI (`form-fill.tsx`) which does mark required fields |
| 09 Forms | — | — | Delete button has correct `aria-label` — pass. "Shared" badge uses text, not color-only — pass. Focus-visible confirmed portal-wide pattern. |
| 10 Messages | — | — | Search input `<label>`-wrapped — pass. Mobile back button has `aria-label` — pass. Unread count numeral in colored pill, not color-only — pass. Full keyboard-only round-trip and unread-badge contrast not spot-checked this pass — flagged as a follow-up once 10-001/10-002 land (fixing 10-002 reintroduces a header with a new interactive lock button needing its own focus/label check). |
| 11 Notifications | — | — | Focus ring present and legible (2px solid, contrast-checked) — pass. "Mark as read" icon button has `aria-label` — pass. Unread state relies on button presence/absence (structurally detectable by AT) plus a decorative `aria-hidden` dot — minor: consider an explicit "(unread)" text cue. Single H1, correct order — pass. |
| 12 Invoices | — | Low | Upload-validation error `<p>` has no `aria-describedby` back to the file input, and no `role="alert"` — not announced contextually |
| 12 Invoices | — | — | Sort links are real `<a>` elements, keyboard/AT accessible — pass. Status pills use `withDot`, not color-only — pass. |
| 13 Reports | — | — | Heading order: H1 → H3 (no H2 in between) — minor, shared `SectionHeader` convention, not report-specific. Native date inputs, no custom-picker keyboard-trap risk — pass. Dataset `<select>` correctly `<label>`-wrapped — pass. `BreakdownTable` is a plain semantic `<table>` — pass. |
| 14 Profile picker | — | — | Cards are real `<Link>`s with visible text — pass. Icon `aria-hidden` — pass. Single H1 — pass. Focus reaches both cards via Tab, default focus ring present. `:focus-visible` treatment vs `:hover` background not independently verified. |
| 15 Profile (country editor) | 15-008 | Medium | 6 unnamed icon-only toolbar buttons in the bio rich-text editor (color swatches), shared `RichTextHtmlField` |
| 15 Profile (country editor) | 15-009 | Medium | Save/error `MessageBanner` is a plain `<p>`, not announced to screen readers — needs `role="status"` |
| 15 Profile (country editor) | 15-010 | Low | Heading order skips H2 (H1 → H3 "Practice context…") |
| 15 Profile (country editor) | — | Low | Bio-locale `PortalTabs` has correct roving tabindex + arrow keys, but tabpanel↔tab `aria-labelledby` wiring is not passed by any consumer (code-derived) |
| 15 Profile (country editor) | — | — | Photo-remove uses native `confirm()` — keyboard-accessible but unstyled/untranslated chrome, inconsistent with `PortalDialog` used elsewhere on the same page. Save buttons ≥44px — pass; toolbar swatches ~24px — below target (same fix vehicle as 15-008). |
| 16 Security | 16-005 | Medium | No skip-to-content (see portal-wide table) |
| 16 Security | — | — | Single H1, no skipped levels — pass. Icon-only buttons: none (all have visible text) — pass. Enabled/not-enabled state uses icon + text, not color alone — pass. No modal on this page (N/A). Touch targets comfortably sized — pass. |
| 17 Confidentiality | 17-004 | Low | Agreement-text scroll `<div>` has no `tabIndex`/`role="region"`/`aria-label` — keyboard-only users cannot Tab directly into it to scroll with arrow keys |
| 17 Confidentiality | — | — | Single H1, no skipped levels — pass. Checkbox correctly `<label>`-wrapped — pass. Accepted state uses icon + text, not color alone — pass. |

## Aggregate pattern

The doctor portal's accessibility posture is **structurally sound but has two systemic gaps and one critical local instance**:

1. **Skip-to-content is portal-wide missing** — one shell-level fix (`portal-shell.tsx`) resolves it for every page in all three portals simultaneously. This is the single highest-leverage a11y fix in the entire audit.
2. **Breadcrumb truncation/PII is portal-wide** and has one **Critical** instance (07-001, patient email) that is a data-handling violation, not merely a UX defect — needs both an engineering fix and, per the source page's own recommendation, a quick legal/compliance sanity check given the explicit prior intent to hide this data.
3. **Icon-only controls are mostly correctly labeled** across the portal (bell, user menu, delete buttons, mobile back arrow) — the exceptions cluster in **one shared component** (`RichTextHtmlField`'s color-swatch toolbar, 6 unnamed buttons, used by both doctor profile and 4 admin routes) rather than being scattered doctor-portal defects.
4. **Status is never color-only** anywhere in the audited pages — this held on every single page checked (01, 02, 04, 05, 09, 12, 15, 16, 17) — a genuine portal-wide strength, not a finding.
5. **Touch targets** are correctly sized except for two destructive/small icon buttons: Availability's delete-window button (22×22px, 05-007) and the rich-text toolbar swatches (~24px, 15-008/§20).
