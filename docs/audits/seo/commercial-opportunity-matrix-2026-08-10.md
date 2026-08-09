# Commercial search-growth opportunity matrix

Date: 2026-08-10 · Data: OpenSEO/GSC, last 28 days (2026-07-09 → 2026-08-06), query+page dimension pull, cross-referenced against a keyword scan of the full 1,000-row query list for medical/commercial intent terms (538/1000 matched). GA4 not connected to the OpenSEO project — GA4-joined `get_search_opportunities` (business-value scoring) unavailable; this is GSC-only evidence.

No content/ranking changes made this pass — audit only, per the brief.

## Headline finding

Commercial-intent demand is real (538 of 1,000 tracked queries this month contain a medical/service intent word, several with 10-128 impressions each) but almost none of it ranks in the 4-20 striking-distance band — it clusters at position 25-80. Brand and doctor-name queries occupy 4-20; commercial queries are one to two SERP pages further back. The growth lever is pushing existing, topically-correct pages from "buried" into "striking distance," not creating new content — every query below already has a page that should rank for it.

## Commercial Opportunity Matrix

| Query | Market | Impr | Pos | Current URL | Best Intended URL | Content Gap | Internal Authority | Action |
|---|---|---:|---:|---|---|---|---|---|
| sick cert online | ie | 22 | 26.4 | `/ireland/es/health/sick-cert-online` | `/ireland/en/services/sick-certificate-ireland` | **Wrong-locale page ranks for an English query** — Spanish-locale route serving an English-intent search | Weak — health page not the commercial service page | Investigate intent/locale mismatch |
| cold and flu sick certificate ireland | ie | 27 (11+4+12 across 3 URLs) | 19-39 | split across `/blog/sick-certificate-ireland-employee-rights`, `/services/sick-certificate-ireland`, legacy `/ireland/sick-leave` | `/ireland/en/services/sick-certificate-ireland` | Fragmented across 3 URLs, none dominant | Blog↔service link exists (shipped prior batch) but hasn't consolidated ranking yet | Existing page, weak coverage — monitor consolidation |
| doctors note ireland / doctors note online | ie | 26 (15+11) | 61-73 | `/ireland/en/services/sick-certificate-ireland`, legacy `/ireland/sick-leave` | same service page | Page exists, matches intent, ranks very deep | Same page as above — good internal signal, position is the gap | Existing page, weak coverage |
| atestado médico online (+ variants) | pt | 39 across 4 rows | 6.8-25 | mostly `/portugal/es/health/atestado-medico-online` (ES-locale route, best position 6.8-17.5) vs `/portugal/pt/health/atestado-medico-online` (PT-locale, worse: 13.7-23) | `/portugal/pt/services/certificados-medicos` (the actual commercial service page — currently pos 25, 1 impr, barely surfaced) | **The ES-locale health page outranks the PT-locale one for Portuguese-language queries, and the commercial service page barely ranks at all** | health page is doing the ranking work the service page should be doing | Wrong page ranking — investigate, then strengthen the service page's internal links from the health page |
| medico online com atestado | pt | 9 | 6.8 | `/portugal/es/health/atestado-medico-online` | `/portugal/pt/services/certificados-medicos` | Same pattern as above, best position in the whole cluster | Same | Wrong page ranking |
| consult general physician online / consulting doctor online / doctor advice online ireland | ie | 27 across 3 queries | 29-59 | 4-way split: `/ireland/en/gp-consultation-online` (legacy-shaped), `/ireland/en/services/acute-medical-consultation` (current), `/service-page/ie-medical-consultation` (very legacy), `/ireland/en/book` | `/ireland/en/services/acute-medical-consultation` | Split ranking signal across old and new URL shapes — same legacy-vs-new pattern as the site-wide macro finding | Diluted by URL fragmentation, not a content gap | Existing page, weak coverage — this IS the legacy-consolidation problem at the query level |
| consulta medica online / consulta médica online / consulta medica online particular | es | 62 across many rows | 20-73 | Spain alone splits 3 ways: `/spain/en/services/consulta-medica-online`, `/spain/es/gp-consultation-online` (legacy shape), `/spain/es/services/consulta-medica-online` | `/spain/es/services/consulta-medica-online` | Real same-market cannibalization — 3 Spain URLs (mixed EN/ES locale) competing for one query | Split authority | **Cannibalization** — consolidate internal links onto the ES-locale service page |
| consulta do viajante (+ variants) | pt | 43 across 4 rows | 8.5-71 | `/portugal/pt/services/consulta-do-viajante` (mostly), one Brazil hit at pos 8.5 | same | Real demand, page exists, ranks deep everywhere except the one Brazil outlier | Weak — this page was already flagged in the prior ranking-readiness audit as having only 1 assigned doctor | Existing page, weak coverage |
| atestado medico para carta de condução / exame medico carta condução | pt | 29 | 44.9-45 | `/portugal/pt/services/certificado-medico-carta-de-conducao` | same | Page matches intent exactly, ranks deep | Not checked this pass | Existing page, weak coverage |
| aesthetic consultation | es | 34 | 36.4 | `/pt/spain/aesthetic-medicine-online-consultation` | `/spain/es/services/aesthetic-medicine-online-consultation` (or equivalent current-shape URL) | **URL itself looks malformed** — `/pt/spain/...` reads as a locale-then-country segment order, not the site's `/country/lang/...` convention | Unknown — worth a technical check before content work | **Investigate URL structure first** — this may be a legacy alias, not a real defect |
| body adjustment clinic | ie | 83 (cs-locale) + 3 (default) | 4.6-9.7 | `/cs/ireland-partner-clinic/body-adjustment-clinic` (legacy shape) | `/ireland/{lang}/partner-clinics/body-adjustment-clinic` or equivalent current-shape URL | Ranks well (pos 4.6-9.7!), 0-1 clicks despite 86 combined impressions | Partner-clinic page, likely thin internal linking | **CTR opportunity** — page ranks, title/snippet isn't earning clicks |
| get sick certificate online ireland / fit for work certificate ireland / gp consult.ie / haemochromatosis blood test / full blood count online | ie | 10-38 each | — | No page found in this data pull (didn't surface in the top-1000 query×page rows this window) | sick-certificate-ireland / a lab-test detail page | Inconclusive from this data alone | — | Needs a targeted GSC pull (single-query filter) before acting — not enough evidence yet |

## Doctor-name search strength (existing asset, confirm not disturb)

Doctor-name queries remain the strongest-converting segment found this session: "fahad farooq" 41.7% CTR, "dr telmo coelho psiquiatra" 22.5%, "dr telmo coelho" 20%. The doctor→service crawlable link (shipped in the prior batch, `db318dfe`) and service→doctor links already route this authority toward commercial pages without any anchor-text stuffing. No further action needed here beyond what's already shipped — flagging as a confirmed-healthy asset, not a gap.

## Top 20, ranked by evidence strength (not just impressions)

1. Portugal `atestado médico online` cluster — wrong-locale page (ES route) outranking the PT route and the actual commercial service page for a Portuguese-market query. Highest confidence, clearest mechanism, ties directly to this session's locale-eligibility work.
2. Ireland GP/consultation query cluster (`consult general physician online` etc.) split across 4 URLs including 2 legacy shapes — direct query-level evidence of the site-wide legacy-consolidation problem.
3. Spain `consulta medica online` cannibalization — 3 Spain URLs, mixed locale, one query.
4. `body adjustment clinic` — ranks well, converts poorly (CTR fix candidate, cheap to test).
5. Ireland sick-cert cluster (`sick cert online`, `cold and flu sick certificate ireland`, `doctors note ireland/online`) — real demand (~75 combined impressions), fragmented across blog/service/legacy, all ranking 19-73.
6. Portugal `consulta do viajante` cluster — real demand, thin doctor coverage already flagged in the ranking-readiness audit, now confirmed by query data too.
7. Portugal driving-certificate query pair — page matches intent exactly, just needs authority/position work.
8. `aesthetic consultation` — malformed-looking URL, technical check before any content work.
9-20. Every other row above once the deeper query-page pull (single-query filters) confirms a current URL — flagged as needing more evidence, not fabricated to fill the list. Padding to exactly 20 with unconfirmed guesses would violate the brief's own "do not blindly target example phrases" instruction.

## D. Recommended next work

### Technical
- Investigate the `/pt/spain/aesthetic-medicine-online-consultation` URL shape — confirm whether it's a legacy alias or a real routing defect before touching content.
- Investigate why `/portugal/es/health/atestado-medico-online` outranks the PT-locale route for Portuguese-language queries — check whether this is stale index entries from before the locale-eligibility fix (prior batch) or a live ranking signal issue.

### Existing-page optimization (highest priority per the brief)
- Ireland sick-cert service page + its blog/legacy siblings — consolidate the query signal onto one URL.
- Portugal driving-certificate service page — content/authority push, page already matches intent.
- Portugal traveler's-consultation service page — same, plus the already-flagged thin-doctor-coverage fix.
- Spain `consulta-medica-online` — resolve the 3-way internal cannibalization.

### Content creation
- None identified this pass. Every commercial query found already has a matching page. Do not create new pages before the "existing-page optimization" list is worked through.

### Internal authority
- Portugal atestado/certificados-medicos service page needs stronger links from the health/blog content currently absorbing its ranking signal.
- Portugal traveler's-consultation needs more assigned doctors (repeats the ranking-readiness audit finding, now with query evidence backing it).

### External authority
- Not assessed this pass — no backlink data pulled. Flag for a dedicated backlink audit before assuming any of the above rankings are link-limited rather than on-page/authority-limited.

## Gate before acting further

Per the brief: do not rewrite titles/descriptions or touch content based on this matrix alone. Each "wrong page ranking" and "cannibalization" row needs a single-query GSC pull (not the 1,000-row general dump this was mined from) to confirm the finding before any change — flagging that as the next concrete step, not doing it speculatively in this pass.
