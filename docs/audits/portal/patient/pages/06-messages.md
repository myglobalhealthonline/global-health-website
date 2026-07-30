# Patient Portal Audit — 06 · Messages

## 1. Page Identification

- **Name:** Messages (patient conversations inbox)
- **Route:** `/account/messages`
- **Entry points:** Sidebar "Messages" nav item; deep links `?open=<appointmentId>&channel=clinic|doctor` (used from bell/notification links elsewhere, order pages, etc.)
- **Role:** Patient (authenticated)
- **Frontend files:**
  - `frontend/app/(auth)/account/messages/page.tsx` — server component, fetches appointments + unread map
  - `frontend/app/(auth)/account/messages/ui.tsx` — `MessagesShell`, `PatientConversation` (client)
- **Shared components:**
  - `frontend/components/messages/MessagesInbox.tsx` — two-pane thread list + conversation shell (shared across admin/doctor/patient)
  - `frontend/components/chat/ChatThread.tsx` — "Clinic" channel chat (polling, text-only)
  - `frontend/components/chat/ConsultationChat.tsx` — "Doctor" channel chat (polling, text + file attachment, lock/unlock)
  - `frontend/components/portal-atoms` — `PageHeader`, `Btn`
- **APIs observed (network tab):**
  - `GET /api/account/appointments/:id/messages` (clinic channel poll, 10s interval)
  - `GET`/`POST` doctor-channel equivalents via `consultation-chat-api` (not directly captured but same pattern)
  - Server-side: `fetchAccountAppointments()`, `fetchAccountMessageUnread()` (page.tsx)
- **Audit date:** 2026-07-12
- **Viewports tested:** desktop (1440×900), laptop (1280×720), tabletl (1024×768), tabletp (768×1024), mobile (390×844), smobile (375×667), short (1366×650)

## 2. Page Purpose

Single inbox for a patient to (a) message the clinic admin team about any booking, and (b) chat directly with their doctor once that booking's payment is confirmed. One conversation exists per appointment/order, with two channels (Clinic / Doctor) inside it.

## 3. Primary User Tasks (priority order)

1. Find the conversation for a specific booking/order (locate by order number or date).
2. Read the latest message(s) in a thread.
3. Send a message to the clinic (always available) or the doctor (payment-gated).
4. Attach a file/document to a doctor conversation.
5. Jump to the full appointment record from a conversation.

## 4. Current Page Structure (top-to-bottom)

1. `PageHeader` — eyebrow "MESSAGES", title "Your conversations", one-line description
2. Two-pane `MessagesInbox`:
   - Left: search input + scrollable thread list (order tag, name, timestamp — no preview, no subtitle)
   - Right: conversation pane — order-number chip, patient name, subtitle (consult type · country), Clinic/Doctor pill toggle, chat body (message bubbles or empty state), composer (textarea + Send, plus paperclip on Doctor channel)

## 5. Current Container Hierarchy (indented tree; mark unnecessary levels)

```
.gh-patient-page
└─ PageHeader (gh2 hero panel — rounded gradient card)          [necessary — page identity]
└─ MessagesShell
   └─ MessagesInbox
      └─ grid (2 columns ≥md)
         ├─ Thread list column
         │  ├─ search <label> wrapper (decorative-only nesting: label + icon + input)
         │  └─ <ul> bordered rounded panel
         │     └─ <li> per thread → <button> (full row is the click target — good, no extra card-in-card)
         └─ Conversation column
            └─ bordered rounded panel ("card 2")                 [borders/rounding stacked against the thread-list panel — see Card overuse]
               ├─ header row (order chip / name / subtitle / mobile-back)
               └─ chat body
                  └─ ChatThread / ConsultationChat root (`gh-chat-panel-embedded`)
                     ├─ optional lock/payment banner
                     ├─ message list (`ul.gh-chat-list` → `li` → bubble `div`)   [no card wrapper — good]
                     └─ composer (`form.gh-chat-compose`)
```

