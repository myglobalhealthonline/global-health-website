# Sick cert online Ireland: content refresh brief

Date: 2026-08-23  
Target: `/ireland/en/blog/sick-certificate-ireland-employee-rights`  
Decision: improve the existing article and keep its slug and canonical URL.

## Outcome

Reposition the existing employee-rights article around the commercial and
informational intent behind `sick cert online Ireland`. The page should answer
the online-assessment and employer-acceptance questions immediately, then earn
trust with the statutory-pay, Illness Benefit, privacy and dispute detail that
thin service pages omit.

Do not create another English article for this query. The existing page already
has search authority, clinical authorship, a cover asset and internal links. A
new URL would split relevance between the article and the sick-certificate
service page.

## First-party evidence used

Live Google OAuth refresh failed on 2026-08-23 because the stored GSC/GA4 grant
has expired or been revoked. This brief therefore uses the latest saved
first-party exports and records their different scopes instead of combining
them into one misleading total.

| Source and window | Signal | Interpretation |
|---|---:|---|
| Saved OpenSEO/GSC topic view, 2026-08-19 | `sick cert online`: 73 impressions, average position 34 | Google already associates the site with the exact transactional query, but the ranking needs stronger intent alignment. |
| Earlier saved GSC baseline, 2026-07-06 to 2026-07-31 | 33 impressions, 1 click, 3.03% CTR, average position 39.8 | Small baseline, directionally consistent with the later query view. |
| Saved GA4 sample, 2026-07-25 to 2026-07-28 | 2 organic sessions, 5 pageviews, 100% engagement | Encouraging behavior, but far too small to prove lead generation. |
| Page-level GSC view, 90 days to 2026-08-06 | 1,407 impressions, 11 clicks, average position 14.7 | The URL already has page authority beyond the exact target query. |
| Editorial-plan view, 90 days to 2026-08-19 | 2,020 impressions | The article is one of two posts responsible for 42% of blog impressions. |

Saved keyword estimate: `sick cert online`, volume 880, KD 0. Treat volume and
difficulty as planning estimates, not first-party traffic.

## Search intent

Primary intent: commercial investigation and transaction.  
Secondary intent: employment rules and legal reassurance.

The reader usually wants to know:

1. Can a doctor assess me and issue a sick cert online?
2. Will my employer accept it?
3. How quickly can I get an appointment?
4. What am I paying for, and is the cert guaranteed?
5. Is the doctor registered with the Irish Medical Council?
6. Can the cert be backdated?
7. Is this the same certificate used for Illness Benefit?

## Keyword and entity targets

Primary: `sick cert online Ireland`

Secondary:

- sick cert online
- sick certificate online Ireland
- sick note online Ireland
- online GP sick cert
- medical certificate online Ireland
- doctor's note online Ireland
- sick cert for work Ireland

Entities and concepts:

- Sick Leave Act 2022
- Workplace Relations Commission
- Irish Medical Council
- statutory sick pay
- Illness Benefit
- Certificate of Incapacity for Work
- Department of Social Protection
- occupational health

## SEO package

- SEO title: `Sick Cert Online Ireland: What You Need to Know`
- H1/page title: `How to Get a Sick Cert Online in Ireland`
- Meta description: `Need a sick cert online in Ireland? Learn how the appointment works, what your employer may require, and when you need an in-person assessment.`
- Canonical: unchanged
- Slug: unchanged
- Search template: how-to guide with a decision-guide layer

## Content structure

1. Direct answer and a practical appointment checklist
2. Employer acceptance and a short refusal workflow
3. Statutory sick pay and the distinction from Illness Benefit
4. Clinical limits, backdating and urgent-care guidance
5. Four focused FAQs, including privacy

The page template owns the H1, cover, author/reviewer metadata and hero. The
article body should use the same designed article system as the live blood-tests
guide: editorial lead panel, sticky section navigation, alternating ivory and
forest sections, branded checklists and alerts, two-column FAQ treatment and a
closing disclaimer. Keep the visible body between roughly 1,000 and 1,300 words.
Reuse the established design CSS and component classes rather than introducing
a second visual system.

## Information gain

The article must add more than generic sick-pay copy:

- A clear two-route decision for employer certification versus Illness Benefit
- An explicit statement that payment buys assessment, not a guaranteed document
- A concise sequence for responding to a refused cert or pay decision
- Clinician-led limits on remote certification and backdating
- A plain-language explanation of verification without disclosure of clinical notes
- Dynamic price language so the article cannot repeat the stale €39 defect

## Internal links

From the article:

- `/ireland/en/services/sick-certificate-ireland`, service CTA
- `/ireland/en/blog/illness-benefit-ireland-how-to-claim`, claim process
- `/ireland/en/blog/when-to-see-a-gp-online-vs-in-person`, clinical suitability

Recommended inbound links after publication:

- Sick-cert service page: `employee sick-leave rights and employer rules`
- Illness Benefit article: `employer sick cert versus Illness Benefit certification`
- Online versus in-person article: `how online sick certificates work`
- Ireland GP page: `when you need a sick cert for work`

## Conversion and measurement

Use one prominent service CTA in the designed article lead. The shared page
template already provides the final service CTA, so do not add more sales panels
inside the content sections.

Do not hardcode price or promise availability. The service page owns current
fee, duration and appointment inventory.

Future analytics should include `article_slug`, CTA position, CTA label and
target service, then connect that event to booking start and booking completion.
The current GA4 evidence cannot establish lead generation without this
attribution.

## Source matrix

| Claim area | Preferred source |
|---|---|
| Five days, 13 weeks, 70% capped at €110, certification and WRC remedy | [Workplace Relations Commission sick-leave guidance](https://www.workplacerelations.ie/en/what_you_should_know/leave/sick-leave/) |
| Statutory wording | [Sick Leave Act 2022](https://www.irishstatutebook.ie/eli/2022/act/24/enacted/en/html) |
| Five-day entitlement retained | [Department of Enterprise, Trade and Employment, April 2025](https://enterprise.gov.ie/en/news-and-events/department-news/2025/april/20250414.html) |
| Illness Benefit certification and application | [Department of Social Protection Illness Benefit guidance](https://www.gov.ie/en/service/ddf6e3-illness-benefit/) |
| Registration number on professional documents | [Medical Practitioners Act 2007, section 43](https://www.irishstatutebook.ie/eli/2007/act/25/section/43/enacted/en/html) |
| Remote consultation professional standard | Medical Council Guide to Professional Conduct and Ethics, 9th edition, paragraph 37 |
| Minimum necessary occupational-health data | [Data Protection Commission case guidance](https://dataprotection.ie/en/dpc-guidance/case-studies/disclosure-unauthorised-disclosure/processing-occupational-health-data) |

## Review and publication gates

- Preserve the existing real author and linked clinical reviewer.
- Do not update `lastReviewedAt` until the reviewer approves this exact copy.
- Reviewer should specifically check remote-cert validity, employer refusal,
  retrospective certification, mental-health examples and urgent-care wording.
- Preserve `ctaServiceId`, author/reviewer IDs and country rows. Replace the
  stale text-baked cover with the approved text-free asset only after that
  asset has shipped with the frontend.
- Keep translated bodies unchanged until each locale receives clinical and legal
  localization review.
- Refresh GSC and GA4 after OAuth reauthorization, then record a clean pre-update
  baseline and evaluate at 30 and 90 days.
