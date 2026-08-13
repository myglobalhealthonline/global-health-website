> **Historical audit — current status is tracked in [`docs/plans/seo-control-state.md`](../docs/plans/seo-control-state.md).** This audit predates the 2026-08 remediation batches. Every count, status and priority below is superseded. Kept as evidence only.

# Post-deploy verification & monitoring — myglobalhealth.online

Phase 4 of the SEO audit. Everything here is blocked on the Phase 1–3 work
actually shipping: 12 commits sit on `Dev-hassaan`, unpushed, and nothing is
deployed. Until then several audit findings remain **unverified in production**,
not fixed-and-confirmed.

Written 2026-08-03.

---

## 0. Before you deploy

Three things must happen, in this order, or the measurement is worthless.

**a) The GSC/GA4 baseline is already captured.** Do not skip re-checking it —
`baseline-gsc-queries.json`, `baseline-gsc-pages.json` and `baseline-ga4.json`
in this directory hold the pre-change numbers:

```
28 days (2026-07-06 → 2026-07-31): 609 clicks · 19,690 impressions · CTR 3.09%
Sitemap: processed, 0 errors, 0 warnings
```

**b) Drift baselines are captured** for 6 representative URLs (the entry gate,
a country home, a service page, a doctor profile, a legal page, the blog hub).
They live in `~/.cache/claude-seo/drift/baselines.db`.

> **That path is a local cache, not the repo.** Clearing it loses the
> pre-deploy snapshot and with it the ability to diff. If this machine is not
> the one deploying, re-capture there first.

```bash
claude-seo run drift_baseline.py "https://www.myglobalhealth.online/" --skip-cwv
```

**c) Apply the migration.** The Phase 3 service-byline columns are authored but
**not applied** — verified by direct query: production's `Service` table has
none of the four columns and no migration row.

```bash
cd backend && npx prisma migrate deploy
```

`prisma migrate dev` is broken in this repo; `migrate deploy` is the working
path. The migration is additive and nullable-only — four columns plus two
`Doctor` FKs with `ON DELETE SET NULL`, no backfill, no defaults.

---

## 1. Verify the things that could not be tested before deploy

These are the specific claims this audit could not close. Each has a command and
an expected result. **If one fails, the fix did not work** — do not assume.

### 1.1 The global `/blog` hub actually lists articles

Phase 1 changed the backend so the bare route is unfiltered. A local frontend
still reads the production API, so this was only ever verified at the query
level (0 → 10 posts).

```bash
curl -s https://www.myglobalhealth.online/blog | grep -c "No articles published yet"
```

Expect **0**. Then confirm the cards link straight at canonical country URLs
rather than at `/blog/{slug}` (which would redirect):

```bash
curl -s https://www.myglobalhealth.online/blog | grep -oE 'href="/[a-z]+/[a-z]{2}/blog/[^"]+"' | sort -u
```

### 1.2 The metadata streaming race — the cold-cache burst test

This is the one that needs care. The defect is **load- and cold-cache-dependent**:
hitting all 127 legal + doctor URLs in one concurrent burst reproduced it on 38;
the same URLs unloaded reproduced it on 1; warm hits never show it. Googlebot's
UA showed the same rate as a generic one, so `htmlLimitedBots` does not shield it.

**Run this immediately after deploy, while the cache is cold.** A warm origin
passes either way and tells you nothing.

```bash
node -e '
const B="https://www.myglobalhealth.online";
(async()=>{
  const sm = await (await fetch(B+"/sitemap.xml")).text();
  const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1])
    .filter(u=>/\/(legal|doctors)\//.test(u));
  let bad=0,n=0; const q=urls.slice();
  await Promise.all(Array.from({length:8}, async()=>{
    while(q.length){ const u=q.shift();
      try{ const h = await (await fetch(u+"?cb="+Math.floor(Math.random()*1e9))).text();
        const he=h.indexOf("</head>"), t=h.indexOf("<title"), c=h.indexOf("rel=\"canonical\"");
        if(!(he>0 && t>0 && t<he && c>0 && c<he)) bad++;
      }catch(e){ bad++ } n++; }
  }));
  console.log(`checked ${n} · metadata outside <head>: ${bad}`);
})()'
```

