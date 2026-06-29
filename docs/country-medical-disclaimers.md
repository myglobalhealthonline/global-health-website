# Country medical disclaimers

Per-country **short** + **full** medical/legal disclaimers, edited in the admin
portal and rendered across the public site.

## Where it's edited

Admin → Countries → *(country)* → **Legal profile** → **Medical Disclaimer**
section. **One tab per language** (the country's enabled `CountryLocale`s plus
the default), each with *Short disclaimer* + *Full disclaimer*.

Storage (mirrors `ServiceTranslation`):
- `CountryLegalProfile.shortDisclaimer` / `.fullDisclaimer` — the **default-locale**
  copy + fallback.
- `CountryDisclaimerTranslation` (`@@unique([legalProfileId, locale])`) — one row
  per non-default locale; each field falls back to the base column when blank.
  An admin clearing both fields of a locale removes its row.

Plain text, paragraphs separated by a blank line. Exposed publicly via
`GET /api/countries/:code/legal` (profile carries `disclaimerTranslations`); the
`getCountryDisclaimer(code, locale)` helper resolves translation → base with
field-level fallback. All render sites pass the route `lang`.

## Where it renders

| Version | Location | File |
|---|---|---|
| Short | Service detail pages — between FAQ and booking CTA | `app/(site)/[country]/[lang]/services/[serviceSlug]/page.tsx` |
| Short | GP appointment listing | `app/(site)/[country]/[lang]/general-consultation/page.tsx` |
| Short | Doctor profile pages — lead line + "read full" link | `lib/content/doctor-profile-page.tsx` |
| Short | Booking flow — consent checkbox before payment | **TODO (before launch)** — not yet wired |
| Full | Standalone `/[country]/[lang]/legal/medical-disclaimer` | `app/(site)/[country]/[lang]/legal/[type]/page.tsx` |
| Full | Footer → legal links | `components/layout/SiteFooter.tsx` |

The standalone legal page prefers a published `CountryLegalDocument` of type
`MEDICAL_DISCLAIMER` when one exists (Ireland's richer HTML), and otherwise
falls back to `CountryLegalProfile.fullDisclaimer`.

All render sites fall back to existing copy when the field is null, so unseeded
countries/locales never break.

## Seeding

`backend/scripts/seed-country-disclaimers.ts` (idempotent, prod-guarded):

```
pnpm --filter backend exec node --import tsx scripts/seed-country-disclaimers.ts
```

Requires migration `20260630130000_country_disclaimers` applied first.

## ⚠️ Before public launch

1. **Legal / clinical sign-off required.** The Ireland copy is verbatim from the
   clinical brief. The other five markets were **drafted from regulatory
   research** (sources below) and must be reviewed by qualified
   legal/clinical staff per market before going live.
2. **Native-language translation.** All six are stored as English baselines
   (matching the Ireland sample). Portugal/Brazil → Portuguese, Spain → Spanish,
   Czechia → Czech, Romania → Romanian should be translated before public use.

## Per-country research basis (load-bearing facts)

### Ireland (`ie`)
Verbatim from the clinical brief. GP level; sick-leave certs not accepted by the
**Department of Social Protection**; emergency 112/999.

### Portugal (`pt`)
- Level: Clínica Geral / Medicina Geral e Familiar. Regulators: Ordem dos Médicos
  (doctors), ERS (provider).
- Sick leave: **CIT (baixa médica)** paid by **Segurança Social**. Since
  **1 Mar 2024** (Portaria n.º 11/2024) private/online doctors *can* issue a
  valid CIT through the official electronic system; a plain private certificate
  is **not** a CIT and gives no sickness benefit.
- Non-emergency: **SNS 24 — 808 24 24 24** (NOT 1414). Emergency 112.
- ⚠️ MEDIUM confidence: "30-day retroactive CIT" limit — verify vs primary
  legislation before stating a hard backdating rule.

### Spain (`es`)
- Level: Medicina de Familia; mandatory colegiación (OMC/CGCOM).
- Sick leave: official **parte de baja (Incapacidad Temporal)** can **only** be
  issued by the public health service or the Mutua — a private/online report is
  **not** valid for INSS/Seguridad Social. (Load-bearing.)
- No single national non-emergency line (region-dependent). Emergency 112.

### Czechia (`cz`)
- Level: praktický lékař. Regulator: Česká lékařská komora (ČLK); register NRPZS.
- Sick leave: **eNeschopenka** via **ČSSZ** — may only be issued by the attending
  physician who personally examined and is treating the patient; not on request
  alone (Act 187/2006 §57 + MoH guidance).
- Controlled substances ("modrý pruh") are paper-only, not via eRecept.
- Info line 1221; emergency 155 (medical) / 112.

### Romania (`ro`)
- Level: medic de familie. Regulator: Colegiul Medicilor din România (CMR).
  Telemedicine: Law 95/2006 + OUG 196/2020 + HG 1133/2022.
- Sick leave: **concediu medical** via **CNAS** — requires objective clinical
  evaluation by a CAS-contracted treating physician, not on request alone
  (CNAS Informare 27 Jun 2025).
- Emergency 112.
- ⚠️ The CNAS 27 Jun 2025 source returns HTTP 403 to automated fetch — confirm
  verbatim wording before publishing.

### Brazil (`br`) — NOT EU
- Level: Clínico Geral. Regulators: CFM + state CRM. Telemedicine: Lei
  14.510/2022 + Resolução CFM 2.314/2022.
- Atestado: telemedicine atestado valid for **employer** absence; **INSS**
  benefit (benefício por incapacidade temporária / auxílio-doença) is separate
  and needs its own assessment (AtestMed documentary review or perícia médica)
  for incapacity beyond 15 days.
- Controlled substances (Portaria 344/1998) not on a first teleconsultation.
- Emergency **SAMU 192**. Data-protection law: **LGPD** (not GDPR).
- ⚠️ CFM primary PDFs (sistemas.cfm.org.br) refused direct fetch; corroborated
  via CFM search snippets + mirror CRM sites.
