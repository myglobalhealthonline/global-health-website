> **Historical audit — current status is tracked in [`docs/plans/seo-control-state.md`](../../docs/plans/seo-control-state.md).** This audit predates the 2026-08 remediation batches. Every count, status and priority below is superseded. Kept as evidence only.

# `/ireland/en` RSC payload — corrected diagnosis + plan

Investigation only. No code changed. Measurements taken 2026-08-03 by direct
`curl` against the live site + static trace of `frontend/app/[country]/[lang]/page.tsx`
and its imports.

## Headline correction

**The "91 KB GP-availability schedule inlined into RSC" claim in
`performance.md` / ACTION-PLAN.md §2.2 is wrong for `/ireland/en`.** The
91 KB figure is real (that's the actual size of the
`/api/public/gp-availability` response — confirmed live), but that data is
**not** fetched server-side on the country-home page and **not** present in
the HTML at all.

Proof:
- `curl https://www.myglobalhealth.online/ireland/en` → grepped the full
  597,299-byte response for `startAt`, `pricingType`, `clinicTimezone` (the
  three fields unique to a `GpAvailabilityResult`/`GpAvailabilitySlot`) —
  **zero matches**.
- `frontend/app/[country]/[lang]/page.tsx:216` calls `getGpLanguages(code)`
  only — a small `{configured, languages[], bookableLanguages[]}` object of
  language names, not the schedule.
- `getGpAvailability()` (`frontend/lib/content/get-gp-availability.ts:71`) is
  called from exactly two places: `frontend/app/api/public/gp-availability/route.ts:25`
  (the API route itself) and `frontend/app/[country]/[lang]/book/page.tsx`
  (the booking page, a different route). It is never called from the
  country-home page.
- `frontend/components/sections/SameDayBooking.tsx` is `"use client"`
  (line 1) and fetches `/api/public/gp-availability` itself, client-side,
  inside a `useEffect` (`fetch(` at line 196). It receives only
  `languages`/`configured` as props from `HomeHero`
  (`frontend/components/sections/HomeHero.tsx:280-289`), which itself gets
  them from `page.tsx:561-565` (`gpLanguages.bookableLanguages`,
  `gpLanguages.configured` — both derived from `getGpLanguages`, not
  `getGpAvailability`).

So the availability schedule is **already** exactly where §2.2 recommends
moving it: fetched client-side, after hydration, behind the same-day widget.
There is nothing to defer here. Implementing §2.2 as written would be a
no-op change to a component that doesn't do what the finding says it does.

## What's actually in the 220 KB (real measurement)

Fetched fresh: `curl https://www.myglobalhealth.online/ireland/en` →
**597,299 bytes** total (audit's 596,632 is consistent, within a render's
worth of drift — content is DB-backed and not literally static).

Parsed every `self.__next_f.push([...])` script tag out of the document:

| Metric | Value |
|---|---|
| Push calls | 69 |
| Inline script payload (sum of `push()` array-literal text) | 219,304 characters (≈221.9 KB incl. the `<script>...</script>` wrapper bytes) |
| % of document | 37.2% (vs. audit's stated 38.6% — same order, the audit's figure likely included the `<script>` tag overhead I excluded; both are directionally the same finding) |

Chunk-size breakdown (largest first):

| Rank | Size | Content |
|---|---|---|
| 1 | 24,120 B | **`DoctorCarousel` props** — full array of 22 doctor objects (name, title, bio, credentials, IMC registration, image metadata, languages) for the "3-at-a-time" GP/Specialist-filterable carousel |
| 2 | 16,985 B | **`ServiceCatalog` props** — full array of 23 services (title, tag, price, duration, description, image) for the service-tile grid |
| 3 | 5,939 B | Root `html`/`head`/`body` shell node (framework-internal, not app content) |
| 4 | 5,520 B | `FAQPage` JSON-LD (SEO-required, server-rendered on purpose) |
| 5–69 | ~1–5 KB each | The remaining ~13 page sections' own serialized render trees (TrustMarquee, TrustRibbon, StatsBand, HowItWorksNarrative, FinalCTA, footer, etc.) — standard Next.js App Router behavior: every server-rendered node that has a client-component descendant gets its subtree serialized into the flight payload alongside the static HTML, so the tree effectively ships twice (once as markup, once as hydration data) |

