# Proposed Czechia search architecture

Date: `2026-08-31`

No new architecture is required. The live country/language/service model already contains the priority routes. The work is ownership, internal linking, and clinical depth.

```text
/czechia/
├── cs/                               market hub
│   ├── gp-consultation-online         broad commercial GP owner
│   ├── services/
│   │   ├── lekar-online-praha         Prague commercial owner
│   │   ├── neschopenka-online         sick-note assessment owner
│   │   ├── obnoveni-lecby             treatment-renewal owner
│   │   ├── detsky-lekar-online        paediatric owner
│   │   ├── kozni-konzultace-praha    dermatology owner
│   │   ├── doporuceni-a-vysetreni    referral/investigation owner
│   │   └── druhy-nazor-praha          second-opinion owner
│   ├── blog/
│   │   ├── lekar-online-24-7-co-vyresi                general explainer
│   │   ├── neschopenka-jak-funguje-eneschopenka       process explainer
│   │   └── vypocet-nemocenske-2026-...                payment explainer
│   ├── tools/
│   │   ├── blood-pressure-chart
│   │   ├── calorie-calculator
│   │   └── bmi-calculator
│   └── doctors/                       roster and profiles
└── en/                                Czechia English/expat hub
    └── services/lekar-online-praha    English Prague commercial owner
```

## Internal-link contracts

1. The Czech home links “praktický lékař online” intent to the GP page, not a blog article.
2. The 24/7 explainer links early and contextually to the GP page with a booking-intent anchor; it owns capability and limitation questions.
3. The eNeschopenka explainer links to the service only where a medical assessment is relevant. The service links back for administrative process detail.
4. The English Czechia hub routes Prague/foreigner transaction intent to `/czechia/en/services/lekar-online-praha`.
5. Service pages link only to clinicians actually available for the service/locale; blog reviewer links preserve the article locale.
6. Tool pages link to care only when clinically appropriate and never imply diagnosis.

## Creation policy

Do not create Czech city, condition, specialty, or language variants unless all four are true: distinct measured intent, a supported service, non-duplicative visible content, and a verified booking/clinical pathway. Existing URLs take priority.

## Cannibalisation gates

- Recheck GP versus 24/7 article after `2026-09-08` before metadata changes.
- Separate service-modified and process-modified neschopenka queries in GSC.
- Keep home pages as market navigators, not catch-all commercial owners.
- Do not revive the legacy travel route; monitor Google’s stored URL until recrawl.
