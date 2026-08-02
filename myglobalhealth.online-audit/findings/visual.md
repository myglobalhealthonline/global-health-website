# Visual Audit — myglobalhealth.online

Captured via Playwright (`capture_screenshot.py` desktop 1440x900 / mobile 390x844) and
`analyze_visual.py`. Screenshots: `myglobalhealth.online-audit/screenshots/{page}-{desktop,mobile}.png`.

## Cross-site: cookie-consent modal is a real mobile interstitial

Every page tested (`home`, `ireland-home`, `service-page`, `doctors`, `about`) loads a
"Cookie preferences" modal that on mobile (390x844) covers **~55–60% of the viewport**,
blocking the H1 and any CTA on first paint — confirmed in `home-mobile.png`,
`ireland-home-mobile.png`, `service-page-mobile.png`. On desktop it's smaller but still
overlaps page content (on `home-desktop.png` it partially covers the country-selector
card, obscuring the Portugal row). This is the most consequential above-the-fold issue
found: real users must dismiss/interact with the banner before seeing anything else on
mobile, on every page, every session until consent is stored. Not a next/image or CLS
problem — it's a modal mounted on top of already-painted content, so it doesn't register
as layout shift (consistent with CrUX reporting CLS 0.00).

## Per-page

### `/` — entry gate (home-desktop.png, home-mobile.png)
- Desktop: H1 ("Licensed doctors and online care, in your country.") visible above the
  fold; value prop copy and trust badges (licensed professionals, secure consultations,
  GDPR-compliant) visible without scrolling. `analyze_visual.py` flags `cta_visible:
  false` — technically correct: the primary action is the country-search/list card, not
  a single button, and "Continue to Ireland" is a text-link with arrow rather than a
  filled CTA button. It IS visible on desktop (partially behind the cookie banner).
- Mobile: cookie modal covers the entire country-selector card and CTA on load (see
  above) — on mobile this page reads as a genuine interstitial gate stacked on top of
  the intentional country-selection gate. Two dismissals needed before a mobile user can
  act (cookie banner, then country pick).
- Does the root gate itself read as an "interstitial" independent of cookies? No —
  it's a single, purposeful step (pick your country), not a promo/popup, and it's the
  intended IA for a multi-country site. The compounding problem is that the cookie modal
  stacks on top of it on first mobile load.
- Font size: `analyze_visual.py` reports base font-size 15.2px flagged `readable: false`
  (its threshold is presumably 16px). Visually the hero heading/body remain legible at
  1440 and 390 widths in the screenshots; this is a threshold-based technical flag, not
  an observed legibility problem — worth a CSS check on true base `font-size` (likely a
  16px root with a 0.95rem body class) but not a rendering breakage.
- No horizontal scroll, no overlapping elements, no text overflow detected.

### `/ireland/en` (ireland-home-desktop.png, ireland-home-mobile.png)
- H1 visible, `cta_visible: true` (analyzer confirms a real button — "Book Appointment"
  sticky button visible on mobile) both desktop and mobile.
- Mobile: cookie modal covers the H1/subhead on load (same as above); floating
  WhatsApp launcher (bottom-left) and sticky "Book Appointment" bar (bottom) both render
  with adequate tap-target size, no overlap with each other observed in the screenshot.
- Hero image is a `next/image` `_next/image?...&w=2560&q=60` JPG (preloaded per brief) —
  no missing-dimension risk observed; CrUX CLS 0.00 corroborates.
- No horizontal scroll, no text overflow.

### `/ireland/en/services/acute-medical-consultation` (service-page-desktop.png, service-page-mobile.png)
- H1 ("See a Doctor Online in Ireland") and CTA both visible/true above the fold on both
  viewports (behind the cookie modal on first mobile paint, same pattern).
- Hero image via `next/image` WebP with srcset (`w=2560&q=75`) — consistent with the
  preload/WebP claim, no broken image observed.
- No horizontal scroll, no overlap, no text overflow detected by the analyzer.

### `/ireland/en/doctors`
- H1 + CTA both visible above the fold, desktop and mobile. Hero `doctors.jpg` via
  next/image. No horizontal scroll / overlap / overflow flagged.
- Screenshots captured (`doctors-desktop.png`, `doctors-mobile.png`) but not individually
  eyeballed beyond the analyzer pass in this run — layout looked structurally identical
  to the service page pattern from the JSON, no anomalies reported.

### `/about`
- H1 + CTA both visible above the fold, desktop and mobile. Hero `about.jpg` via
  next/image. No horizontal scroll / overlap / overflow flagged.
- Screenshots captured (`about-desktop.png`, `about-mobile.png`) but not individually
  eyeballed beyond the analyzer pass in this run.

## Tap targets / mobile responsiveness
`analyze_visual.py` reports `touch_targets_ok: true` and `horizontal_scroll: false` and
`viewport_meta: true` on all 5 URLs. Visually the WhatsApp bubble, hamburger menu, cart
icon, and sticky CTA buttons all look >= 44px in the screenshots. Not independently
measured pixel-by-pixel this run — flagged as **not assessed** at that level of
precision.

## Layout shift
CrUX field data shows CLS 0.00 across the origin — treated as ground truth per brief.
Hero images are preloaded next/image WebP with srcset, consistent with no shift.
Theoretical risk only: the cookie-consent modal itself is DOM-inserted after initial
paint on every page; if it were unstyled/unsized before its own CSS loads it could
theoretically nudge layout, but CrUX shows this isn't happening in the field — **not
assessed further, no evidence of a real problem**.

## Rendering breakage
None observed: no overlapping elements, no text cutoff/overflow, no horizontal scroll,
no broken images, across all 5 URLs x 2 viewports.

## Summary of action items
1. **Cookie-consent modal covers H1+CTA on mobile on every page** — real above-the-fold
   / interstitial issue, highest priority. Consider a bottom-sheet/banner style instead
   of a centered modal that eclipses primary content on small viewports.
2. Country-selector gate at `/` is intentional IA, not itself a bad interstitial — but
   it compounds with #1 on first mobile visit (two dismissals before any action).
3. `analyze_visual.py`'s `readable: false` / 15.2px base-font flag is a threshold check,
   not an observed legibility failure in the screenshots — worth a quick CSS confirm of
   root/body font-size, low priority.
4. `/doctors` and `/about` screenshots captured but only analyzer-checked, not manually
   eyeballed in this run — noted as not assessed beyond automated pass.
5. Precise tap-target pixel measurement not performed — analyzer's boolean pass only.
