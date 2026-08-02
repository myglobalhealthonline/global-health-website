# SEO indexation plan — from 2026-07-28

Carry-out plan following the full Google Search Console indexation audit of
`sc-domain:myglobalhealth.online`. Everything below is either **done**, **scheduled**
(waiting on Google, with a date and a command), or a **decision** someone has to make.

Property: `sc-domain:myglobalhealth.online` · Site: `https://www.myglobalhealth.online`
Audit data: `~/.config/claude-seo/monitoring/index-audit/`
Weekly monitor: Windows task "SEO Monitor myglobalhealth", Mondays 09:00

---

## 1. Baseline — what we measured (2026-07-26 → 07-28)

Every URL in the sitemap was inspected via the GSC URL Inspection API.

| Coverage state | Count |
| --- | --- |
| Submitted and indexed | 986 |
| Discovered — currently not indexed | 178 |
| URL is unknown to Google | 123 |
| Excluded by `noindex` | 2 |
| Duplicate without user-selected canonical | 1 |
| **Total inspected** | **1,304** |

Sitemap contained 1,353 URLs at the time of this audit; 49 sample URLs from the first
pass were never re-run, which is the difference.

> **The sitemap is no longer 1,353 URLs.** Two changes landed after this audit
> (see §2) and it is now **1,153**. `res_00..06.json` therefore contains 201 URLs
> that are no longer submitted. Re-running the audit against the original
> `chunk_00..06` files will read as a 200-URL regression that never happened —
> **regenerate the chunks from the live sitemap first** (§3.2).

> **Read the JSON correctly.** Each result nests `index_status.coverage_state`.
> There is no top-level `verdict` — a flat read reports every row as UNKNOWN.
> An earlier pass over 1,353 rows reported 1,034 indexed / 319 not. Both are real;
> they cover different URL sets. **Pick one and stay with it.** For measuring the
> delta, compare against `res_00..06.json` — that is the complete run.

Traffic baseline (28 days to 2026-07-25): **514 clicks · 15,210 impressions · 3.38% CTR**,
955 distinct pages earning impressions, but only **161 pages earning any click**.

### Root cause of the 123 undiscovered URLs

164 of the 318 non-indexed URLs had **zero `referring_urls`**. The header
`LanguageSwitcher` rendered its items inside a Radix `DropdownMenu.Portal`, which
only mounts when opened — so the **served HTML of every page contained no anchor to
any other locale**. `<link rel="alternate" hreflang>` was present, but hreflang is a
hint, not a discovery edge.

Orphans by section: services 61 · legal 48 · doctors 15 · blog 14 · health 14.

---

## 2. Done and verified in production

| Change | Commit | Verified |
| --- | --- | --- |
| Crawlable locale links (footer locale row + `<a>` switcher items) | `b8b96200` | 5 sibling-locale anchors present on deep pages |
| Sitemap `lastmod` on hub + detail pages | `baa09b68`, `ae7c9a9c` | 1,293 of 1,353 URLs carry `<lastmod>` (was 870) |
| Entry-gate SERP snippet, 6 locales | `e49630b1` | Title/description swap per `Accept-Language`; visible hero unchanged |
| Corrected stale robots.txt claim in `sitemap.ts` | `96af9c8c` | — |
| Legal pages submitted once per country, not per locale (231 → 42 URLs) | `77365698` | 189 URLs left the sitemap; all still 200, self-canonical, no `noindex` |
| `/` added to the sitemap; `" ? "` title separator unmangled to `" — "` | `6eb06826` | `/` in sitemap; `/czechia/cs/doctors` + `/romania/ro/book` serve em-dash titles |
| Root canonical and sitemap `<loc>` for `/` agree (both bare origin) | *this pass* | Cosmetic — Google normalises the two |

**Re-verified in production on 2026-08-03** (served HTML, not source):
5 sibling-locale + 5 cross-country anchors on every page type; hreflang present
(6 region tags + `x-default`); 1,145 of 1,153 URLs dated across **185 distinct**
timestamps spanning 2026-06-06 → 2026-08-02 (so: real row dates, not build time);
section-pages loop still last; no Wix Disallow in robots.txt; all six entry-gate
locales serve distinct translated title/description.