No card-in-card stacking beyond the two top-level panels (thread list, conversation pane), which is a reasonable/necessary two-pane pattern, not excess nesting.

## 6. Interaction Inventory

| Element | Type | Action Tested | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| Thread row | button | Click to open conversation | Opens conversation in right pane, "Clinic" channel selected by default | — | `06-messages-desktop-thread-open-01.png` |
| Clinic/Doctor pill toggle | button pair | Click "Doctor" (unlocked thread) | Switches to doctor channel, composer gains paperclip icon | — | `06-messages-desktop-doctor-tab-01.png` |
| Clinic/Doctor pill toggle | button pair | Click "Doctor" (payment-pending thread, index 13 of 27) | Doctor pill renders `disabled` + `title="Complete payment to chat with your doctor"`, opacity 0.5 | — | `06-messages-desktop-doctor-locked-01.png` (composer for Clinic channel shown; doctor lock confirmed via `isDisabled()` check) |
| Composer textarea | textarea | Type draft text, do not send | Text entered, auto-grows height, Send button enables | — | `06-messages-desktop-composer-draft-01.png` |
| Composer textarea | textarea | Shift+Enter | Inserts newline, does not submit (verified `textarea.value` retains both lines, no POST fired) | — | code+script verified |
| Search input | text input | Type non-matching query | List replaces with "No matches." row, no results count, no state to clear easily beyond manual delete | Minor — see 09/17 | `06-messages-desktop-search-nomatch-01.png` |
| Order number chip (conversation header) | link | Not clicked (would navigate away) | Code-derived: `<Link href={selected.orderHref}>` → `/account/bookings`, not the specific record | 06-002 | code-derived |
| Mobile back arrow | icon button | Click (mobile viewport) | Returns to thread list, `aria-label="Back to conversations"` present | — | `06-messages-mobile-mobile-back-01.png` |
| Doctor-channel composer (mobile) | textarea+attach+send | Open Doctor channel at 390px width | Textarea collapses to ~20px, "Type a message…" placeholder wraps one character per line vertically | 06-001 | `06-messages-mobile-doctor-tab-01.png` |
| Attach (paperclip) button | icon button | Not clicked (would open OS file picker) | Code-derived: `aria-label` absent on the button itself (only on the hidden `<input>`), button has no visible text, relies on `title` only | 06-006 | code-derived |

## 7. Screenshots

| File | Viewport | State | Reason | Related Issues |
|---|---|---|---|---|
| `06-messages-desktop-default-0{1..3}.png` | 1440×900 | Default, scroll slices | Baseline | 06-002, 06-003 |
| `06-messages-laptop-default-0{1..4}.png` | 1280×720 | Default | Baseline | — |
| `06-messages-tabletl-default-0{1..3}.png` | 1024×768 | Default | Two-pane holds at tablet-landscape | — |
| `06-messages-tabletp-default-0{1..2}.png` | 768×1024 | Default | List-only view (conversation column blank+empty) | 06-004 |
| `06-messages-mobile-default-0{1..3}.png` | 390×844 | Default | List-only, stacked | — |
| `06-messages-smobile-default-0{1..4}.png` | 375×667 | Default | Smallest phone | — |
| `06-messages-short-default-0{1..4}.png` | 1366×650 | Default | Short-height desktop | 06-005 |
| `06-messages-desktop-thread-open-01.png` | 1440×900 | Thread selected, empty conversation, list shows duplicate ORD-000135 rows | Evidence for 06-002, 06-003 | 06-002, 06-003 |
| `06-messages-desktop-thread-open-empty-recheck-01.png` | 1440×900 | Same thread, longer settle time | Confirms empty-state renders correctly once hydrated (dev-server first-compile latency, not a real bug) | — |
| `06-messages-desktop-thread-with-messages-01.png` | 1440×900 | Thread with 2 patient-authored messages | Confirms bubble rendering, own-message alignment/color | — |
| `06-messages-desktop-doctor-tab-01.png` | 1440×900 | Doctor channel selected, unlocked | Tab switch works | — |
| `06-messages-desktop-doctor-locked-01.png` | 1440×900 | Payment-pending thread, doctor tab disabled | Evidence for lock gating working | — |
| `06-messages-desktop-composer-draft-01.png` | 1440×900 | Draft typed, not sent | Composer behavior | — |
| `06-messages-desktop-search-nomatch-01.png` | 1440×900 | Search "zzzznomatch" | Empty search result state | — |
| `06-messages-mobile-thread-open-01.png` | 390×844 | Thread opened on mobile | Mobile conversation layout | — |
| `06-messages-mobile-doctor-tab-01.png` | 390×844 | Doctor channel on mobile | **Composer textarea collapse bug** | 06-001 |
| `06-messages-mobile-mobile-back-01.png` | 390×844 | Back button clicked | Returns to list correctly | — |

