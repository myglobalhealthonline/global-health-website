# Backlink Profile — myglobalhealth.online

**Credential tier: 0** (Common Crawl web graph + verification crawler only). Moz and Bing Webmaster keys are not configured — confirmed via `backlinks_auth.py --check`:
- `moz.available: false` — "No Moz API key found ... sign up free at https://moz.com/products/api"
- `bing.available: false` — "No Bing Webmaster API key found ... get free key at https://www.bing.com/webmasters"

At Tier 0, fewer than 4 of the 7 scoring factors have a data source. **No numeric Backlink Health Score is produced this run** — reporting raw metrics only, per audit rules.

## 1. Common Crawl domain-level metrics (confidence: 0.50)

Source: Common Crawl web graph, release `cc-main-2026-jan-feb-mar` (quarterly snapshot, https://commoncrawl.org/web-graphs).

| Domain | In crawl | In rankings | PageRank (raw) | PageRank rank | Harmonic centrality rank | n_hosts |
|---|---|---|---|---|---|---|
| **myglobalhealth.online** (target) | yes | yes | 7.40e-09 | 8,396,221 | 7,515,428 | 1 |
| webdoctor.ie (competitor) | yes | yes | 1.74e-08 | 2,747,412 | 3,371,283 | 6 |
| videodoc.ie (competitor) | yes | yes | 5.67e-09 | 12,955,079 | 12,481,292 | 2 |

Lower rank number = stronger. Reading:
- **webdoctor.ie is meaningfully stronger** than the target on both PageRank rank (~3.1x better) and harmonic centrality rank (~2.2x better), and shows 6 crawled hosts vs. the target's 1 — consistent with a longer-established link/content footprint.
- **videodoc.ie is roughly comparable to slightly weaker** than the target (worse PageRank rank, slightly better harmonic centrality rank) — the two sit in the same rough tier.
- The target domain is present in both the crawl and the ranking graph, which at minimum confirms it isn't invisible to Common Crawl's link graph.

**Third competitor: not assessed this run.** Attempted `mydoc.ie`, `topdoctors.es`, `doctoranytime.gr`, `mediconsult.pt`, `hallo.ie`, `mymedicare.ie` — each timed out (exit 124) rather than returning data or an explicit "not found," most likely because these domains have too little Common Crawl coverage to resolve quickly, or don't exist under the guessed hostname. Two verified competitor comparisons (webdoctor.ie, videodoc.ie) are included above; a third was not obtained within a reasonable retry budget.

Common Crawl's web graph gives **domain-level aggregate rank only** — it does not expose an actual list of individual referring URLs/domains at Tier 0, so there is no seed list to feed into `verify_backlinks.py` this run. **Verification of specific referring domains: not assessed this run** — running it requires a known-backlinks JSON file (`--links`), e.g. exported from Google Search Console's Links report.

## 2. Domain history (confidence: 0.50, WHOIS fallback source)

`domain_history.py myglobalhealth.online`:
- **Registrar:** Tucows Domains Inc.
- **Created:** 2024-12-16
- **Updated:** 2026-07-15
- **Expires:** 2026-12-16
- **Age:** ~1.63 years
- **Topical shift / risk:** unknown (no baseline topic supplied this run)

This is a young domain (registered Dec 2024) with no signal of prior third-party use under this exact registration. It does not itself carry inherited link equity — that legacy authority sits on the old Wix-hosted URLs/domain instead (see §3).

I also queried `globalhealth.wixsite.com` as a stand-in for the legacy Wix property to see if it's still resolvable/tracked: WHOIS fallback returned no creation date and `risk: unknown` — inconclusive, not a confirmed finding. **Whether the actual legacy Wix hostname the brand used (not the generic wixsite.com guess) still holds independent link equity: not assessed this run** — would need the real legacy domain/subdomain the brand published under.

## 3. Legacy Wix URL redirect handling — link-equity finding (verified, confidence: 0.95)

This is the main actionable finding regardless of what the link-graph data shows, and it was verified directly against the live redirect behavior rather than inferred:

- Legacy Wix paths are being redirected server-side with **308** status:
  - `/es/home-sp` → `/spain/es`
  - `/plans-pricing` → `/ireland/en/pricing`
  - `/service-page/*` → `/ireland/en/see-a-specialist`
- **However, all `/post/*` article paths blanket-redirect to `/ireland/en/blog`** rather than to the specific matching article.

Because these legacy `/post/*` URLs still hold SERP positions (per the brief), collapsing every one of them to the generic blog index is a **soft-404-equivalent pattern**: Google devalues a redirect that doesn't land on genuinely equivalent content, so whatever backlink/ranking equity those individual article URLs accumulated on the old Wix site is being lost rather than consolidated onto the matching new article. This should be remediated with per-article 301 mapping (old slug → matching new post) instead of a single catch-all target.

## 4. What CANNOT be assessed at Tier 0 — itemised

| Factor | Why unavailable | Unlocked by |
|---|---|---|
| Domain Authority / Page Authority (DA/PA) | Moz-only metric | Moz API key — free tier, 2,500 rows/month, https://moz.com/products/api |
| Full referring-domain count / list | CC graph gives aggregate rank only, no per-domain link list at this tier | Moz `domains` endpoint, or Bing Webmaster `links`, or DataForSEO |
| Anchor text distribution / naturalness | No source at Tier 0 | Moz `anchors` endpoint (0.85 confidence) or Bing anchor data (0.70) or DataForSEO (1.00) |
| Toxic / spam link ratio | No spam-scoring source at Tier 0 | Moz Spam Score, or DataForSEO |
| Link velocity trend | Free sources don't track this at all | DataForSEO only |
| Follow/nofollow ratio | Not exposed by CC graph | Bing link details or DataForSEO |
| Geographic relevance of links | Not exposed by CC graph | Bing country data or DataForSEO |
| Individual referring-domain verification (live/do-follow check) | No seed list of actual backlink URLs available this run | Export Links report from Google Search Console → feed to `verify_backlinks.py --links <file>` |

**Recommended next step:** register the free Moz API key (https://moz.com/products/api, 2,500 rows/month) to unlock DA/PA, referring-domain counts, anchor text, and spam scoring — this alone would move most factors above from "no data" to confidence 0.85 and allow a real numeric Backlink Health Score. Bing Webmaster (free, https://www.bing.com/webmasters) would add inbound-link and country data, but only for properties actually registered to that Bing account (not usable for arbitrary competitors). For full DataForSEO-grade coverage: `./extensions/dataforseo/install.sh`.

---
*Cross-references: for E-E-A-T / content authority signals, see `/seo content` output; for crawlability of the legacy `/post/*` paths, see `/seo technical` output. This report does not duplicate those.*
