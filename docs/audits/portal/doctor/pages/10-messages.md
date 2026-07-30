# 10 — Patient Messages (Doctor Portal)

## 1. Page Identification
- **Name:** Patient messages
- **Route:** `/doctor/messages` (optional `?open=<appointmentId>` deep-link param)
- **Entry points:** Sidebar → Schedule → "Messages"; deep link from `MessagesInbox`'s own order-number link is one-directional (out, not in); appointment detail page's chat section is a separate embed, not a link back here.
- **Role:** DOCTOR only (`verifyDoctorAccess`).
- **Workflow position:** Ongoing communication hub — doctor reviews/replies to patient consultation chat threads without opening each appointment record individually.
- **Frontend files:**
  - `frontend/app/(doctor)/doctor/messages/page.tsx` (RSC, data fetch)
  - `frontend/app/(doctor)/doctor/messages/inbox.tsx` (client wrapper, maps API shape → shared inbox props)
- **Shared components used:**
  - `MessagesInbox` (`frontend/components/messages/MessagesInbox.tsx`) — shared across admin/doctor/patient portals (two-pane list+chat).
  - `ConsultationChat` (`frontend/components/chat/ConsultationChat.tsx`) — shared chat body, used here in `variant="embedded"`.
  - `AdminCard`, `PageHeader`, `Pill` (`@/components/portal-atoms`).
- **APIs observed:**
  - `GET /api/doctor/message-threads` — `backend/src/routes/consultation-chat.route.ts:708`, returns up to 100 appointments with `chatMessages: { some: {} }` for this doctor, most-recently-updated first, with last message preview + unread count.
  - `GET /api/doctor/messages/unread` (used elsewhere for a badge count — `doctor-api.ts:149-152`, not called on this page itself).
  - Chat body (on thread select): `fetchDoctorChat` / `postDoctorMessage` / `uploadDoctorChatFile` from `@/lib/api/consultation-chat-api` (not opened this pass — standard consultation-chat endpoints under `/api/doctor/appointments/:id/chat/*`, confirmed via download-URL pattern in the DOM dump: `/api/doctor/appointments/{id}/chat/download/{messageId}`).
- **Date audited:** 2026-07-12
- **Viewports tested:** desktop 1440×900, laptop 1280×720, tabletl 1024×768, tabletp 768×1024, mobile 390×844, smobile 375×667, short 1366×650 (screenshot matrix); interaction testing at laptop + mobile.
- **States tested:** default populated (4 threads, browser), thread opened/loaded (browser), search-filtered (browser), search-no-match (browser), mobile thread-open with back button (browser), empty inbox (code-derived only, `MessagesInbox.tsx:87-108`), loading (code-derived, `ConsultationChat`'s internal `loading` state + spinner), error (code-derived, `page.tsx:17-28` and `ConsultationChat`'s `error` state).

## 2. Page Purpose
A unified, searchable list of every appointment thread that has at least one consultation chat message with this doctor, letting the doctor triage and reply without navigating to each appointment individually.

## 3. Primary Doctor Tasks (priority order)
1. See which threads have unread patient messages.
2. Open a thread and read the conversation (including file attachments).
3. Reply.
4. Jump to the full appointment record when more context is needed (order number link).
5. Search/filter to find a specific patient's thread.

## 4. Clinical/Operational Importance
High. This is the doctor's live channel for patient-initiated clinical questions and follow-ups (file uploads include reports/images). Missed or hard-to-find unread messages have direct patient-care consequences. Unlike admin's message-threads (clinic/ops messages, `Message`/`MessageAuthorRole` model), this page is strictly the **clinical** consultation channel (`ConsultationMessage`/`ChatAuthorRole` model) — confirmed by the backend query filtering on `chatMessages` (the `ConsultationMessage` relation), not `messages` (the `Message`/admin-chat relation) — see §23.

## 5. Current Page Structure (top-to-bottom)
1. Compliance banner (portal-wide)
2. `PageHeader`: eyebrow "MESSAGES", title "Patient messages", description, and a conditional "X unread" `Pill` in the actions slot (only rendered when `totalUnread > 0`)
3. `MessagesInbox` two-pane layout:
   - Left: search input + scrollable thread list
   - Right: selected thread's header (order number link, patient name, subtitle) + embedded `ConsultationChat`, or an empty "Select a conversation" placeholder

