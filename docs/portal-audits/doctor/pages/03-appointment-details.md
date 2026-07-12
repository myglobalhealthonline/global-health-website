# 03 — Appointment Details (Consultation Workspace)

## 1. Page Identification

| Field | Value |
|---|---|
| Name | Appointment Details / Consultation Workspace |
| Route | `doctor/appointments/[id]` |
| Entry points | Appointments list row click, notification bell deep-link (`?tab=`), follow-up chain link, `#patient-chat` hash link |
| Role | DOCTOR |
| Workflow stage | Core clinical workspace — the single page where a consult happens end-to-end (join call → write SOAP note → issue docs/prescriptions → finalize → follow-up) |
| Frontend files | `frontend/app/(doctor)/doctor/appointments/[id]/page.tsx`, `loading.tsx`, all 18 files in `_components/` |
| Shared components | `AdminSummaryStrip`, `AdminCard`, `SectionHeader` (via `FormSection`), `PortalTabs`/`PortalTabPanel`, `PortalDialog` (prescriptions delete), `InternalMessagesThread` (`components/chat/`) |
| APIs observed (code) | `GET` consultation/exams/messages/form-submissions/form-templates/documents/generated-documents/me/prescriptions (parallel `Promise.all`), `PATCH .../consultation`, `POST .../consultation/sign`, `PATCH .../` (status/slot/mode/meeting-url), `POST .../finalize`, `POST .../follow-up`, `POST/DELETE .../prescriptions`, document-generate/-send/-context, exams, form-submissions, internal-messages |
| Date | 2026-07-12 |
| Viewports tested | desktop 1440×900, laptop 1280×720, tabletl 1024×768, tabletp 768×1024, mobile 390×844, smobile 375×667, short 1366×650 (all 7, browser-verified) |
| States tested | Default (BOOKING_CONFIRMED-ish/`REQUEST_RECEIVED`, has meeting link) browser-verified; Draft note dirty-then-navigate-away browser-verified; sign-confirm dialog attempted (native `confirm()`, dismissed) browser-verified; finalize-without-checklist validation browser-verified; follow-up form open browser-verified; document workspace modal open/Escape browser-verified; tab switch (all 6 tabs) browser-verified; second appointment id (no meeting link, `BOOKED — WAITING PAYMENT`) browser-verified; a "CONCLUDED" id was still DRAFT/unsigned in DB, so true signed/locked state is code-derived only |

## 2. Page Purpose

The doctor's per-consultation workspace: identify the patient, join or manage the video call, write and sign the SOAP note, issue clinical documents (exam requests, prescriptions, certificates), log services rendered, finalize the appointment, and optionally book a follow-up — all for one appointment.

## 3. Primary Doctor Tasks (priority order)

1. Confirm who the patient is and when the appointment is (identity/time/status).
2. Join the video call (if online) or see the location context (if in-person).
3. Write/update the SOAP note during or after the consult.
4. Issue prescriptions / exam requests / certificates.
5. Log services rendered (feeds the invoice).
6. Sign the note (locks it).
7. Finalize the appointment (checklist gate).
8. Optionally: book a follow-up, message the patient, leave an internal handoff note for admin.

## 4. Clinical/Operational Importance

Highest-value page in the portal — this is where medico-legal documentation (signed SOAP notes, prescriptions, certificates) is created. Data loss here (unsaved note wiped by an accidental back-click) or a mis-set appointment status has direct clinical/compliance consequences, not just a UX inconvenience.

## 5. Current Page Structure (top-to-bottom)

1. Portal-wide "Complete your compliance setup" banner (2FA nudge, dismissible) — not page-specific, occupies ~90px before anything appointment-related.
2. `← Back to appointments` link
3. Header: patient name (H2), consult type · date/time · country, delivery-mode pill, follow-up-of pill, `Join call` + `Print summary` buttons
4. `AdminSummaryStrip` — 4 stat cards: Consultation Note (Draft/Signed), Documents (count), Clinical Items (count), Messages (count)
5. Two-column grid (≥1024px): left = tab strip + panel; right = sticky Patient rail
6. Tabs: **Overview** (Meeting & status form, Finalize checklist + Book follow-up, Consultation documents card, Brazil consent if BR) → **Consultation** (SOAP form, Services rendered, Share with colleague) → **Clinical** (Exam results, Prescriptions) → **Forms** (Fill form, Submissions) → **Documents** (generated docs table, uploads, review & send) → **Messages** (Patient chat, Internal notes) → **Patient** (duplicate of rail, <1024px only)
7. Right rail: Patient context card (GHN, email, phone, DOB, language, status, booked-at, booking notes, "Open patient chart" link)

