# Prioritized Doctor Portal Improvement Plan

Date: 2026-07-12. ~108 issues from 17 page audits, tiered per `FABLE_DECISIONS.md`'s P0 set plus this synthesis's P1-P3 assignment of every remaining issue ID. Owner suggestions: **S** = small isolated task, **F** = needs architectural/Fable judgment. Complexity: XS <½d · S ½–1d · M 1–3d · L 3d+. No implementation has been performed — plan awaits approval.

## P0 — Blocking (data loss, PHI leak, correctness bug, primary-CTA missing)

Verbatim from `FABLE_DECISIONS.md` §"P0 set for 08-prioritized plan":

| Order | Issues | What | Complexity | Owner | Dependencies |
|---|---|---|---|---|---|
| P0-1 | 07-001 | Breadcrumb renders patient email as visible text (Critical, GDPR-plan violation) — fix in `useBreadcrumbs` (`portal-shell.tsx`), mask/skip email-shaped segments portal-wide | S | S | Also affects admin patient routes — verify in the same pass; quick legal/compliance sanity check recommended given the explicit prior intent to hide this data |
| P0-2 | 03/UX-001, 07-004, 08-005, 09-001, 15-003, 15-004 | Portal-wide adoption of the existing `UnsavedChangesGuard`/`useUnsavedChanges` primitives (currently **zero** doctor-portal consumers, verified by grep — see `05-shared-component-impact-map.md` §9) across 6 forms: consultation SOAP note (03), patient chart (07), service selection (08), form templates (09), profile identity+bio (15 ×2) | M (1 ticket, per-page wiring listed under it) | F design, S wiring | None — primitive already exists and ships in patient portal |
| P0-3 | 05-001 | Week grid loses Thu–Sun entirely on mobile, zero scroll affordance — `min-w-0` fix on `availability-week-view.tsx:112` grid wrapper | S | S | **Verify identical bug on admin per-doctor availability editor** (shares `WeekCalendar`) in the same PR |
| P0-4 | CAL-04-001 | Calendar month grid entirely below fold on mobile/short — reorder sections (toolbar+grid above stats), drop redundant `PageHeader` description on this page | S | S | Compliance-banner persistence (portal-wide) is a separate, larger fix — flag but don't block this ticket on it |
| P0-5 | 03/IH-001 | Appointment-detail 6-tab strip clipped at short viewport — `PortalTabs` overflow fix | M | F (shared component) | Must land before Patient Record (07), Security (16), Invoices (12) adopt `PortalTabs` for their new tab structures — see `05-shared-component-impact-map.md` §2 |
| P0-6 | 02-001, 15-001(page 02, filter toggle) | Appointments filter panel permanently expanded and un-collapsible on desktop (`sm:pointer-events-none` dead toggle) — pushes every row below the fold, zero rows visible at 1366×650 | S | S | Product sign-off recommended on the new default-collapsed density (page audit's own open question) |
| P0-7 | 07-002 | Appointment history sorted by `createdAt` instead of displayed `scheduledAt` — one-line backend `orderBy` fix, `doctor-actions.route.ts:513` | XS | S | None — sibling endpoint already has the correct pattern |
| P0-8 | 15-006 | "Public profile" form PATCHes the **global** profile endpoint for 4 fields (name/qualifications/languages/WhatsApp) while its own heading claims country-scoped save — silent cross-country mutation | M | F (structural, multi-locale-file) | Touches 6 locale files; bundle with 15-001/15-002 (same page, same review pass) |
| P0-9 | 03/UX-005 | No CTA at all when an online appointment has no meeting link yet — the single most time-critical action is invisible on first load | S–M | F (decide small reorder vs full header move — page audit recommends starting with the smaller reorder) | Payload contract unchanged either way |

## P1 — High impact (page/portal architecture)

| Order | Issues | What | Complexity | Owner | Dependencies |
|---|---|---|---|---|---|
| 1 | 16-001, 16-003, 16-004, 16-005 | Security page rebuild: add Password + Sessions tabs (reuse already-shipped, role-agnostic `changeCurrentPassword`/`signOutAllDevices`), retitle H1 to "Security", add unsaved-changes guard to 2FA setup, add portal-wide skip-to-content link | L | F | Reuses `PortalTabs` (needs P0-5's overflow fix landed first) |
| 2 | 12-001, 12-002, 12-003, 12-006, 13-002, 13-003, 13-005 | Invoices tab split (Consultations / Monthly statement) + payout-"Not set" explainer + Reports reorder + drop duplicate payout-statement export from Reports' dropdown, replace with cross-link | M–L | F (coordinate both pages in one review) | `PortalTabs` (P0-5) |
| 3 | 01-001, 01-002 | Dashboard hero backlog-aware copy ("No consults today · 12 open in your queue") + OPEN stat gets `tone="warning"`+`href`; compliance-banner background gets warning tint, not just border | S | S | None |
| 4 | 07-003, 07-005, 07-006, (IA: safety-strip promotion + tabs) | Patient Record: promote clinical-alerts/allergy strip above the fold (currently the doctor's #1 priority task is placed last in the page); add tabs for Appointment history / Consultation history / Patient chart; remove duplicate Summary card; fix table column clip | M | F (structural — page merge/tab adoption needs review per brief) | `PortalTabs` (P0-5) |
| 5 | 15-001, 15-002 | Profile: single market-count source (kills the "Markets 3" vs "Markets 2" contradiction + phantom Portugal listing), delete the redundant `ProfileInsight` strip, merge its one real signal into `AdminSummaryStrip` | S–M | F | Bundle with P0-8 (same file, same review) |
| 6 | 10-001, 10-002, 10-003 | Messages: decouple loading spinner from header/`lockToggle` presence (shared `ConsultationChat`); wire `onToggleLock` into the inbox; always render the order-number link with a fallback label (shared `MessagesInbox`) | M | F (shared components, 2 of 3) | Cross-portal visual regression required — see `05-shared-component-impact-map.md` §6-7 |
| 7 | 08-001, 08-002 | Services: merge redundant explainer card into `PageHeader` description; re-scope the stat strip to the active country tab instead of showing stale portal-wide totals | S | S | None |
| 8 | 02-002 | Reduce Appointments' stat strip from 4 cards to 2 (drop VISIBLE RESULTS, MEETING LINKS), wire OPEN CONSULTS / NOT FINALIZED as filter-shortcut links | S | S | Requires `AdminSummaryStrip` `href` prop (additive, shared — see impact map §3); pairs naturally with P0-6, same file |
| 9 | 05-002, 05-004 | Availability: add non-blocking overlap warning on add-window (the live account already has duplicate/overlapping windows as evidence); interpolate the specific window's day/time into the delete-confirm dialog | S | S | None |
| 10 | 06-001 | Patients: collapse stat strip to a single inline line and/or move search into the header row on narrow/short viewports so the list is reachable without scrolling past 3 stat cards | S | S | Requires `AdminSummaryStrip` compact-mode variant (shared, additive) |
| 11 | 09 (§15/§17 restructure) | Forms: modal-ize the "New template" builder (list becomes full-width, "+ New template" opens a `PortalDialog`) — removes the always-visible builder taking 50% of screen real estate on every visit for a rarely-used action | M | F | Depends on `FormSection`'s existing `right` slot (no change needed) |
| 12 | CAL-04-002 | Calendar: validation errors on add-availability/time-off forms render ~170px off-screen with no scroll-into-view — split to per-form inline errors | S | S | None |
| 13 | Status lexicon consolidation | Single shared label map for appointment/consultation status, replacing the two independently-maintained string sets between Appointments list and Appointment Details detail/rail (see `04-cross-portal-design-system-findings.md` §3) | M | F | Touches doctor-portal locale bundle across 6 languages |
| 14 | (Owner decision, not scheduled) | Merge Calendar + Availability into one "Schedule" area with List/Calendar-style tabs | — | **Owner decision required** | See `03-doctor-information-architecture.md` and `09-open-questions-and-blockers.md` — flagged, not implementable without sign-off |

## P2 — Consistency

| Issues | What | Complexity |
|---|---|---|
| 02-003, 02-004, 02-005 | Shadow-source audit on `.gh-appointment-card__time`/`.gh-pill`/pill-internal spans (portal.css); no-meeting-link row gets a real secondary button instead of caption+chevron; rename "Legacy open window" copy | S each |
| 19-001, 02/06/09/11/12/13/16/17 breadcrumb truncation | Shell-wide: reposition/z-index the floating "N" widget; fix breadcrumb mid-word truncation with proper ellipsis/hide-below-threshold (bundle with P0-1's `useBreadcrumbs` change) | S |
| UX-004, UX-006, VIS-001, VIS-003 | Fix duplicate "Patient chat" heading; clinic-time preview on reschedule field; flatten `AppointmentActions`/`FinalizeChecklist` self-wrapping cards into their parent `FormSection`; 2×2 mobile stat-strip grid | S each |
| UX-003 | Disable Finalize button until both checklist boxes are checked, instead of click-then-error | XS |
| CAL-04-004, CAL-04-005, CAL-04-006, CAL-04-007, CAL-04-008, CAL-04-009 | Day-cell `aria-label` extension (shared `MonthCalendar`); date `min` constraint on availability form; fix badge clip; `EventDetailDialog viewerRole="doctor"` suppression (shared, needs patient/admin screenshot verification); Legend → popover; dedupe "Add availability" label | S each |
| 05-003, 05-005, 05-006, 05-007/05-009, 05-008 | Group/label near-duplicate weekly windows by effective-date; unify the two identical error banners; move validation inline near the offending field; enlarge delete-button touch target; add icon/pattern to color-only slot status (shared `WeekCalendar`) | S each |
| 08-003, 08-004, 08-006 | Hand off CZ/EN translation-completeness gap to content-ops (not a code fix); add retry-on-error button; consider collapsing redundant Selected/Bookable stat pair when they coincide | XS-S |
| 09-002, 09-003, 09-004, 09-005 | Remove native `required` conflicting with app's own validation copy (also unblocks the dead "no fields" branch); interpolate delete-confirm with the template title; fix loading-skeleton shape mismatch | S each |
| 11-002, 11-003 | Remove the static "SOURCE" stat tile; treat mobile loading-flash as a perf watch-item only (no fix required unless real users report it) | XS |
| 13-001, 13-006 | Single shared empty-state when both breakdown tables are empty simultaneously; rename "Export CSV"/"Download lists" for clearer CSV-vs-Excel/PDF distinction | S |
| 14-001, 14-002, 14-003 | Profile picker: add per-country status chips (verification + payout, data already fetched); add retry on error; account-menu deep-link target is a separate owner call | S |
| 15-004, 15-005, 15-008, 15-009, 15-010, 15-011, 15-012, 15-015, 15-016 | Bio-field dirty-tracking via `RichTextHtmlField` `onDirty` callback; country-matched IBAN placeholders; `aria-label` on 6 unnamed toolbar swatches (shared, coordinate w/ admin); `role="status"` on save banners; heading-order H2 fix; `PortalDialog` for photo-remove; retry on intermittent load failure; WhatsApp field default-country fix; swap hardcoded Tailwind palette for `gh-status-*` tokens | S each |
| 17-001, 17-002, 17-004 | Branch header description on `accepted` state; viewport-relative agreement-text scroll height; `tabIndex`/`role="region"` on the scroll container | XS each |
| 22-001 | Verify pagination beyond 25 results exists and works — needs a bigger seeded account or a dedicated code review before this can even be scheduled | — (blocked) |
| Modal focus-trap verification | `consultation-documents-modal.tsx` (03) not fully verified for tab-cycling confinement — dedicated a11y follow-up | S |

## P3 — Polish

01-003 (notification-panel timestamps), 01-004 (dismiss microcopy caption), 11-001/12-001 on page 01 (panel-header flattening — defer until coordinated with the shared-atom owner; loading skeleton — defer, needs production latency data first), generic bar-chart icon differentiation across every `AdminSummaryStrip` tile portal-wide (01, 06, 07), 14-004 (top-heavy composition — resolved as a side effect of 14-002, no separate work), 09-006/09-007 (fold into the modal-ize work at P1 item 11, no standalone ticket), 17-003 (IA question — **resolved, no code change**: this audit's and Fable's recommendation is to keep Confidentiality standalone).

## Sequencing logic

1. **P0 first, independently shippable** — none depend on the design-system decisions below them. P0-5 (`PortalTabs` overflow) should land early within the P0 batch since 3 separate P1 items depend on it.
2. **P1 item 1 (Security tabs) and item 2 (Invoices/Reports split) both consume `PortalTabs`** — sequence after P0-5, not before.
3. **P1 item 5 (profile strip/market-count) is the same file as P0-8** — do both in one reviewed pass, not two.
4. Shared-component edits (impact map §1-8) each require a cross-portal screenshot pass before merge — budget this explicitly, don't treat it as included in the page-local complexity estimate.
5. Re-audit checkpoint: after the P0 batch and after P1 items 1-2 (the two tab-adoption pieces), re-run the 7-viewport screenshot sweep and diff against this audit's baseline screenshots.

## Phases (mirroring the patient-audit plan format)

- **Wave 1 = P0** — 9 tickets, ~2-3 dev-days each average, touches 8 distinct pages + 1 shared shell component. Est. 10-14 dev-days.
- **Wave 2 = P1 structural** — 14 items, several requiring Fable/owner sign-off before implementation (Security rebuild, Invoices/Reports split, Patient Record tabs, Calendar/Availability merge). Est. 15-20 dev-days, longer if the Schedule-merge owner decision lands as "yes."
- **Wave 3 = P2/P3** — mechanical per-page fixes once the Wave 1/2 patterns are set (shadow audit, breadcrumb truncation, a11y batch, microcopy). Est. 8-10 dev-days.

## Items requiring owner approval / clinical-legal review / backend work before scheduling

- **Owner approval:** Calendar+Availability "Schedule" merge (P1 item 14); Appointments filter default-collapsed density (P0-6); Invoices tab split naming/scope (P1 item 2); account-menu Profile deep-link target (P2, 14-001).
- **Clinical/legal review:** none of the items above require it directly, but P0-1's breadcrumb-PII fix should get a quick compliance sanity check given the explicit GDPR-plan intent it's correcting; a possible future finalize-semantics change on Appointment Details (self-attested checklist → system-derived) was raised by the page audit as a **recommendation requiring clinical/legal review** and is **not scheduled** — see `09-open-questions-and-blockers.md`.
- **Backend work:** P0-7 (one-line `orderBy` fix) is the only backend change in P0. No other P0/P1/P2 item requires a schema or API contract change — confirmed frontend-only in every page audit's §23.
