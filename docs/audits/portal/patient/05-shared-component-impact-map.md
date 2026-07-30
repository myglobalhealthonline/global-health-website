# Shared-Component Impact Map — Patient Portal Audit

Date: 2026-07-12. Rule: no shared component is modified without (a) usage grep across all portals, (b) decision "modify vs new variant", (c) regression check on non-patient consumers. Portal-impact column below is from audit evidence; **verify with a fresh grep at implementation time**.

| Component | File | Patient pages citing | Recommended change | Modify or variant? | Portals affected | Regression risk |
|---|---|---|---|---|---|---|
| `AdminSummaryStrip` / `StatCard` | `app/(admin)/admin/_components/atoms.tsx` (re-export `components/portal-atoms.ts`) | 01,02,05,07,09,11,12,14,15,16,17,19 (+18 reinvents it) | Do NOT modify the component; **remove usages** from patient list/detail pages (Rule S3), add per-metric icon prop | Usage removal + additive prop | Admin+doctor render it legitimately on dashboards | Low if only patient usages removed; icon prop additive |
| `SectionHeader` / `AdminEmptyState` | same `atoms.tsx` | 01,08,09,14,15,20 | Heading level fix (h3→h2 or `as` prop) | **`as` prop, default unchanged**, migrate consumers page-by-page | All 3 portals | High if default flipped blindly — grep every consumer first (20-§21 flag) |
| `AdminCard` | same `atoms.tsx` | 01,08,14,15,20 | No component change; ban `padding={0}` + inner `.p-5` idiom at call sites | Call-site cleanup | All 3 portals | None (call-site only) |
| `PortalMobileCard` | `components/PortalMobileCard.tsx` | 02,08,09,14,16 | Flatten `__meta-item` bordered boxes (`portal.css:767-773`); restrict role to table fallback | Modify CSS + migrate call sites to `ColumnPriorityTable` | All 3 portals (fallback layer) | Medium — visual change everywhere mobile cards render; screenshot-diff each portal |
| `ColumnPriorityTable` | `components/ColumnPriorityTable.tsx` | 02,14 (should adopt), 16 (already uses — reference) | No change; adopt on bookings/orders | Adoption only | — | Low |
| `PortalTabs` / `PortalTabPanel` | `components/PortalTabs.tsx` | 09,17 | Mobile overflow affordance (scroll cue/compact); consumers must wire `PortalTabPanel` (09-004 ARIA) | Modify (additive) + call-site fix | All 3 portals | Medium — tab strip renders in admin lists too |
| `PortalDialog` | shared primitive | 11,17,18,19 | None to component; stop passing `danger` to non-destructive confirms (11-001) | Call-site fix | — | None |
| `.gh-portal-menu-content` | `app/portal.css:5659` | 01 (shell) | Opaque fill or backdrop blur (must join both mobile fallback blocks per CLAUDE.md CSS rule) | Modify CSS | All 3 portals' menus | Medium — check doctor/admin menus on dark surfaces |
| `MonthCalendar` | `components/calendar/MonthCalendar.tsx` | 05 | Day-badge dot+numeral at narrow widths; day-cell `aria-label` | Modify (responsive+a11y, additive) | Admin+doctor calendars | Medium — verify doctor availability badges still legible |
| `DayAgenda` | `components/calendar/DayAgenda.tsx` | 05 | Row overflow fix (05-001); empty-state copy via prop (05-007 doctor copy leak) | Modify + copy prop | Admin+doctor | Medium |
| `EventDetailDialog` | `components/calendar/EventDetailDialog.tsx` | 05 | Role-aware variant: patient title = service+time, drop Patient row, gate Join CTA on confirmed+time-window (05-005/006/008) | **Variant/props** — doctor/admin need current fields | Doctor+admin | High if modified in place — Join gating must not break doctor join path |
| `MessagesInbox` | `components/messages/MessagesInbox.tsx` | 06 | Render `subtitle` in thread rows; empty-placeholder breakpoint fix; `sr-only` search label | Modify | Admin+doctor+patient | Medium — confirm other portals pass `subtitle` (06-§21) |
| `ConsultationChat` | `components/chat/ConsultationChat.tsx` | 06 | Composer responsive fix <420px (06-001 High); attach `aria-label` | Modify | Doctor portal shares the paid chat | Medium — test doctor side at mobile widths |
| `SubscriptionDashboard` | `app/(auth)/account/_components/SubscriptionDashboard.tsx` | 01,11 | Perk-grid odd-count fix; ledger row wording; eyebrow→SectionHeader | Modify | Patient only (2 routes) | Low |
| `.gh-patient-access-row` mobile CSS | `app/portal.css:3514-3550` | 10 | Remove from shared flex-row stacking selector (grid mistarget, 10-001 High) | Modify CSS (1 consumer) | Patient only | Low |
| `PayNowButton` | `account/payments/_components/pay-now-button.tsx` | 15,16 | Add visible error state (16-002); generalize for order-level pay (15-001) | Modify + extend | Patient only | Low; 15-001 needs **backend endpoint** |
| Public booking wizard + header | `app/(site)/[country]/[lang]/book/`, public header | 04 | Portal-chrome variant (IA-1); mobile order content-before-sidebar (04-009); details-form card merge (04-008) | **Variant flags only** | PUBLIC SITE funnel | **Highest risk in audit** — any change hits unauthenticated conversion path; feature-flag + funnel screenshots before/after |
| `useUnsavedChanges` (new) | proposed `lib/hooks/use-unsaved-changes.ts` | 17,18,19 | New shared hook: beforeunload + in-app nav intercept via PortalDialog | New | Portal-wide (later doctor/admin forms too) | Low (new code) |
| `statusTone()` dup | `orders/page.tsx` + `orders/[id]/page.tsx` | 14,15 | Extract to `lib/format-order-status.ts` | New util | Patient only | None |
| Medical-documents proxy | `app/api/account/medical-documents/[...path]/route.ts` | 09 | Folder rename → `[[...path]]`; verify handler on 0-segment path | Modify (1 line) | Patient only | None — currently 100% broken, can't regress |

## Order-of-operations guard

1. Anything touching `atoms.tsx`, `PortalTabs`, calendar components, `MessagesInbox`, `ConsultationChat`, or `portal.css` shared blocks ships **only with** a doctor+admin visual pass (the DESIGN2.md §9.2 screenshot matrix already exists for this).
2. Booking wizard changes ship behind a variant/flag with public-funnel screenshots.
3. New glass/backdrop classes must join both mobile fallback blocks in the same CSS file (project CLAUDE.md rule) — applies to the popover fix.
