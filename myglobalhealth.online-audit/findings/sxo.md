> **Historical audit — current status is tracked in [`docs/plans/seo-control-state.md`](../../docs/plans/seo-control-state.md).** This audit predates the 2026-08 remediation batches. Every count, status and priority below is superseded. Kept as evidence only.

# SXO Gap Analysis — myglobalhealth.online

Scope: SERP-backwards analysis for 8 commercial head terms across 6 markets, scored against 6 target pages (Ireland funnel).

## 1. SERP Consensus by Query

| Query | Dominant page type | Format signals | Who ranks |
|---|---|---|---|
| online doctor ireland / online gp ireland | Country-specific telemedicine brand homepage | Price anchor in title/meta (from €20-€35), doctor count, IMC registration badge, single primary CTA | webdoctor.ie, mediconline.ie, smartscripts.ie, eirdoc.com, onlinedoc.ie |
| sick cert online ireland | **Dedicated single-purpose transactional landing page** (not a subpage of a general GP page) | Price front and center (€24.99+), "24/7 no appointment," legal-validity FAQ, explicit DSP/employer-acceptance caveat | doconcall.ie/online-sick-cert-ireland, medhub.ie, getsickcert.ie, sicknote.com |
| medico online portugal | Country-brand homepage / insurer-linked service (Médis, Multicare) | 24/7 availability badge, specialty list, "same doctor for family" trust hook | mediconanet.pt, medis.pt, teleconsultaportugal.com, dronline.pt |
| médico online españa / consulta médica online | Country-brand homepage, price-per-consult from €20, response-time SLA ("<3h") | ZAVA, Virtual Clínica, tuMédico, Doctoralia (marketplace/directory format also ranks) |
| online doctor romania / medic online | Country-brand homepage, pharmacy-delivery integration hook | mediculonline.ro, doclandia.ro, dr-online.net, directdoc.ro |
| telemedicina brasil | Country-brand homepage + regulatory-trust content (CFM Law 14.510) | brasiltelemedicina.com.br, portaltelemedicina.com.br |

SERP features observed: no classic featured snippets/PAA captured by WebSearch tool, but AI-overview-style summaries synthesize competitor answer content directly — meaning competitor pages are structured for extractability (short answer blocks, FAQ-style headers). No local-pack signal surfaced (these are national/remote services, not location-based).

## 2. Page-Type Mismatch Findings — lead finding

**CRITICAL — "sick cert online ireland" has no matching page type on the site.**
The intent cluster is dominated by dedicated single-purpose transactional pages. Global Health has:
- `/ireland/en/gp-consultation-online` — sick cert is one bullet among acute illness, prescription reviews, referrals, chronic disease (1,434 words, general-purpose page)
- `/post/getting-a-gp-sick-note-online-simplified` — an **informational blog post**, not a transactional page, and it is the only Global Health URL currently surfaced by search for this query
There is no equivalent of doconcall's `/online-sick-cert-ireland` or getsickcert.ie's price-forward, FAQ-forward single-purpose page. This is an entire high-intent commercial cluster the site cannot compete for because the required page type doesn't exist, not because of thin content on an existing page.

**HIGH — price inconsistency across the funnel undermines the price/comparison-shopper page type SERP rewards.**
`/ireland/en` meta description: "same-day appointments **from €29**." `/ireland/en/gp-consultation-online` meta description: "same-day appointments **from €39**." Competitors that rank (smartscripts.ie €20, ZAVA, tuMédico) lead with one single, consistent number. A shopper who clicks the hub result and lands on the GP page sees a €10 jump before they've booked anything.

**MEDIUM — `/ireland/en/pricing` is subscription-first, SERP rewards single-consult pricing.**
442 words, "Comprehensive Care Plan €39/month" is the primary object on the page. Every ranking competitor for the head terms leads with a one-off consultation price (from €X), not a monthly plan. Subscription framing is a legitimate business model but it is not what searchers for "online doctor ireland" are primed to compare against — it reads as a mismatch at the moment of price comparison.