## 8. UX Problems

### 06-001 — Doctor-channel composer collapses to unusable width on mobile
- **Severity:** High
- **Category:** Responsive / Forms
- **Browser evidence:** `06-messages-mobile-doctor-tab-01.png` — the "Type a message…" placeholder renders as a single vertical column of characters ("T / y / p …") because the textarea's flex-basis loses the fight against the paperclip button, textarea, and Send button all sitting in one `flex` row at 390px.
- **User impact:** On the Doctor channel (the paid-consultation channel — the one that matters most), a patient on a phone cannot see or comfortably type their message; the input is functionally unusable without zooming/rotating.
- **Root cause:** `frontend/components/chat/ConsultationChat.tsx` composer form (`gh-chat-compose`) packs attach-button + `textarea.gh-chat-textarea.min-w-0.flex-1` + `Btn` (`Send` with visible label) in one row with no responsive stacking or icon-only Send button below a breakpoint. The plain `ChatThread.tsx` (Clinic channel, no attach button) does not exhibit this because it has one fewer flex sibling.
- **Recommended resolution:** Below ~420px, either (a) drop the "Send" text label and render an icon-only Send button (`aria-label="Send"`) to reclaim ~50px, or (b) wrap composer to two rows: textarea full-width on row 1, attach + Send right-aligned on row 2. Apply the same fix to any other `ConsultationChat` consumer (doctor portal) since the component is shared.

### 06-002 — Thread list shows no subtitle/consultation-type, only order number + patient name
- **Severity:** Medium
- **Category:** Information hierarchy / List presentation
- **Browser evidence:** `06-messages-desktop-thread-open-01.png` — sidebar rows show only order tag + name + timestamp; the `subtitle` (consultation type · country, e.g. "GP consultation · IE") only appears after opening a thread, in the conversation header.
- **User impact:** With a patient who has 27 threads (as in this account), rows are visually identical except for order number and date — a user scanning for "my dermatology booking" or "the one about my prescription" has to open each thread to find out what it's about.
- **Root cause:** `frontend/components/messages/MessagesInbox.tsx` only renders `t.name`, `t.orderNumber`, `t.preview`, `t.timestamp` in the list `<li>` — `t.subtitle` (already computed and passed by `frontend/app/(auth)/account/messages/ui.tsx` line 167: `` `${consultLabel(...)} · ${item.countryCode.toUpperCase()}` ``) is defined on `InboxThread` but never rendered in the list, only in the selected-conversation header (line 233-237).
- **Recommended resolution:** Render `t.subtitle` as a truncated secondary line under the name in the list row (the type already exists, no new data plumbing needed).

