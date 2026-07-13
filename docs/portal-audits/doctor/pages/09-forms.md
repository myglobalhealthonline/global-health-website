# Doctor Portal Audit — 09 Forms (`/doctor/forms`)

## 1. Page Identification

- **Name:** Forms (clinical templates manager)
- **Route:** `doctor/forms` → `frontend/app/(doctor)/doctor/forms/page.tsx`
- **Entry points:** Doctor sidebar → Practice → "Forms"; also linked from the appointment workspace's Form-Fill panel when a doctor has zero active templates (`frontend/app/(doctor)/doctor/appointments/[id]/_components/form-fill.tsx:55`)
- **Role:** DOCTOR
- **Workflow:** template CRUD only — this page does **not** contain a fill/preview/sign/send flow. It is a builder + list for reusable form *templates* (title + description + N field defs). The actual fill-and-submit-answers flow lives on a different page (appointment detail).
- **Frontend files:**
  - `frontend/app/(doctor)/doctor/forms/page.tsx` (server component, data fetch)
  - `frontend/app/(doctor)/doctor/forms/loading.tsx` (skeleton)
  - `frontend/app/(doctor)/doctor/forms/_components/templates.tsx` (client component — builder + list, all logic)
  - Related/reused elsewhere: `frontend/app/(doctor)/doctor/appointments/[id]/_components/form-fill.tsx` (consumes the same `FormTemplateDto`/`FormFieldDef` types to render the fill form during a consultation)
- **Shared components used:** `AdminSummaryStrip`, `PageHeader`, `AdminEmptyState` (`components/portal-atoms`), `FormSection` (`components/FormSection.tsx`, wraps `AdminCard` + `SectionHeader`)
- **APIs observed:**
  - `GET/POST /api/doctor/form-templates` → `frontend/app/api/doctor/form-templates/route.ts` → backend `forwardToBackend(..., "/api/doctor/form-templates")`
  - `DELETE /api/doctor/form-templates/[templateId]` → `frontend/app/api/doctor/form-templates/[templateId]/route.ts`
  - Data shapes: `FormTemplateDto`, `FormFieldDef` in `frontend/lib/api/doctor-api.ts:388-413`
  - Consumed (not called from this page) by `POST /api/doctor/appointments/[id]/form-submissions` in the appointment workspace
- **Date audited:** 2026-07-12
- **Viewports tested:** desktop 1440×900, laptop 1280×720, tabletl 1024×768, tabletp 768×1024, mobile 390×844, smobile 375×667, short 1366×650
- **States tested (browser-verified):** default (1 seeded template "Pre-consult Intake"), native-HTML validation on empty submit, native-HTML validation on empty field-label with title filled, two-field builder state, delete-confirm native dialog, post-edit in-app navigation (no guard). **Not tested** (would mutate live shared DB / send real data): actual template creation, actual delete confirmation, actual form-submission POST from the appointment workspace. Empty-list state (zero templates) is **code-derived** — the seeded doctor always has 1 template.

## 2. Page Purpose

Lets a doctor define reusable clinical form templates (e.g., an intake questionnaire) once, so they can be attached and filled per-patient inside an appointment instead of being rebuilt every time. It is infrastructure/config for the appointment workflow, not a document-generation tool (no sick cert / prescription / referral generator lives here — see Open Questions).

## 3. Primary Doctor Tasks (priority order)

1. See what templates already exist and how many fields/when last updated.
2. Create a new template: title → optional description → one or more fields (label, type, required, options for choice).
3. Remove a template that's no longer needed.
4. (Not on this page) Attach/fill a template against a specific patient during a consultation — that happens on the appointment detail page.

## 4. Clinical/Operational Importance

Medium. Templates gate what data a doctor *can* capture consistently across patients (intake, pre-consult, follow-up). Getting the field types/required flags wrong here propagates directly into every future consultation using that template — but the page itself carries no PHI and no irreversible clinical action (no sign/send). Risk is workflow friction, not clinical-safety.