Expect **0**. Anything above ~2 means the `cache()` sharing did not close the
race and the `/legal/*` ISR headers are the load-bearing half.

Why it matters: Google **ignores `rel=canonical` placed in `<body>`**. Late
`<title>` it usually recovers; the canonical it does not.

### 1.3 Titles are inside the budget

```bash
for u in /ireland/en/see-a-specialist /spain/es /ireland/en/doctors; do
  printf "%-34s " "$u"
  curl -s "https://www.myglobalhealth.online$u" | grep -oP '(?<=<title>).*?(?=</title>)' | awk '{print length": "$0}'
done
```

Expect ≤60 characters each. Pre-fix these were 91, 85 and 77.

The subtle failure mode: the root layout's `title.template` appends
` · Global Health` **after** the budget is enforced. `buildPublicMetadata` now
always returns `{ absolute }` to prevent that. If titles come back ~16 chars
over, that regression is back.

### 1.4 Locale leak is gone

```bash
node -e '
const B="https://www.myglobalhealth.online";
const N=["Book a consultation","Pick a time","Ready when you are","Languages","Specialist care","View profile"];
(async()=>{
  const sm = await (await fetch(B+"/sitemap.xml")).text();
  const urls=[...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]).filter(u=>/\/(pt|es|cs|ro|de)\//.test(u));
  const pick=[]; for(let i=0;i<urls.length;i+=Math.ceil(urls.length/60)) pick.push(urls[i]);
  let hits=0;
  for(const u of pick){ const h=await (await fetch(u)).text();
    if(N.some(n=>new RegExp(">\\s*"+n+"\\s*<").test(h))) hits++; }
  console.log(`sampled ${pick.length} non-English URLs · leaking: ${hits}`);
})()'
```

Expect **0**. Pre-fix: 50 of 66.

### 1.5 Everything else, quickly

| Check | Command | Expect |
|---|---|---|
| Pricing schema | `curl -s .../ireland/en/pricing \| grep -c '"Service"'` | ≥1, and `Product` gone |
| Offer on sick-cert | `curl -s .../ireland/en/services/sick-certificate-ireland \| grep -c AggregateOffer\\\|'"Offer"'` | ≥1 |
| Entry-gate hreflang | `curl -s .../ \| grep -c hrefLang` | 7 |
| `/health/` canonicals | `curl -s .../ireland/en/health/sick-cert-online \| grep canonical` | points at `/services/sick-certificate-ireland` |
| Retired page | `curl -sI .../ireland/en/health/international-students` | 301 → `/ireland/en/gp-consultation-online` |
| llms.txt articles | `curl -s .../llms.txt \| grep -c "^- \["` | >10 |
| **No AggregateRating yet** | `curl -s .../ireland/en \| grep -c AggregateRating` | **0** until real review data is entered |

Note `hrefLang` is emitted camelCase in served HTML — grepping lowercase
`hreflang` returns zero and will fool you.

---

## 2. Then compare against baseline

```bash
claude-seo run drift_compare.py "https://www.myglobalhealth.online/"
```

Expect **intentional** diffs only: titles shorter, new hreflang on `/`, new
schema types. An unexpected diff — a canonical moving, a page losing schema, a
status change — is a regression from this work and should be treated as one.

---

## 2b. Legal pages 404 on fetch failure — DID NOT REPRODUCE IN PRODUCTION

> **Downgraded 2026-08-03, after deploy.** This was raised as a new finding
> based on a local test. Re-run against production at *higher* concurrency, it
> did not reproduce: 289 legal + doctor URLs at 8 concurrent, cache-busted, all
> returned **200**. The original 20/231 failures were almost certainly the local
> dev server being rate-limited by the production API it was proxying to — an
> artifact of the test rig, not a site defect. Recorded rather than deleted,
> because the underlying code path is still real and worth knowing about.

