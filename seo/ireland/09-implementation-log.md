# Implementation log

> **Dated evidence, not current operational status.** The canonical global ledger at
> `docs/plans/seo-control-state.md` owns current status, priorities and next actions.

**Batch date:** 2026-08-25
**Public application changes:** GP/specialist hub code; not deployed
**CMS writes:** none
**Deploy:** none

The initial research pass did not justify a broad rewrite. A subsequent focused GP/specialist review found two bounded defects that could be fixed without changing CMS content, clinical claims or booking behavior.

| File changed | URL affected | Reason | Keyword cluster | Change type | Expected impact | Risk | Clinical review | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `seo/ireland/README.md` | None | Index and operating contract | All | Documentation | Prevent duplicate/stale SEO work | Low | No | File review |
| `01-baseline-audit.md` | Ireland surface | Record framework, crawl and first-party baseline | All | Research | Shared evidence base | Low | No | Repo + OpenSEO |
| `target-page-inventory.csv` | 27 priority URLs | Record the requested target crawl inventory | All | Data | Reusable page baseline | Low | No | CSV and URL uniqueness checks |
| `02-webdoctor-competitor-audit.md` | None | Current competitor architecture analysis | All | Research | Better prioritisation | Low | No | Public crawl + OpenSEO |
| `webdoctor-page-inventory.csv` | None | Complete public sitemap discovery plus bounded deep sample | All | Data | Reusable architecture and template evidence | Low | No | 282 unique sitemap rows; 20 deep rows |
| `03-keyword-master.csv` | None | Cluster and score live Ireland terms | Six primary clusters | Data | Focused opportunity set | Medium | Flags included | CSV checks |
| `04-content-gap.csv` | None | Map gaps to real services | Priority clusters | Planning | Prevent unsupported page creation | Low | Flags included | Row review |
| `05-url-keyword-map.csv` | 27 priority URLs | Assign one primary intent per URL | Priority clusters | Planning | Reduce cannibalisation | Medium | Flags included | URL and cluster review |
| `06-proposed-site-architecture.md` | Ireland IA | Keep-first hub/spoke plan | All | Architecture | Clear linking plan | Low | No | Repo reconciliation |
| `07-technical-audit.md` | Ireland technical surface | Record verified findings | Technical | Audit | Avoid speculative rewrites | Low | No | OpenSEO + code |
| `08-backlink-opportunities.csv` | None | Legitimate authority plan | Authority | Research | Off-site prioritisation | Medium | Business/legal where noted | Prospect risk review |
| `10-measurement-plan.md` | None | Define privacy-safe gates | All | Measurement | Decision quality | Low | Privacy/compliance | Metric review |
| `11-30-60-90-day-roadmap.md` | None | Sequence owners and gates | All | Planning | Controlled execution | Low | Per item | Date/dependency review |
| `clinical-review-register.csv` | Priority medical pages | Prevent unreviewed publication | Medical clusters | Governance | YMYL safety | Low | Required | Register review |
| `content-briefs/*` | Proposed existing-page work | Define page-level requirements | P0/P1 clusters | Draft planning | Actionable editorial work | Medium | Required | Brief checklist |
| `raw/openseo-call-log.jsonl` | None | Sanitised collection record | All | Provenance | Reproducibility | Low | No | No credentials stored |
| `frontend/lib/content/service-doctor-selection.ts` and specialist wrapper | GP and specialist hubs | Enforce reciprocal active-service assignment before a clinician appears | Online GP / specialists | Eligibility helper | More accurate clinician discovery and trust presentation | Low | No copy change | 23 focused tests + typecheck |
| `frontend/app/[country]/[lang]/general-consultation/page.tsx` | `/{country}/{lang}/gp-consultation-online` | Exclude unassigned and specialist-only clinicians from the GP roster | Online GP | Page integration | GP heading and clinician cards remain semantically aligned | Low | No | Selector tests + full frontend suite |
| `frontend/lib/seo/consultation-hub-visible-content.ts` | Specialist hub | Resolve the exact visible hero/FAQ content used by structured data | Specialists | SEO helper | Prevent hidden, stale or empty FAQ schema | Low | No | Authored, fallback and empty-FAQ tests |
| `frontend/app/[country]/[lang]/specialist-consultation/page.tsx` | `/{country}/{lang}/see-a-specialist` | Use visible authored/fallback FAQ and hero description in JSON-LD | Specialists | Structured data | Schema matches the page users see | Low | No | Focused tests, typecheck, lint, review |

## Deliberate non-changes

The follow-up batch deliberately stops at the two proven defects. The live CMS already contains the earlier GP/specialist content work, and current query evidence does not justify another metadata rewrite.

- No title, meta description or H1 was changed from a length heuristic alone.
- No new service, medication, location or clinician page was created.
- No redirect, canonical, sitemap, robots, hreflang or navigation rule was changed.
- No prescription cluster was enabled.
- No lab copy/schema/link change was made before the approximately 2026-09-08 gate.
- No rank tracker, recurring paid task or saved-keyword tag was created.
- No keyword was written to OpenSEO project memory.
