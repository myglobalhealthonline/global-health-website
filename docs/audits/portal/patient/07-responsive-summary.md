# Responsive Summary — Patient Portal

Date: 2026-07-12. Every page captured at 1440×900, 1280×720, 1024×768, 768×1024, 390×844, 375×667, 1366×650 (screenshots under `screenshots/<page>/`).

## Systemic finding #1 — short-height starvation (1366×650)

On **8 pages** the header + `AdminSummaryStrip` (+ filters) consume the entire fold; zero primary content visible on load: 02 bookings, 05 calendar (grid ~1.5 rows), 07 notifications (first row barely), 08 prescriptions, 09 medical-files (upload clipped), 11 membership (all primary actions below fold), 14 orders (0 rows), 15 order-details, 16 payments. Root cause is layout composition, not CSS: fixing Rule S3 (stat strips off list pages) resolves all 8 simultaneously — do NOT ship 8 page-local `max-height` hacks.

Passing pages prove the layout can do it: 01 (dashboard hero scales), 04, 06, 18, 20.

## Systemic finding #2 — mobile scroll-to-task cost

Stat-card stacks cost 600–800px of scroll before the first real row at 390px: 02 (~800px), 08 (~700px), 11 (~2 screens to reach Cancel), 14 (~600px), 15, 16. Same root cause, same fix.

Booking wizard variant: the step/trust sidebar renders **above** the service grid on mobile (04-009) — reorder DOM/flex order, content first.

## True mobile defects (component bugs, fix individually)

| Issue | Page | Defect | Root cause |
|---|---|---|---|
| 06-001 High | Messages | Paid doctor-chat composer collapses, placeholder wraps 1 char/line at 390px | `ConsultationChat` composer flex never allows input to shrink w/ fixed buttons |
| 10-001 High | Access history | 32px icon avatar stretches to full-width pill | Shared flex-row mobile stacking rule applied to a grid (`portal.css:3514-3550`) |
| 05-001 High | Calendar | Day-agenda rows overflow drawer, status text clips | `DayAgenda` row lacks overflow guard; badge won't wrap |
| 05-003 Med | Calendar | "3 consults" badge truncates to "3 cons" in day cells | 7-col grid ~48px/col; word-badge instead of dot+numeral |
| 17-003 Med | Profile | Tab strip clips after ~3 of 5 tabs, no scroll cue | `PortalTabs` missing overflow affordance |
| 09 Med | Medical files | 5-tab strip overflows w/ no affordance | Same `PortalTabs` fix |

## Tablet portrait (768×1024)

Mostly sound. Two notes: messages conversation pane renders as a large empty bordered box pre-selection (06-004); bookings meta-grid dead space most visible here (02-005).

## Inconclusive (needs re-test)

17-006 / 19-004: short-viewport captures landed on loading skeletons on Profile and Security specifically — possibly screenshot timing, possibly a real hydration stall; re-run manually with longer waits, prod build (`08-open-questions-and-blockers.md`).

## Acceptance bar for the fix phase

- At 1366×650: ≥1 primary content row AND the page's primary action visible without scroll on every page.
- At 390×844: first content row within one viewport height of page top; no horizontal overflow anywhere; composer/forms usable.
- Tabs usable at 375px (scroll cue or compact mode).