Chunks 3–69 (everything except the two carousels) sum to roughly 178 KB
across ~65 chunks and are not attributable to any single fetch or
component — they're the generic RSC "flight duplication" cost of a
15-section, heavily-styled page (long `className` strings, JSON-LD, footer,
nav). This is inherent to the App Router's architecture and isn't something
`/ireland/en` does wrong that other pages don't also do.

The two things that make `/ireland/en` an outlier over the doctor-profile
and service pages are `DoctorCarousel` and `ServiceCatalog` — together
**41.1 KB (18.6% of the inline payload)** — because both are **client
components** (`"use client"` at the top of
`frontend/components/sections/DoctorCarousel.tsx:1` and
`frontend/components/sections/ServiceCatalog.tsx`, confirmed via `head -3`
grep). A client component's props must be serialized into the flight
payload so React can hydrate it; a server component's props never leave the
server. Neither of the two doctor-profile/service-page equivalents has a
component this data-heavy that's also client-side (see §4 below).

## 1. Confirm the diagnosis — done, see above

The 91 KB availability figure and the 230 KB inline-script figure are both
real numbers, but they describe two unrelated things that the original
finding merged into one causal story. The corrected story: 220 KB of inline
script exists, 41 KB of it is attributable to two specific client
components (doctor carousel + service catalog), and the rest is generic RSC
overhead spread across every section on the page.

## 2. The component(s) — file:line

