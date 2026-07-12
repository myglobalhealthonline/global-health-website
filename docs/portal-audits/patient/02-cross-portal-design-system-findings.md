# Cross-Portal Design-System Findings — Patient Portal Audit

Date: 2026-07-12 · Evidence: 20 page audits (`pages/*.md`), 108 issues. This file defines the *rules* that stop every page from re-inventing its own layout. Scope note: the portal shell and most primitives are shared with admin/doctor portals — every rule here must be regression-checked there before shipping (see `05-shared-component-impact-map.md`).

## 1. The core disease (observed on 14+ of 20 pages)

The portal has one layout idea — "put it in a rounded card" — applied at every level simultaneously: page panel → section card → stat card → list-item card → meta-item box → pill. The result is the "collection of floating boxes" the reference screenshot shows. Three shared components generate most of it:

1. **`AdminSummaryStrip`/`StatCard`** (`app/(admin)/admin/_components/atoms.tsx`) — dropped onto ~14 pages as decoration. On list/detail pages it duplicates data visible in the content below it, shares one generic bar-chart glyph across unrelated metrics, and at 1366×650 it alone fills the entire fold on 8 pages (zero primary content visible on load).
2. **`PortalMobileCard`** — a mobile *fallback* used as the sole presentation at all viewports (bookings, prescriptions, orders), producing card-in-card-in-card nesting: each row a bordered card, each meta value inside its own bordered box (`portal.css:767-773`).
3. **`AdminCard` + `padding={0}` + inner `div.p-5`** — a repeated anti-idiom (08, 14, 15, 20) that adds a decorative nesting level the component's own `padding` prop already covers.

## 2. Surface-level rules (proposed portal law)

**Rule S1 — max 2 visual surface levels below the page background.** Page canvas → section surface → content. A third bordered/shadowed/filled box inside a section surface is banned; use dividers, whitespace, or typography instead. (Today bookings hits 5 levels: page → panel → filter card → item card → meta box.)

**Rule S2 — a card must earn its border.** A card is allowed only when the content is independently actionable (clickable unit, selectable, dismissible) or genuinely heterogeneous from siblings. Homogeneous collections (bookings, prescriptions, invoices, consents, log rows) are **divided rows or `ColumnPriorityTable`**, never card stacks. Reference implementations already in the codebase: payments consultation table (16, best page of the audit), access-history log rows (10).

**Rule S3 — stat strips live only on true dashboards.** `AdminSummaryStrip` is allowed on `/account` (in reduced, task-oriented form) and nowhere else. List/detail pages that want orientation numbers get a one-line inline meta row ("27 bookings · 23 open · 0 this week") inside the section header, next to the controls — pattern already recommended per-page in 02/05/07/09/14/15/16 §11-14.

**Rule S4 — one primary action per viewport.** Every page must have exactly one visually-primary CTA above the fold at 1366×650. Today 8 pages show *zero* content or actions above that fold (see `07-responsive-summary.md`).

**Rule S5 — status gets one treatment.** One `StatusBadge` recipe (tone via `--lux-*` tokens), rendered once per record. Duplicated status displays with divergent formatting (15-004 "Payment" twice, 16-004 hardcoded "paid" tone, 11-003 plan status ×3) are consolidation bugs.

## 3. Standard page anatomy (all portal pages)

```
PageHeader        — H1 + one-line context + (optional) single primary action
[Attention band]  — conditional: needs-action items only; plain banner, not cards
Section(s)        — SectionHeader (H2!) + one surface; controls inline in header row
                    lists = divided rows/table; forms = FormSection with ONE save model
Footer meta       — counts/links, de-emphasized
```

- Max content width, section spacing, and header structure are already tokenized in `portal.css` — the audit found no token gaps, only misuse. No new tokens needed for Phase 1.
- Sticky elements: only the page header band and (on forms) one save bar. The floating chat launcher (02-007) must respect content padding.

## 4. Component-specific rulings

| Component | Ruling |
|---|---|
| `AdminSummaryStrip` | Restrict to dashboards (Rule S3). Add per-metric icon prop — the identical `BarChart3` glyph on every card (01, 05, 14) communicates nothing. |
| `PortalMobileCard` | Return to its designed role: mobile fallback under `ColumnPriorityTable` only. Flatten `__meta-item` boxes to plain label/value rows. |
| `AdminCard` | ~~Forbid `padding={0}` + inner padded div~~ REVISED during Wave 2b: that idiom is the established flush-SectionHeader composition (`.gh-portal-section-header` `:first-child` radius rules depend on it). Rule withdrawn; a real fix would be an AdminCard `header` slot — optional, low priority. |
| `SectionHeader`/`AdminEmptyState` | Fix heading levels (`h3`→`h2` / configurable) — single root cause of the H2-skip on 5+ pages. Cross-portal regression pass required. |
| `PortalTabs` | Wire `PortalTabPanel` everywhere (ARIA broken on medical-files); add mobile overflow affordance (17-003). |
| `PortalDialog` | `danger` variant reserved for destructive actions only (11-001 misuse: plan change styled like cancellation). |
| Popovers (`.gh-portal-menu-content`) | Opaque fill or real blur — translucent panels bleed page text through menu text (01-001, all 3 portals). |
| Doctor/admin components on patient pages | `EventDetailDialog`, `DayAgenda`, calendar copy must take a role-aware variant/prop. Patients currently see "Add availability", an empty "Patient —" row, and their own doctor named 3× (05-005/006/007). |

## 5. Typography, radius, shadow

- Heading scale itself is sound (`lux` tokens); the failures are semantic (H2 skips), not visual.
- Radius/shadow: one radius+shadow recipe is used at every nesting level, which is *why* nesting reads as noise. Adopting Rules S1-S2 resolves this without new tokens; do not add hierarchy by adding more shadows.
- Pills: reserve for status. Non-status pills (meta boxes, day badges) become plain text or dot+numeral (05-003).

## 6. Empty states, loading, feedback

- `AdminEmptyState` needs per-context copy props — 5 identical sentences across medical-files tabs (09-005), doctor copy on patient calendar (05-007).
- Async feedback: save/error messages must use `role="status"`/`aria-live` (17, 19 gaps; 18 is the correct reference implementation).
- Never render an empty status pill (16-001); define a fallback tone/text.
