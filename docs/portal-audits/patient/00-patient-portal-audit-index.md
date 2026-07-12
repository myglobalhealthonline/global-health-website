# Patient Portal Audit — Index

Audit date: 2026-07-12 · Local dev `http://localhost:3000` · Patient test account (credentials withheld)
Method: real-browser audit (Playwright headless, 7 viewports: 1440×900, 1280×720, 1024×768, 768×1024, 390×844, 375×667, 1366×650) + source inspection. Sonnet agents per page, Fable review of structural recommendations.

## Documents

| File | Purpose | Status |
|------|---------|--------|
| `01-route-inventory.md` | All patient-accessible routes | Done |
| `02-cross-portal-design-system-findings.md` | Portal-wide surface/spacing/typography rules | Done |
| `03-patient-information-architecture.md` | Navigation + IA recommendation | Done |
| `04-prioritized-patient-improvement-plan.md` | P0–P3 plan | Done |
| `05-shared-component-impact-map.md` | Shared-component risk map | Done |
| `06-accessibility-summary.md` | Cross-page a11y summary | Done |
| `07-responsive-summary.md` | Cross-page responsive summary | Done |
| `08-open-questions-and-blockers.md` | Unresolved items | Done |

## Page audits

| # | Page | Route | File | Status |
|---|------|-------|------|--------|
| 01 | Dashboard + portal shell | `/account` | `pages/01-dashboard.md` | Done |
| 02 | My bookings | `/account/bookings` | `pages/02-bookings.md` | Done |
| 03 | Reschedule | `/account/bookings/[id]/reschedule` | `pages/03-reschedule.md` | Done — Critical 03-001 verified in code by reviewer |
| 04 | Booking wizard | `/ireland/en/book` | `pages/04-booking-flow.md` | Done |
| 05 | Calendar | `/account/calendar` | `pages/05-calendar.md` | Done — reviewer addendum §22 closed dialog/keyboard gaps, added 05-005…05-008 |
| 06 | Messages | `/account/messages` | `pages/06-messages.md` | Done |
| 07 | Notifications | `/account/notifications` | `pages/07-notifications.md` | Done |
| 08 | Prescriptions | `/account/prescriptions` | `pages/08-prescriptions.md` | Done (populated list state code-derived — blocked by 09-001 API bug) |
| 09 | Medical files | `/account/medical-files` | `pages/09-medical-files.md` | Done — Critical 09-001 (dead API route) verified by reviewer via curl |
| 10 | Access history | `/account/access-history` | `pages/10-access-history.md` | Done |
| 11 | Membership | `/account/membership` | `pages/11-membership.md` | Done |
| 12 | Rewards | `/account/rewards` | `pages/12-rewards.md` | Done (redeem flow code-derived — 0/6 credits) |
| 13 | Subscribe | `/account/subscribe` | `pages/13-subscribe.md` | Done (form code-derived — active-subscriber redirect guard, Critical 13-001) |
| 14 | My orders | `/account/orders` | `pages/14-orders.md` | Done |
| 15 | Order details | `/account/orders/[id]` | `pages/15-order-details.md` | Done — Critical 15-001 (unpaid order has no pay path) |
| 16 | Payments | `/account/payments` | `pages/16-payments.md` | Done |
| 17 | Profile | `/account/profile` | `pages/17-profile.md` | Done — Critical 17-002 (no unsaved-change guard) verified by reviewer via grep |
| 18 | Family members | `/account/family` | `pages/18-family.md` | Done |
| 19 | Security | `/account/security` | `pages/19-security.md` | Done |
| 20 | Corporate | `/account/corporate` | `pages/20-corporate.md` | Done (empty state browser-verified; populated view code-derived — no corporate test account) |

## Screenshots

The 478 audit screenshots were captured locally and NOT committed (repo size). Filenames referenced in page files document what was captured; regenerate with the Playwright helper (viewport matrix + GPU flags) if needed.

## Scope guard

Patient Portal only. Doctor/Admin/Corporate portals NOT started — awaiting approval of this audit. No implementation performed; recommendations only.
