# Performance / Core Web Vitals Audit — myglobalhealth.online

**Date:** 2026-07-24
**Method:** Lighthouse 13.4.1 CLI (local, headless Chrome), mobile (default throttled) + desktop presets, `--only-categories=performance`. PSI API unavailable (shared-quota rate-limited, no key). CrUX skipped per instructions.

Pages tested:
- Homepage `/` (entry gate)
- `/ireland/en` (country home)
- `/ireland/en/services/acute-medical-consultation` (service page)

## Scores & metrics

| Page | Device | Score | LCP | CLS | TBT | TTI |
|---|---|---|---|---|---|---|
| Homepage | Mobile | **64** | 3.04s | 0 | 1,840ms | 28.8s |
| Homepage | Desktop | 96 | 0.87s | 0 | 120ms | — |
| /ireland/en | Mobile | **68** | 1.97s | 0 | 2,970ms | 8.3s |
| /ireland/en | Desktop | 97 | 1.00s | 0 | 50ms | — |
| Service page | Mobile | **63** | 4.62s | 0 | 770ms | 5.2s |
| Service page | Desktop | 98 | 0.81s | 0 | 0ms | — |

INP has no lab equivalent; TBT used as proxy per methodology note above. CLS is 0 across all six runs — not a concern on any page.

### CWV pass/fail (mobile, 75th-percentile-equivalent lab run)
- **LCP:** Homepage FAIL (>2.5s), /ireland/en PASS (≤2.5s), Service page FAIL (>4.0s — Poor band)
- **INP proxy (TBT):** Homepage FAIL (1,840ms), /ireland/en FAIL (2,970ms — worst), Service page borderline-FAIL (770ms, "Needs Improvement"/Poor boundary)
- **CLS:** PASS everywhere (0)

Desktop is healthy across the board (96-98) — all mobile issues are throttled-CPU/network main-thread problems, not markup/layout problems.

## Findings

### P0 — Homepage LCP element is text gated behind JS, not an image (Severity: Critical)
LCP breakdown for `/` mobile: TTFB 552ms + **element render delay 2,491ms** (82% of LCP time). The LCP node is the `CountryEntryGate` `<h1>` hero title text ("Licensed doctors and online care, in your country."), not an image. Render delay this large on a text node means the entry-gate component is blocking paint on JS/hydration before the already-downloaded text can render — consistent with the known reveal-system pattern (`html.js` CSS-hidden-before-paint, memory: `project_perf_rendering_fix_july2026`).
**Fix:** ensure the entry-gate hero `<h1>` is not held behind a JS-gated reveal/opacity class; if it must wait for a client decision (country/locale), render the text immediately and defer only the interactive gate controls. Expected impact: LCP 3.0s → likely <1.5s (removes ~2.4s of the 3.0s total).

### P0 — Homepage: 1,840ms TBT / 28.8s TTI (Severity: Critical, interactivity)
Main-thread breakdown mobile: Style & Layout 10.3s, Rendering 8.9s, Script Eval 5.5s, Other 5.0s — total ~30s of main-thread work, wildly disproportionate to the other two pages (6.9s and 2.6s respectively) despite similar JS bundle set. This points to homepage-specific continuous layout/rendering work (animation loop, repeated reflow, or an observer with a very large rootMargin repeatedly firing) rather than one-time hydration cost.
**Fix:** profile the homepage-only components (entry gate, hero) for a running rAF/animation loop or IntersectionObserver causing continuous Style&Layout/Rendering work; the `forced-reflow-insight` audit reports near-zero, so this is likely animation/paint driven, not JS-triggered reflow. Expected impact: TBT 1,840ms → target <200ms would move INP band from Poor to Good; also shrinks homepage LCP render-delay above.

### P1 — /ireland/en: highest TBT of the three pages (2,970ms) despite lowest total-page script (Severity: High)
LCP itself is fine (1.97s, Good), but Script Evaluation main-thread cost (2.58s) plus general main-thread contention pushes TBT to the worst of the three pages. Bootup-time attributes ~3.0s to the page's own inline/route JS and ~2.7s to shared chunk `124-p0nn-_je8.js`.
**Fix:** audit what's route-specific on `/ireland/en` that isn't on the service page (same shared chunk, smaller total) — likely a heavier client component tree (doctor list widgets, trust bar, Doctify embed) hydrating synchronously. Split/defer non-critical below-fold hydration (lazy `next/dynamic` for widgets not needed for LCP).

### P1 — Service page LCP is Poor (4.62s), dominated by resource load duration (Severity: High)
LCP breakdown: TTFB 601ms + resource load delay 322ms + **resource load duration 3,634ms** (79% of total) + render delay 66ms. LCP element is a hero background image served via `/api/media/media/<uuid>` (backend media proxy), not `/_next/image`. Unlike the homepage/ie hero image (served through Next's image optimizer, `resource load duration` only 748ms for a similarly-styled hero on `/ireland/en`), this image is not going through Next/Image optimization/resizing — full-size asset, no responsive `srcset` sizing benefit, likely no CDN edge caching either.
**Fix:** route the service-page hero image through the same `next/image` + `/_next/image` optimization pipeline used elsewhere (or apply resize/format transforms at the `/api/media` proxy and add far-future cache headers). Add `fetchpriority="high"` + preload for this image (it currently isn't prioritized the way the ie hero is). Expected impact: recovers ~2-3s of LCP, moving service page from Poor into Good/Needs-Improvement band.

### P2 — Third-party script detection empty on all runs (Severity: Info/Verify)
`third-party-summary` returned no entities on any of the three pages despite known Doctify widget usage (memory: `project_doctify_trust_july2026`). Either the widget lazy-loads below the fold and never executes within Lighthouse's trace window, or it's proxied through a first-party domain (masking as first-party in Lighthouse's entity classification) — worth a manual network-tab check if third-party weight becomes suspect later. Not currently a bottleneck signal either way.

### Not a concern
- **CLS = 0** on every page/device combination — no layout-shift work needed.
- **Desktop scores 96-98** — production is fine for desktop users; all remediation above should target mobile-throttled CPU/network paths specifically.
- Total byte weight is modest (454-665 KiB per page) — this is a main-thread/JS-execution and image-pipeline problem, not a "too many bytes" problem.

## Priority order (expected impact first)
1. Homepage hero `<h1>` render-delay fix (unblock LCP text from JS gate) — P0
2. Homepage continuous main-thread work (animation/observer loop) — P0, also fixes homepage TBT/INP
3. Service-page hero image through image-optimization pipeline + preload — P1
4. `/ireland/en` route-specific hydration audit/defer — P1
5. Verify Doctify/third-party script loading behavior — P2, informational