The latent issue, which remains true but is not currently firing:

Found 2026-08-03 while verifying the Phase 4 sitemap change. **Not in the
original audit.**

Checking all 231 legal URLs at 6 concurrent requests against a LOCAL dev server
reading the production API, **20 returned 404**. The same 231 checked
sequentially returned **0 failures**, and all of them return 200 in production.

The mechanism, in `lib/content/get-country-legal.ts`:

```ts
return result.ok ? result.data : null;   // any failure -> null
```

`getCountryLegalDocument` collapses *every* outcome into `null` — a genuine
"no such document", a timeout, a 500, a rate-limit. The page then does:

```ts
if (!result && disclaimerParagraphs.length === 0) notFound();   // -> hard 404
```

So a transient backend hiccup makes a legal page serve **404 Not Found** rather
than a 5xx. That distinction matters a lot to a crawler: a 404 says *this page
is gone, drop it from the index*; a 503 says *retry later*. Googlebot crawls in
bursts, which is exactly the condition that triggers it.

This is the same class of defect as the metadata streaming race (§1.2) —
invisible when you test one URL at a time, reproducible under concurrency — but
with a worse consequence, and it applies to the 36 pages that carry the site's
data-controller and DPO information.

**Suggested fix:** distinguish "not found" from "fetch failed" in the content
layer. On a failed request, throw so Next serves a 5xx; reserve `notFound()`
for a successful response that genuinely has no document. The same pattern is
worth auditing across the other `get-country-*.ts` fetchers, which use the same
`result.ok ? … : null` idiom.

**Verify after any fix** by re-running the concurrent check:

```bash
node -e '
const B="https://www.myglobalhealth.online";
(async()=>{
  const sm = await (await fetch(B+"/sitemap.xml")).text();
  const urls=[...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]).filter(u=>/\/legal/.test(u));
  let bad=0,n=0; const q=urls.slice();
  await Promise.all(Array.from({length:6}, async()=>{
    while(q.length){ const u=q.shift();
      try{ const r=await fetch(u,{redirect:"manual"}); if(r.status!==200) bad++; }catch(e){ bad++ } n++; }
  }));
  console.log(`checked ${n} legal URLs at 6 concurrent · non-200: ${bad}`);
})()'
```

Expect 0. It was 20 of 231 when found.

---

## 3. Watch-items

None of these are broken today. They are the things trending in a direction
worth catching early.

| Signal | Current | Why watch |
|---|---|---|
| **INP** | 137 ms origin, **+33.9% over 25 weeks** | The only CWV metric degrading. Still "Good". Desktop specifically +16.9%. Most likely driver is third-party JS, which has never been measured (see §4). |
| **Phone TTFB** | 2,618 ms (Poor), +23.3% over 25 weeks | Diverges sharply from the 534 ms blended origin figure. Re-check once CrUX rolls past the current collection window to rule out a small-sample artifact. |
| **Legacy Wix rankings** | Still hold most top-ranking pages | `/ireland-doctors/dr-mohammed-omar` (20 clicks), `/home` (11), `/home-cz` (10). All 301 correctly. Watch consolidation onto the current URLs as the `/post/*` per-article map takes effect. |
| **LCP by device** | 3,098 ms phone / 3,097 ms desktop | Both "Needs Improvement" while the blended origin figure passes. The blended number is flattering. |
| **FAQPage** | 293 blocks | Google retired FAQ rich results for non-authoritative sites. No reason to remove, no reason to expand. |

```bash
claude-seo run crux_history.py --origin https://www.myglobalhealth.online --form-factor PHONE
```

---

## 4. Measurement gaps — still open

Being explicit, because these are absences of data, not findings of zero.