### 06-003 — Duplicate-looking thread rows are indistinguishable (same order number, same timestamp)
- **Severity:** Medium
- **Category:** List presentation / Weak hierarchy
- **Browser evidence:** `06-messages-desktop-thread-open-01.png` and `06-messages-tabletp-default-01.png` — two consecutive rows both read "ORD-000135 · Syed Muhammad Hassaan · 9 JUL 2026, 04:41" with nothing to tell them apart.
- **User impact:** A patient cannot tell which of the two identical-looking rows holds the conversation they want without opening both. Combined with 06-002 (no subtitle in list), there is currently zero way to distinguish them from the list.
- **Root cause:** Each `AccountAppointment` (likely one per service line within a multi-item order) becomes its own thread with `orderNumber` reused; `MessagesShell` maps 1 appointment → 1 thread with no de-duplication or differentiating label beyond the (unrendered) subtitle.
- **Recommended resolution:** At minimum, ship 06-002 (subtitle in list) so the consultation type distinguishes same-order rows. If two rows still fully match (identical service, identical timestamp), consider grouping same-order threads under one collapsible list entry, or appending a short qualifier (e.g. "GP consultation #2").

### 06-004 — Conversation column renders as a large empty bordered box with no thread selected (tablet-portrait/mobile default)
- **Severity:** Low
- **Category:** Visual design / Space misuse
- **Browser evidence:** `06-messages-tabletp-default-01.png` — right column is a tall empty grey-bordered rectangle taking ~40% of viewport width with only "Select a conversation to read and reply." (hidden below `md:` breakpoint per code, so on tabletp it's just blank space with no CTA at all, since the placeholder text has `hidden ... md:grid`).
- **User impact:** Wasted screen real estate at tablet-portrait width; the panel looks broken/unfinished rather than intentionally empty.
- **Root cause:** `MessagesInbox.tsx` line 242-250 renders the empty-state placeholder only for `md:` and up, but the grid itself isn't `md:` gated, so between the mobile single-column breakpoint and `md`, the "column 2" of the CSS grid still occupies space with nothing in it.
- **Recommended resolution:** Match the empty-state placeholder's breakpoint to the grid's actual two-column breakpoint, or collapse the grid to one column until the same breakpoint the placeholder assumes.

### 06-005 — No blocking issues at 1366×650 (short viewport)
- **Severity:** N/A
- **Category:** N/A
- **Browser evidence:** `06-messages-short-default-01.png` through `-04.png` — layout scrolls normally, no clipped controls, composer stays reachable.
- **User impact:** N/A
- **Root cause:** N/A
- **Recommended resolution:** N/A — listed for completeness per audit brief §9.

### 06-006 — Attach (paperclip) button has no `aria-label`
- **Severity:** Low
- **Category:** Accessibility
- **Browser evidence:** Code-derived — `frontend/components/chat/ConsultationChat.tsx` lines 398-406: `<button type="button" onClick={...} title="Attach a file (PDF / image)" ...><Paperclip .../></button>` has a `title` attribute but no `aria-label`/visible text; the actual `<input type="file">` does carry `aria-label="Attach file"` but it is `sr-only` and not the element being clicked.
- **User impact:** Screen-reader users focusing the visible attach button hear no accessible name (icon has `aria-hidden`), only a `title` tooltip which most screen readers don't reliably announce.
- **Root cause:** Missing `aria-label` on the visible `<button>`.
- **Recommended resolution:** Add `aria-label="Attach a file"` to the button element itself.

## 9. Visual Design Problems

- The thread-list panel and the conversation panel are two separately bordered/rounded `14px` cards sitting directly adjacent inside a `gap-4` grid — visually reads as "two cards" rather than one unified inbox surface. Not wrong, but could read cleaner as a single bordered surface with one internal divider (removes one border + one corner-radius repetition). Low priority — this is a deliberate, functional two-pane pattern also used by admin/doctor portals, so changing it here alone would create inconsistency; flag for a cross-portal pass rather than a page-local fix.
- Unread badge (green pill with count) only appears on 1 of 27 threads in this account's data, so its visual treatment could not be evaluated at scale from screenshots beyond confirming it renders (code path exists, `MessagesInbox.tsx` lines 163-170).

## 10. Information Hierarchy Problems

- See 06-002/06-003 — the single most important scannable piece of information (what is this conversation about) is hidden until a thread is opened, while the least differentiating piece (order number, a near-meaningless string to most patients) is the most prominent element in each row.
- List rows sort by `item.createdAt` (booking creation time), not by last-message activity (`timestamp` in `InboxThread` is literally `item.createdAt`, never updated by new messages) — see Section 11.

## 11. Section Ordering Review

Current order (single page, no sections to reorder — N/A at page level). At the **thread-list-row** micro level:

Current: `[order tag] [name] ... [unread badge]` / `[preview — always null]` / `[timestamp = booking created date]`

Recommended: `[order tag] [name] [unread badge]` / `[consultation type · country subtitle]` / `[last-activity relative time]`

Reasoning: name is rarely useful to the patient (it's always their own name); consultation type is the actual differentiator and currently invisible; timestamp should reflect conversation recency, not booking creation, since that's what "which thread is newest" should mean to a user scanning an inbox.

## 12. Tabs, Steps, or Sectioning Recommendation

N/A — page is already a single inbox view with the correct primitive (two-pane list/detail). The Clinic/Doctor pill toggle inside a conversation is the right pattern (segmented control, not tabs-as-navigation) and needs no structural change, only the mobile composer fix (06-001).

## 13. Proposed Page Structure (exact top-to-bottom)

Unchanged from current — structure is sound. Only row-level content changes (06-002) and the composer responsive fix (06-001) are proposed.

## 14. Proposed Container Simplification

| Level | Current | Proposed |
|---|---|---|
| Thread-list `<li>`/`<button>` | Full-row button, no inner card | Keep as-is |
| Conversation panel | Bordered rounded box wrapping header + chat body | Keep — but see §9 note on cross-portal follow-up to merge the two 14px-radius panels into one surface with an internal divider, if/when the whole `MessagesInbox` is revisited (not a page-local change since it's shared with admin/doctor) |
| Chat empty state | `gh-chat-empty` — plain row, no card | Keep — correctly avoids card-in-card |

## 15. Responsive Findings

- **Desktop/laptop/tabletl (1440/1280/1024):** two-pane layout intact, no overflow, doctor lock/composer all functional.
- **tabletp (768):** conversation column shows dead empty space with no message when no thread is selected (06-004).
- **mobile/smobile (390/375):** list-only view is clean; opening a thread hides the list correctly (`selected ? "block" : "hidden md:block"` — matches expected mobile master-detail pattern); Doctor-channel composer breaks (06-001).
- **short (1366×650):** no clipping observed; composer remains reachable without scrolling past the fold in the conversation pane.

## 16. Accessibility Findings

- Heading outline: single `<h1>` "Your conversations" (via `PageHeader`) — correct, no skipped levels.
- Search input: wrapped in a `<label>` with only an `aria-hidden` icon and a placeholder — no text accessible name beyond the `placeholder` attribute (which is not a reliable substitute for a label per WCAG). Recommend adding an `sr-only` label text ("Search conversations").
- Mobile back button: has `aria-label="Back to conversations"` — correct.
- Attach button: missing `aria-label` (06-006).
- Focus order (Tab key, 3 presses from page load): lands on the first thread-list button — logical, no focus trap detected.
- Doctor tab lock state: disabled button correctly uses native `disabled` + descriptive `title`; screen readers will announce it as disabled, which is adequate (title is supplementary, not load-bearing here since the `disabled` state itself is the accessible signal).
- Send button: icon + visible text label "Send" — good, no icon-only-button gap on desktop; becomes icon-only implicitly on mobile only due to the layout bug (06-001), not by design, so no separate `aria-label` gap once 06-001 is fixed (label text still present in DOM, just visually squeezed).

## 17. Content and Microcopy Findings

| Current | Recommended | Notes |
|---|---|---|
| "Select a conversation to read and reply." (empty conversation-pane placeholder) | Keep — already task-specific | — |
| Search placeholder "Search" | "Search by order or name" | Generic placeholder doesn't hint what's searchable (order number, name, subtitle, preview per the `filtered` logic) |
| "No matches." | Keep, optionally add "Clear search" affordance next to the message | Search input already has a clear (×) button when text present — sufficient |
| Doctor-tab disabled tooltip: "Complete payment to chat with your doctor" | Keep — clear, task-specific, not vague | — |

No vague "Open"/"Manage"/"Submit" labels found on this page.

## 18. Component and Code Impact

| Component | File | Change | Shared/Page-specific | Risk | Complexity |
|---|---|---|---|---|---|
| `ConsultationChat` composer | `frontend/components/chat/ConsultationChat.tsx` | Responsive fix for 06-001 (icon-only Send or two-row wrap below ~420px) | **Shared** (also used in doctor portal) | Low — CSS/layout only, no logic change | Small |
| `MessagesInbox` thread row | `frontend/components/messages/MessagesInbox.tsx` | Render `t.subtitle` under name (06-002) | **Shared** (admin/doctor/patient) | Low — additive JSX, existing prop already populated by all three portal callers (verify admin/doctor also pass `subtitle` before shipping) | Small |
| `MessagesInbox` conversation-empty placeholder | `frontend/components/messages/MessagesInbox.tsx` | Fix breakpoint mismatch (06-004) | Shared | Low | Small |
| Attach button | `frontend/components/chat/ConsultationChat.tsx` | Add `aria-label` (06-006) | Shared | Low | Trivial |
| Search input | `frontend/components/messages/MessagesInbox.tsx` | Add `sr-only` label text | Shared | Low | Trivial |

## 19. Recommended Implementation Order

1. 06-001 (mobile composer collapse) — High severity, affects the paid/priority channel.
2. 06-002 (show subtitle in list) — unblocks 06-003 partially, cheap, high value.
3. 06-006 + search label a11y fixes — trivial, bundle together.
4. 06-004 (empty-state breakpoint) — cosmetic, low urgency.
5. 06-003 follow-up (grouping/differentiating true duplicates) — needs product decision on data model, do after 06-002 ships and duplicates are re-evaluated with subtitles visible.

## 20. Acceptance Criteria (measurable)

- 06-001: At 375–414px viewport width, the Doctor-channel composer textarea placeholder renders on a single horizontal line (no per-character vertical wrap), and the Send control remains tappable (≥44×44px target).
- 06-002: Every thread-list row displays the consultation-type/country subtitle beneath the name, truncated with ellipsis if it overflows the row width.
- 06-004: At 768×1024 (tabletp) with no thread selected, the right column either collapses to zero width or shows the same "Select a conversation…" placeholder shown at desktop widths.
- 06-006: Attach button exposes an accessible name via `aria-label`, verifiable via accessibility tree inspection (no longer unnamed in `read_page`/axe output).

## 21. Open Questions

- Whether the two identical `ORD-000135` rows represent two distinct services within one order (expected) or a data-duplication bug (unexpected) could not be determined from the frontend alone — requires checking the backend `AccountAppointment` query / order-detail record for that order number.
- Whether admin and doctor portal callers of `MessagesInbox` already pass a populated `subtitle` (needed to confirm 06-002 is a pure render fix vs. also needing prop wiring in those two portals) was not verified — out of scope for this patient-portal audit pass.
- The transient stat/count desync observed while auditing the neighboring Notifications page (see `07-notifications.md` §8) does not apply here since Messages has no equivalent header count, but the same `router.refresh()` pattern is not used here at all (Messages has no read/unread mutation from this page), so no related risk carries over.