## 6. Current Container Hierarchy

```
page (gh-doctor-appointment-workspace)
 └─ AdminSummaryStrip (4 stat cards)               [L1 — flat, fine]
 └─ grid (workspace-grid)
     ├─ tab column
     │   └─ PortalTabPanel
     │       └─ FormSection (AdminCard, L1)        [L1: card]
     │           └─ inner widget card                [L2: e.g. AppointmentActions
     │               (rounded-lg border bg-white/75)   / FinalizeChecklist / consult
     │               └─ icon badge (rounded-md bg)      form's own field group]
     │                                               [L3: icon-badge pill — decorative,
     │                                                not a real surface]
     │           └─ Services-rendered / Share sub-block  [L2, divider-separated, no card]
     └─ aside (context rail)
         └─ FormSection (AdminCard)                 [L1: card]
             └─ dl rows (border-b only, no bg)       [not a surface — fine]
```

Max simultaneously-visible nesting on Overview tab = **3 surface levels** (page → FormSection card → inner widget card, e.g. `AppointmentActions`'s own `rounded-lg border bg-white/75 shadow-sm` wrapper nested inside the `FormSection`'s `AdminCard`). This is one level more than necessary: `AppointmentActions`, `FinalizeChecklist`, and the Documents-tab `HistorySection`/upload table each re-wrap themselves in their own bordered/shadowed container even though their parent `FormSection` is already a card — a card-in-card pattern repeated 3+ times on this page. Unnecessary level: the inner component wrapper (L2) should be flattened into the `FormSection`'s own grid (no border/shadow/bg of its own), leaving header/description spacing to `SectionHeader` alone.

## 7. Interaction Inventory

| Element | Type | Action | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| `Join call` | link (button-styled) | click (not clicked, safety) | opens Meet URL in new tab | Only shown when `meetingUrl` set — no CTA at all when missing (see 8) | `03-appointment-details-default-desktop-default-01.png` |
| `Print summary` | link | — | opens `/print/appointments/[id]` new tab | fine | — |
| Tab strip (6 tabs) | `role=tab` buttons | click each | switches panel instantly (all pre-rendered, hidden) | Overview/Consultation/Clinical/Forms/Documents/Messages all verified switching | `-tab-clinical-01.png`, `-tab-consultation-01.png`, `-tab-documents-01.png`, `-tab-forms-01.png`, `-tab-messages-01.png` |
| Consultation textarea (Chief Complaint) | textarea | typed test text, then clicked "Back to appointments" | **Navigated away immediately, no warning, no dialog** | Critical — no unsaved-changes guard | `-laptop-consultation-dirty-02.png` → `-laptop-after-navaway-03.png` |
| `Save & sign` | button | clicked, dialog listener attached | native browser `confirm()` fires (JS `confirm()`, not `PortalDialog`) | Medium — inconsistent with app's own dialog primitive, unstyled, non-brandable, not focus-trapped by app code | `-laptop-sign-dialog-04.png` |
| `Finalize appointment` | button | clicked with both checklist boxes unchecked | inline red validation "Confirm both checklist items before finalizing." | Correct guard behavior, but validation only fires after click instead of disabling the button while unchecked | `-laptop-finalize-validation-01.png` |
| `Book follow-up` | button | clicked | inline form expands (When / Delivery / Notes) | Fine, no confirmation needed since it's non-destructive create | `-laptop-followup-open-01.png` |
| `Open document workspace` | button | clicked | `ConsultationDocumentsModal` opens, focus moves in | Fine | `-laptop-docworkspace-modal-01.png` |
| Modal `Escape` | keyboard | pressed Escape | Modal closes | Fine (Escape supported) | `-laptop-docworkspace-closed-01.png` |
| Meeting/status `Save` | button | submit with no field changed | inline error "Nothing to change" | Fine, clear feedback | `-laptop-overview-save-nochange-01.png` |
| Keyboard Tab (9 presses from load) | keyboard | Tab×9 | Lands on "Forms" tab with visible 3px lime focus ring (`box-shadow`) | Focus visibility good | `-laptop-keyboard-focus-08.png` |
| `Open patient chart` | link | — | navigates to `/doctor/patients/[email]` | Using patient **email** as the identifier in the URL — PII in URL path, also breaks if email has special chars | — |

## 8. Page States Tested