- `frontend/components/sections/DoctorCarousel.tsx:1` — `"use client"`.
  Renders all 22 country doctors for CSS scroll-snap swipe + a GP/Specialist
  filter toggle (comment at `page.tsx:681`: "Doctor carousel — 3 at a time,
  GP/Specialist filter tabs, prev/next arrows"). All 22 must be present
  client-side for the filter tabs and swipe to work without a network
  round-trip per filter click.
- `frontend/components/sections/ServiceCatalog.tsx` — `"use client"`.
  Renders all 23 services as a grid/carousel of cards.
- Data source: `getCountryDoctors(code, lang)` and
  `getCountryServices(code, undefined, lang)`, both called server-side in
  `Promise.all` at `page.tsx:198-217`, then mapped into
  `DoctorCarouselItem[]` / `ServiceCatalogItem[]` and passed as props.
- Both are already wrapped in `frontend/components/motion/LazyHydrate.tsx`
  (`page.tsx:583-585` and `682-695`), which defers **hydration** (JS
  execution, event listeners, TBT) until the wrapper is within
  `rootMargin: "600px"` of the viewport via `IntersectionObserver` — but
  this does **not** reduce the bytes shipped. `LazyHydrate` renders the full
  server HTML unconditionally and the RSC flight payload for a client
  component is generated at render time regardless of whether/when it later
  hydrates. So `LazyHydrate` already addresses part of the TBT story (see
  §3) but does nothing for the 41 KB of bytes.

Is this data needed for first paint? No — the doctor carousel and service
catalog both sit below `HomeHero`, and Lighthouse's LCP-element audit came
back empty in the original run (not re-confirmed here either — see "Not
determined" below), but neither dataset is hero content. `LazyHydrate`'s own
design assumes exactly this: the DOM is server-rendered (so it's visible and
crawlable on scroll) but not needed for the initial interactive/paint
budget.

## 3. Can it move client-side? What would it cost?

**SEO check:** No JSON-LD on `/ireland/en` references availability, doctor
carousel, or service catalog data structurally beyond what's already
visible as text — `curl` + regex search for `ReserveAction` on this URL
returned **zero matches** (the audit's "196 pages" figure is a sitewide
count; this isn't one of them). The three JSON-LD blocks present are
`MedicalBusiness`/`Organization` (2,500 B), a second smaller block
(1,086 B), and `FAQPage` (5,396 B) — none touch doctor or service arrays.
Doctor names/services **are** rendered as visible server HTML text
independent of the client component's hydration data — the same props feed
both the static markup and the flight payload, so trimming or deferring the
*flight* payload doesn't remove the *visible, crawlable* text; it only
removes the duplicate copy that exists solely for hydration.

**Doctor carousel and service catalog are core visible content**, not an
interactive widget layered on top of nothing — unlike GP-availability
(which has zero server-rendered text equivalent), these two arrays back
real paragraphs/cards Google can already read in the HTML. That changes the
fix shape: you cannot "fetch it client-side after hydration" the way §2.2
proposed for availability, because the server HTML needs this content
regardless (SEO, no-JS visibility, and no-layout-shift). The available
levers are narrower:

- **Reduce the client-hydration footprint without reducing the server
  HTML**: keep both arrays server-rendering full static markup as today,
  but for the *client* (interactive) island, hydrate only a lightweight
  controller (filter-tab state, current-index state, swipe handlers) that
  reads the already-mounted DOM instead of re-receiving the full data as
  React props. This is a bigger refactor than "add a `use client`
  directive" — it means restructuring `DoctorCarousel`/`ServiceCatalog` so
  the data-heavy list renders as an actual server component (static HTML,
  zero flight-payload cost) and only the thin interaction shell
  (`CarouselNav`, filter buttons) is a client component operating on refs/DOM
  queries rather than a `doctors: DoctorCarouselItem[]` prop. Non-trivial;
  touches the filter-tab logic (currently presumably does `doctors.filter()`
  in JS) and the swipe/scroll-snap wiring.
- **Cap the client payload size, not the server HTML**: cheaper, smaller
  diff. Server-render all 22/23 items as today (full SEO text, no CLS risk),
  but only pass the client component a trimmed prop set (e.g., id + name +
  href, dropping `bio`, full `credentials[]`, image metadata fields not
  needed for the swipe/filter interaction itself — those are already in the
  static DOM). This shrinks the flight payload without touching the SSR
  output or the filter/carousel behavior. Rough estimate: `bio` strings and
  `credentials[]` arrays look like roughly 40-50% of each doctor object's
  serialized size from the sampled chunk — could plausibly cut the 24 KB
  doctor chunk to under 12 KB. Not benchmarked; would need an actual diff to
  measure.

**CLS risk:** Low for either option, since the server HTML output doesn't
change — `LazyHydrate`'s wrapper already reserves the DOM node with
`dangerouslySetInnerHTML` adoption specifically to avoid a hydration-time
reflow, and neither proposed change alters that mechanism. CrUX's 0.00 CLS
should be unaffected as long as the visible markup stays byte-for-byte
identical, which both options above preserve.

**Booking-flow dependency:** None. The doctor carousel's "pick a time" CTA
and the service catalog's "Book" CTA are just links (`bookHref`/`href`
strings built server-side via `buildBookHref`) — they navigate to `/book`,
they don't carry availability state. Confirmed via `mapServiceToCatalogItem`
(`page.tsx:128-148`) — no slot data flows through either component.

## 4. Same pattern elsewhere? — different, not same

Fetched and analyzed the same way:

| Page | HTML bytes | Inline script bytes | % | gp-availability markers | Largest chunk |
|---|---|---|---|---|---|
| `/ireland/en` | 597,299 | 219,304 | 37.2% (36.7% char-for-char of 597,299) | 0 | 24,120 B (`DoctorCarousel`) |
| `/ireland/en/services/acute-medical-consultation` | 235,731 | 122,982 | **52.2%** | 0 | 5,939 B (framework shell — no outlier) |
| `/spain/en/doctors/dr-syed-tahir` | 270,211 | 103,184 | **38.2%** | 0 | 6,073 B (`Physician` JSON-LD) |

Both figures are close to the audit's original 55.2%/41.5% (small drift is
expected — content is DB-backed, not a frozen snapshot). **Neither service
pages nor doctor profiles has a single outlier chunk** — no chunk over
6.1 KB on either page, versus `/ireland/en`'s 24 KB and 17 KB outliers. Their
inline-script weight is the generic "many sections × ~2-5 KB each" pattern
(45 and 55 chunks respectively), the same baseline overhead present on
`/ireland/en` too, just without the two carousel/catalog additions on top.

**Conclusion for item 4: same root mechanism (RSC flight duplication across
many server-rendered sections), but the *magnitude driver* differs.**
`/ireland/en` has two large, data-heavy client components layered on top of
the baseline; the service and doctor pages don't have an equivalent — their
elevated percentage is entirely the baseline "N sections × several KB"
pattern, which is a platform characteristic, not a single fixable
component. Fixing `/ireland/en`'s two carousels won't move the needle on
the service-page 52.2% or doctor-page 38.2% figures at all — those need a
different intervention (see "cheaper wins" below) or acceptance as a
platform cost.

## 5. Cheaper wins in the same payload

- **Nothing duplicated within a page's own payload was found** — spot-checked
  for repeated large substrings (footer, `cardI18n`, JSON-LD) and each
  appears exactly once per page, as expected for a single server render.
- **JSON-LD is being both server-rendered as a `<script type="application/ld+json">` tag AND separately captured in a `self.__next_f.push` chunk** (see rank-4 chunk on `/ireland/en`, the `FAQPage` schema, and rank-1 chunk on the doctor page, the `Physician` schema) — this is the same generic RSC-duplication mechanic as everything else, not a special case, but JSON-LD specifically is inert non-visual data with zero interaction need. If `JsonLd` (`frontend/components/seo/JsonLd.tsx`, referenced at `page.tsx:3`) is a server component with no client descendants, it shouldn't be serialized into the flight payload at all — worth checking whether it's actually a leaf server component or gets swept into a parent client boundary's serialization. Not confirmed here; flagged for a follow-up read of `JsonLd.tsx`.
- **No image-metadata or translation-bundle over-fetch found** in the
  sampled chunks — image fields present (`imageSrc`, `imageAlt`, etc.) are
  single string/number fields per item, not bulk metadata blobs. Translation
  bundle (`loadLocaleBundle`) content appears distributed as already-resolved
  strings inside each section's own props, not as one giant duplicated
  dictionary object anywhere in the payload.

## Ordered implementation plan (smallest diff first)

1. **Correct the action-plan item.** §2.2 as written ("fetch availability
   client-side after hydration") should be struck or rewritten — it
   describes work that's already done. Zero-risk, zero-code, prevents a
   wasted implementation pass. *Expected saving: 0 KB (nothing to change);
   prevents wasted engineering time.*
2. **Trim `DoctorCarouselItem`/`ServiceCatalogItem` client props to what the
   interaction actually needs** (drop `bio`, `credentials[]`, per-image
   metadata fields not used by swipe/filter JS — keep them in the SSR
   markup, just don't also hand them to the client component as props).
   Smallest real diff with real payload impact. *Expected saving: rough
   estimate 15-25 KB off `/ireland/en`'s 220 KB inline payload (not
   benchmarked — needs a before/after `curl` diff once implemented). TBT
   impact uncertain — trims JSON.parse cost during hydration but the DOM
   work (22-23 cards) is unchanged, so probably a modest, not dramatic, TBT
   improvement.*
3. **Check `LazyHydrate`'s effective `rootMargin` against real mobile
   viewport height for this specific page.** TBT is 1,515ms despite
   `DoctorCarousel`/`ServiceCatalog` being wrapped in `LazyHydrate` with
   `rootMargin: "600px"` — on a page this long, that margin may be wide
   enough that both sections are "near enough" to the viewport to hydrate
   almost immediately after load rather than genuinely deferring, especially
   since Lighthouse doesn't scroll. This needs a DevTools Performance trace
   (not run here) to confirm whether `LazyHydrate` is actually delaying
   hydration on this page or firing immediately — if the latter, either the
   `rootMargin` needs tightening for this page or the mobile TBT number
   isn't actually being helped by the wrapper at all. *Expected saving:
   unknown until traced — this is the most likely candidate for actually
   moving the 1,515ms TBT number, more so than the byte trim in step 2.*
4. **Larger refactor (server-render markup, client-only controller) for
   `DoctorCarousel`/`ServiceCatalog`** — only worth doing if step 2's
   measured saving is judged insufficient. Bigger diff, touches filter-tab
   and swipe-state logic; do not start without a measured baseline from
   step 2 first.
5. **Check whether `JsonLd` components are leaking into flight-payload
   serialization** (item 5 above) — cheap to verify (read
   `frontend/components/seo/JsonLd.tsx`, confirm it's a server-only leaf), no
   code change likely needed, but worth 10 minutes before touching anything
   else since JSON-LD duplication (if real) is pure waste with zero
   trade-off.
6. **Do not attempt a shared fix for the service-page 52.2% / doctor-page
   38.2% figures via the `/ireland/en` fix** — those pages don't share the
   carousel/catalog cause (§4). If those percentages need to come down, that
   is a separate investigation into the generic RSC baseline-overhead
   pattern (e.g., whether any of their ~50 small sections could be merged,
   or whether some are client components that don't need to be), out of
   scope for this plan.

## Risks

- **CLS**: low, both proposed fixes (steps 2 and 4) preserve server HTML
  output exactly; `LazyHydrate`'s DOM-adoption mechanism (§2) is the thing
  actually protecting CLS today and isn't touched by either fix.
- **Booking flow**: none identified — confirmed no availability/slot state
  flows through either component (§3).
- **SEO-visible content**: none at risk if step 2 only trims *client* props
  and leaves server-rendered markup untouched — but this must be verified
  with a diff of the rendered HTML before/after, not assumed, since it's
  easy to accidentally trim a field that's also used in the SSR JSX path
  (`DoctorCarousel`/`ServiceCatalog` likely render from the same prop object
  server- and client-side; the "SSR view" vs "client-interaction view" split
  proposed in step 2 does not exist in the code today and would need to be
  built, not just have fields deleted).
- **`LazyHydrate` rootMargin change (step 3)**, if pursued, could make
  interaction feel less "ready" (delayed swipe/filter responsiveness) if
  tightened too aggressively — needs to be tuned against real TBT trace
  data, not guessed.

## Not determined

- Actual byte/TBT saving from step 2 — no code was written or benchmarked
  (investigation-only scope).
- Whether `LazyHydrate`'s `rootMargin: 600px` is actually deferring
  hydration on `/ireland/en` in practice, or firing near-immediately — needs
  a DevTools Performance trace or Lighthouse trace-waterfall run, not done
  here.
- Whether `JsonLd` (`frontend/components/seo/JsonLd.tsx`) is a leaf server
  component or gets pulled into a client boundary's flight serialization —
  file not read this pass.
- LCP element identity on `/ireland/en` — still not confirmed (Lighthouse's
  `largest-contentful-paint-element` audit was empty in the original run;
  not re-run here). Without it, it's not certain the carousel/catalog fix
  moves LCP at all versus only TBT/TTI — the original 4,809ms LCP could be
  dominated by the hero image or a render-blocking resource unrelated to
  this payload.
- Real production TBT/LCP after any of these changes — nothing was deployed
  or measured post-fix; this document is diagnosis only.