**ALIGNED — `/ireland/en` and `/ireland/en/gp-consultation-online` match the dominant SERP page type well.** Both are country-specific brand/service pages with strong depth (3,196 and 1,434 words), FAQPage + Offer + Service + MedicalOrganization schema (6 and 5 blocks respectively — confirmed via structured_data extraction), IMC registration signals, and multilingual claims that mirror what ranks.

**Root domain (`myglobalhealth.online/`) — ALIGNED as architecture, but leaking indexation.** 105 words, 1 H1/H2, 2 schema blocks, 6 internal links — correctly thin, because it's a country-selection gate, not a query-answering page; it should never be the intended landing page for any of these head terms and isn't competing on this SERP set. The risk is elsewhere: WebSearch turned up legacy indexed URLs (`/es/home-sp`, `/service-page/pt-cons-med-dr-tiago-miguel-figueira`, `/ireland-doctors/dr-mala-vili-rajan`) that are old Wix-era paths still ranking/indexed alongside the current Next.js site — consistent with the known legacy-Wix-orphan issue already tracked for this project. These compete for brand equity/clicks against the correct current URLs and should be redirected, not just left live.

**Romania and Brazil — not independently verifiable in this pass.** Only Ireland pages were in scope for scoring. Per project history, Romania/Brazil market go-live has open blockers; if `/romania/*` and `/brazil/*` equivalents to `/ireland/en` don't exist yet or aren't published, that is a CRITICAL page-type mismatch for "online doctor romania," "medic online," and "telemedicina brasil" — the SERP wants a full country-brand homepage and there may be no page to rank at all. Needs direct confirmation outside this audit's scope.

## 3. User Stories (cite SERP signal)

1. "As a worker who woke up sick, I need a certificate my employer will accept, fast, without booking a full GP consult." — derived from doconcall/getsickcert/sicknote.com all leading with price + "24/7 no appointment needed" + legal-validity FAQ. **Awareness/decision, same session.** Not served: no matching page.
2. "As an Irish Medical Council skeptic, I need to verify this doctor is really registered before I pay." — derived from every ranking competitor surfacing IMC registration as a trust badge in snippet/title. **Consideration.** Served well: `/ireland/en/doctors` shows named doctors + registration numbers.
3. "As an expat, I want to see doctors who speak my language before I commit to booking." — derived from Médis/Portugal and Spain results emphasizing specialty/availability breadth, and doctor-directory competitors (Doctoralia) surfacing language filters. **Consideration.** Served: doctor profiles list languages (e.g., "Dr Abdelrahman Mustafa — English, Arabic").
4. "As a price-comparer with 4 tabs open, I want one clear number I can compare across services in under 10 seconds." — derived from every SERP result anchoring price in the title/meta itself (from €20, €24.99, €35, €39...). **Decision.** Broken: €29 vs €39 conflict, and pricing page defaults to subscription framing instead of a single comparable number.
5. "As someone who just wants to talk to a doctor tonight, I want to know consultations happen today, not 'book an appointment' ambiguity." — derived from "same-day," "24/7," "<3 working hours" response-time framing across ES/PT/IE competitors. **Decision.** Served on `/ireland/en/gp-consultation-online` ("same-day appointments" in meta + Offer schema) but not reinforced with same urgency on `/ireland/en/pricing`.

## 4. Gap Scores (out of 100) — `/ireland/en/gp-consultation-online` (best-matching page, used as funnel exemplar)

| Dimension | Score | Evidence |
|---|---|---|
| Page Type | 12/15 | Matches SERP's country-service-page consensus; loses points for not being sick-cert-specific when that's a named intent it half-serves |
| Content Depth | 13/15 | 1,434 words, 8 H2s — in line with competitor depth |
| UX Signals | 10/15 | Clear CTA structure per extracted text ("Talk to a GP," "Safe & confidential," "Quick appointments") but price contradicts hub page |
| Schema | 15/15 | 6 blocks incl. FAQPage, Offer, Service, MedicalOrganization, BreadcrumbList — matches/exceeds what ranks |
| Media | 10/15 | 17 images present; no video consult demo/trust visuals confirmed in extracted content |
| Authority | 12/15 | IMC registration language present; no visible review count/Trustpilot integration in extracted text (competitors like webdoctor.ie lead with "800,000 patients trusted") |
| Freshness | 7/10 | publication_date 2026-07-20 for homepage sample; no visible "last reviewed by Dr. X" clinical-review date on the GP page itself |
| **Total** | **79/100** | |