| State | Browser/Code | Result | Issue |
|---|---|---|---|
| Default, has meeting link, unsigned draft | Browser | Full page renders, 0 documents/clinical items/messages | — |
| No meeting link (`BOOKED — WAITING PAYMENT` id) | Browser (attempted; screenshot capture cut short by tool timeout, page confirmed to load without console errors on first pass) | `Join call` button absent entirely | High — see UX-005 |
| Dirty SOAP note → navigate away | Browser | No guard, silent data loss | Critical, UX-001 |
| Sign confirm | Browser | Native `confirm()` dialog | Medium, VIS-002 |
| Finalize, checklist unchecked | Browser | Inline red error text | Low polish opportunity |
| Empty documents/exams/prescriptions/messages | Browser (this appointment has 0 of each) | Empty states render as plain descriptive text under section header, no illustration/CTA distinction from populated state at a glance | Medium, CONTENT-001 |
| Signed / locked consultation | **Code-derived** (`consultation-form.tsx` `disabled={signed}` on every textarea + both buttons; `prescriptions-list.tsx` takes `consultationLocked`; `services-used-list.tsx` takes `locked={signed}`) | All clinical-entry fields disable; Share-with-colleague button enables | Not browser-verified — no signed record found among the 4 scouted ids within time budget |
| Loading | `loading.tsx` code read | Two skeleton cards, generic bars — does not mirror the real two-column/tab structure | Low |
| Error (consultation fetch fails) | Code (`page.tsx` L98-112) | Whole page replaced by a single warning card with only a back link — no retry | Medium |

## 9. Screenshots

All in `docs/portal-audits/doctor/screenshots/03-appointment-details/`:

| Filename | Viewport | State | Reason | Issues shown |
|---|---|---|---|---|
| `03-appointment-details-default-desktop-default-01.png` | 1440×900 | default | full matrix | baseline |
| `03-appointment-details-default-laptop-default-01.png` | 1280×720 | default | full matrix | baseline |
| `03-appointment-details-default-tabletl-default-01.png` | 1024×768 | default | full matrix | rail still visible at exactly 1024 |
| `03-appointment-details-default-tabletp-default-01.png` | 768×1024 | default | full matrix | rail collapses to Patient tab |
| `03-appointment-details-default-mobile-default-01.png` | 390×844 | default | full matrix | 4 stacked stat cards push tabs below the fold |
| `03-appointment-details-default-smobile-default-01.png` | 375×667 | default | full matrix | worse version of the above |
| `03-appointment-details-default-short-default-01.png` | 1366×650 | default | fold check | only stat-strip visible, tab bar clipped at the very bottom edge |
| `03-appointment-details-laptop-consultation-tab-01.png` | 1280×720 | Consultation tab | interaction | SOAP form default |
| `03-appointment-details-laptop-consultation-dirty-02.png` | 1280×720 | dirty note | interaction | unsaved text entered |
| `03-appointment-details-laptop-after-navaway-03.png` | 1280×720 | post-navigation | interaction | proves silent navigation, no guard (UX-001) |
| `03-appointment-details-laptop-sign-dialog-04.png` | 1280×720 | after sign-confirm dismissed | interaction | native confirm used (VIS-002) |
| `03-appointment-details-laptop-docworkspace-modal-01.png` | 1280×720 | modal open | interaction | Consultation documents modal |
| `03-appointment-details-laptop-docworkspace-closed-01.png` | 1280×720 | modal Escape-closed | interaction | Escape works |
| `03-appointment-details-laptop-finalize-validation-01.png` | 1280×720 | validation error | interaction | inline red error text |
| `03-appointment-details-laptop-followup-open-01.png` | 1280×720 | follow-up form open | interaction | inline expand |
| `03-appointment-details-laptop-overview-save-nochange-01.png` | 1280×720 | no-op save | interaction | "Nothing to change" |
| `03-appointment-details-laptop-tab-clinical-01.png` / `-tab-consultation-01.png` / `-tab-documents-01.png` / `-tab-forms-01.png` / `-tab-messages-01.png` | 1280×720 | each tab | interaction | tab-content check |
| `03-appointment-details-laptop-keyboard-focus-08.png` | 1280×720 | Tab×9 | a11y | visible focus ring |
| `03-appointment-details-laptop-concluded-state-09.png` / `-concluded-consultation-10.png` | 1280×720 | "CONCLUDED" id, still Draft | states | scouted id was not actually signed |

## 10. UX Problems