## 5. Current Page Structure (top-to-bottom)

1. `PageHeader` — eyebrow "CLINICAL TEMPLATES", title "Forms", description
2. `AdminSummaryStrip` (2 stat tiles: Templates count, Workflow="Reusable")
3. Error card (only if template fetch failed) — code-derived, not triggered in this session
4. `FormTemplatesClient` — a single 2-column CSS grid (`gh-doctor-templates-layout`) containing:
   - Left: `FormSection "Your templates"` → list of template rows (title, shared badge if not owned, description, "N fields · updated {date}", delete icon-button)
   - Right: `FormSection "New template"` → the builder form (Title, Description, repeatable Field blocks, "Add field", error banner, "Create template" submit)

## 6. Current Container Hierarchy

```
main
└─ PageHeader (gh-portal-page-header)                     [surface 1]
└─ AdminSummaryStrip
   └─ 2× gh-admin-summary-item (stat tile)                [surface 1]
      └─ gh-portal-icon-badge (icon chip)                 [surface 2 — decorative, no action]
└─ gh-doctor-templates-layout (2-col grid, no own surface) [layout only]
   ├─ FormSection "Your templates" = AdminCard             [surface 1]
   │  └─ SectionHeader (title+rule, no surface)
   │  └─ ul
   │     └─ li.gh-doctor-template-row (bordered card)      [surface 2]
   └─ FormSection "New template" = AdminCard                [surface 1]
      └─ SectionHeader
      └─ form
         └─ input/textarea (flat, no card)
         └─ div.gh-doctor-template-field (bordered, per field) [surface 2]
```

Max nesting depth measured via `getComputedStyle` walk (border/bg/radius/shadow): **2 levels** (card → row/field-block). This is within the recommended max-3 range. The stat-tile icon badges (`gh-portal-icon-badge`) are a 3rd nominal "surface" but are decorative glyphs, not content cards — not a violation.

**Unnecessary here:** none of the 2 levels are redundant — `AdminCard` (section boundary) and the inner bordered row/field block (repeatable-item boundary) each carry distinct meaning. No card-in-card-in-card found on this page.

## 7. Interaction Inventory