The one undated legal URL, `/romania/ro/legal/medical-disclaimer`, is **correct**:
Romania's disclaimer comes from `profile.fullDisclaimer`, which carries no
timestamp of its own. Per §5 it stays undated rather than borrowing a date.

**Design decisions that must not be "simplified" later**

- Hub pages derive `lastmod` from their newest child, so the section-pages loop
  **must stay last** in `frontend/app/sitemap.ts`. Moving it back to the top silently
  undates every hub.
- **Never use build time / `new Date()` for `lastmod`.** A date that changes every
  deploy teaches Google the signal is noise and gets it discounted sitewide,
  including for the URLs where it is accurate.
- Legacy Wix slugs are **deliberately not disallowed** in robots.txt. Googlebot must
  crawl a legacy URL to see its 308. Blocking them strands the Wix ranking equity
  permanently.
- Entry-gate SEO strings are translated in all six locales, not English-only:
  `loadLocaleBundle` deep-merges each locale over `en`, so en-only keys leak English
  into every other locale.

---

## 3. Scheduled checks

### 3.1 CTR on head terms — **from 2026-08-04** (~1 week)

`/` now has a snippet that names the service and the markets. It previously earned
zero clicks on page-one impressions.

| Query | Position | Impressions (28d) | Clicks |
| --- | --- | --- | --- |
| global health medical services | 10.0 | 127 | 0 |
| global health clinic | 9.2 | 67 | 0 |
| clinic global health | 6.3–8.1 | 96 | 0 |

```bash
py ~/.claude/plugins/marketplaces/agricidaniel-claude-seo/scripts/gsc_query.py \
  --property sc-domain:myglobalhealth.online --days 28 --dimensions query,page --json
```

**Success:** any non-zero clicks on those three queries. `/` recrawls quickly, so a
week is enough to see movement. **If still zero after two weeks**, the problem is the
destination, not the snippet — see decision 4.1.

### 3.2 Re-run the index audit — **from 2026-08-25** (~4 weeks)

Measures whether crawlable locale links converted the undiscovered URLs.

Regenerate the chunks from the **live** sitemap first — the stored `chunk_00..06`
predate the legal-page reduction and would inspect 201 URLs no longer submitted:

```bash
D=~/.config/claude-seo/monitoring/index-audit
curl -s https://www.myglobalhealth.online/sitemap.xml \
  | grep -oP '(?<=<loc>)[^<]+' > $D/urls_current.txt
split -n l/7 -d $D/urls_current.txt $D/chunk_
```

```bash
# ~7.5 s/URL, 2000/day quota. Chunked — never kill mid-chunk, the script
# only writes its JSON at the end.
for c in 00 01 02 03 04 05 06; do
  py ~/.claude/plugins/marketplaces/agricidaniel-claude-seo/scripts/gsc_inspect.py \
    --batch ~/.config/claude-seo/monitoring/index-audit/chunk_$c \
    --site-url sc-domain:myglobalhealth.online --delay 0.2 --json \
    > ~/.config/claude-seo/monitoring/index-audit/rerun_$c.json
done
```

Compare `rerun_*.json` against `res_00..06.json`.

**Realistic target: ~1,100–1,150 indexed of 1,353. Not all of them.**

- The **123 "unknown to Google"** should largely convert — this is what the fix addresses.
- The **178 "discovered, not indexed"** mostly will not. Google already saw those and
  declined them as near-duplicate locale variants. Discovery does not change that
  judgment; only content differentiation would.

Do not treat 100% indexation as the goal. 48 of the orphans are legal pages with no
search demand — leaving them unindexed costs nothing.

---

## 4. Decisions needed (not mine to make)

### 4.1 Should `/` be in the sitemap? — **DECIDED: yes, shipped in `6eb06826` (2026-07-30)**

