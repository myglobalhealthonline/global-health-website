# On-Page SEO — myglobalhealth.online

Basis: 500 pages crawled from the sitemap, raw served HTML.

## Per-page-type scorecard

| Page type | Pages | No `<title>` | Title > 60 chars | Median words | Has hreflang | Has FAQPage |
|---|---|---|---|---|---|---|
| services | 144 | 0 | 93 | 1,901 | 144 | 123 |
| doctors | 69 | **18** | 17 | 1,176 | 51 | 69 |
| health | 45 | 0 | 21 | **351** | 45 | 2 |
| blog | 38 | 0 | 38 | 355¹ | 38 | 0 |
| book | 33 | 0 | 0 | 892 | 33 | 0 |
| pricing | 33 | 0 | 1 | 455 | 33 | 0 |
| country-home | 33 | 0 | 32 | 2,172 | 33 | 33 |
| legal | 32 | **21** | 0 | 2,701 | 11 | 0 |
| gp-consultation-online | 28 | 0 | 5 | 1,129 | 28 | 28 |
| see-a-specialist | 24 | 0 | 13 | 1,251 | 24 | 24 |
| lab-tests | 14 | 0 | 11 | 775 | 14 | 12 |
| global (root-level) | 6 | 0 | 1 | 547 | **0** | 2 |
| root `/` | 1 | 0 | 0 | **114** | **0** | 0 |

¹ The blog median is dragged down by the per-country blog *index* pages
(230–430 words). Actual blog **articles** run 2,385 / 2,565 / 2,991 / 2,996 /
3,846 words — substantial. The index pages are the thin ones.

## Title tags

| Metric | Count | % of 500 |
|---|---|---|
| Missing entirely | 39 | 7.8% |
| Under 30 chars | 0 | 0% |
| Over 60 chars (truncation likely) | 232 | 46.4% |
| Over 70 chars (truncation near-certain) | 99 | 19.8% |
| Duplicate titles | 6 pages in 3 groups | 1.2% |

**Over-length is the dominant on-page defect.** 232 pages will have their titles
cut in the SERP. The cause is a consistent template that appends both a
qualifier and the brand:

```
91  Online Specialist Consultation Ireland | Cardiology, Neurology, Paediatrics | Global Health
89  Dr. Leandro Wang — Flebología y Medicina General | CGCOM 464628929 | Global Health España
87  Sick Certificate Ireland: Employee Rights & Statutory Sick Pay 2026 · Global Health
87  Médico Online Portugal | Médicos de Cabecera y Especialistas Colegiados | Global Health
85  Médico Online España | Médicos de Cabecera y Especialistas Colegiados | Global Health
77  Online Doctors Ireland | IMC-Registered GPs & Specialists · Global Health
```

Note the pattern: the *keyword-bearing* part is at the front (good), and what
gets truncated is the differentiator and the brand. On the country-home pages —
32 of 33 are over 60 — the truncated tail is exactly the trust signal
("IMC-Registered", "Colegiados", "ČLK Registered") that would earn the click.

**Fix:** drop `| Global Health` / `· Global Health` from the template on any page
whose title already exceeds ~48 characters (Google appends the site name from
`WebSite` schema anyway, which is already present on all 500 pages), and shorten
the middle qualifier. Target ≤ 60 characters / ~575px.

Also note the two title-template separators in use — `|` and `·` — are mixed
inconsistently across page types. Cosmetic, but pick one.

### Duplicate titles (3 groups, 6 pages)

```
"Specialist Consultation in Portugal | Global Health"
  /portugal/en/see-a-specialist  +1 other

"Men's Health Online | Romania | Confidential English Doctor"
  /romania/en/services/controlul-greutatii  +1 other
  ^ note: slug means "weight control" but the title says "Men's Health" — wrong title mapped to the page

"HAND, FOOT AND MOUTH DISEASE: SIGNS AND TREATMENT · Global Health"
  /ireland/en/blog/hand-foot-and-mouth-disease-signs-and-treatment
  /portugal/en/blog/hand-foot-and-mouth-disease-signs-and-treatment
  ^ same article syndicated to two countries with an identical title
```

