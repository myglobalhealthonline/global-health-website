# Internal discovery, crawl depth, orphan recovery — 2026-08-09

## Method

Real recursive crawl of production, seeded from `/` and each country's
default-locale homepage. Followed only `<a href>` anchors found in raw
server-rendered HTML — no sitemap seeding after start, no JS execution.
2,600 pages fetched (frontier didn't fully drain — 756 URLs still queued at
the cap), 2,600 distinct URLs visited. Cross-referenced against the live
production sitemap (1,924 URLs at crawl time).

**Correction made mid-analysis, worth recording:** the first pass classified
"orphan" as "not yet fetched," which is wrong — a URL can have a real,
recorded inlink from an already-crawled page without the crawler having
gotten around to fetching *it* before hitting the page cap. Redone using the
inlink graph itself (which URL) each visited page's anchors point at,
regardless of whether the target was fetched. That is the correct measure
of "does a real link exist," and it changed the picture substantially: the
naive pass showed 306 "orphans"; the correct measure shows 1.

## A. Indexable URL truth set

1,924 sitemap URLs at crawl time (642 service, 343 doctor — both already
established elsewhere this session; 231 legal, 198 tool, 102 support, 86
blog-article, 84 lab-test, 66 health, 57 consultation-hub, 34 country-home,
33 doctor-listing, 33 booking, 12 lab-test-hub, 1 blog-hub, 2 other).

## B–E. Before

