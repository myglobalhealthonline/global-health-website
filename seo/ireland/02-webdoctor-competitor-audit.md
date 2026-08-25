# WebDoctor.ie competitor audit

**Observed:** 2026-08-25
**Method:** public robots/sitemaps/navigation, a complete 282-URL sitemap inventory, and a bounded 20-page deep template sample, followed by Ireland OpenSEO domain, keyword, SERP and backlink calls.

`webdoctor-page-inventory.csv` contains every URL exposed by the three public XML sitemaps. The 20 deep-sample rows contain page-level template observations; the remaining sitemap-discovery rows are explicitly labelled and leave uncollected titles, copy, link and URL-level OpenSEO metrics blank. This separates breadth of discovery from depth of analysis and avoids presenting inferred metrics as facts.

## Competitor snapshot

- OpenSEO estimated organic traffic: 80,967.
- OpenSEO organic keyword count: 3,036.
- Filtered domain-scope backlink summary: 182 backlinks from 117 referring domains, rank 19, target spam score 2.
- Trend data, which includes subdomains, showed 2,535 backlinks and 927 referring domains in July 2026. This broader trend is not directly comparable to the filtered domain snapshot.
- Yoast sitemap inventory: 113 posts, 123 pages and 46 PPC pages, 282 URLs total.
- OpenSEO live SERPs placed WebDoctor:
  - #1 for `online doctor ireland`
  - #1 for `home blood test ireland`
  - #1 for `online mental health consultation`
  - #2 for `online weight management ireland`
  - outside the sampled top ten for `sick cert online`

## Biggest lesson

WebDoctor combines commercial treatment hubs with supporting condition content, visible safety limitations and repeated trust proof. Its advantage is not a hidden technical trick. It has much greater organic breadth and a materially stronger referring-domain profile.

## Best realistic opportunity

Protect and improve existing striking-distance pages instead of copying WebDoctor's breadth. Sick-certificate content, Ireland tools and selected service pages already have first-party impressions. The lab hub is commercially relevant but must wait for the dated index-ramp gate.

| Area | Competitor pattern | Evidence | Opportunity |
| --- | --- | --- | --- |
| Architecture | Commercial hubs surrounded by support articles | HTML sitemap and clusters for contraception, asthma, ED, cystitis and travel | Build only support content tied to a verified service and one canonical money page |
| Trust | Registration, named clinicians, prices and social proof near conversion content | Homepage, About and service samples | Surface only verified Global Health clinicians/governance; do not invent proof |
| Safety | Eligibility, exclusions and in-person escalation are part of the selling page | GP, prescription and contraception samples | Keep cautious scope and escalation prominent on target service pages |
| Conversion | Action-and-price CTAs repeated after decision sections | “Book Now”, “Request Prescription – €25”, test-kit CTA | Preserve clear target CTAs but never add stale prices or guarantees |
| Editorial | Article metadata, tables, FAQs, sources and aligned service CTA | Obesity article sample | Use official Irish sources and clinician review; avoid volume-driven generic articles |
| Crawl discovery | Megamenu, footer popular searches and HTML sitemap | Live navigation and `/site-map/` | Improve contextual hub-to-spoke links, not sitewide links to every service |
| PPC | Separate campaign post type is indexable | 46 PPC sitemap URLs; acne sample index/follow/self-canonical | Do not imitate; it creates duplication/cannibalisation risk |
| Schema | Broad generic schema plus repeated AggregateRating | Five core templates sampled | Target already has stronger medical/service models; accuracy matters more than quantity |
| Authority | Large referring-domain advantage | 117 vs 36 filtered domain-scope referring domains | Original data, tools and clinician commentary are the main growth lever |

## Information architecture

Primary branches observed:

1. Online consultations: general GP, gendered GP options, language-specific consultations, dermatology, weight management, menopause, mental health and dietetics.
2. Prescription treatment categories: women's health, men's health, general health, skin, weight, allergies, travel, sexual health and hair.
3. Home test kits.
4. Dublin physical clinic.
5. Healthcare plans and corporate care.
6. About, help, patient guide, policies and Health HQ.
7. HTML sitemap and footer “popular searches”.

The target should not mirror service families it does not provide. Physical-location structure applies only to a genuine clinic. Prescription clusters remain excluded from the target plan under the current business constraint.

## Template observations

### Commercial pages

The homepage and GP pages lead with availability, action, pricing and trust. Detailed pages cover what is included, who is eligible, remote-care limits, next steps and FAQs. Adjacent service links appear near the hero and after educational sections.

### Treatment pages

The contraception sample combines request flow, measurement requirements, included/excluded products, interactions, side effects and urgent safety content. This is effective intent coverage but is clinically sensitive and cannot be copied.

### Editorial

Health HQ supplies category discovery and reading-time cues. The representative obesity article includes a date, medical-team byline, table, FAQs, citations and an aligned consultation CTA. The generic acne promotion on the Health HQ listing is sometimes contextually mismatched.

### Trust

About names clinicians and registration numbers and displays media/accreditation proof. Observed public content has governance drift: pricing differs between homepage/About/acquisition surfaces, and the Patient Guide's Medical Director name differs from About. This is a competitor weakness and a warning to keep target claims centrally maintained.

## SERP interpretation

- `online doctor ireland`: commercial providers dominate; AI Overview and People Also Ask are present. A commercial page is appropriate, but the authority bar is high.
- `sick cert online`: dedicated service pages dominate. WebDoctor was not in the sampled top ten, so a specific target service page has a plausible path.
- `home blood test ireland`: commercial hubs/providers dominate, with HSE guidance also present. The target hub fits the SERP, but supplier/product accuracy is essential.
- `online mental health consultation`: mixed commercial, therapy, insurer, charity and HSE results. The target GP-assessment page must state its exact scope.
- `online weight management ireland`: commercial clinics/pharmacies dominate with HSE guidance. Medication wording raises regulatory and clinical risk.

## Backlink findings

The strongest legitimate observed examples are Irish Times health coverage, Dublin City FM interviews, Irish business coverage and genuine pharmacy/benefit partnerships. The sample also contains job profiles, review aggregators, mirrors and obvious SEO directories. Those are excluded or deprioritised.

No qualifying broken competitor link was established. “Broken-link replacement” remains a future evidence task, not a claimed opportunity.

## What to avoid copying

- WebDoctor copy, claims, prices, clinician data, review numbers or awards.
- Indexed PPC-page proliferation.
- Medication-first landing pages without verified service/regulatory approval.
- Fake county/city pages.
- Generic AggregateRating markup.
- Broad “popular searches” links that are not genuinely useful.
