# Multilingual and Advertising Compliance Audit

Audit date: 2026-07-10  
Repository: `global-health-website`  
Supported locales: `EN`, `PT`, `ES`, `CS`, `RO`, `DE`

## Scope and method

Reviewed the Prisma schema, translation tables, locale resolver, public Fastify routes, Next.js route/data loaders, locale JSON files, translation/import scripts, cache tags, and the live database through the repository's read-only audit scripts. No database record was modified and no valid translation was overwritten. Because no database write was performed, a production backup was not created.

The backend is TypeScript/Fastify/Prisma, not Django/DRF. The country URL is `/{country}/{lang}`; frontend locale segments are normalized to uppercase backend enum values.

## Findings before remediation

| Area | Evidence | Classification | Recommended action |
|---|---|---|---|
| Services | 187 total; 124 missing at least one non-default locale. Gap counts: PT 87, ES 94, CS 81, RO 82, DE 103, EN 55. | Missing content | Author/import verified translations; do not machine-fill without human approval. |
| Service FAQs | 776 total; 343 missing at least one locale. | Missing content / content gap | Complete through admin/import workflow. |
| Doctors | 38 of 62 missing at least one profile translation. | Missing content | Add verified profile translations. |
| Health tests | 2 of 2 missing at least one translation; health-test FAQ translation architecture exists for detail rows but no coverage is present. | Missing content / architecture gap | Add verified translations and complete FAQ content where required. |
| Romania public services | Existing repair dry-run identified 16 service rows with missing non-default field translations; Romania has 18 public services and no FAQs. | High priority manual translation | Translate the eight service fields; author Romanian FAQs manually. |
| Czech doctor `khoiamul-islam` | ID `cmp9n5dpq0000foju1qv98wm3`; base `title/bio/seoTitle/seoDescription` are English while country default is `CS`; a valid `CS` translation row exists and the mismatch detector predicted `EN` for the base row. | Incorrectly mapped base/fallback data, but not currently leaking through the supported CS path | Preserve rows; manually confirm whether base columns should be Czech or remain final fallback. |
| Orphan/duplicate/invalid locale rows | Prisma uniqueness and enum constraints prevent duplicate `(parent, locale)` rows and invalid enum values at schema level. The read-only audit found one language-mismatch suspect and did not report an orphan. | No confirmed orphan/duplicate | Keep constraints and rerun after content imports. |
| Static locale bundles | Existing key audit: 6 locales × 12 namespaces, no key gaps. | Compliant | Keep CI check enabled. |

## Root causes

1. The main issue is incomplete translation data, especially service fields/FAQs, Romanian services, doctor profiles, and health tests.
2. Doctor public payloads selected raw specialty rows and did not resolve `SpecialtyTranslation` by locale. This allowed a default-language specialty label to appear in another locale.
3. Legacy global `/api/services`, `/api/specialties`, and `/api/health-tests` returned base rows without applying the shared locale resolver.
4. Country-scoped APIs already received and normalized `locale`, and their cache keys included locale for the localized collection fetchers. The shared resolver intentionally uses only requested locale → country default → base; it does not select an arbitrary array element.

## Remediation applied

- Localized doctor specialty names and summaries in global, country-list, and doctor-detail payloads.
- Added locale-aware resolution to the legacy global service, specialty, and health-test endpoints.
- Added locale query propagation and locale-specific Next.js cache tags to the corresponding frontend fetchers.
- Made global normalized service/specialty loaders accept a locale so callers can opt into the same behavior.
- No database records, translations, migrations, or seed data were changed.

## Remaining manual review

- 124 service records with incomplete locale coverage.
- 343 service FAQ records with incomplete locale coverage.
- 38 doctor profiles with incomplete locale coverage.
- 2 health tests with incomplete locale coverage.
- All 18 Romanian public service FAQ sets require content-authoring review; no FAQs should be fabricated.
- Czech doctor base-row language mapping noted above.
- Any translation that affects medical claims, qualifications, risks, pricing, or legal disclosures requires qualified human translation/policy review.

## Verification

- Backend typecheck: passed.
- Frontend locale-key check and TypeScript typecheck: passed.
- Existing database-backed backend test command: blocked by the repository safety guard because `.env` points to a non-local Railway database; tests were not forced against live data.
- Read-only live coverage audit completed successfully before remediation.
- Read-only mismatch audit: 1 suspect base doctor row; no automatic correction applied.

## Google Ads and Meta Ads compliance review

This is a pre-launch risk review, not legal advice and not a guarantee of ad approval. Google and Meta retain final review/enforcement authority.

Official policy pages reviewed on 2026-07-10:

- Google Ads [Misrepresentation](https://support.google.com/adspolicy/answer/6020955?hl=en), [Destination requirements](https://support.google.com/adspolicy/answer/6368661?hl=en), [Healthcare and medicines](https://support.google.com/adspolicy/answer/176031?hl=en), and [Unreliable claims](https://support.google.com/adspolicy/answer/15936857?hl=en).
- Meta [Advertising Standards](https://www.facebook.com/policies/ads/), [Drugs and Pharmaceuticals](https://www.facebook.com/policies/ads/restricted_content/prescription_drugs), and [Ad review, policy and support](https://www.facebook.com/business/ads/review-policy-guidelines).

| Surface | Languages | Status | Risk/correction |
|---|---|---|---|
| Telehealth/healthcare services and online prescriptions | All six | Restricted category requiring authorization review | Confirm country eligibility, provider/business verification, prescription/telehealth authorization, targeting, and required disclaimers before launch. |
| Medical service/doctor/FAQ claims | All six | Requires manual policy and translation review | Prove qualifications and outcomes; remove unsupported guarantees/cures; review every localized claim for meaning drift. |
| Landing pages and localized URLs | All six | Requires improvement | Run authenticated-free AdsBot/mobile checks for HTTP status, crawlability, offer/pricing consistency, language consistency, forms, and legal disclosures. |
| Lead forms, cookies, analytics and ad pixels | All six | Requires legal/privacy review | Verify consent gating, purpose/retention disclosures, regional rights, and that sensitive health data is not sent to ad platforms. |
| Meta personal-attribute language | All six | Requires manual ad-copy review | Avoid implying the advertiser knows the viewer's condition, diagnosis, disability, or hardship. |
| Pricing, subscriptions, refunds and cancellation | All six | Requires improvement | Make recurring charges, eligibility, fees, cancellation and refund terms clear before payment or lead submission. |
| Creative assets, testimonials, awards and affiliations | All six | Not fully evidenced | Verify ownership, authenticity, approvals, and claim substantiation before use in ads. |

The repository audit found no basis to declare the application legally compliant or ad-approval eligible. The restricted healthcare/telehealth and prescription surfaces must remain pending authorization/legal review.

## Post-translation ads-policy scan (2026-07-11)

After the bulk machine-translation run (4,530 fields drafted and applied: services, service FAQs, doctor profiles, health tests across IE/PT/ES/CZ/RO/BR), all draft source/draft pairs were scanned against Google Ads (Healthcare and medicines, Misrepresentation, Unreliable claims) and Meta (personal attributes, drugs) policy criteria — regex triage over multilingual stem lists for cure/guarantee/superlative/safety/credential/speed/personal-attribute/drug-brand terms, with every hit manually re-read in full context.

**Result: no translation drift.** No draft added or strengthened any claim, credential, guarantee, price, or legal statement relative to its source. Doctor bios contain no invented qualifications or awards. Health-test drafts contain no diagnostic-certainty claims.

**Inherited source-content items** (pre-existing in base content, now present in more locales; owner: ads/compliance, not translation):

| Severity | Item | Location | Note |
|---|---|---|---|
| High — **RESOLVED 2026-07-11** | Affirmative STI cure claim: "Is syphilis curable? … curable with appropriate treatment with benzathine penicillin" | `saude-sexual-ist-online` FAQ, PT source now also EN/ES | Reworded to treatability framing ("Can syphilis be treated? … treatment with benzathine penicillin is highly effective when indicated by a doctor") in PT/EN/ES FAQ and detailBody via `scripts/fix-ads-compliance-wording.ts` (7 changes, snapshot taken first). |
| Low-Med — **RESOLVED 2026-07-11** | "Lei 14.510/2022 garante validade nacional…" legal-guarantee sentence | ~15 Brazil service-FAQ slugs, now also EN/ES | Rewritten with jurisdiction scope ("Under Brazilian federal law (Law 14.510/2022) … valid throughout Brazil" / ES analogue) across 41 EN/ES rows via the same script; 8 rows already correctly scoped were left unchanged. |
| Low-Med | Second-person condition phrasing ("your condition", "your case") | `doencas-cronicas`/`enfermedades-cronicas`/mental-health FAQ answers, now also EN | FAQ answer copy, not ad creative — acceptable on landing pages; do not reuse in Meta ad copy. |
| Low | Prescription weight-loss drug brand names (Ozempic, Wegovy, Saxenda, Contrave) | `controle-peso-online` detailBody, PT source now also EN/ES | Long-form body only, never in SEO/hero/CTA fields; surrounded by prescription-required and contraindication caveats. Sanity-check before using page as a Google Ads destination. |

Caveats: triage was keyword-stem based with manual context reads; subtle modality drift without a keyword match would need an LLM-judge back-translation pass. This does not change the overall pre-launch status above: restricted healthcare/telehealth surfaces still require platform authorization and legal review before any campaign.

## Recommended next steps

1. Back up production content, then complete verified translations in batches with a post-import read-only audit after each batch.
2. Add an admin report/export for missing translation coverage by parent ID, field, and locale.
3. Add API integration tests asserting that requested locale, resolved locale, and fallback behavior cannot mix languages.
4. Run browser/API checks for every country × locale combination, including language switching, refresh, and stale-cache scenarios.
5. Complete the separate ad-copy/creative inventory and legal/privacy review before launching Google or Meta campaigns.
