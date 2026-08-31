# Proposed Portugal site architecture

Decision date: 2026-08-31. Principle: retain and strengthen real, staffed URLs; do not manufacture keyword or city pages.

## Existing architecture

The canonical market route is `/portugal/pt`, with service detail pages under `/portugal/pt/services/[serviceSlug]`, clinician profiles under the Portugal doctor route, content/resources, health tools and a separate booking flow. The backend supplies localized page, service and clinician content.

The production read showed 23 active public services. The current sitemap, canonical/hreflang and schema systems are centralized in the existing Next.js architecture. Those systems should remain the source of truth.

## Recommended hub-and-spoke model

```text
/portugal/pt                                  Market / online-doctor hub
├── /services/consulta-medica                General online consultation
├── /services/medicina-geral-e-familiar      Primary-care spoke
├── specialist family
│   ├── /services/consulta-cardiologia
│   ├── /services/consulta-de-oncologia
│   ├── /services/consulta-de-pediatria
│   ├── /services/pediatria-geral
│   ├── /services/consulta-de-psicologia
│   ├── /services/consulta-de-psiquiatria
│   └── /services/consulta-dermatologia
├── documents and clinical administration
│   ├── /services/baixa-medica
│   ├── /services/certificados-medicos
│   ├── /services/certificado-medico-carta-de-conducao
│   ├── /services/renovacao-de-tratamento
│   └── /services/consulta-de-referenciacao
├── focused care
│   ├── /services/consulta-do-viajante
│   ├── /services/consulta-queda-de-cabelo
│   ├── /services/deixar-de-fumar
│   ├── /services/gestao-da-dor
│   ├── /services/perda-de-peso
│   ├── /services/saude-da-mulher
│   ├── /services/saude-do-homem
│   ├── /services/saude-mental
│   └── /services/segunda-opiniao-medica
├── /doctors/...                             Verified clinician profiles
└── /tools/blood-pressure-chart              Existing supporting tool
```

The two pediatrics URLs need a content/intent review before consolidation: one is a specialist consultation and one is a general pediatrics product. Do not redirect either until production copy, bookings, assignments, links and GSC ownership prove duplication.

## URL dispositions

| Disposition | Count | Decision |
|---|---:|---|
| Retain | 23 active service URLs + market hub + existing tool | All represent current architecture or supplied services. |
| Improve | Existing P0/P1 cluster owners | Use the content briefs; verify clinical facts and live CMS values first. |
| Consolidate | 0 approved | Pediatrics is a review candidate, not an approved merge. |
| Redirect | 0 | No fresh evidence supports a new redirect. |
| Create | 0 | The existing pages cover all approved clusters. |
| New location pages | 0 | No evidence supports unique city intent/content without implying a clinic. |
| Noindex changes | 0 | Pedro Santos is a Google recrawl watch item, not a live meta-robots defect. |
| Clinical review | 24 page/file gates | Every brief is blocked pending the named clinical/compliance/content review; certificates, leave, prescribing and specialist claims carry the highest controls. |

## Navigation

Primary Portugal navigation should expose:

1. Consultas online (market/general hub).
2. Medicina Geral e Familiar.
3. Especialidades—only active staffed specialties.
4. Serviços clínicos—documents, referral and focused care grouped in plain pt-PT.
5. Médicos—verified clinician directory.
6. Como funciona / segurança / privacidade.
7. Booking CTA supplied by localized content.

Do not surface inactive database services. Do not infer physical clinics or “near me” coverage from online availability.

## Footer

Keep the footer compact and evidence-led:

- market hub;
- general consultation;
- active service families, not all 23 as an unstructured keyword block;
- doctors;
- about/trust/privacy/terms;
- emergency limitation;
- country/language selector.

A service-family link index can improve crawl paths, but every label must be human-readable and every destination active.

## Internal-link rules

- Market hub → each active service family and priority service using the real service name.
- Service pages → booking, assigned clinician profiles, relevant parent hub, and at most two genuinely adjacent services.
- Clinician profiles → only services currently assigned to that clinician/country link.
- Patient-information content → one primary service owner plus official sources; avoid linking every keyword variant.
- Blood-pressure tool → cardiology and general consultation only where the copy explains when to seek care.
- Prescription, certificate and leave content → official Portuguese sources and explicit non-guarantee language.

Do not link to inactive service pages merely because keyword volume exists. Do not create exact-match anchors at scale.

## Cannibalisation watchlist

- `consulta-medica` vs `medicina-geral-e-familiar`: define broad episodic consultation versus continuity/primary-care intent.
- `consulta-de-pediatria` vs `pediatria-geral`: audit visible scope, clinician assignment and GSC query ownership.
- `saude-mental` vs psychology vs psychiatry: hub must route; specialist pages must own their discipline intent.
- `certificados-medicos` vs driving certificate vs sick leave: generic parent and explicit document spokes; do not duplicate full copy.
- Portugal `pt` vs other locale pages ranking for Portuguese certificate terms: monitor hreflang/canonical and internal language ownership.

## Publication gate

Any CMS copy change requires verified service scope, current price/availability source, clinician/compliance approval where flagged, locale QA, canonical/hreflang/schema QA, and a recorded before/after measurement window.
