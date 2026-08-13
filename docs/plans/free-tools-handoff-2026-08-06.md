# Free health calculators — handoff, 2026-08-06

Paste the "Prompt" section below into a fresh session. Everything above it is
the state that prompt assumes.

---

## State as of 2026-08-06

Six free calculators live at `/{country}/{lang}/tools/{slug}` in 33 market/locale
pairs each — 198 URLs, all on production and in the sitemap.

`bmi-calculator` · `calorie-calculator` · `blood-pressure-chart` ·
`due-date-calculator` · `ovulation-calculator` · `adhd-test`

**Pushed and live.** `origin/main` == `origin/Dev-hassaan` == `cdfa93c1`.

### Architecture (read `lib/tools/registry.ts` first — its header is the recipe)

| file | role |
| --- | --- |
| `lib/tools/registry.ts` | structure only: `ToolMeta[]`, positional `sections`, `rowTones` |
| `locales/<lang>/tools.json` | every user-facing string, six languages |
| `lib/tools/market-copy.ts` | per-market overrides (`MARKET_COPY`) + market FAQ (`MARKET_FAQ`); only Brazil has copy overrides today |
| `lib/tools/markets.ts` | `isToolMarket`, `toolMarkets()`, `toolHreflangAlternates` — ONE cross-market cluster, single `x-default` at `/ireland/en` |
| `lib/content/tool-page.tsx` | server renderer; only client boundary is `<ToolWidget />` |
| `components/tools/ToolWidget.tsx` / `ToolShell.tsx` | the six widgets and their shared chassis |
| `lib/tools/service-suggestions.ts` | per-tool service categories from the LIVE catalogue (`TOOL_SLOTS`) |
| `app/sitemap.ts` (~line 415) | tools loop, outside the per-country loop, undated |

There is deliberately **no `/tools` index** — it would compete with the six.
`/tools` and `/{country}/{lang}/tools` both 404. Nav dropdown + footer link
straight to each calculator.

### Verified on production 2026-08-06

- 30 URLs (6 tools × ireland/en, brazil/pt, czechia/cs, spain/es, romania/ro):
  **30/30 clean** — 200, translated `<title>`, H1, 8 FAQ questions, full chart
  table, all in the SERVER HTML; self-canonical; 34 hreflang alternates with
  exactly one `x-default`; no unfilled `{country}`/`{kg}`.
- Sitemap: 1,610 URLs, **198 tool URLs** (33 per tool), zero `/tools` index
  entries, zero duplicates, no `<lastmod>` on tools (correct — copy is
  code-resident). Section-hub `lastmod` derivation intact (79/79 dated).
- Widgets driven live under the production CSP — BMI, ES blood pressure, BR due
  date, CZ ADHD all recalculate and re-band. **Zero page or console errors.**
- 375px: no horizontal scroll on any tool, chart stacks instead of scrolling.
- `tsc` clean · `eslint` clean · `vitest run lib/tools` 53/53 ·
  `node scripts/check-locale-keys.mjs` 0 issues on tools.json (doctor.json drift
  is pre-existing and unrelated).

### Keyword work already done (OpenSEO project `7b96b0f3-8190-4b11-a370-5b69a9f99ff1`)

Titles were retargeted at each market's real head term in `d620d2a8`:

| market | tool | now targets | volume / KD |
| --- | --- | --- | --- |
| CZ | due date | `těhotenská kalkulačka` (was `kalkulačka termínu porodu`, 210/mo) | 8,100 / 2 |
| ES | blood pressure | `tensión arterial normal` (was `tabla…`, 1,000) | 33,100 / 10 |
| BR | blood pressure | `pressão arterial normal` (was `tabela…`, 2,900) | 22,200 / 1 |
| RO | blood pressure | `tensiune arterială normală` (was `tabel…`, 110) | 1,000 / 0 |
| BR | ovulation | `período fértil` (was `calculadora de ovulação`, no volume) | 90,500 / 1 |
| BR | due date | added `idade gestacional` to the title | 135,000 / 0 |
| BR + ES | BMI | `calculadora imc` (was `calculadora DE imc`) | BR 246,000 / ES 90,500 |
| ES | due date | `calculadora de embarazo` (was `fecha de parto`, 1,900) | 4,400 / 0 |

English is deliberately untouched — `blood pressure chart` IS the 8,100/mo
English head term in Ireland. Portugal untouched — its demand was never measured.

30 head keywords saved to the project across BR/ES/CZ/RO/IE.

### SERP shape (checked 2026-08-06)

- `calculadora imc` BR/ES — 100% calculator pages; ranking domains are national
  authorities (ABESO, fundaciondelcorazón, quironsalud). Our format is right;
  the authority gap is the obstacle.
- `bmi kalkulačka` CZ — top results are **commercial** (ketomix.cz, gymbeam.cz,
  myketo.cz), plus AI Overview and PAA. Lowest-authority SERP of the set.
- `calculadora gestacional` BR — **single-clinic domains rank page 1–2**
  (dralarissaatala.com.br, fetalclin.com.br). 135,000/mo at KD 0. Best
  opportunity on the site.