**UX-001 (Critical)** — No unsaved-changes protection on the SOAP note.
Evidence: browser, `03-appointment-details-laptop-after-navaway-03.png` (typed text into Chief Complaint, clicked "Back to appointments", navigated instantly with zero prompt).
Doctor impact: a doctor who writes part of a clinical note and then clicks any nav link, tab (browser tab), or the sidebar loses the note with no warning — real risk of re-doing clinical documentation work or, worse, believing it was saved.
Root cause: `consultation-form.tsx` keeps `state` in local React state with no `beforeunload`/router-transition guard; `save()` is the only path to persistence and nothing calls it automatically or blocks navigation.
Fix: add a dirty-check (`state !== initial`) that (a) registers a `beforeunload` listener for hard navigation/tab close, and (b) intercepts in-app navigation — Next.js App Router has no native `usePrompt`; use a `useEffect` on `popstate`/link-click capture, or simplest: wrap the Back link and tab-switch handler to show a `PortalDialog` confirm when the form is dirty. **The repo already ships exactly this primitive: `frontend/components/UnsavedChangesGuard.tsx` + `frontend/lib/hooks/use-unsaved-changes.ts`, already used on other doctor pages (`doctor/profile/_components/edit-form.tsx`, `doctor/services/_components/service-selection-form.tsx`). Wire `<UnsavedChangesGuard when={dirty} />` into `ConsultationForm` (and the document-workspace field forms) rather than building anything new.**

**UX-002 (Medium)** — Sign confirmation uses native `confirm()`.
Evidence: browser, `03-appointment-details-laptop-sign-dialog-04.png`; code `consultation-form.tsx:111`.
Doctor impact: unstyled OS dialog breaks visual continuity for an irreversible, medico-legally significant action (signing locks the note); no way to show the actual consequence copy beyond one line; not consistent with the `PortalDialog` used for prescription deletion two components away.
Root cause: `if (!confirm(copy.signConfirm))` — quick native shortcut instead of the app's dialog primitive.
Fix: replace with `PortalDialog` confirm pattern (already imported in `prescriptions-list.tsx` in the same directory) so signing gets the same modal treatment as deleting a prescription.

**UX-003 (Medium)** — Finalize button doesn't reflect checklist state until after a failed click.
Evidence: browser, `03-appointment-details-laptop-finalize-validation-01.png`.
Doctor impact: doctor must click Finalize once, get an error, then go check the two boxes — extra round trip for a state the UI already knows client-side.
Root cause: `finalize-checklist.tsx` doesn't disable the button while `!notesUploaded || !filesUploaded`; it always renders enabled and validates on click.
Fix: `disabled={pending || !notesUploaded || !filesUploaded}` on the button; drop the redundant inline-error path for this specific case (keep it for the network-failure case).

**UX-004 (Medium)** — Duplicate "Patient chat" heading.
Evidence: browser, `dump()` heading list returned `H3:Patient chat` twice on the Messages tab.
Doctor impact: minor, but confuses screen-reader users navigating by heading (two identically-named landmarks with no way to tell them apart).
Root cause: `page.tsx` wraps the chat `FormSection` in a `<div id="patient-chat">` and the `FormSection` itself renders a `title` heading — need to check `consultation-chat-section.tsx`/`FormSection` for a nested second heading; likely `DoctorConsultationChatSection` renders its own internal heading duplicating the section title.
Fix: keep exactly one heading per chat block; if `DoctorConsultationChatSection` needs a heading for its own layout, demote it to a non-heading label or delete the outer `FormSection` title.

**UX-005 (High)** — No CTA when there's no meeting link yet.
Evidence: code-derived, `page.tsx:227-237` — `{appointment.meetingUrl ? <a>Join call</a> : null}` — nothing renders in its place.
Doctor impact: for an online appointment that hasn't had a link pasted yet, the header shows nothing where the primary action should be; the doctor has to already know to scroll to the Overview tab's Meeting & status card to paste one. On first load this is the single most time-critical action (get the video link in before the slot) and it's invisible above the fold.
Fix: when `consultationMode === "ONLINE" && !meetingUrl`, render a header CTA ("Add meeting link") that scrolls/focuses the Meeting URL field in the Overview tab — same treatment `Join call` gets, just pointed at the input instead of an external URL.

