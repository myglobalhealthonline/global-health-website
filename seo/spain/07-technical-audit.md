# Focused Spain technical and source audit

All 422 live inventoried URLs are self-canonical. Thirty legal translations are
noindex; retain the observed policy. Twelve linked specialty destinations return
404. These checks are a Spain content inventory, not a new full-site crawl or a
claim that all Core Web Vitals, indexation and accessibility issues are closed.

The six booking pages were inspected in a browser: localized H1s and 23 service
choices rendered in each. No patient booking or payment was made. Some English UI
labels remain on ES (`View` and the same-day GP link); record as localization debt,
not the old missing-H1 claim.

Ownership traced through Prisma, public routes and Next rendering:

| Content | Stored owner and preservation requirement |
| --- | --- |
| Service copy and metadata | Spain Service plus ServiceTranslation; base language ES. Compare source values and explicit translations. |
| Native service FAQs | ServiceFaq and ServiceFaqTranslation; preserve hidden rows and base/locale equivalence. |
| Embedded FAQs | Rich-text detailBody; none observed here, so no FAQ-section deletion is proposed. |
| Doctor copy | Global Doctor/DoctorTranslation with DoctorCountry/DoctorMarketTranslation overrides. Audit all associations before changing shared fields. |
| Doctor FAQs | DoctorFaq belongs to doctor+locale, not Spain; planner refuses cross-market doctors/assignments. |
| Related offers | ServiceLink and translations; remove only exact obsolete link activation flags. |
| Availability | Active assignments plus dynamic booking rules/slots; content edits must not alter these. |
| FAQ schema | Rendered from native FAQ output; all 1,518 answers match visible text after whitespace normalization. |

Four services contain Spanish text in every locale record despite a matching
resolvedLocale. Their localized hero/FAQ candidates do not translate the complete
clinical body. Native-language and clinical source review remain necessary.

Public API fingerprints are not authenticated snapshots. The local snapshot reader
includes hidden translations and cross-country associations, excludes patient data
and internal payout/configuration columns, and has not run against production.
See `raw/storage-export-scope.md` for the exact blocked scope.

The current shared CMS transaction wrapper has been extended locally to gate Spain
service/profile/FAQ/link state changes. It does not govern page/blog/tool writers or
privileged SQL outside the updater. No production enforcement deployment exists.