`/ireland/en/pricing` scores far lower on Page Type (subscription vs single-consult framing) and UX Signals (price inconsistency) — estimate ~52/100. The sick-cert intent scores **0/100 on Page Type** because no page exists to evaluate.

## 5. Persona Scoring (25 pts each: Relevance / Clarity / Trust / Action)

| Persona | Relevance | Clarity | Trust | Action | Total | Fix priority |
|---|---|---|---|---|---|---|
| **Anxious patient, needs same-day cert** | 5 | 8 | 10 | 12 | **35/100** | #1 — build a dedicated `/ireland/en/sick-cert-online` transactional page: price-forward, "issued within X minutes," DSP electronic-cert caveat handled explicitly (competitors all address it — hiding it is worse than stating it), single CTA |
| **Price-comparison shopper** | 12 | 10 | 12 | 15 | **49/100** | #2 — fix the €29/€39 meta-description conflict (root cause: two independently authored SEO title/meta pairs); lead `/pricing` with a single one-off consult price before the subscription pitch |
| **Expat, own-language doctor** | 20 | 18 | 20 | 15 | **73/100** | #3 — add an explicit language filter/facet on `/ireland/en/doctors` (currently language is only visible per-profile, not filterable at a glance per extracted content) |

Sort order for remediation: sick-cert persona first (largest score gap, entire keyword cluster unaddressed), price-shopper second (root-cause fix is a two-line meta edit, cheap win), expat persona last (already strongest, minor polish only).

## 6. Funnel Break Points

- **Sick cert intent: breaks before the click.** No page exists for Google to serve, so the funnel never starts for this cluster.
- **Price-shopper intent: breaks between hub and service page.** Click lands on `/ireland/en` (€29 promise) → navigates to `/ireland/en/gp-consultation-online` (€39) → contradiction reads as bait-and-switch, likely bounce before reaching `/pricing` at all.
- **Pricing page itself: breaks between price page and booking.** Subscription-first framing (€39/month) doesn't answer "how much for one consult right now," forcing the shopper to hunt or leave.
- Awareness→consideration→decision is otherwise intact on the IMC-registration and doctor-directory path (`/ireland/en/doctors`), which is the strongest leg of the funnel.

## 7. Limitations

- No Google Search Console query data (OAuth grant broken per project notes) — SERP positions/impressions for these exact terms on myglobalhealth.online could not be confirmed; this is SERP-backwards inference from top-ranking competitors only, not confirmed rank tracking.
- WebSearch did not surface a classic featured-snippet/PAA block for any of the 8 queries in this pass — SERP-feature analysis is based on result titles/snippets only.
- Romania and Brazil target pages were not in the page list to score and were not independently fetched; RO/BR mismatch severity above is inferred from project history, not verified live.
- `content`/raw HTML from `render_page.py` is truncated in this environment's JSON output; page structure conclusions rely on `parse_html.py` (title/meta/H-tag/schema counts) and `structured_data` block summaries rather than raw markup inspection.
- Legacy Wix URL indexation was observed opportunistically via WebSearch, not audited exhaustively — treat as a pointer to re-run the existing legacy-redirect tracking, not a new full audit.

## Cross-skill follow-ups

- Missing schema for a would-be sick-cert page → `/seo schema` once the page exists.
- E-E-A-T/authority gap (no visible review-count trust signal vs. competitors' "800,000 patients") → `/seo content`.
- Legacy Wix URLs still indexed → existing redirect-audit workstream, not a new `/seo local` or `/seo page` task.