## 6. Current Container Hierarchy (indented tree)
```
page
└─ PageHeader (flat)
└─ MessagesInbox
   ├─ grid (2-col md:, single col mobile) — no chrome itself
   │  ├─ left: search <label>/<input> (bordered pill input)         ← surface level 1
   │  │  └─ <ul> bordered list                                       ← surface level 1
   │  │     └─ <li> rows (border-top only, no card-per-row)          ← flat, correct
   │  └─ right: conversation pane (bordered card)                    ← surface level 1
   │     ├─ header row (border-bottom, no separate card)
   │     └─ ConsultationChat (variant="embedded" — no card chrome, no header of its own since onToggleLock is absent — see 10-002)
   │        └─ message bubbles (own vs other, background-colored)    ← surface level 2 (acceptable, chat bubbles are expected)
```
**Assessment:** Clean — this is one of the better-structured pages in the audit set. Thread list rows are flat `<li>` with a border-top divider, not individually carded (correct pattern, avoids the "excessive cards" anti-pattern). Only two visible surface levels (pane → bubble), both justified.

## 7. Interaction Inventory
| Element | Type | Action | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| Thread row | button | Click | Selects thread, right pane loads `ConsultationChat`, mobile: list hides, chat shows with a back arrow | Confirmed load takes ~1-2.5s with no visible skeleton in that window — see 10-001 | `10-messages-laptop-thread-open-01.png`, `10-messages-laptop-thread-open-loaded-01.png` |
| Search input | text input, `type=search` | Type query | Client-side filter on `name`/`orderNumber`/`subtitle`/`preview` (`MessagesInbox.tsx:73-83`); selected thread's chat pane is unaffected by filtering | No results shows "No matches." text row; chat pane on the right stays open/unaffected while the left list empties — could look like the two panes are out of sync | `10-messages-laptop-search-filtered-01.png`, `10-messages-laptop-search-empty-01.png` |
| Order number link (e.g. "ORD-000009") | `<a>` | Click | Navigates to `/doctor/appointments/{id}?tab=messages#patient-chat` | **Not present** on the one thread whose `orderNumber` is `null` — see 10-003 | `10-messages-laptop-thread-open-01.png` |
| Mobile back arrow | icon button | Click | Deselects thread, returns to list view | Works correctly (`aria-label="Back to conversations"` present) | `10-messages-mobile-thread-open-01.png` |
| Attach file | icon button | Click | Opens native file picker (not exercised — would require a real file and risks an upload mutation) | Not tested | — |
| Compose textarea + Send | textarea/button | — | **Not exercised** — sending a message is a real mutation, explicitly out of scope | Send button correctly `disabled` while draft is empty | — |
| Chat lock/re-open toggle | button (conditional on `onToggleLock` prop) | — | **Absent on this page** — `inbox.tsx:41-49` does not pass `onToggleLock` to `ConsultationChat`, unlike the appointment-detail page's `DoctorConsultationChatSection` (`app/(doctor)/doctor/appointments/[id]/_components/consultation-chat-section.tsx:38`), which does | Doctor cannot lock/re-open a chat from the Messages inbox — must navigate to the appointment record to do so | 10-002 |