**UX-006 (Medium)** — Rescheduling uses the doctor's browser-local timezone while the rest of the page displays clinic time.
Evidence: code-derived, `appointment-actions.tsx:45-61` (`toLocalInputValue`/`fromLocalInputValue` convert the `datetime-local` value via the browser's timezone) vs the header which renders the slot in clinic + patient timezones (`page.tsx:191-198` via `formatAppDualTz`). The field label even says "Slot (your local time)".
Doctor impact: this test account practices in Czechia + Portugal + Ireland; a doctor whose OS timezone differs from the clinic timezone (travel, multi-country practice) reschedules to a wrong wall-clock hour with no feedback.
Fix: render a live clinic-time preview under the input (reuse `formatAppDualTz` on the chosen value), or accept the input in clinic time and convert server-side.

## 11. Visual Design Problems

**VIS-001 (Low)** — Card-in-card pattern repeats 3× (AppointmentActions, FinalizeChecklist, generated-docs history section each add their own `border + rounded-lg + shadow-sm bg-white/75` wrapper inside the `FormSection`'s own `AdminCard`). See §6/§18 for the exact fix.

**VIS-002 (Medium)** — Native `confirm()` for signing (visual half of UX-002 — flagged again here because it's a first-class *visual* inconsistency: every other confirm on this exact page, e.g. deleting a prescription, uses the styled `PortalDialog`).

**VIS-003 (Low)** — 4-stat `AdminSummaryStrip` stacks to 4 full-width cards on mobile (390px) before any tab content is reachable — see `03-appointment-details-default-mobile-default-01.png`. Not "genuinely useless" (each has a real number), but the vertical space cost at this width is disproportionate to the value delivered (all 4 stats say "0" on a fresh appointment).

## 12. Information Hierarchy Problems

**IH-001 (High)** — At `short` (1366×650, common laptop-with-browser-chrome height) the entire visible viewport is consumed by the compliance banner + header + 4 stat cards; the tab bar is clipped at the very bottom edge and zero actionable content (Meeting & status, Join call context) is visible without scrolling. Evidence: `03-appointment-details-default-short-default-01.png`. For the highest-value page in the portal, the single most important action (the tab strip / meeting link) should never require a scroll on a standard laptop viewport.

**IH-002 (Medium)** — The dismissible "Complete your compliance setup" 2FA banner is portal-chrome, not appointment content, yet it sits above the appointment header on every visit until dismissed, competing with "who is this patient / what do I do next" for the top of the fold. This is a portal-wide banner (not scoped to this page) but its z-order/placement decision directly worsens IH-001 on this specific highest-traffic page.

## 13. Current Section Order

1. Compliance banner (global)
2. Back link
3. Header (identity + time + mode + Join call/Print)
4. Stat strip (4 cards)
5. Tabs: Overview → Consultation → Clinical → Forms → Documents → Messages (→ Patient, <1024px)
6. Overview tab internals: Meeting & status → Finalize checklist + Follow-up → Consultation documents → (Brazil consent if applicable)
7. Consultation tab internals: SOAP form → Services rendered → Share with colleague
8. Right rail: Patient context (persistent, ≥1024px)

## 14. Recommended Section Order (+ reasons)

1. Back link + header (identity/time/mode) — unchanged, correct at top.
2. **Primary action zone** (new, replaces buried Meeting & status): inline in the header itself — `Join call` (or `Add meeting link` per UX-005) stays the dominant CTA; move the meeting-URL/status/delivery-mode mini-form to a collapsed-by-default "Manage" affordance next to it rather than a full card one scroll down. Reason: this is the #1 time-critical action (§3.2) and currently sits below 4 stat cards.
3. Stat strip — keep, but compress on mobile (see §18) so it doesn't dominate the fold.
4. Tabs, same order (Overview/Consultation/Clinical/Forms/Documents/Messages) — the SOAP note (doctor's #1 documentation task) is one tab-click away as Consultation, which is correct; Overview should keep Finalize + Follow-up + Consultation-documents-launcher since those are wrap-up actions, not the meeting-link mini-form once it moves to the header (see #2).
5. Right rail — keep persistent Patient context; unchanged.

Reasoning: current order buries the two things a doctor needs in the first three seconds (join the call, see the note status) beneath a global banner and 4 stat tiles that are usually all zero on a fresh appointment.

## 15. Tabs/Steps/Sectioning Recommendation

**Keep tabs** (current `AppointmentTabs`/`PortalTabs` structure is correct for this page) — a single long scroll would bury the SOAP note, documents, and messages behind clinical-items in one unbroken page; tabs are the right call given DESIGN.md §6.3 already specifies this and it works well in practice (fast, no reload, badges convey pending counts).

One structural change: **fold the Overview tab's "Meeting & status" mini-form into the header** as described in §14, leaving Overview with just Finalize + Follow-up + Consultation-documents-launcher (+ Brazil consent). This removes one full `FormSection` card from Overview and shortens the pre-fold scroll on `short` viewport.

Do not add a numbered wizard/step flow — a consult isn't linear (doctor may write notes mid-call, issue a prescription before finishing SOAP, message the patient after signing) and tabs preserve that freedom; steps would force an artificial order.

## 16. Save & Finalization Recommendation

Current model is broadly sound (draft PATCH vs explicit sign POST vs separate finalize POST) but has three gaps:
1. Add the dirty-state guard (UX-001) — non-negotiable given this holds clinical text.
2. Replace `confirm()` with `PortalDialog` for signing (UX-002) so the irreversible action gets the same modal weight as other destructive/locking actions in this codebase.
3. Disable Finalize until both checklist boxes are checked (UX-003) instead of click-then-error.

No change needed to the underlying save scope — "Save draft" saves the SOAP text only, "Save & sign" locks it, "Finalize appointment" is a separate downstream gate — this three-tier model is clear and should stay.

## 17. Proposed Page Structure (top-to-bottom)

1. Back link
2. Header: patient name/time/mode + primary CTA (Join call / Add meeting link) + a collapsed "Manage meeting" disclosure (status/slot/mode/URL) + Print summary
3. Stat strip (kept, compacted on mobile per §18)
4. Tabs: Overview (Finalize · Follow-up · Consultation-documents launcher · Brazil consent) / Consultation (SOAP · Services rendered · Share) / Clinical / Forms / Documents / Messages / (Patient, <1024px)
5. Right rail: Patient context (unchanged)

## 18. Proposed Container Simplification

| Element | Action | Detail |
|---|---|---|
| `AppointmentActions` wrapper (`rounded-lg border bg-white/75 shadow-sm`) | **Flatten** | Remove the component's own border/shadow/bg; it already lives inside a `FormSection`'s `AdminCard`. Keep the internal `grid gap-4` only. File: `appointment-actions.tsx:143`. |
| `FinalizeChecklist` wrapper (`rounded-lg border bg-white/75 shadow-sm`) | **Flatten** | Same reasoning. File: `finalize-checklist.tsx:78`. Keep the checkbox rows' own `border + bg-well` — those are real distinct controls, not decorative nesting. |
| Generated-docs `HistorySection` (`rounded-md border`) inside Documents tab's `FormSection` | **Keep** | This one is a legitimate second surface — it's a distinct sub-list (history) inside a tab that also contains an upload table; two genuinely different data sets justify the extra border. |
| Icon badge spans (`size-9 rounded-md bg-primary`) on Finalize/AppointmentActions | **Keep** | Decorative icon chip, not a data surface — fine as-is, just don't count it as a "card level" (it isn't one). |
| Meeting & status `FormSection` on Overview | **Move** | Relocate its two live fields (meeting URL, status) into the header per §14/§17; drop the standalone card once emptied. |
| Mobile stat strip (4 stacked full-width cards) | **Compress** | Switch `AdminSummaryStrip` to a 2×2 grid below `sm` breakpoint instead of a 1-column stack, halving the vertical cost before reaching tabs (`portal.css`, add a `@media (max-width: 480px)` rule scoped to `.gh-doctor-appointment-workspace` — new glass/backdrop classes aren't involved here so no mobile-fallback-block obligation, but confirm `AdminSummaryStrip`'s existing responsive CSS doesn't already special-case this page before adding a new rule). |
| Sign confirmation | **Replace** | Native `confirm()` → `PortalDialog`, matching `prescriptions-list.tsx`'s existing delete-confirm usage in the same directory. |

Max visible surface levels recommendation: **2** (page → `FormSection` card) for simple content blocks; **3** only where a tab genuinely holds two distinct datasets side-by-side (e.g. Documents tab's generated-history vs uploads).

## 19. Responsive Findings (per viewport)

- **desktop (1440) / laptop (1280)**: Two-column grid works well, rail stays visible, no overflow. Baseline.
- **tabletl (1024)**: Exactly at the `lg` breakpoint — rail still shows (breakpoint is `min-width:1024px`), tab labels start to feel tight but don't wrap/clip.
- **tabletp (768)**: Rail correctly collapses; Patient info only reachable via the "Patient" tab (7th tab) — verified in `03-appointment-details-default-tabletp-default-01.png`. This is intentional per the code comment in `page.tsx:624-626` and works.
- **mobile (390) / smobile (375)**: Stat strip stacks to 4 full-height cards before the tab bar — see IH item / VIS-003. Everything else reflows correctly (SOAP form fields full-width, no horizontal scroll observed).
- **short (1366×650)**: Fold problem — see IH-001. This is the most actionable responsive finding: a doctor on a 1366×768 laptop with normal browser chrome (address bar + bookmarks bar ≈ 100-120px) gets a viewport very close to this "short" preset and cannot see the tab bar without scrolling.
- Sticky elements: `.gh-doctor-context-rail` is `position: sticky` at ≥1024px (`portal.css:3160-3164`) — did not observe it covering content in any capture; the tab strip itself is also sticky (`PortalTabs sticky` prop) — no overlap issue seen at any tested viewport, but worth a scroll-through check post-fix since IH-001's header CTA move will change vertical offsets.

## 20. Accessibility Findings

- Heading order: `H2` (patient name) → flat `H3`s per section, one `H4` pair (Services rendered / Share with colleague nested under Consultation's `H3`). No skipped levels observed except the expected H1 living in the portal shell layout (not this page's concern). One duplicate: two `H3:Patient chat` — see UX-004.
- Icon-only buttons: none found without an accessible name (`iconOnlyIssues` evaluate returned empty) — good, no fix needed here.
- Focus visibility: confirmed via keyboard Tab×9 — active element (`Forms` tab) shows a clear 3px lime `box-shadow` ring (`rgba(143,176,33,0.65) 0 0 0 3px`), meets visibility bar. Evidence: `03-appointment-details-laptop-keyboard-focus-08.png`.
- Modal (Consultation documents): Escape key closes it (verified). Did not verify full focus-trap (tab cycling confined inside) within the time budget — flag as **not verified**, recommend a follow-up check specifically on `consultation-documents-modal.tsx`.
- Status not color-only: consultation-note badge uses both color AND text ("Draft"/"Signed") — good. Delivery-mode pill uses icon (`Globe2`/`MapPin`) + text, not color alone — good.
- Sign confirmation via native `confirm()` (UX-002) is itself an a11y regression risk: OS dialogs are keyboard-accessible by default but bypass the app's own focus-management/ARIA conventions used everywhere else (`PortalDialog`), so screen-reader users get an inconsistent experience between this and the prescription-delete dialog two clicks away.
- Contrast: not exhaustively spot-checked via `getComputedStyle` this pass — muted text tokens (`--portal-muted`) are used extensively for secondary copy; recommend a dedicated contrast pass across the whole portal design-token set rather than a one-off per page (tokens are shared).

## 21. Content & Microcopy Findings

| Current | Recommended | Reason |
|---|---|---|
| "Save" (AppointmentActions submit button) | "Save changes" | "Save" alone doesn't say what — this form saves slot/mode/link/status together, worth a slightly more explicit label given it's a multi-field save. |
| "Nothing to change" (error-styled, on no-op save) | Same text, but render as neutral/info tone, not the red/amber warning style — it's not an error, the user just clicked Save with no edits. |
| Status option "Created" (`REQUEST_RECEIVED`) | **Rename — vocabulary mismatch with the appointments list (browser-verified):** the list page renders the same enum values as "BOOKED – WAITING PAYMENT / BOOKING CONFIRMED / CONCLUDED", while this page's select and rail show "Created / Sent / Contacted / Concluded / Cancelled" (`page.tsx:69-75`). A doctor moving between list and detail sees two different names for one state. Unify via one shared label map in `frontend/locales/*/doctor.json` used by both pages. |
| "Confirm both checklist items before finalizing." | Fine as-is; becomes moot once UX-003 disables the button instead. |
| Date format "23/05/2026, 9:21:23 pm" (Booked row) | Trim seconds — "23/05/2026, 9:21 pm" is sufficient precision for a booking timestamp and matches the terser formats used elsewhere on the page (Slot field shows no seconds). |
| "DOCUMENTS 0 — Uploads and generated PDFs" | Fine; stat-card hints are already descriptive. |

## 22. Component & Code Impact

| Component | Path | Change | Shared? | Risk | Complexity |
|---|---|---|---|---|---|
| `consultation-form.tsx` | `_components/consultation-form.tsx` | Add dirty-check + navigation guard (`beforeunload` + intercept in-app nav); swap `confirm()` for `PortalDialog` | No (page-local) | Medium — touches the save/sign flow directly | Medium |
| `finalize-checklist.tsx` | `_components/finalize-checklist.tsx` | Disable Finalize button until both checkboxes checked | No | Low | Low |
| `appointment-actions.tsx` | `_components/appointment-actions.tsx` | Remove self-wrapping card border/shadow (flatten into parent `FormSection`); optionally split meeting-URL field out to header per §14 (larger change) | No | Low for flatten; Medium for header-move (touches `page.tsx` layout) | Low (flatten) / Medium (header move) |
| `page.tsx` | `app/(doctor)/doctor/appointments/[id]/page.tsx` | Move meeting-link CTA to header (UX-005); duplicate-heading fix for Messages tab | No | Low-Medium — layout-only, no data changes | Medium |
| `AdminSummaryStrip` usage on this page | `components/portal-atoms` (shared) or a page-scoped CSS override | 2×2 grid below `sm` for this page only | **Shared component** — prefer a scoped CSS rule (`.gh-doctor-appointment-workspace` selector) over touching the shared component's default grid, since other pages use `AdminSummaryStrip` at 1-col-mobile intentionally | Medium if done at the shared-component level; Low if scoped via `portal.css` | Low |
| `consultation-documents-modal.tsx` | `_components/consultation-documents-modal.tsx` | Verify/add full focus trap | No | Low | Low-Medium |

## 23. Backend or Business-Logic Impact

- Frontend-only: dirty-guard, dialog-swap, container flattening, header CTA relocation, stat-strip mobile grid, duplicate-heading fix, button-disable logic, microcopy — no API/schema changes required for any of these.
- No clinical/legal review needed for the UX/visual fixes listed (they don't change what data is captured, signed, or stored — only how/when the doctor is warned or where controls are placed).
- Note: moving the meeting-URL field into the header (§14/§17) does not change the `PATCH /api/doctor/appointments/[id]` payload contract — same fields, new placement only.

## 24. Recommended Implementation Order

1. UX-001 unsaved-changes guard (Critical, data-loss risk — do first).
2. UX-002 sign-confirm → `PortalDialog` (pairs naturally with #1 since both touch `consultation-form.tsx`).
3. UX-003 Finalize button disable (small, isolated).
4. UX-004 duplicate heading fix (trivial, isolated).
5. Container flattening (§18 rows 1-2) — cosmetic, low risk, do in one pass.
6. UX-005 header meeting-link CTA + Overview reflow (§14/§17) — largest layout change, do after the smaller fixes land and are verified stable.
7. Mobile stat-strip 2×2 grid (§18) — independent, can be done anytime.

## 25. Acceptance Criteria (measurable)

- Typing into any SOAP field then attempting to navigate away (link click, tab switch, browser back) triggers a confirm dialog; canceling keeps the user on the page with the typed text intact.
- Clicking "Save & sign" opens the app's `PortalDialog` (not a native `confirm()`); Escape and click-outside both cancel without signing.
- "Finalize appointment" button is `disabled` (not just erroring on click) whenever either checklist checkbox is unchecked.
- Zero duplicate heading text within a single tab panel (verified via the same `dump()`-style heading scan used in this audit).
- At `short` (1366×650) and real-world 1366×768-minus-chrome viewports, the tab strip is visible without scrolling.
- At 390px width, the 4 stat cards occupy no more than 2 rows before the tab strip.
- `AppointmentActions` and `FinalizeChecklist` render with exactly one visible border/shadow surface between the `FormSection` card and their contents (down from two).

## 26. Open Questions

1. Should the meeting-link field move fully into the header (bigger change, better fold behavior) or is a smaller fix (reorder Overview so Meeting & status is the very first card, before Finalize) preferred as a lower-risk first step? Recommend starting with the smaller reorder and only doing the full header move if fold behavior is still unacceptable.
2. Is there an existing pattern elsewhere in the doctor portal for "confirm irreversible clinical action" that should be the canonical dialog copy/behavior for signing, or should this audit's `PortalDialog` swap set the pattern others should follow?
3. No genuinely SIGNED/locked consultation was found among the 4 scouted appointment ids — worth getting one seeded so the locked-state UI (all fields disabled, Share button enabled) can be browser-verified rather than left code-derived.
4. The "Complete your compliance setup" banner is global portal chrome, not scoped to this page — is a fix to its placement/dismiss-persistence in scope for this audit, or does it belong to a portal-shell-level audit instead? Flagged here only because it materially worsens this page's fold problem (IH-001/IH-002).
