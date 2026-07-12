# Short-viewport clipping fixes (2026-07-12)

Bug family: a section combines a viewport-height cap (`max-height`/`height`
in svh/dvh) with `overflow: hidden`. When the window is shorter than the
section's content floor, the content is clipped with no scroll fallback —
it just vanishes under the next section. Violates the plan rule
(RESPONSIVE_IMPLEMENTATION_PLAN: "content is never clipped, page scroll
remains the fallback").

Fix pattern: gate the cap behind a `min-height` media query sized to the
section's content floor. Tall viewports keep the no-page-scroll behavior;
short viewports size naturally and scroll. Where the cap must stay (country
gate panel), make the inner body `overflow-y: auto` instead.

| # | Surface | Cause | Fix |
|---|---------|-------|-----|
| 1 | Country home hero (`.gh-home-hero-root` + `.gh-hero-cap-full`, globals.css) | `max-height: 100svh` at lg+, content floor ≈ 880px (SameDayBooking column `min-h-[660px]` + header + padding) | Cap now `(min-width: 1024px) and (min-height: 880px)` |
| 2 | Country entry gate panel (`.selectPanel`/`.panelBody`, CountryEntryGate.module.css) | Panel `max-height: min(760px, 100dvh − 168px)` + `overflow: hidden`; content ≈ 520px; country cards clipped, unreachable | `.panelBody` gets `flex: 1 1 auto; overflow-y: auto` — body scrolls inside the capped panel |
| 3 | Text heroes (`.gh-hero-cap`: ServiceHero, PageHero, DoctorsHero, globals.css) | `max-height: calc(100svh − header)` at lg+, no floor guard | Cap now `(min-width: 1024px) and (min-height: 700px)` |
| 4 | Split detail heroes (`.gh-inline-split-hero`: doctor profile, service/test detail, globals.css) | Fixed `height: calc(100svh − header)` at lg+ with a 620px floor — short windows overflowed | Hero tracks viewport height at any lg height (620px floor only ≥ 700px tall); right panel scrolls internally (`lg:overflow-y-auto`); compact tier ≤ 760px tall shrinks panel padding + `h1` via `6.5svh` clamp |

Rule for new heroes/panels: never pair a viewport-height cap with
`overflow: hidden` unless either (a) the cap is gated on a `min-height`
media query ≥ the content floor, or (b) an inner slot scrolls
(`overflow-y: auto`).