## 8. Page States Tested
| State | Browser | Code | Result | Issue |
|---|---|---|---|---|
| Default populated (4 threads) | ✅ | ✅ | Renders correctly, most-recent-first | — |
| Thread selected, chat loading | ✅ (partial — caught mid-load once) | ✅ | Right pane shows fixed-height empty grey box for ~1-2s before messages/compose UI appear; no spinner visible during that window in the embedded variant (header only shows a `Loader2` spinner in `variant="panel"`, not `"embedded"` — `ConsultationChat.tsx:248-265`) | 10-001 |
| Thread selected, loaded | ✅ | ✅ | Messages + attachments render correctly with timestamps | — |
| Search with match | ✅ | ✅ | Filters list correctly | — |
| Search with zero matches | ✅ | ✅ | "No matches." row shown; selected thread's chat pane unaffected | — (see interaction table) |
| Thread with no `orderNumber` | ✅ | ✅ (`MessagesInbox.tsx:148,231`) | No order badge in list row, no clickable order link in the open pane header | 10-003 |
| Mobile thread open + back | ✅ | ✅ | Correct show/hide behavior, back arrow works | — |
| Empty inbox (0 threads) | — | ✅ (`MessagesInbox.tsx:87-108`) | Centered icon + "No conversations" / "Messages will appear here." | Code-derived only — this doctor account always has threads |
| API error (`!result.ok`) | — | ✅ (`page.tsx:17-28`) | `AdminCard` warning message, no retry | Code-derived only; same gap pattern as 08-004 |
| Chat fetch error (`ConsultationChat`'s own `error` state) | — | ✅ (`ConsultationChat.tsx:114-116`, `294-305`) | Inline red-bordered error message above the message list | Code-derived only |
| Payment-required / chat-locked banners | — | ✅ (`:275-290`) | Both banners exist in code (payment-required takes priority over lock) | Not reachable with this account's data — code-derived only |

## 9. Screenshots
| Filename | Viewport | State | Reason | Issues |
|---|---|---|---|---|
| `10-messages-desktop-default-01.png` | 1440×900 | default | matrix | — |
| `10-messages-laptop-default-01.png` | 1280×720 | default | matrix / primary reference | — |
| `10-messages-tabletl-default-01.png` | 1024×768 | default | matrix | — |
| `10-messages-tabletp-default-01.png` | 768×1024 | default | matrix | — |
| `10-messages-mobile-default-01.png` | 390×844 | default | matrix | — |
| `10-messages-smobile-default-01.png` | 375×667 | default | matrix | — |
| `10-messages-short-default-01.png` | 1366×650 | default | matrix, fold check | thread list visible but truncated after 2 rows — acceptable, list itself scrolls |
| `10-messages-laptop-thread-open-01.png` | 1280×720 | thread just clicked (~0.9s) | interaction | chat pane still empty at this point — 10-001 |
| `10-messages-laptop-thread-open-loaded-01.png` | 1280×720 | thread loaded (~2.5s wait) | interaction | confirms 10-002 (no header/lock control), content loads correctly |
| `10-messages-laptop-no-order-thread-01.png` | 1280×720 | thread without order number selected | interaction | 10-003 |
| `10-messages-laptop-search-filtered-01.png` | 1280×720 | search "Hassaan" (matches all) | interaction | — |
| `10-messages-laptop-search-empty-01.png` | 1280×720 | search "zzz_no_match_zzz" | interaction | confirms list/chat-pane desync noted in interaction table |
| `10-messages-mobile-thread-open-01.png` | 390×844 | thread open, mobile, back arrow visible | interaction | confirms 10-003 (no order badge in header) |

## 10. UX Problems

**10-001 — No loading indicator in the embedded chat pane while a thread's messages fetch (~1-2.5s observed).**
- Severity: Medium
- Evidence: Browser — `10-messages-laptop-thread-open-01.png` (captured ~900ms after click) shows a completely blank grey box, no spinner, no skeleton, no compose bar. Code — `ConsultationChat.tsx:246-272`: the `Loader2` spinner is only rendered inside the `variant === "panel"` header (`:262`); the `variant === "embedded"` branch (used here) renders no header at all when `lockToggle` is null (which it always is on this page — see 10-002), so there is no loading affordance whatsoever in this configuration.
- Doctor impact: On a slow connection, a doctor clicking a thread sees an apparently broken/empty panel for up to a couple of seconds with zero feedback that anything is happening.
- Root cause: The `embedded` variant's loading spinner is coupled to the header, which is itself coupled to `lockToggle` being non-null (`ConsultationChat.tsx:266-272`). Since this page never passes `onToggleLock`, both the header and its loading spinner are silently dropped together.
- Recommendation: Decouple the loading spinner from the header — render it inside the message-list area (e.g. a centered `Loader2` while `loading && items.length === 0`) regardless of variant/header presence.

**10-002 — Doctor cannot lock/re-open a chat from the Messages inbox; the control only exists on the appointment detail page.**
- Severity: Medium
- Evidence: Code — `inbox.tsx:41-49` passes `fetcher`/`poster`/`fileUploader`/`variant` to `ConsultationChat` but omits `onToggleLock`, whereas `consultation-chat-section.tsx:38` (appointment detail page) passes `onToggleLock={(open) => toggleDoctorChatLock(appointmentId, open)}`. Confirmed by browser: `10-messages-laptop-thread-open-loaded-01.png` shows no header row at all above the message list (contrast with the panel variant's "Patient chat" header + lock button used elsewhere).
- Doctor impact: The Messages page is explicitly pitched (its own description text: "Click a thread to read and reply in place") as the fast path for triaging conversations, but a doctor who wants to lock a chat (e.g. to pause a conversation before a call) must abandon this page, find the same appointment via search/appointments list, and open it there instead — defeats the "reply in place" promise for that one action.
- Root cause: Missing prop wiring, not a missing feature — `ConsultationChat` already supports `onToggleLock` and `variant="embedded"` handles it correctly when present (`:267-271`).
- Recommendation: Import/wire the same `toggleDoctorChatLock` action used by `consultation-chat-section.tsx` into `inbox.tsx` and pass it as `onToggleLock`. Low-risk, since the prop and the embedded-variant rendering path already exist and are exercised elsewhere.

**10-003 — Threads with no linked order number have no way to open the full appointment record.**
- Severity: Medium
- Evidence: Browser — the 4th thread in the test account ("Syed Muhammad Hassaan… You: Hi, I have reviewed your notes…") shows no `ORD-xxxxxx` badge in the list row and, once opened, no clickable order-number link in the conversation header (`10-messages-laptop-no-order-thread-01.png` / mobile equivalent `10-messages-mobile-thread-open-01.png`). Code — `MessagesInbox.tsx:148-155` (list badge) and `:231-240` (header link) both gate on `t.orderNumber`/`selected.orderNumber` being truthy; `inbox.tsx:26` sets `orderHref` unconditionally, but it's simply never rendered when `orderNumber` is null.
- Doctor impact: For any appointment whose order number failed to resolve (backend: `mapAppointmentOrderNumbers(ids)` in `consultation-chat.route.ts:743` — a lookup that can legitimately miss, e.g. for manually-created/legacy appointments), the doctor has no way to jump to the appointment record from Messages at all — the "click order number to open the appointment" affordance the page description promises silently doesn't exist for that thread.
- Root cause: `orderHref` is always constructible (`inbox.tsx:26`, uses `appointmentId` not `orderNumber`) but the link is only rendered conditionally on `orderNumber` existing, which conflates "do we have a display label" with "can we navigate."
- Recommendation: Always render the order-number link/badge when `orderHref` exists; fall back to a generic label (e.g. "Open appointment") instead of the order number when `orderNumber` is null, rather than omitting the link entirely.

**10-004 — Search filters the thread list but leaves the currently-open chat pane visible/unaffected, which can read as the two panes being out of sync.**
- Severity: Low
- Evidence: Browser — `10-messages-laptop-search-empty-01.png`: left list shows "No matches." while the right pane still displays the previously-selected thread's full conversation.
- Doctor impact: Minor — could momentarily confuse ("why is this thread still open if it doesn't match my search?"), but arguably correct behavior (search is a list filter, not a "close current thread" action).
- Recommendation: No change required; if addressed at all, a subtle "not in current filter" note on the open pane's header would be the lightest touch — low priority.

**10-005 — No visible "you" vs "system" separation is needed because the page is already clinical-only — but this isn't stated anywhere in the UI.**
- Severity: Low
- Evidence: Code — the backend endpoint (`consultation-chat.route.ts:708-778`) filters strictly on `chatMessages: { some: {} }` (the `ConsultationMessage`/patient-chat relation), never touching the separate `Message`/`MessageAuthorRole.ADMIN` model used by admin-clinic messaging (`chat.route.ts:225-260` — a different endpoint, `/api/account/message-threads`, that patients/admins use for clinic-ops messages). There is no mixing of clinical and system/ops messages on this page — confirmed correct by design.
- Doctor impact: None functionally; noted because the brief specifically asked to verify clinical-vs-system separation. No fix needed — flagging as a **confirmed pass**, not a defect.

## 11. Visual Design Problems
- None significant. Thread-list rows are appropriately flat (no per-row card chrome), unread badges are color + numeral (not color-only), timestamps are consistently formatted via `formatAppDateTime`.
- Minor: the conversation-pane header (order badge + name + subtitle) sits in its own bordered row above `ConsultationChat`'s embedded body, which itself renders no header — two adjacent header-like rows from two different components is slightly redundant but not confusing in the screenshots (`10-messages-laptop-thread-open-loaded-01.png`).

## 12. Information Hierarchy Problems
- Unread count is currently only visible as a numeral badge per row (`MessagesInbox.tsx:163-170`) plus an aggregate `Pill` in the page header (`page.tsx:39-43`) — both correctly implemented and consistent; no issue.
- Order number (the deep-link to full clinical context) is visually de-emphasized (small font-mono chip) relative to patient name — appropriate, since name/preview/timestamp are what a doctor scans first; order number is a secondary "more context" action. No change recommended.

## 13. Current Section Order
1. Compliance banner (shell)
2. PageHeader (title + unread pill)
3. MessagesInbox (search + list + conversation pane)

## 14. Recommended Section Order (+ reasons)
No reordering needed — this page's top-level section order is already minimal and correct (3 sections, no redundant intro block unlike 08-services). Recommendation is limited to within-component fixes (10-001 through 10-003), not structural reordering.

## 15. Tabs/Steps/Sectioning Recommendation
Not applicable — the two-pane list+detail pattern is the right shape for this page and needs no tabs/steps/wizard treatment.

## 16. Save & Finalization Recommendation
Not applicable — no save/draft/finalize concept on this page. Message send is a single, immediate action (not tested per safety rules) with a correctly-disabled Send button while empty. Lock/re-open (10-002) is the closest thing to a state-changing action, and it should be exposed here per that finding.

## 17. Proposed Page Structure (exact top-to-bottom)
Unchanged from current — no structural change recommended, only component-level fixes:
1. Compliance banner (shell)
2. PageHeader (title + unread pill)
3. MessagesInbox
   - search + list (unchanged)
   - conversation pane: add `onToggleLock` wiring (10-002) → restores the header + gains a visible loading state as a side effect of fixing 10-001 the recommended way (decouple spinner from header, not "always show header")
   - always render order-number/appointment link with a fallback label when `orderNumber` is null (10-003)

## 18. Proposed Container Simplification
No simplification needed — hierarchy is already minimal (see §6). This page is a **positive reference example** for the rest of the portal audit: flat thread rows, no card-in-card, no redundant stat strip, no unnecessary intro copy.

## 19. Responsive Findings (per viewport)
- **Desktop/Laptop/Tabletl/Tabletp:** Two-pane layout renders correctly at all four (`md:grid-cols-[minmax(260px,340px)_1fr]` kicks in from `tabletp` 768px up); list and pane both fully usable.
- **Mobile 390×844 / Smobile 375×667:** Correctly collapses to single-pane with show/hide + back-arrow pattern (`MessagesInbox.tsx:113,212`), confirmed working end-to-end via browser (`10-messages-mobile-thread-open-01.png`).
- **Short 1366×650:** Thread list is visible but only shows ~2 rows before needing an internal scroll — acceptable since the list itself is a scroll container, not a page-level fold problem like 08-services.

## 20. Accessibility Findings
- Search input has an associated `<label>` wrapping it (`MessagesInbox.tsx:114-128`) — correct.
- Mobile back button has `aria-label="Back to conversations"` — correct, verified present in DOM dump.
- Thread rows are real `<button>` elements inside an `<ul>/<li>` structure — keyboard-focusable and reachable via Tab, not spot-checked exhaustively this pass.
- Unread count uses a numeral in a colored pill, not color-only — passes the "status not color-only" check.
- Not tested this pass: full keyboard-only round-trip (Tab into search → into first thread → Enter to open → Tab into compose textarea → Escape/Tab out), and contrast spot-check on the unread badge (green-on-white `signal` token) — recommend as follow-up before shipping the 10-001/10-002 fixes, since fixing 10-002 reintroduces a header with a new interactive lock button that needs its own focus/label check.

## 21. Content & Microcopy Findings
| Current | Recommended | Reason |
|---|---|---|
| "Your consultation chats with patients. Click a thread to read and reply in place; the order number opens the appointment." | Keep, but make true for all threads — currently false for order-number-less threads (10-003) | Copy promises a feature the UI doesn't always provide |
| "Select a conversation" / "Choose a thread on the left to read and reply." | Keep — clear empty-pane state | — |
| "No matches." (search empty state) | Keep — sufficient, low-stakes | — |
| No explicit "message failed to send" wording verified (not triggered) | Verify code-derived error copy in `ConsultationChat.tsx` reads clearly to a doctor mid-conversation | Not testable without sending; flag for follow-up |

## 22. Component & Code Impact
| Component | Path | Change | Shared? | Risk | Complexity |
|---|---|---|---|---|---|
| `DoctorMessagesInbox` | `frontend/app/(doctor)/doctor/messages/inbox.tsx` | Pass `onToggleLock` (import/wire `toggleDoctorChatLock`, mirroring `consultation-chat-section.tsx`) | No (page-local) | Low | Small |
| `ConsultationChat` | `frontend/components/chat/ConsultationChat.tsx` | Decouple loading spinner from header/`lockToggle` presence; render it in the message-list area instead | **Yes** — used by patient portal and doctor appointment-detail page too | Medium (shared component; verify patient-portal + appointment-detail views aren't relying on current spinner placement) | Small-Medium |
| `MessagesInbox` | `frontend/components/messages/MessagesInbox.tsx` | Always render order-number link/badge with fallback label when `orderNumber` is null | **Yes** — shared by admin/doctor/patient portals | Medium (shared component; check admin's message-threads and patient's equivalent for the same null-orderNumber scenario before changing shared behavior) | Small |

## 23. Backend or Business-Logic Impact
- 10-002 (lock toggle) and 10-001 (loading spinner) are frontend-only — no API changes; both already call existing, already-used backend routes.
- 10-003 (null order number) is frontend-only for the *link* fix, but the root cause of *why* some appointments lack an order number lives in `mapAppointmentOrderNumbers` (backend, not opened this pass) — worth a quick backend check on whether that's expected (e.g. legacy/manually-created appointments) or a data-integrity gap, since a doctor permanently losing the ability to open an appointment from its thread is a workflow, not just cosmetic, issue.
- Clinical/system separation (10-005) requires no change — confirmed correct at the data-model level (`ConsultationMessage` vs `Message` are already separate Prisma models/endpoints).

## 24. Recommended Implementation Order
1. 10-002 (wire `onToggleLock`) — restores parity with the appointment-detail page's chat, single prop addition.
2. 10-001 (decouple loading spinner) — shared component change, do together with 10-002 since both touch the same header/variant logic, and verify the other two `ConsultationChat` consumers (patient portal, doctor appointment page) visually after the change.
3. 10-003 (order-number fallback) — shared `MessagesInbox` change; check backend `mapAppointmentOrderNumbers` behavior first to decide the right fallback label.
4. 10-004 — no action recommended.

## 25. Acceptance Criteria (measurable)
- Opening a thread from `/doctor/messages` shows a lock/re-open control identical in behavior to the one on `/doctor/appointments/[id]`.
- A visible loading indicator appears within 200ms of selecting a thread and disappears once messages render, in the embedded variant specifically.
- Every thread in the list — including ones with a null `orderNumber` — has a clickable way to reach its appointment record from both the list row and the open conversation header.
- No regression to the patient portal's or doctor appointment-detail page's `ConsultationChat` rendering (both consumers screenshot-verified after the shared-component change).

## 26. Open Questions
- Why do some appointments have no resolvable order number (`mapAppointmentOrderNumbers` miss)? Is this expected for a specific appointment type (manual entry, legacy import) or a data gap worth fixing upstream? Needs backend/data owner input before deciding 10-003's fallback UX.
- Should locking a chat from the Messages inbox require any additional confirmation (it's a doctor-only, reversible action, unlike the destructive actions this audit is barred from triggering) — worth a quick UX sign-off, not a blocker to implementing 10-002.
- Is the two-pane layout intended to eventually gain the same `ColumnPriorityTable`/`PortalMobileCard` treatment used elsewhere in the portal, or is the current bespoke list+pane pattern (shared via `MessagesInbox`) meant to stay as its own primitive? No action needed now — flagging for Fable awareness only, since `MessagesInbox` is shared across 3 portals and any future table-ification would be a multi-portal change.
