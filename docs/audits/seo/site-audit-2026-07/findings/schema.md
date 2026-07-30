# Schema.org / Structured Data Audit — myglobalhealth.online

Fetched via `render_page.py` (raw + `--mode always` for legal pages). Pages checked:
homepage, `/ireland/en`, `/ireland/en/gp-consultation-online` (service), `/ireland/en/doctors/dr-tiago-miguel-figueira`,
`/about`, `/ireland/en/legal/medical-disclaimer` + `/ireland/en/legal/privacy-policy` (legal),
`/ireland/en/blog/diabetes-a-silent-disease` (blog post).

**Score: 78/100**

## What works

- All JSON-LD (no Microdata/RDFa found anywhere). `@context: https://schema.org` (https, correct) on every block.
- Sitewide `MedicalOrganization` block (name, legalName, foundingDate, sameAs incl. medical-council/regulator links, `contactPoint`, `address`, `identifier` for CRO/IČO/NRPZS company registrations) — present and identical on every page checked. Good E-E-A-T signal.
- `BreadcrumbList`: correct on `/ireland/en`, the service page, the doctor page, `/about`, and the blog post — absolute URLs, sequential `position`, matches visible breadcrumb.
- `Physician` (doctor page + blog author/reviewer): `jobTitle`, `image`, `knowsLanguage`, `identifier` (IMC number), `hasCredential` → `EducationalOccupationalCredential.recognizedBy`, `memberOf`, `worksFor` — this is a strong, correctly-modelled medical-credential graph, exactly what Google's YMYL/E-E-A-T guidance wants for telehealth.
- Service page: `Service` + `MedicalProcedure` + `ReserveAction` + 16 `Offer`s, each with `price`, `priceCurrency`, `availability`, `eligibleDuration` — valid Offer required properties present.
- Blog post: `Article` with `author` AND `reviewedBy` both typed `Physician` (medical-review pattern), `datePublished`/`dateModified`/`lastReviewed` all ISO 8601.
- No deprecated types found (no HowTo, no SpecialAnnouncement, no CourseInfo/EstimatedSalary/LearningVideo).
- No placeholder text, no relative URLs, no `http://schema.org`.

## Findings by severity

### Critical
None.

### High
1. **Legal pages missing the BreadcrumbList the recent commit claims to add.** Checked `/ireland/en/legal/medical-disclaimer` and `/ireland/en/legal/privacy-policy` both raw and with `--mode always` (forced Playwright render) — both return only the sitewide `MedicalOrganization`+`WebSite` block, no `BreadcrumbList`. Commit `6a756ff1` ("fix(seo): legal-page BreadcrumbList + re-audit patch scripts") is present in the git log but the live site doesn't reflect it — either unpushed/undeployed, or scoped to a legal-page type this deployment doesn't hit. Verify deploy status before assuming this is shipped.

### Medium
2. **Article missing `publisher.logo`.** Blog post's `publisher` is `{"@type":"MedicalOrganization","name":"Global Health","url":...}` with no `logo` (`ImageObject`, ≥600px wide) — this is a required property for Google's Article rich-result eligibility. Add:
   ```json
   "publisher": {
     "@type": "MedicalOrganization",
     "name": "Global Health",
     "url": "https://www.myglobalhealth.online",
     "logo": {
       "@type": "ImageObject",
       "url": "https://www.myglobalhealth.online/logos/global-health-light.png"
     }
   }
   ```
3. **No `@id` anywhere**, so the identical `MedicalOrganization`/`WebSite` blocks repeated on every page aren't linked as the same entity graph-wide, and `Physician`/`Service`/`Article.publisher` reference the org by name only, not by `@id`. Not an error, but Google's entity resolution and your own future Knowledge Graph work benefit from `"@id": "https://www.myglobalhealth.online/#organization"` on the canonical org block and `"provider": {"@id": "..."}` elsewhere.
4. **No review/rating schema despite Doctify integration** (Doctify domains are allow-listed in CSP, so the widget is live on the site) — no `AggregateRating`/`Review` anywhere (org or doctor level). If Doctify exposes a ratings API/embed, this is a real missed opportunity; skip if Doctify's own widget already emits its own schema client-side (didn't confirm either way with static/raw fetch).

### Info (no SERP action needed, but flag)
5. **FAQPage present on `/ireland/en`, `/about`, and the service page** — per current guidance Google retired FAQ rich results for all sites (May 7 2026), so these blocks have no SERP benefit anymore. Not broken, don't rip them out reactively, but don't add more expecting a rich result — any benefit is AI/GEO-only and unconfirmed.
6. **`WebSite` has no `potentialAction` (SearchAction)** — if the site has an internal search endpoint, adding a sitelinks-searchbox action is a low-effort addition; skip if there's no real search feature to point it at.
7. **`/ireland/en` `MedicalBusiness` has no `address`/`geo`/`openingHours`** — expected, since Global Health is a virtual telehealth provider with no physical clinic per country; `MedicalBusiness`/`LocalBusiness` schema without these properties is still valid but won't be eligible for local-pack results. This is a correct choice, not a bug — flagging only so it isn't "fixed" by someone adding a fake address later.

## Missing opportunities (optional, not required)
- `MedicalWebPage` wrapper on service/condition pages (currently plain `Service`+`MedicalProcedure`, which is fine, but `MedicalWebPage` adds `medicalAudience`/`aspect` metadata Google can use for YMYL trust signals).
- `BlogPosting` instead of generic `Article` for blog posts — cosmetic, `Article` is a valid parent type and Google treats them equivalently for Article rich results, so this is not required.

## Generated fix — legal-page BreadcrumbList (in case deploy is the gap)
If item 1 turns out to be a genuine gap rather than an undeployed fix, this is the shape already used elsewhere on the site (matches the pattern from `/about` and the doctor page):
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.myglobalhealth.online/" },
    { "@type": "ListItem", "position": 2, "name": "Ireland", "item": "https://www.myglobalhealth.online/ireland/en" },
    { "@type": "ListItem", "position": 3, "name": "Legal", "item": "https://www.myglobalhealth.online/ireland/en/legal" },
    { "@type": "ListItem", "position": 4, "name": "Privacy Policy", "item": "https://www.myglobalhealth.online/ireland/en/legal/privacy-policy" }
  ]
}
```
