# Proposed Ireland site architecture

**Decision:** keep the current URL system and strengthen a small number of existing hubs. No migration or mass page creation is justified.

## Current public structure

```text
/ireland/en
├── /gp-consultation-online
├── /services/{verified-service}
├── /see-a-specialist
│   └── /services/{verified-specialist-service}
├── /lab-tests
│   └── /lab-tests/{published-test}
├── /doctors
│   └── /doctors/{verified-doctor}
├── /blog
│   └── /blog/{published-post}
├── /tools
│   └── /tools/{tool}
├── /pricing
├── /faq
└── /book
```

Internally, lab routes are implemented under `tests` and rewritten to public `lab-tests` URLs. This is intentional and must be preserved.

## Recommended hierarchy

### 1. Online GP hub

- Canonical money page: `/ireland/en/gp-consultation-online`.
- Child service pages remain distinct only where clinical intent differs.
- Supporting articles should link to the GP page when a general consultation is the appropriate next step.
- Do not create another “online doctor Ireland” page.

### 2. Sick-certificate cluster

- Money page: `/ireland/en/services/sick-certificate-ireland`.
- Support:
  - `/ireland/en/blog/sick-certificate-ireland-employee-rights`
  - `/ireland/en/blog/illness-benefit-ireland-how-to-claim`
- Legacy paths keep their existing one-hop redirects.
- Article and service intent must remain distinct.

### 3. Mental-health cluster

- GP assessment: `/ireland/en/services/mental-health-consultation`.
- Specialist psychiatry: `/ireland/en/services/psychiatry-specialist-consultation`.
- Keep them separate. Use query-by-page evidence to prevent cannibalisation.
- Any support content requires Irish sources, crisis/escalation wording and clinical review.

### 4. Home-test cluster

- Hub: `/ireland/en/lab-tests`.
- Children: only published runtime catalogue pages.
- Supporting guide links to the hub only when the guide answers a distinct informational need.
- No structural or copy changes before the approximately 2026-09-08 ledger gate.

### 5. Weight cluster

- Money page: `/ireland/en/services/weight-management-consultation`.
- Linkable support: existing BMI/calorie tools where clinically appropriate.
- Medication-specific content is gated for prescribing-clinician and regulatory review.

### 6. Trust cluster

- `/ireland/en/doctors` and verified doctor pages.
- Existing company, privacy, security, clinical governance and editorial-policy pages.
- Never create a clinician/location entity from keyword demand alone.

## Navigation

Keep the main navigation focused on care discovery:

- See a doctor
- See a specialist
- Lab tests
- Doctors
- Pricing
- Patient guides/help

Tools and editorial content should be discoverable through contextual links and their hubs, not a bloated megamenu.

## Footer

Retain trust/help/legal links and a small set of genuine high-value pathways. Do not emulate WebDoctor's keyword-heavy footer unless user research shows it improves navigation.

## Link flows

```text
Officially sourced guide
        ↓ contextual need
Verified commercial service ← related service → sibling service
        ↓ decision support
Verified doctor / safety / FAQ
        ↓
Generic booking route
```

- Hubs link to live children.
- Children link to the parent and only relevant siblings.
- Guides link to one appropriate service using descriptive, non-guaranteeing anchors.
- Services link back to relevant official guidance where useful.
- Avoid sitewide exact-match anchors and links to every treatment.

## Disposition

| Action | URLs |
| --- | --- |
| Keep | All current canonical Ireland market, service, doctor, blog, tool and lab URLs |
| Improve after evidence gate | GP, sick-cert cluster, mental-health/psychiatry distinction, selected tools |
| Freeze | Ireland lab cluster until approximately 2026-09-08 |
| Consolidate | None newly proven |
| Redirect | No new redirects; preserve existing legacy map |
| Create | No net-new public page approved in this batch |
| Noindex | Existing fallback/private rules only; no new noindex |
| Clinical approval | Every substantive medical copy change and all content briefs |