- `tensión arterial normal` ES — **not** a calculator SERP: AI Overview, then
  explainers carrying a value table. That is exactly the page we built.

---

## Prompt — paste this into a fresh session

> Continue the free-health-calculator work on `global-health-website`
> (branch `Dev-hassaan`, which is level with `main` at `cdfa93c1`; everything is
> pushed and live). Read `docs/plans/free-tools-handoff-2026-08-06.md` first —
> it has the architecture map, what is already verified, and the keyword
> research. Do not redo that verification; it was done against production.
>
> Four things are open. Work them in order and stop to report between 1 and 2.
>
> **1. Indexation watch — the only thing that gates everything else.**
> On 2026-08-06 every tool URL came back `URL is unknown to Google` from the
> URL Inspection API. Google had never crawled them. The sitemap was
> re-submitted that day (it was registered 2026-07-28 but Google's last read
> showed 1,412 URLs against the live 1,610), and it went to `is_pending: true`.
>
> Re-check with the openseo MCP (`inspect_urls`, read-only, no credits) on a
> spread of ~10 tool URLs across all five markets, and with
> `gsc_query.py sitemaps --property sc-domain:myglobalhealth.online --json` to
> confirm the submitted count has moved to 1,610.
>
> Gotcha that has cost a round before: **URL Inspection results nest
> `index_status.coverage_state`. There is no top-level `verdict`** — a flat read
> reports every row as UNKNOWN. And use `py`, never `python`.
>
> If the URLs are still unknown after the sitemap re-read lands, the next lever
> is internal linking, not resubmission: the calculators are reachable only from
> the header dropdown and the footer. Consider linking the relevant calculator
> from the matching service pages (BMI from weight management, due date from
> women's health, and so on) — real in-content links from pages Google already
> crawls.
>
> Do NOT mass-submit through the Indexing API. It is 200/day and officially
> JobPosting/BroadcastEvent only.
>
> **2. Rank-tracking baseline.**
> 30 head keywords are saved to openseo project
> `7b96b0f3-8190-4b11-a370-5b69a9f99ff1` across BR (2076/pt), ES (2724/es),
> CZ (2203/cs), RO (2642/ro) and IE (2372/en). Only ONE rank tracker exists
> (`aca3437b-37ac-4cf1-9c61-47c46f974554`, Ireland/en, weekly). The MCP is
> read-only for trackers — creating the other four needs the OpenSEO dashboard.
> Tell the user that plainly rather than trying to do it through the API.
>
> **3. The six English variants — cannibalisation, currently undecidable.**
> `/spain/en/tools/*`, `/czechia/en/*`, `/romania/en/*`, `/brazil/en/*` carry
> copy identical to `/ireland/en/*` and are held apart only by hreflang plus a
> per-market FAQ block. DataForSEO **refuses** English metrics for those
> locations (`Language 'en' is not available for this location`), so there is no
> keyword evidence to be had. The only real signal is Search Console impressions
> on those 24 URLs — which needs step 1 first. Do not `noindex` anything on a
> guess.
>
> **4. Content follow-ups, lowest priority.**
> - CZ calorie targets `kalorická kalkulačka`, 2,400/mo at **KD 42** — the
>   hardest term in the Czech set. Correct target, low odds. No action.
> - ADHD has no volume data at all in BR/ES (KD 0–4). Keep, don't invest.
> - Markets with only two matching services leave an empty third column in the
>   suggestions grid (RO ovulation, CZ ADHD). Cosmetic.
> - Portugal's tool titles were never keyword-checked. If you want them, pull
>   `get_keyword_metrics` at location 2620 / language `pt` and compare against
>   the six `pt` titles — but remember `/brazil/pt` reads the pt-BR overrides in
>   `lib/tools/market-copy.ts`, so changing `locales/pt/tools.json` moves
>   Portugal only.
>
> **House rules that apply here.**
> - This is a shared clone. Another session committed my working tree twice
>   mid-run on 2026-08-06. Check `git log --oneline -1` before and after any
>   edit, and never rewrite a commit you did not author — ask first.
>   Never push `main` or `Dev-nauman` unprompted.
> - Verify against the server HTML, not the DOM. Content behind a client or
>   Suspense boundary being absent from the served HTML is this repo's recurring
>   SEO defect. `curl` it.
> - Titles are truncated to a ~60-char search budget by
>   `compactSearchTitle` in `lib/seo/page-seo.ts`. Any new `metaTitle` must fit
>   AFTER `{country}` is interpolated — check the served `<title>` for a
>   trailing `…`, do not count characters by hand.
> - The Browser pane does not composite in this environment (screenshots time
>   out). Use Playwright directly from `frontend/` instead; chromium is already
>   installed.
> - Dev server: `.claude/launch.json` → `frontend-prod-api`, port 3100.
> - OpenSEO credit budget: ask before any batch over 2,000. ~260 were spent on
>   2026-08-06; 6,769 remained.
> - Search Console OAuth: the consent screen is still in **Testing**, which caps
>   refresh tokens at 7 days. It was refreshed 2026-08-06, so it dies around
>   **2026-08-13** unless the screen is published. If GSC calls start failing
>   with an auth error, that is why.