`/` is now submitted, undated like its hand-authored siblings. The reasoning below
stands as the record of why; the second question in it — whether a country-selection
interstitial is the right destination for "global health clinic" — is **still open**
and is answered by §3.1, not by this commit.

Originally excluded by design — "a country picker, not a content target". But it earns
your largest commercial impressions (~200 across three head terms) whether submitted
or not, and now has a real snippet. Excluding it does not stop Google ranking it; it
means the page earning your impressions is the one never optimised.

Related: is a country-selection interstitial the right destination for someone
searching "global health clinic"? If CTR stays at zero after 3.1, this is why.

The picker exists for market-routing/legal reasons — needs a product call, not an SEO one.

### 4.2 Merge, don't cherry-pick

`main` and `Dev-hassaan` currently hold the **same four changes under different SHAs**
(`git diff origin/main..origin/Dev-hassaan` is empty). Someone is cherry-picking
instead of merging. Nothing is missing and nothing needs force-pushing — but it will
recur every session until the workflow changes.

### 4.3 Legacy Wix link reclamation

Legacy URLs still outrank their own targets (`/ireland-doctors/...`, `/home-*`,
`/pt/about` are among the top click-earning pages). The 308s forward equity correctly,
so this is optimisation rather than repair: ask the highest-value external referrers to
point at the new URLs. Outreach work — do **not** buy or build links for a medical site.

---

## 5. Explicitly not doing

| Item | Why |
| --- | --- |
| The 2 Spain `noindex` legal pages | Already serve `index, follow`; GSC verdict is from a stale crawl. Self-heals. |
| The 48 orphaned legal pages | Policy pages × 36 country/locale combos. No search demand. |
| Mass-submitting URLs to the Indexing API | 200/day cap, and it is officially JobPosting/BroadcastEvent-only. Abuse risks key revocation, and the pages are already being crawled. |
| Force-pushing to align branch SHAs | Destructive on a shared clone with concurrent sessions. Content is already identical. |
| `lastmod` on `/about`, `/faq`, `/contact`, `/privacy`, `/terms` | Hand-authored, no row behind them. A borrowed date would be fiction. |

---

## 6. Framing for the client

- **Indexation is not the constraint.** 955 pages earn impressions; ~92% of indexed
  pages are being served in search.
- **The constraint is that only 161 pages earn a click.** That is rankings and demand,
  not crawling.
- **The migration has not fully handed over.** Legacy Wix URLs still own the SERPs.
  Users land correctly via 308s, but ranking equity is still moving across.
- **Indexed ≠ ranking ≠ traffic.** Getting 100 thin locale variants indexed will not
  move 514 clicks/month meaningfully. Say so before indexation becomes the KPI.

---

## 7. Environment notes

- Use `py`, not `python` — `python` on PATH is a broken WindowsApps stub.
- URL Inspection: ~7.5 s/URL, 2,000/day. Indexing API: 200/day.
- The GSC **Page indexing report is UI-only** — no API endpoint exposes the
  "why pages aren't indexed" breakdown. Its totals include legacy URLs, parameter
  variants and redirects, so it will always look worse than a sitemap-scoped audit.
  The two are measuring different sets; do not mix them in one report.
- **Grepping served HTML for `hreflang` returns zero — the attribute is emitted as
  camelCase `hrefLang`.** It is present and correct on every public page. Match
  case-insensitively before concluding the alternates are missing.
- `ga4_report.py` (not `ga4_query.py`) needs the `google-analytics-data` package:
  `py -m pip install google-analytics-data`. Installed 2026-08-03.
- `google_auth.py --check` used to print `[OK]` for GSC/GA4/Indexing whenever an
  expired token merely *had* a `refresh_token`, without testing it — so a revoked
  grant looked healthy while every call died on `HTTP 400`. Patched 2026-08-03 to
  attempt the refresh and report the real result. **That file lives in the plugin
  marketplace, outside this repo — a plugin update will revert it.**
- Two `next dev` processes cannot share `frontend/.next`, and `frontend/package.json`
  hardcodes `next dev -p 3000`. If another session holds the port, local preview will
  die instantly on start.
