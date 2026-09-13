# Independent page candidates and unresolved facts

These are exact proposed text changes outside the service/profile mutation manifest. Before values are the saved public rendering, not a complete PageContent snapshot. Do not publish through the service updater.

| Page/field | Before | Proposed | Source/dependency |
| --- | --- | --- | --- |
| /brazil/pt title | Médico Online Brasil · rendered title: Médico Online Brasil \| Clínicos e Especialistas Registados | Médico online no Brasil \| Consulta por vídeo | HOME PageContent → country-home-copy extras → market locale fallback; inspect the exact winning stored row before implementing. Avoid changing shared Portugal strings. |
| /brazil/en title | See raw public inventory for exact current value | Online doctor in Brazil \| Video consultations | Same HOME ownership; no specialist or same-day promise. |
| /brazil/es title | See raw public inventory for exact current value | Médico online en Brasil \| Consulta por vídeo | Same HOME ownership. |
| /brazil/pt/book link label | Need a same-day GP instead? | Ver consulta com médico de família | frontend/app/[country]/[lang]/book/page.tsx, existing link target preserved; add a Brazil-specific localized label in the existing locale owner, not a global Portuguese replacement. |
| /brazil/en/book link label | Need a same-day GP instead? | View family doctor consultations | Same source. |
| /brazil/es/book link label | Need a same-day GP instead? | Ver consultas con médico de familia | Same source. |

Country FAQ already limits employer acceptance/INSS and includes SAMU 192. Retain those useful limits. Its signing statement must be reviewed against the actual workflow; no Atesta or ICP-Brasil integration sentence is proposed without business evidence. CFM's retrieved older article describes suspension, not a current universal requirement.

Pricing shows active-looking memberships at R$150/250/300, specialist savings and an English “Only Ireland” section. Before changing contractual benefits, confirm which benefits apply in Brazil and whether these are membership plans rather than regulated health-plan coverage. Preserve prices and purchase flows pending that answer.

Existing article authors/reviewers, legal bodies, homepage FAQ section counts and /dr-renato landing-page ownership need separate evidence. The 153-row matrix records their holds; no body is described as newly verified. Do not convert these unapproved candidates into an indexability change or silent unpublication.