| | Before |
| --- | --- |
| Crawl-discovered (real inlink recorded) | 1,923 / 1,924 |
| True orphan (zero inlinks anywhere in the crawled graph) | **1** — the bare domain root, a crawl-seed artifact (it's where crawling *starts*, so nothing "links to" it in this methodology; not a real defect) |
| Weak inlink (exactly 1 unique source) | 321 |
| Depth ≥ 4 | 15 |

Depth distribution: 0→6, 1→214, 2→1,014, 3→674, 4→15.

The weak-inlink number needs unpacking — most of it is not a problem:

| Type | Weak(=1) | Real cause |
| --- | --- | --- |
| doctor | 66 | **Real defect** — see F below |
| legal | 165 | Healthy: one link from that country's `/legal` index. A hub→detail page with exactly one clean structural inlink is the expected pattern, not a defect (§16 explicitly warns against manufacturing a second link where one already suffices). |
| lab-test | 84 (100%) | Healthy: one link from that country's `/lab-tests` hub. Same as legal. |
| blog-article / health | 3 each | One real inlink each, from a service's `relatedTopics` block or the sibling default-locale page. |

So of the 321 "weak" URLs, **66 were a genuine problem** (doctors) and **255
were already healthy minimum-viable discovery**, correctly left alone.

## F. Blog pagination — found and fixed

`app/[country]/[lang]/blog/page/[n]/page.tsx` and
`app/(global)/blog/page/[n]/page.tsx` both passed `noindex: true` to
`buildPublicMetadata`, whose shared behaviour for that flag is `noindex,
nofollow`. `nofollow` tells Googlebot not to follow *any* link on the page —
including the prev/next controls and article cards that are the only crawl
path to older posts once they scroll off page 1's window.

Both pagination controls were already confirmed real server-rendered
`<Link>` elements with `rel="prev"`/`rel="next"` (not JS-only), and every
article card link was already a real `<Link>` too — the ONLY defect was the
robots directive itself.

**Fixed**: both routes now override the shared helper's result to `{ index:
false, follow: true }` after building it, exactly the pattern already
established this session for the service detail page's own noindex override.
Verified live: `noindex, follow` on both `/ireland/en/blog/page/2` and
`/blog/page/2`.

## G. Blog article discovery

No further fix needed once pagination follows correctly — articles are
already linked from their archive page (own inlink) and, where tagged to a
service via `BlogPost.ctaService`, from that service's `relatedTopics` block
(a second inlink). 72 of 86 blog-article URLs were already crawl-discovered
before this batch even ran (the pre-fix nofollow only blocked the *deeper*
archive pages, not page 1); the remaining 14 are secondary-locale article
translations — see the locale-switcher note under I.

## H. Lab-test / health-tool discovery

Lab tests: already fully covered — every one of the 84 lab-test URLs has a
real inlink from its country's `/lab-tests` hub, and that hub itself already
gates on the live `health-tests` country feature flag (verified in
`app/[country]/[lang]/lab-tests/page.tsx`'s existing implementation — not
new work). No dead links to disabled-market lab tests found.

Health tools (`/tools/*`, 198 URLs): **already covered, not orphaned** —
confirmed via the same crawl. Every tool URL has a real inlink through the
service detail page's `relatedTopics` block (`toolSlugsForService`), gated
by `isToolMarket(code, lang)` so a market without tools enabled gets none.
That mechanism already carries a self-documented comment recording the
exact prior defect this batch was asked to look for ("on 2026-08-06 every
one of the 198 tool URLs was 'Discovered - currently not indexed' with the
sitemap as its sole referring URL") — meaning this was already fixed in
earlier work, not something this batch needed to touch. Footer/header do
NOT separately link every tool (confirmed — `SiteFooter.tsx` has no tool
references at all), which is correct per §11's own instruction not to dump
every tool into global navigation.

## I. Health/condition page discovery

Same `relatedTopics` mechanism as tools — a health page tagged to a service
via `serviceSlugs` gets a real inlink from that service's page. 51 of 66
health URLs were already discovered pre-fix; the other 15 are all
secondary-locale variants sitting at depth 4 with 2 real inlinks each (the
service's relatedTopics block AND the sibling default-locale health page) —
not orphaned, just one hop deeper than their default-locale sibling. Not
force-fixed, per §18 ("do not force every URL to depth 2").

## J. Service discovery result

All 642 indexable service URLs have a real inlink. Default-locale services
are linked from the GP/specialist consultation hubs, doctor "services
offered" sections, and the homepage; the 4 confirmed thin/noindex Spain
services (already excluded from the sitemap and hreflang by earlier work
this session) were checked and are correctly absent from every discovery
component — not promoted anywhere.

## K. Doctor discovery result — the real fix

**Root cause found**: `/doctors` renders through `DoctorTeamTemplate`, a
`"use client"` component with `const [page, setPage] = useState(0)` and
`doctors.slice(safePage * 6, ...)`. `CarouselNav`'s prev/next controls are
`onClick` handlers, not real anchors. Since React state always initializes
to `0` — server-side included — the SSR HTML for `/{country}/{lang}/doctors`
never contained more than 1 featured + 6 paged doctor cards, for ANY
country, regardless of actual roster size. Confirmed directly: Ireland has
22 doctors, the listing page emitted exactly 7 `<a href>` doctor links, both
before this fix and independent of CDN caching (verified with a
`Cache-Control: no-cache` fetch — same result).

This means every doctor beyond the first 6 (alphabetically, minus whoever is
featured) had **zero inlink from their own market's listing page** — the
canonical place a patient or a crawler would expect to find them. Their only
discovery paths were the homepage's featured-doctor section (1 doctor),
service pages' assigned-doctor sections (only for doctors with a service
assignment), and the sitemap.

**Fixed**: added an always-rendered link index below the carousel in
`DoctorTeamTemplate.tsx`, sourced from the same `doctors` prop the carousel
slices from (so it can never itself be truncated — the render layer never
copies or re-slices that array for this section). One real `<Link>` per
doctor with anchor text `"{name} — {title}"` (the exact good-anchor pattern
named in this batch's own instructions), under a translated heading ("All
doctors in {country}", new locale key `doctors.allDoctorsHeading`, all 6
languages). Verified genuinely visible (not display:none/visibility:hidden),
not just present in markup.

Verified live for all 6 markets — doctor-listing link count now equals the
full roster exactly:

| Country | Full roster | Links on `/doctors` before | After |
| --- | --- | --- | --- |
| Ireland | 22 | 7 | **22** |
| Portugal | 17 | 7 | **17*** |
| Czechia | 9 | 7 | **9** |
| Spain | 13 | 7 | **13** |
| Romania | 3 | 3 (roster < PAGE_SIZE, already fine) | 3 |
| Brazil | 1 | 1 (roster < PAGE_SIZE, already fine) | 1 |

*16 in the index + 1 featured spotlight = 17.

Romania and Brazil were never actually broken — their rosters are smaller
than `PAGE_SIZE` (6), so the carousel's first page already showed everyone.
The defect was specifically countries with more than 7 doctors.

## L. Internal redirect links corrected

Audited the crawl for internal `<a href>` targets that resolve to a 3xx
before their eventual 200. None found pointing at legacy/alias URLs — every
internal anchor discovered already targets a canonical 200 directly. (The
booking-wizard's own internal `/book?service=…` step-to-step links, audited
separately in the booking-crawl-surface batch, are excluded here as
explicitly out of scope.)

## Locale/country consistency (§13) — found, correctly NOT touched

The bulk of the "orphan" false-positives in the first (wrong) analysis pass
— secondary-locale services, legal docs, health pages, blog articles — trace
to one documented, deliberate architectural choice: the footer's locale
switcher always links to the target locale's HOME page, never the current
deep page, because reading the live pathname would opt the route out of
static generation (P-001, noted directly in `SiteFooter.tsx`'s own comment:
"That's enough: the locale home carries the full in-locale nav, so crawlers
reach the deep pages one hop later"). This is a known, reasoned, prior
decision, not a fresh bug — re-architecting it means giving up static
rendering on every page carrying the footer, a tradeoff explicitly flagged
as future work ("Populate `rest` if per-page swapping is ever wanted") and
well outside "smallest structural fix." Not touched. These pages remain
discoverable via hreflang (a legitimate, separate discovery channel this
crawl's body-anchor-only methodology doesn't credit, by design, since the
task asked for real navigational links specifically).

## Files changed

- `frontend/app/[country]/[lang]/blog/page/[n]/page.tsx` — noindex,follow
- `frontend/app/(global)/blog/page/[n]/page.tsx` — noindex,follow
- `frontend/components/templates/DoctorTeamTemplate.tsx` — full-roster crawlable index
- `frontend/lib/i18n/types.ts` — new `allDoctorsHeading` key on the doctors bundle type
- `frontend/locales/{en,pt,es,cs,ro,de}/common.json` — translated heading
- `frontend/lib/content/doctor-directory.test.ts` — new coverage
- `frontend/lib/seo/blog-pagination-robots.test.ts` — new

## N–Q. After

Doctor-listing link coverage verified 100% (roster-size match) across all 6
countries, live. Blog pagination robots verified `noindex, follow` on both
route families, live. A full 2,600-page recrawl was not re-run post-fix
(token/time budget for this batch) — verification instead targeted the
exact two mechanisms changed, directly, which is sufficient to confirm the
fix: the doctor-listing link COUNT matching the roster is a direct,
unambiguous measurement of "orphan count = 0" for that content type without
needing to re-crawl the whole site to prove it.

The pre-fix numbers above (B–E) stand as the true "before." Post-fix,
mechanically: doctor weak-inlink count moves from 66 to a number bounded by
however many doctors' ONLY other inlink was already the homepage spotlight
— every doctor now has at minimum the listing-index inlink, so the true
post-fix weak(=1) floor for doctors is 0 for any doctor previously at 1
(homepage-only) source, now at 2 (homepage + listing index).

## R. Top GSC URLs improved

The doctor-listing fix directly benefits every doctor from
`doctor-indexability-migration-gap-2026-08-08.md`'s backfill list — those 28
doctors were already newly indexable but several (Telmo Coelho, Pedro
Santos, Margarida Andrade, Rui Diogo Rodrigues, Nádia Cavaco — all
Portugal, all previously invisible on `/portugal/pt/doctors` per this
batch's finding) now also have a real structural inlink from their own
market's listing page for the first time, on top of being indexable.

## S. Tests

`doctor-directory.test.ts` — 3 new tests proving `buildDoctorDirectoryView`
never truncates the grid regardless of roster size (the precondition the
crawlable-index fix depends on; the index itself, being interactive JSX in a
`"use client"` component, isn't unit-testable in this repo — no
jsdom/testing-library, confirmed earlier this session — so verification of
the actual rendered markup was done live instead, recorded above).
`blog-pagination-robots.test.ts` — 2 new tests proving the shared helper's
real default is `nofollow` and the route's override composition really
produces `follow` without disturbing anything else `buildPublicMetadata`
computed. 5 new tests total, full suite 648/649 (1 pre-existing unrelated
failure), `tsc --noEmit` clean.

## T. Remaining internal-discovery SEO debt

- Secondary-locale services/legal/health/blog pages depend on hreflang for
  discovery rather than a body inlink, by deliberate design (P-001 static
  rendering). Not a defect to fix in an SEO batch — an architecture
  decision that would need its own dedicated engineering work if ever
  revisited.
- 15 secondary-locale `/health/` pages sit at depth 4 (2 real inlinks each,
  not orphaned). Low severity, not touched.
- The doctor-listing carousel's underlying pagination is still `useState`
  or client-only for the VISUAL experience — this batch made the full
  roster crawlable in parallel, it did not redesign the carousel itself.
  If the product ever wants URL-addressable doctor-listing pages (matching
  the blog's `/page/[n]` pattern), that's a larger, separate change.
- A full post-fix recrawl to re-derive exact depth/weak-inlink numbers for
  every content type was not run this batch (time/token budget) — the two
  changed mechanisms were verified directly and precisely instead.
