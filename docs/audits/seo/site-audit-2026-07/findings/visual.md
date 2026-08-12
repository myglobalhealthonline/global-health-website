> **Historical audit — current status is tracked in [`docs/plans/seo-control-state.md`](../../../../plans/seo-control-state.md).** Counts and statuses below are a record of what was true when written. Do not treat them as current.

# Visual SEO Audit — myglobalhealth.online

Tool: Playwright (Chromium), captured 2026-07-24. Viewports: Desktop 1920x1080, Mobile 375x812 (iPhone UA). Pages: `/`, `/ireland/en`, `/ireland/en/services/acute-medical-consultation`. 2.5s settle wait used per page to clear entry gate/animation before capture.

Screenshots: `docs/audits/seo/site-audit-2026-07/screenshots/{home,ireland-en,service}-{desktop,mobile}.png` (full page) + `fold-*.png` (above-the-fold crop).

## Score: 78/100

## Entry gate / JS-gated content
No blocking gate found — `<html>` carries `js` class post-hydration but content (H1, CTA, country picker) is present and visible in the DOM/screenshot without further interaction on all 3 pages, both viewports. Not an SEO risk as observed (also matches SSR: view-source would need separate check for raw HTML, but rendered DOM is clean).

## Findings

### High — Cookie consent banner fully covers primary CTA on mobile (all 3 pages)
On mobile (375x812), the "Cookie preferences" panel renders as a large fixed/centered overlay that fully obscures the primary conversion element on first paint:
- Homepage: covers the country-picker list (the primary CTA) — user must resolve the modal to see country options below.
- `/ireland/en`: covers the "Book Appointment" CTA button entirely.
- Service page: covers the sticky booking box's price/features and the "Book this service" button (button text itself is only ~30% visible, cut off mid-word "...k this service").
This is a real above-the-fold/conversion blocker for the majority-mobile traffic segment, and it repeats on every route (site-wide component), not a one-off page bug. Not an SEO ranking factor directly, but hurts Core Web Vitals perception/bounce and Google's mobile-friendliness heuristics if flagged as intrusive interstitial (borderline — banner is dismissible and disclosure-required, so likely exempt from the "intrusive interstitial" penalty, but still a UX/conversion issue worth flagging).
Fix: constrain the cookie banner to a bottom sheet with a fixed max-height (e.g. `max-height: 40vh`, scrollable) so the H1/CTA visible above it remains reachable without a scroll, or move to a slim bottom bar rather than a card that centers over content.

### Low — Desktop cookie banner overlaps bottom of country-picker card (homepage)
On desktop, the same banner overlaps the lower portion of the "Select your country" card (Portugal row cut off), though Ireland/Czechia rows and the primary CTA area are unobstructed. Cosmetic only at this breakpoint.

### Info — No horizontal scroll detected
`document.documentElement.scrollWidth` matched viewport width exactly on all 3 pages at both breakpoints (375px and 1920px). No overflow bugs found.

### Info — H1 above fold on all pages/breakpoints
Confirmed via DOM query (`h1.is_visible()` + bounding box y < viewport height) on all 6 page/viewport combinations:
- Home: "Licensed doctors and online care, in your country." ✓
- Ireland: "Online medical care in Ireland" ✓
- Service: "See a Doctor Online in Ireland" ✓

### Info — Above-fold CTA present and reachable (once cookie banner dismissed)
- Homepage: primary CTA is the country picker ("Continue to Ireland/Czechia/Portugal →") — unconventional but functionally the main above-fold action, adequately sized touch targets (~48px row height).
- `/ireland/en`: dual CTA "Book a consultation" (filled) + "Browse services" (outline) on desktop; consolidated to single "Book Appointment" pill in mobile hamburger-adjacent header + inline CTA further down.
- Service page: sticky "Book this service" button in a right-rail booking card (desktop) / full-width card (mobile) — good pattern, but see cookie-banner finding above for mobile occlusion.

### Info — Mobile nav
Hamburger menu icon present (circular, ~48x48px, meets tap-target minimum) on all pages, paired with cart icon at same size. No visible nav-item overflow or overlap.

### Info — Text-to-image ratio
Homepage/ireland hero sections use a large background photo (blurred/darkened) with text overlay — sufficient contrast (white/lime-green text on dark forest-green overlay), no readability issues observed in either breakpoint.

## Not tested
- Raw (pre-hydration) HTML source for gate/SSR content parity — would need `curl`/view-source diff against rendered DOM; out of scope for this Playwright pass.
- Layout-shift (CLS) numeric measurement — no PerformanceObserver instrumentation was wired into this pass; only qualitative overlay/gate check was done.