**Third-party script cost has never been measured.** GTM, Doctify, Meta,
Microsoft Clarity and ElevenLabs all measured **zero bytes** in Lighthouse
because every one is consent-gated and none fired in a headless session. This
matters precisely because INP is the degrading metric. Needs a
consent-accepted run or production RUM.

**Backlinks are Common Crawl only.** No DA/PA, no anchor-text distribution, no
toxicity scoring, no referring-domain counts. Two free keys unlock all of it:

- Moz — https://moz.com/products/api (2,500 rows/month)
- Bing Webmaster Tools — https://www.bing.com/webmasters

Add to `~/.config/claude-seo/backlinks-api.json`, then
`claude-seo run backlinks_auth.py --check`.

For context on why this matters here: the domain was registered 2024-12-16 and
is ~1.6 years old, so the brand's accumulated authority sits on the legacy Wix
URLs rather than on this domain.

**OpenSEO/DataForSEO returned 0 credits**, so no live SERP positions or keyword
volumes were available at any point in this audit.

**GSC OAuth expires.** The consent screen is still in Testing, which caps
refresh tokens at 7 days. It died once mid-audit and blocked all GSC/GA4/
indexation data. Publishing the consent screen stops the weekly re-auth.

```bash
claude-seo run google_auth.py --auth --creds ~/.config/claude-seo/client_secret.json
```

---

## 5. Still requiring a human

| Item | Why it cannot be automated |
|---|---|
| Real Doctify rating + count at `/admin/settings/reviews` | `AggregateRating` fails closed and emits nothing until entered. Fabricating it on a medical site is a manual-action and consumer-protection risk. |
| Assigning clinician reviewers to service pages | Attributing medical content to a clinician who has not reviewed it is a clinical-governance problem. Fields ship empty by design. |
| Legal review of the new legal-summary copy | Legal-adjacent, in all 6 locales, in `frontend/locales/*/legal.json`. |
| The 12 `/health/` briefs | `briefs/health-pages.md` — needs a writer and a clinician. |
| Service differentiation | `briefs/service-differentiation.md`. |
| Romania sick-certificate page | The only market without one. Romanian sick-leave law differs from Irish DSP rules; needs local legal input. |
| 5 legacy `/post/*` URLs with no current article | One at **1,046 impressions/90 days**. A content gap, deliberately not guessed at. |
| Cookie-consent modal covering 55–60% of the mobile viewport | Not a ranking penalty (consent notices are exempt) but it buries the H1 and CTA on first paint. A UX/design call. |

---

## 6. Re-audit cadence

Re-run the full audit once the Phase 1–3 changes have been live long enough for
Google to recrawl — **4–6 weeks**, not days. Re-running sooner mostly measures
crawl lag.

```
/claude-seo:seo-audit https://www.myglobalhealth.online
```

A weekly monitoring task already exists at
`~/.config/claude-seo/monitoring/seo_monitor.py` (Windows scheduled task,
Mondays 09:00), writing snapshots and `REPORT.md` alongside it. It becomes
useful again now that GSC auth is restored.

Use `py`, never `python` — `python` on PATH is a broken WindowsApps stub.

---

## What "done" means here

Phases 1–3 closed all 22 audit items **in code**. What that does not mean:

- Nothing is deployed. 12 commits, unpushed.
- The migration is unapplied.
- `AggregateRating` emits nothing and will until someone types in real numbers.
- The content briefs are briefs.

**Four audit findings turned out to be wrong** and were corrected in place
rather than quietly edited: the 127-URL "no metadata" claim (a load-dependent
streaming race, not missing code), 2.2's 91 KB payload (already fixed —
`SameDayBooking` fetches client-side), 2.4's "no sick-cert page" (5 of 6 markets
had one), and 3.5's "duplicate legal sets" — where the prescribed fix, a
cross-canonical or redirect, would have actively damaged the site.

That ratio is worth remembering when reading any future audit output: roughly
one finding in five did not survive verification.
