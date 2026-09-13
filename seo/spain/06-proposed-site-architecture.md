# Spain URL and intent ownership

Keep the existing URL structure and six supported page locales. No new service,
locale, redirect or one-page-per-keyword expansion is supported by this evidence.

| Intent | Existing owner | Decision |
| --- | --- | --- |
| Médico online / consulta médica online | `consulta-medica-online` | Improve existing general-care copy; homepage and GP hub remain supporting navigation. |
| Dermatología online | `dermatologia-especialista-online` | Preserve specialist owner, distinguish general skin care; investigate ES-query/EN-landing behaviour. |
| Private justificante assessment | `justificante-medico-online` | Keep document discretion and limits; exclude public sick-leave/template intent. |
| Psychological therapy / psychiatry | Existing separate psychologist/psychiatrist services | Preserve distinct practitioner scope; do not merge by keyword similarity. |
| Cardiology | `cardiologo-online` | Hold promotion until actual appointment supply returns. |
| Vascular / aesthetic consultation | Four existing pages | Reconcile scope and wrong-language bodies; no newly invented procedures. |

`05-url-keyword-map.csv` covers every discovered URL, including pages with only an
editorial role or GSC query evidence. Blank volume is unavailable, not zero. Spain
EN/DE/PT/RO/CS SERPs help interpret intent; they do not supply Spanish keyword volume.

Seven existing ServiceLink rows advertise `neurologo-online` or
`pediatra-especialista-online`; their 12 locale destinations return 404. Exact
drafts deactivate those callouts reversibly. Do not create the absent specialty or
redirect it to general care. Pricing, doctor assignments, slugs and publication
states are outside these proposed changes.