The Romanian one is a genuine content bug, not just a duplicate. The blog one
indicates cross-country article syndication with no country differentiation in
the title.

Separately: blog article titles are set in **ALL CAPS** (`HAND, FOOT AND MOUTH
DISEASE: SIGNS AND TREATMENT`). Google frequently rewrites all-caps titles, and
they read as low-quality in a YMYL SERP. Convert to sentence case.

## Meta descriptions

| Metric | Count |
|---|---|
| Missing entirely | 39 (the same legal + doctor routes) |
| Under 70 chars | 0 |
| Over 160 chars | 0 |
| Duplicated | 55 pages across 12 groups |

Length discipline is excellent — every present description sits in the 70–160
band. The only issue is duplication, concentrated on hub pages:

```
[7 pages] "Evidence-based guides written and reviewed by our medical team. No ads, no fluff."
[6 pages] "Guías basadas en evidencia escritas y revisadas por nuestro equipo médico. …"
[6 pages] "Guias baseados em evidências escritos e revistos pela nossa equipa médica. …"
[5 pages] "Consulte hoy con un médico colegiado por videollamada — consultas de medicina general, cert…"
[5 pages] "Příručky založené na důkazech, které napsal a zkontroloval náš lékařský tým. …"
[5 pages] "Ghiduri bazate pe dovezi, scrise și revizuite de echipa noastră medicală. …"
```

These are the per-country blog hubs sharing one description per language. Add the
country name — the fix is a one-line template change and it makes six SERP
listings distinct instead of identical.

## Headings

| Check | Result |
|---|---|
| Pages with no `<h1>` | **0** ✓ |
| Pages with multiple `<h1>` | 5 |
| Median `<h2>` per page | healthy across all types |

Multiple-H1 pages, all blog articles:

```
/ireland/en/blog/diabetes-a-silent-disease
/ireland/en/blog/when-to-see-a-gp-online-vs-in-person
/ireland/en/blog/sick-certificate-ireland-employee-rights
/ireland/en/blog/hand-foot-and-mouth-disease-signs-and-treatment
/portugal/en/blog/hand-foot-and-mouth-disease-signs-and-treatment
```

Low severity (Google handles multiple H1s), but the blog article template is
emitting one more than it should — likely the page title and the article title
both rendering as `h1`.

## Open Graph / social

| Tag | Missing |
|---|---|
| `og:title` | 39 |
| `og:image` | 39 |
| `twitter:card` | 39 |

Present on the other 461. `og:locale` is emitted per page with values like
`en_IE`, `pt_PT`, `es_PT`, `cs_PT`, `ro_PT`, `de_PT`. The `xx_PT` forms are
structurally valid (language in a region) and correctly describe "Czech-language
content for the Portugal market", so this is defensible; just be aware Facebook's
supported-locale list will not recognise all of them and will fall back.

## Images

| Metric | Value |
|---|---|
| Total `<img>` elements across 500 pages | 6,186 |
| Missing `alt` attribute | **0** ✓ |
| Empty `alt=""` (decorative) | 408 (6.6%) |

This is a genuinely excellent result and rare at this scale — every image carries
an `alt` attribute. The 408 empty ones are the correct treatment for decorative
imagery. Images are served through `next/image` with responsive `srcset` and
WebP, and hero images are `rel=preload`ed. No action required.

## Internal linking

| Metric | Value |
|---|---|
| Median internal links per page | 53 |
| Minimum | 6 (the root entry gate) |
| Maximum | 128 |
| Pages with fewer than 20 internal links | 1 (the root gate) |

Internal linking within each country silo is strong. The weakness is entirely at
the root: the entry gate passes equity through 6 anchors, and there is no
cross-silo linking, so authority earned by (say) an Irish blog article cannot
flow to the Spanish equivalent.