| Element | Type | Action | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| Template row delete icon (Trash2) | icon-only button | click | native `confirm()` — "Delete this template?" | Icon-only, `aria-label` present ✓ but confirm dialog text is generic (doesn't name the template) | `09-forms-laptop-delete-dialog-05.png` (dialog itself is a browser-native modal, not in DOM/screenshot) |
| Title input | text input, `required`, maxLength 200 | leave empty, submit | Browser-native "Please fill out this field" tooltip fires; custom `strings.titleRequired` error never shown | Two validation systems overlap (native HTML5 + custom JS) — custom message is dead code on this path | `09-forms-laptop-validation-empty-01.png` |
| Field 1 Label input | text input, `required` | fill Title only, submit | Native tooltip on Label field | Same overlap; also **contradicts** the component's own `serialiseFields()` logic which explicitly filters out fields with blank labels — the `required` attribute makes that filtering path unreachable via the UI | `09-forms-laptop-validation-nofield-02.png` |
| Type `<select>` | select | change to "choice" | Reveals "Options" textarea | Works as documented | — |
| "Add field" | button | click | Appends a new Field N block | Works; no field limit visible/enforced (code-derived) | `09-forms-laptop-two-fields-03.png` |
| "Remove field" | text button, only shown when >1 field | click | Removes that field block | No confirm — correct, since it's pre-save and reversible | — |
| Sidebar nav link (e.g. "Appointments") while title+field mid-edit | link | click | Navigates immediately, in-progress template lost | **No unsaved-changes guard** — confirmed by test (filled Title="Test Template Draft", clicked Appointments, landed on `/doctor/appointments` instantly, no prompt) | `09-forms-laptop-nav-guard-04.png` |
| "Create template" | submit button | click | POST `/api/doctor/form-templates`; on success prepends to list, clears form, `router.refresh()` | Not exercised to completion (would write a real template row to shared DB) | — |

## 8. Page States Tested

| State | Browser | Code | Result | Issue |
|---|---|---|---|---|
| Default (1 template) | ✓ | — | Renders row + builder | — |
| Empty list (0 templates) | code-derived | `templates.tsx:162-169` `AdminEmptyState` | Shows icon, title, description | Not reachable without deleting the only seeded template (destructive — skipped) |
| Loading | code-derived | `loading.tsx` → `ListPageSkeleton rows={5} columns={4}` | Generic 4-column table skeleton | **Mismatch**: real page is a 2-card grid, not a table — skeleton shape doesn't match final layout, causes a layout jump on load |
| Error (fetch failed) | code-derived | `page.tsx:41-46` | Plain `gh-card` with warning text, summary strip suppressed | No retry action offered |
| Validation — empty title | ✓ | `templates.tsx:102-105` (`titleRequired` message, but shadowed by native `required`) | Native browser tooltip, not app copy | See row above |
| Validation — no fields | code-derived (unreachable via UI) | `templates.tsx:106-109` (`fieldRequired`) | Cannot trigger: label `required` blocks submit before this check runs | Dead validation branch |
| Disabled (saving) | code-derived | `disabled={pending}` on submit button, label swaps to `strings.saving` | Standard pending pattern | Not exercised (would submit) |
| Read-only/locked shared template | ✓ (visually only "Pre-consult Intake" is owned, so no unowned example present) | `templates.tsx:181-186,198-207` — non-owned templates get a "Shared" badge and no delete button, still fully visible | Consistent, correct pattern | None |

## 9. Screenshots

All in `docs/portal-audits/doctor/screenshots/09-forms/`:

| Filename | Viewport | State | Reason captured |
|---|---|---|---|
| `09-forms-default-desktop-default-01.png` | 1440×900 | default | Baseline, 2-col layout confirmed |
| `09-forms-default-laptop-default-01.png` | 1280×720 | default | Baseline |
| `09-forms-default-tabletl-default-01.png` | 1024×768 | default | Below 1400px stack breakpoint |
| `09-forms-default-tabletp-default-01.png` | 768×1024 | default | Stacked single column, long scroll |
| `09-forms-default-mobile-default-01.png` | 390×844 | default | Mobile stack, header truncates "Forms"→"Fo" |
| `09-forms-default-smobile-default-01.png` | 375×667 | default | Smallest supported width |
| `09-forms-default-short-default-01.png` | 1366×650 | default | Fold check — see §19 |
| `09-forms-laptop-validation-empty-01.png` | 1280×720 | validation, empty title | Native tooltip fires instead of app copy |
| `09-forms-laptop-validation-nofield-02.png` | 1280×720 | validation, empty label | Confirms native `required` on Label field |
| `09-forms-laptop-two-fields-03.png` | 1280×720 | 2-field builder | "Add field" works; shows per-field bordered block |
| `09-forms-laptop-nav-guard-04.png` | 1280×720 | post-navigation | Proves no unsaved-changes guard — landed on `/doctor/appointments` with edits lost |
| `09-forms-laptop-delete-dialog-05.png` | 1280×720 | pre/post delete-dialog dismiss | Page underneath the (invisible, native) confirm dialog |

## 10. UX Problems

**09-001 — No unsaved-changes protection on the template builder** — Severity: Medium
Evidence: browser, `09-forms-laptop-nav-guard-04.png` (filled Title field, clicked "Appointments" in sidebar, navigated instantly with no prompt).
Doctor impact: a doctor who builds a multi-field template and gets interrupted (patient call, another tab) loses all work silently — there's no draft persistence and no warning.
Root cause: `templates.tsx` has no `beforeunload`/route-change guard; state is plain `useState`, unpersisted.
Recommendation: add a `useState`-driven dirty flag (any of title/description/fields non-default) and wire it to Next.js route-change interception (or at minimum a `beforeunload` listener for the empty-tab-close case). Given this is a short single-screen form, a lighter fix — persist the draft to `sessionStorage` keyed by doctor id, restore on remount — is more proportionate than a full navigation-block dialog, since the ladder of effort/value favors "don't lose data" over "block navigation."

**09-002 — Double validation system: native HTML5 `required` shadows the custom error copy** — Severity: Low
Evidence: browser, `09-forms-laptop-validation-empty-01.png` + code, `templates.tsx:98-109,225-231,266-271`.
Doctor impact: minor inconsistency — the app's own translated error strings (`titleRequired`, `fieldRequired`) never actually display in English UI because the native browser validation intercepts submit first. In some browsers/locales this reads as an untranslated/generic message instead of the app's copy.
Root cause: both the `required` HTML attribute and `event.preventDefault()` + manual `setError()` logic exist for the same field.
Recommendation: drop `required` from the Title and Field-Label `<input>`s (or keep them for baseline non-JS accessibility but ensure `noValidate` on the `<form>` so the custom messages always win), so the translated, in-app error banner is the single source of truth.

**09-003 — "No fields" validation branch is unreachable** — Severity: Low
Evidence: code, `templates.tsx:106-109` vs. `templates.tsx:270` (Label input has `required`).
Doctor impact: none directly, but it's dead code that will confuse a future maintainer, and it reveals the field-label `required` attribute wasn't meant to always block submit (the surrounding `serialiseFields()` at line 76-77 explicitly tolerates blank-label fields by filtering them out).
Root cause: same required-attribute conflict as 09-002.
Recommendation: resolved by the 09-002 fix (remove native `required`, let `fieldRequired` validation run and actually be reachable if all fields end up blank-labeled).

**09-004 — Delete-confirm dialog wording is generic** — Severity: Low
Evidence: browser (dialog message text captured via Playwright dialog listener): `"Delete this template?"` (native `confirm()`, `templates.tsx:143`).
Doctor impact: if a doctor has several templates open in memory/tabs, a generic confirm doesn't name which template is being deleted, raising misclick risk.
Root cause: `confirm(strings.deleteConfirm)` doesn't interpolate the template title.
Recommendation: interpolate the title, e.g. `Delete "${t.title}"? This can't be undone.` — also consider replacing the native `confirm()` with the shared `PortalDialog` primitive for visual consistency with the rest of the portal (native browser dialogs look and behave differently across OS/browser and can't be styled — see 09-018).

**09-005 — Loading skeleton shape doesn't match the real layout** — Severity: Low
Evidence: code, `loading.tsx` (`ListPageSkeleton rows={5} columns={4} summaryItems={0}`) vs. actual rendered page (2-card grid, not a 4-column table, and 2 summary items are actually shown).
Doctor impact: brief layout jump/flash when the real content replaces the skeleton (table-shaped → card-shaped).
Root cause: `loading.tsx` was likely copy-pasted from a list/table page template without adjusting to Forms' actual card-grid shape.
Recommendation: use a skeleton matching the real 2-column card grid (or a generic `AdminCard`-shaped skeleton) and set `summaryItems={2}` to match the actual `AdminSummaryStrip`.

## 11. Visual Design Problems

None significant. Card/border/radius usage is consistent with the rest of the doctor portal (`gh-admin-card`, `.gh-doctor-template-row`, `.gh-doctor-template-field` all use the same `border border-[var(--portal-line)]` + `rounded-md` pattern — no pill overuse, no shadow stacking, no gradient-blob elements). The 2-stat `AdminSummaryStrip` here is a legitimate small strip (2 items, both meaningful — Templates count and Workflow mode) and doesn't fall into the "useless stat card" anti-pattern, though "Workflow: Reusable" is a static, never-changing value (see §12).

## 12. Information Hierarchy Problems

**09-006 — "Workflow: Reusable" summary tile carries no variable information** — Severity: Low
Evidence: browser, `09-forms-default-desktop-default-01.png`; code, `page.tsx:31-36` (`value: d.forms.reusable` — a hardcoded string, not data).
Doctor impact: takes up a full stat-tile slot (half the summary strip's width) for a label that never changes and answers a question ("is this reusable?") no doctor is asking. It reads as a stat but isn't one.
Root cause: summary strip was populated to "look full" with 2 items rather than 1.
Recommendation: drop the second tile; either show a single "Templates: N" tile, or replace the second slot with a real, useful stat if one exists (e.g., count of templates actually used in the last 30 days, if the backend tracks it) — otherwise 1 tile is honest and cheaper than a decorative one.

**09-007 — List and builder have equal visual weight, but list is the "read" state and builder is the "write" state a doctor visits far less often** — Severity: Low
Evidence: browser, all default screenshots — both `FormSection`s render as identically-sized cards side by side.
Doctor impact: minor — a returning doctor who just wants to check/delete an existing template gets an equally large "New template" form in their face every visit, even though template creation is a rare, one-off action (most doctors will set up 1-3 templates once and rarely touch this page again).
Recommendation: see §15 — collapse "New template" behind a "+ New template" trigger (button/drawer) so the default view is list-first, builder-on-demand.

## 13. Current Section Order

1. Compliance banner (dismissible, portal-shell-level, not specific to this page)
2. PageHeader (eyebrow/title/description)
3. Summary strip (Templates count, Workflow=Reusable)
4. Your templates (list) — left column
5. New template (builder) — right column
(4 and 5 render simultaneously as a 2-col grid, not sequential sections — order only matters at ≤1400px where they stack top-to-bottom in that same 4-then-5 order.)

## 14. Recommended Section Order (+ reasons)

1. PageHeader — unchanged, orientation.
2. Your templates (list) — full width once the builder is collapsed (§15), because checking/using existing templates is the primary return-visit task (§3.1).
3. "+ New template" entry point — a button, not a permanently-open form, placed above or beside the list header.
4. Summary strip — demote to a single "Templates: N" inline count near the list header instead of a separate strip section; a 1-count "strip" for a page with one real number doesn't earn a whole horizontal section (reasoning: §12, 09-006).

Reasoning: the current order already puts the list before the builder in DOM/reading order (good), but the 2-column layout gives the rarely-used builder 50% of permanent screen real estate on every visit. Reordering to "list first, builder on-demand" matches actual usage frequency.

## 15. Tabs/Steps/Sectioning Recommendation

Not a long unstructured scroll (only 2 sections at desktop width), so a tab/step system is unnecessary overhead here — this would violate the ladder (don't add structure the content doesn't need). The one sectioning change worth making: convert "New template" from an always-visible form into a **disclosed** form:
- Default: "Your templates" list, full width, with a "+ New template" button in the `SectionHeader`'s `right` slot (that slot already exists — `FormSection` accepts a `right` prop, unused today).
- Click → the builder form opens as a `PortalDialog` (shared modal primitive, already used elsewhere in the portal per CLAUDE.md's UI-primitives rule) rather than a second permanent card, since template creation is infrequent, single-purpose, and has a clear "done" boundary (submit or cancel) that a modal naturally provides.
- This also sidesteps 09-001 (unsaved work) for free in the common case: closing a modal is a much lower-stakes, expected "did you mean to lose this?" moment than a full page navigation, and `PortalDialog` can carry a standard "discard changes?" confirm if dirty.

No multi-step wizard needed inside the builder itself — title/description/fields is a single coherent unit doctors fill in one sitting, and template count is small (add-field is already a lightweight repeat-block pattern, not deep enough to warrant steps).

## 16. Save & Finalization Recommendation

There is exactly one save action (`Create template`) and one destructive action (delete) — no multi-save ambiguity exists today, which is correct. Keep this 1:1 mapping when moving the builder into a modal (§15): the modal's primary action stays "Create template" (right-aligned per the repo's standing rule — already the case, `templates.tsx:325` renders a single right-context button, no competing "Save" elsewhere). No "draft" vs "finalize" distinction is needed for templates themselves (they're config, not clinical documents) — sign/send semantics belong to `form-fill.tsx`'s submission flow, not this page, and should stay there.

## 17. Proposed Page Structure (exact top-to-bottom)

1. `PageHeader` (unchanged)
2. `FormSection "Your templates"` — full width
   - `SectionHeader` with `right` = "+ New template" button and inline "{N} templates" count (replaces the 2-tile summary strip)
   - List (unchanged row markup) or `AdminEmptyState` if zero
3. `PortalDialog` (mounted, hidden by default) containing the existing builder form, opened by the header button; on successful create, closes and the list re-renders (existing `router.refresh()` logic reused as-is)

## 18. Proposed Container Simplification

- **Remove:** the `AdminSummaryStrip` 2-tile block (§12, 09-006) — replace with a single inline count in the list's `SectionHeader`.
- **Keep:** the `AdminCard`/`FormSection` wrapper for the list (surface 1) and the per-row bordered item (surface 2) — correct 2-level depth, no change needed.
- **Flatten → Modal:** the "New template" `FormSection` becomes a `PortalDialog` body instead of a permanent second grid column; this removes the `gh-doctor-templates-layout` 2-col grid entirely (list becomes single-column full width), simplifying the CSS and the responsive stacking logic in `portal.css:2877-2894` and `portal.css:3055-3062` for this specific page (those rules are shared with 4 other doctor pages, so don't delete them — just stop applying `gh-doctor-templates-layout` to this page's markup once the modal migration lands).
- **No change:** per-field bordered block inside the builder — appropriately scoped as a repeatable-item boundary.
- **No dividers/tables needed** — list is short (typically 1-10 templates per doctor); a `ColumnPriorityTable` would be over-engineering for 3 pieces of info per row (title, field count, updated date) already well-served by the current card-row pattern.

## 19. Responsive Findings (per viewport)

- **Desktop 1440 / Laptop 1280:** 2-col grid renders correctly, both `FormSection`s comfortably fit; no overflow.
- **Tabletl 1024:** below the 1400px breakpoint (`portal.css:3050-3062`), grid already correctly stacks to 1 column — verified in `09-forms-default-tabletl-default-01.png`. No cramped/horizontal-scroll issue observed here (the CLAUDE-documented 1180-1400px table-crowding problem this rule guards against doesn't apply to Forms since it has no wide table).
- **Tabletp 768:** clean single-column stack, all fields full-width and usable.
- **Mobile 390 / smobile 375:** stacks correctly; top bar breadcrumb truncates "Forms" to "Fo" (`09-forms-default-mobile-default-01.png`) — a shared header-chrome issue, not specific to this page (out of scope to fix here, flagged for the header/breadcrumb component instead).
- **Short 1366×650:** the compliance banner + `PageHeader` + summary strip together consume ~490px of the 650px viewport height before "Your templates" begins (`09-forms-default-short-default-01.png`) — a doctor on a short/laptop screen has to scroll before seeing any actual template. Removing the summary strip (§18) reclaims roughly 110-130px of that, which materially improves the fold on this specific viewport; the compliance banner is a portal-shell-level element outside this page's scope.

## 20. Accessibility Findings

- **Heading order:** H1 "Forms" → H3 "Your templates" → H3 "New template". **Skips H2** — Severity: Low. Code: `PageHeader` renders an `h1`; `SectionHeader` (inside `FormSection`) renders `h3` directly (`components/portal-atoms` — not modified here, shared across many pages). Recommendation: either `SectionHeader` should render `h2` for top-level page sections, or accept it as a portal-wide convention (verify in `portal-atoms.tsx` before changing, since this is shared by ~15+ pages — flagged for a cross-page fix, not page-specific).
- **Focus visibility:** Tab-traced through the sidebar nav (12 tabs) — all links receive a visible `box-shadow`-based focus ring (`box: true` in trace), consistent portal-wide focus treatment. Builder form inputs use standard browser/Tailwind focus rings on `.gh-input`/`.gh-select` (not individually re-verified per-input here, but consistent class usage with other audited doctor pages).
- **Icon-only buttons:** delete (Trash2) button has `aria-label={strings.deleteTemplateAria}` — correctly labeled. ✓
- **Required-field marking:** builder's "Required" checkbox is a form-*design* control (marks whether the *generated* field is required for whoever fills it later), separate from the builder's *own* required inputs (Title, Label) which rely on the native `required` attribute + a red-tinted `*` is used in the *filler* UI (`form-fill.tsx:144-146`) but **not** in the *builder* UI itself — Title/Label required inputs have no visible `*` or "(required)" text, only the native browser tooltip on submit. Severity: Low. Recommendation: add a visible required-indicator (`*`) next to "Title" and "Label" `gh-field-label` spans for parity with how `form-fill.tsx` marks required fields, and so sighted users don't need to submit-and-fail to discover a field is mandatory.
- **Status not color-only:** the "Shared" badge on non-owned templates uses text ("Shared") not just color — ✓ compliant.
- **Modal focus trap/Escape:** not applicable today (no modal exists on this page) — becomes a **requirement** if §15's `PortalDialog` migration is implemented (verify `PortalDialog`'s existing focus-trap/Escape behavior, which per CLAUDE.md is the shared primitive and should already handle this).
- **Touch targets:** delete icon-button (`size-3.5` icon, no explicit padding beyond `gap-1` flex) is visually small; not separately re-measured against the 44px touch-target guideline in this pass — flag for follow-up on mobile (`09-forms-default-mobile-default-01.png` shows it at a plausible but tight size next to "Pre-consult Intake").

## 21. Content & Microcopy Findings

| Current | Recommended | Reason |
|---|---|---|
| "Delete this template?" (native confirm) | `Delete "{title}"? This can't be undone.` | Names the target, states irreversibility (09-004) |
| "Workflow" / "Reusable" stat tile | (remove tile) | Not a variable stat — static label masquerading as data (09-006) |
| "N fields · updated {date}" | Keep — clear, scannable | — |
| Generic native "Please fill out this field." tooltip on Title/Label | App's own `strings.titleRequired` / `strings.fieldRequired` copy, always shown | Consistency + translation coverage (09-002) |
| "New template" section always visible | "+ New template" button (verb-first, matches doctor's mental model of an on-demand action) | Matches disclosure pattern (§15) |

Date format `formatAppDateTimeShort` renders "23 May, 04:11" — consistent, unambiguous (day-month-time), no issue found.

## 22. Component & Code Impact

| Component | Path | Change | Shared? | Risk | Complexity |
|---|---|---|---|---|---|
| `FormTemplatesClient` | `frontend/app/(doctor)/doctor/forms/_components/templates.tsx` | Remove native `required` from Title/Label inputs (or add `noValidate` to `<form>`); add visible required-indicator; interpolate delete-confirm message; wrap builder in `PortalDialog`, add trigger button in list's `SectionHeader right` slot | No (page-local) | Low | Small |
| `DoctorFormsPage` | `frontend/app/(doctor)/doctor/forms/page.tsx` | Remove `AdminSummaryStrip`, move template count into list header | No | Low | Small |
| `DoctorFormsLoading` | `frontend/app/(doctor)/doctor/forms/loading.tsx` | Swap `ListPageSkeleton` for a card-grid-shaped skeleton, `summaryItems={0}` already correct once strip is removed | No | Low | Small |
| `PortalDialog` | shared portal primitive | Reuse only — verify focus-trap/Escape/dirty-close behavior fits the builder form | Yes (many pages) | Low (read-only verification, no primitive change expected) | N/A |
| `FormSection` | `components/FormSection.tsx` | None required — `right` prop already exists and supports this change | Yes (many pages) | None | N/A |

All CSS involved (`.gh-doctor-templates-layout`, `.gh-doctor-template-row`, `.gh-doctor-template-field`) lives in `frontend/app/portal.css` (portal-only classes) per the repo's CSS-architecture rule in root `CLAUDE.md` — any styling change stays in `portal.css`, never `globals.css`. Removing `gh-doctor-templates-layout` usage from this page must not delete the shared rule since 4 other doctor pages (`gh-doctor-detail-grid`, `-overview-grid`, `-availability-grid`, `-profile-edit-layout`, `-patient-detail-layout`) reuse the exact same selector block.

## 23. Backend or Business-Logic Impact

Frontend-only for all recommendations above. No API contract changes needed:
- Delete-confirm message interpolation is a client-side string change (uses data already in `t.title`, already fetched).
- Modal-izing the builder doesn't change the `POST /api/doctor/form-templates` payload or `FormFieldDef` shape.
- Removing the summary strip is presentation-only; the `AdminSummaryStrip` `items` array construction in `page.tsx` is simply deleted, not the underlying `result.data.items.length` data.

No clinical/legal review needed — this page has no PHI display and no document-generation/signing logic.

## 24. Recommended Implementation Order

1. 09-002/09-003 — remove native `required` conflict, restore custom validation messages (smallest, isolated fix, unblocks correct testing of the "no fields" error path).
2. 09-004 — interpolate delete-confirm message (one-line change).
3. §20 required-field visible indicator on Title/Label.
4. §12/§18/§14 — remove summary strip, add inline count to list header (small, immediate fold improvement per §19).
5. §15/§17 — modal-ize the builder (largest change; do last since it depends on `SectionHeader`'s `right` slot being free, which step 4 already establishes).
6. 09-001 — sessionStorage draft-recovery, layered onto the now-modal builder (naturally scoped to "warn on modal close if dirty" per §15, cheaper than a full route-guard).
7. 09-005 — fix loading skeleton shape to match the post-modal-migration layout (do last so it matches the final shape, not the current one).

## 25. Acceptance Criteria

- Submitting the builder with an empty Title shows the app's own translated error text, not a browser-native tooltip, verified in at least one non-English locale.
- Submitting with all field-labels blank shows `fieldRequired` copy (the previously-dead branch is now reachable and displays).
- Delete confirm dialog text includes the exact template title being deleted.
- "Your templates" list renders full-width with no `AdminSummaryStrip` present; a template count is visible inline near the section title.
- "+ New template" button opens the builder in a modal; Escape and an explicit close/cancel both dismiss it; if the doctor has typed a title or any field label, closing prompts a discard-confirmation.
- Fold check: at 1366×650, "Your templates" section heading is visible without scrolling (currently requires ~150px of scroll per `09-forms-default-short-default-01.png`).
- Loading skeleton visually matches the real single-column list-plus-button layout (no table/column skeleton).

## 26. Open Questions

- Product intent: is a generic freeform template builder (this page) meant to be the **only** way doctors create clinical documents, or is there a separate, more structured sick-cert/prescription/referral generator elsewhere in the app that this audit didn't reach? The brief expected named document types (sick cert, prescription, referral) but the actual implementation is a single generic key/label/type/required field builder with no document-type concept at all — worth confirming this is the intended final state vs. an interim/MVP building block, since it changes how much investment (e.g., the modal work above) is warranted here.
- Is there a per-doctor or per-clinic template count limit? None is enforced client-side (`addField` has no cap either) — confirm backend enforces a sane ceiling to prevent runaway templates/fields.
- Should "shared" (admin-managed, `ownedBySelf: false`) templates be editable/duplicatable by a doctor (e.g., "duplicate as my own"), or are they intentionally fully read-only here? Current UI gives no path to customize a shared template — confirm this is by design.
