# Czechia dual-reviewer and Head execution approval — 2026-09-02

This record preserves the execution basis for the 13 exact Czechia candidate
hashes listed in `clinical-review-register.csv`.

- Dual-reviewer PDF: `Czechia_Dual_Reviewer_Approval_Ahmed_Tiago_Ready_To_Sign_2026-09-02.pdf`
- Dual-reviewer PDF SHA-256: `30161c8bd7913acbd98e2aac0820499b21e4bc1bb951c38aef8d8eac97ec024c`
- Head resolution PDF: `Czechia_Clinical_Approval_Head_Execution_Resolution_2026-09-02.pdf`
- Head resolution PDF SHA-256: `13ed9273e65b6954fce8b83c386791e9630dae52bcf27c513bd7fc3b420466c0`
- Clinical reviewer: MUDr. Ahmed Maklad (`cmqas8yh9000b01pgpc0yp1la`)
- Governance, credential and native-English reviewer: Dr Tiago Miguel Figueira (`cmp5r0if3002kssjug743x0p6`)
- Owner/super-admin production authorization: supplied in the Codex task on 2026-09-02.

Both PDFs contain visible handwritten approvals. The Head resolution explicitly
accepts date-only execution and makes exact signature time optional. The register
uses `2026-09-02T16:50:00+02:00`, the dual-review record's prepared-at timestamp,
as the RFC 3339 administrative approval-record time; it is not represented as an
electronic-signature audit timestamp.

The approvals authorize only the exact candidate hashes in the register. They do
not authorize the three measurement holds, the two reviewed-no-change rows, the
privacy/legal row, biographies, qualifications, certifications, registrations,
clinical algorithms, global doctor FAQs or unrelated countries/locales.

## Production source reconciliation

Read-only production checks found that the reviewed service, translation, FAQ,
doctor-profile and doctor-translation timestamps remained pinned. Operational
nested state, including doctor-service assignments, changed on 2026-09-02; that
state is protected and is not written by this rollout. The guarded sources were
therefore repinned to the complete current snapshots before the final dry run:

- paediatrics service: `5382a2857335ff52f1ec5dceab4bd7ab1ad958e2bb43cdf26b80e7737a6ad732`
- mental-health service: `3839eaf5ad33d12809b326247cba8b7552929d712829dfa19c42000b26cec5ee`
- English Prague service: `929eb8ac281ad5383eb468a1783457c7aae55d5a87d576a67e16135b1a0b10bb`
- Ahmed profile: `1c1598c0789ed5bc3287053387e5666c032d2eee3bd463d944e1ae5dd748fe05`
- Islam profile: `11d7e3c8d799dfe60f520db8e7829f404e01691f7cfe79c396b866a9be662869`
- Pavlů profile: `b85c9f22c1a3493974447642ebae58432e6232e1d68dd37b457b2b4d10467f97`
- Holz profile: `0a7b30fa8fa3f6914420a1e99d9e2c5cd54f600a36a5c8d63304d1947848fed7`

The Černý profile source did not drift. Final production dry runs matched all 13
approval hashes and every current source fingerprint before any write.
