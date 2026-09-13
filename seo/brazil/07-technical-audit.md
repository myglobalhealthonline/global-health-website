# Brazil source and technical findings

Service base content belongs to Service.countryId. ServiceTranslation overrides fields using requested locale, country default, then base. ServiceFaq stores PT; ServiceFaqTranslation stores EN/ES. The authenticated snapshot contains all hidden translations and native rows. The 19-group planner edits exact rows and preserves all other fields; no FAQ inserts or embedded migration are needed.

Doctor base, global translations and DoctorFaq are shared ownership. DoctorMarketTranslation is the correct market-specific SEO owner. Snapshot confirms this doctor has one country association and all 18 assignments in Brazil, so the three booking FAQ edits have no currently observed cross-country effect. The writer compares the full scoped snapshot again before publication.

CFM named search confirms CRM-PA11426 and CRM-SP170837 Regular, with Family/Community Medicine RQE8822 in PA only. SP says no registered specialty. Graduation 2013 at Centro Universitário do Estado do Pará is confirmed. No other degree/employment/company claim is newly verified.

Country FAQ: PT/EN authored groups feed both tabs and schema. PT browser shows questions and answers, including 192 SAMU. Spanish is a fallback/noindex page. The shared parser counts details only; country FAQ has zero details but 18 schema questions, so record renderer type rather than declaring missing content. Homepage has six details versus five schema questions, requiring section-level reconciliation; /dr-renato has six details and zero FAQ schema. Neither count alone establishes a schema defect.

CFM's retrieved July 2025 Atesta article explicitly says the platform is suspended by preliminary judicial decision. Its current legal status cannot be certified from that older article. The earlier suggestion to cite Atesta as an authority signal is not a legal conclusion. No new Atesta claim is drafted. The official prescription FAQ describes PDF/link sharing, but does not prove this platform's signing integration. SAMU's Ministry of Health page confirms 192 for emergency response.

Existing service bodies/FAQs still include legal and operational claims requiring broader review: blanket employer acceptance and art.473/TRT attribution, ICP-Brasil promises, prescription restrictions, SUS/INSS process assertions, same-day claims and specialty-like phrasing. The first exact batch changes metadata, selected hero fields and 21 FAQs. Other paragraphs remain live debt, not newly reviewed or secretly removed. Full body revisions need Brazilian clinical/legal review and the signing facts.

Backend gate now checks BR as well as RO/ES at the existing CMS transaction owner; direct SQL runner checks the same resulting hashes. Empty BR approvals and unset review-age policy reject publication. This code is local, not deployed. The reviewed-country snapshots on low-volume CMS writes add a full catalogue read; existing pattern retained.

Public crawl is a baseline, not a post-publication receipt. Canonical/alternates and internal destinations are captured, and the shared public verifier checks unchanged targets and FAQ text after each future batch. External targets and browser-only routes have bounded coverage, not an exhaustive link audit.
