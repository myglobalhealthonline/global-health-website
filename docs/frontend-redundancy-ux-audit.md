# Frontend Redundancy & UX Audit

## Executive Summary

The frontend has a serious template-overuse problem. Many public pages are technically different routes, but they reuse the same hero rhythm, green trust sections, CTA banners, FAQ blocks, card grids, and generic "licensed clinicians / secure consultations / patient-first support" messaging. The result is a site that feels larger than its actual content depth.

Biggest UX problems:

- Country home pages, consultation listing pages, service detail pages, and static marketing pages share the same section logic too often, so the user cannot quickly tell what makes each page unique.
- Repeated CTA banners appear after many sections and reduce decision clarity. The main action is obvious, but the repetition makes the experience feel heavy and sales-driven.
- Trust signals are overused. "Licensed doctors", "secure", "confidential", "available across Europe", and "trusted by thousands" appear repeatedly without enough page-specific evidence.
- Long listing pages combine destination cards, ratings, quote blocks, pricing, how-it-works, trust, FAQ, and final CTA in a predictable order, creating scroll fatigue.
- Dynamic service pages and fallback content create thin, generic pages that look public-ready while carrying placeholder-like substance.

Biggest redundancy problems:

- `HeroSection`, `BookingCTA`, `TrustSignals`, `HowItWorks`, `FAQSection`, `TrustBar`, `SocialProof`, and `CountryLinks` are reused as full-section defaults instead of context-specific variants.
- `StaticMarketingTemplate`, `ServiceDetailTemplate`, `ConsultationListingTemplate`, and `CountryHomeTemplate` create page families where only the title and a few labels change.
- Legal aliases, service aliases, dynamic blog routes, category pages, and country-swapped pages create duplicate intent and duplicate structure.
- Blog post content is slug-driven and thin because `frontend/data/blog-posts.ts` is empty.

Biggest SEO risks:

- Multiple legal aliases compete with canonical legal pages.
- `/plans-pricing` and `/pricing-plans/list` target the same pricing intent.
- `/service-page/[serviceSlug]`, `/services/[serviceSlug]`, `/ireland/[serviceSlug]`, `/ireland-specialist-consultations/[serviceSlug]`, and `/home-health-tests/[testSlug]` create overlapping service detail intent.
- Country home pages and country consultation pages are country-name-swapped in places, creating weak local differentiation.
- Placeholder/fallback metadata such as "Template-driven marketing page", "Consultation listing template", and "Patient-focused blog article" should not be indexable.

Biggest trust risks:

- Public-facing copy includes or implies internal implementation language: `placeholder`, `adapter`, `migration`, `admin-managed`, `future`, `legacy compatibility`, `template-driven`, and `TODO`.
- Several fallback pages read like implementation scaffolds rather than healthcare content.
- Medical pages often lack clinical specificity, eligibility boundaries, safety disclaimers, provider credentials, and real care-path explanation.

Biggest conversion issues:

- Too many pages ask users to "Book online" without explaining which service is best for their need.
- Consultation listing pages overload the user with repeated proof and CTA blocks instead of helping them choose quickly.
- Service pages do not always answer the conversion-critical questions: who is this for, what happens during the consult, what is not covered, price, timing, prescription/referral path, and follow-up.

---

# Global Systemic Problems

## Template Overuse

Severity: Critical

The frontend is organized around broad templates that make route coverage easy but content differentiation weak. `StaticMarketingTemplate`, `ServiceDetailTemplate`, `ConsultationListingTemplate`, `CountryHomeTemplate`, `DoctorTeamTemplate`, and `LegalPageTemplate` are doing too much work across too many different user intents.

Why it matters:

- UX impact: users see repeated layouts and lose confidence that each page has been intentionally designed.
- Conversion impact: repeated sections interrupt decision-making instead of reducing uncertainty.
- SEO impact: pages with similar structure, headings, metadata, and fallback content can cannibalize each other.

Most affected routes:

- Country home pages: `/home`, `/home-pt`, `/home-sp`, `/home-cz`, `/home-rm`
- General consultation pages: `/general-consultation-ireland`, `/general-consultation-portugal`, `/general-consultation-spain`, `/general-consultation-czechia`, `/general-consultation-romania`
- Specialist pages: `/specialty-ireland`, `/specialty-portugal`, `/specialty-spain`, `/specialty-czechia`, `/specialty-romania`
- Static marketing pages: `/about`, `/careers`, `/gift-card`, `/partner-clinics`, `/plans-pricing`, `/pricing-plans/list`, `/corporate-plans`
- Service details: `/ireland/[serviceSlug]`, `/ireland-specialist-consultations/[serviceSlug]`, `/services/[serviceSlug]`, `/service-page/[serviceSlug]`

## Repeated Components

Severity: High

The same full-section components are reused as default page modules instead of being adapted to the page task.

Most repeated components:

- `HeroSection`: generic hero layout reused for marketing, legal, booking, blog, and service details.
- `BookingCTA`: same heavy green CTA card repeated across templates.
- `TrustSignals`: same trust section repeated where shorter local proof would work better.
- `HowItWorks`: same 3-step flow, always sliced to 3 steps.
- `FAQSection`: same accordion pattern appears as a default page ending.
- `TrustBar`, `SocialProof`, `CountryLinks`: repeated across doctor/team pages.

Recommended direction:

- Keep the components, but stop using them as default full-width endings.
- Create lighter contextual variants: inline CTA, service-specific trust proof, country-specific trust row, FAQ preview, booking decision card, and compliance note.

## Repeated Messaging

Severity: Critical

The site repeats the same broad claims:

- Licensed clinicians
- Secure consultations
- Patient-first support
- Private and secure
- Clear follow-up guidance
- No waiting rooms
- Available across Europe
- Book online
- The clinic team will guide you

These claims are useful once. Repeating them across nearly every route weakens their effect.

Better messaging strategy:

- Country pages should focus on availability, local coverage, pharmacy/referral rules, pricing currency, and provider access.
- Service pages should focus on symptoms, eligibility, what is included, what is not included, prescription/referral rules, and next steps.
- Team pages should focus on real clinician credibility, specialties, registration, languages, and availability.
- Pricing pages should focus on cost clarity, plan comparison, refund/eligibility rules, and what happens after payment.

## Repeated Page Structures

Severity: High

Common repeated order:

1. Hero
2. Intro card or feature grid
3. Trust/proof block
4. How it works
5. FAQ
6. CTA

This order appears across multiple page families. It gives consistency, but currently it creates cloned pages.

Recommended fix:

- Assign each route family a different narrative structure.
- Do not use FAQ + trust + CTA as the universal ending.
- Prioritize the section that matches the user task.

## SEO Duplication

Severity: Critical

The route system creates several duplicate-intent families:

- Legal aliases duplicate legal canonical pages.
- Pricing aliases duplicate pricing intent.
- Dynamic service aliases duplicate service detail intent.
- Country consultation pages duplicate country home intent.
- Blog article slugs can generate thin pages without real article data.
- Category routes can generate generic category pages with little unique value.

Recommended SEO actions:

- Redirect aliases where possible.
- Canonicalize non-primary service URLs.
- Noindex fallback, placeholder, empty, and generated thin pages.
- Merge duplicated pricing routes.
- Require content completeness before allowing dynamic service/category/blog pages to index.

## Internal Language Leakage

Severity: Critical

Public-facing or metadata-adjacent content includes implementation language that damages trust.

Flagged terms and examples to remove:

- `placeholder`
- `adapter`
- `migration`
- `admin-managed`
- `future-managed`
- `seeded`
- `fallback`
- `pending content`
- `mock`
- `demo`
- `legacy compatibility`
- `template-driven`
- `TODO`

High-risk locations:

- `frontend/lib/content/template-page-data.ts`
- `frontend/lib/content/marketing-page-data.ts`
- `frontend/lib/content/category-page-data.ts`
- route metadata in `frontend/app/**/page.tsx`
- `frontend/lib/routing/public-route-registry.ts`

## CTA Fatigue

Severity: High

The repeated `BookingCTA` makes the site feel pushy and visually monotonous. It also reduces the meaning of the primary CTA because users encounter it too often in the same style.

Recommended CTA model:

- One primary booking CTA per page above the fold or near the decision point.
- One lower-intensity inline CTA after content that answers an objection.
- Replace repeated CTA banners with route-specific decision helpers.

Examples:

- Service page CTA: "Check if this consultation fits your symptoms"
- Country page CTA: "See services available in Ireland"
- Pricing page CTA: "Compare consultation options"
- Doctor profile CTA: "Book with this clinician" only if availability exists

## Visual Fatigue

Severity: High

The site leans heavily on green gradients, rounded cards, icon rows, soft shadows, and repeated image frames. This is on-brand but over-applied.

Recommended visual differentiation:

- Country pages: editorial local guide layout.
- Service pages: clinical decision layout with facts, eligibility, and care steps.
- Specialist pages: specialty directory with filtering and comparison.
- Pricing pages: product-comparison table and decision support.
- Team pages: credential-led profile system.
- Blog pages: editorial article layout, not marketing cards.

---

# Route Family Analysis

## Global Entry Pages

Routes:

- `/`
- `/home`

### Purpose

Introduce Global Health as an online healthcare provider and route users toward countries, services, and booking.

### User Intent

Users want to understand what the service is, whether it is available in their country, and how to book.

### Repeated Patterns

- Hero plus country/service cards.
- Trust claims repeated from other pages.
- Booking CTA repeated from lower-level pages.
- Similar green visual treatment as country and consultation pages.

### UX Problems

- The homepage and country-home pattern blur together.
- Users are asked to book before the site clearly explains country/service fit.
- The same trust and CTA rhythm repeats later on service pages.

### Content Problems

- Broad value propositions are repeated instead of used to define positioning.
- Needs stronger first-screen answer: "Online GP and specialist consultations across selected European countries."

### SEO Problems

- `/` and `/home` should not both act like primary homepage destinations unless one is canonical.

### Trust Problems

- Trust proof is broad and repeated. Add concrete registration, clinical governance, support hours, and country availability.

### Redundancy Score (1-10)

7

### Severity

High

### Recommended Refactor

Make `/` the canonical homepage. Use `/home` only as redirect or country selector if required. Homepage should become a concise routing hub, not another long marketing page.

## Country Home Pages

Routes:

- `/home`
- `/home-pt`
- `/home-sp`
- `/home-cz`
- `/home-rm`

### Purpose

Explain country-specific availability and route users to local services.

### User Intent

Users want to know if online consultations are available in their country, what services exist, what it costs, and how booking works locally.

### Repeated Patterns

- Same `CountryHomeTemplate` across countries.
- Similar hero, quick actions, stats, specialties grid, how-it-works, trust, doctor spotlight, and final CTA.
- Country name swapping without enough local operational differences.

### UX Problems

- Country pages feel cloned.
- Too many sections compete before answering local availability clearly.
- Repeated trust modules dilute the more important country-specific proof.

### Content Problems

- Some country copy references asset migration, route coverage, profile migration, and placeholder-like status.
- Country pages need local specificity: currencies, clinical rules, prescription/referral expectations, operating hours, languages, and partner coverage.

### SEO Problems

- Country pages can cannibalize country consultation listing pages if both target "online doctor [country]" and "general consultation [country]".
- Weak localized copy reduces ranking potential.

### Trust Problems

- Internal language such as migration/pending undermines healthcare credibility.

### Redundancy Score (1-10)

9

### Severity

Critical

### Recommended Refactor

Create distinct country page variants:

- Ireland: mature service hub with GP, specialists, doctors, prescriptions, and tests.
- Portugal/Spain/Czechia/Romania: availability explainer pages if service depth is lower.
- Replace generic trust sections with country-specific availability, language, pricing, and regulatory notes.

## General Consultation Pages

Routes:

- `/general-consultation-ireland`
- `/general-consultation-portugal`
- `/general-consultation-spain`
- `/general-consultation-czechia`
- `/general-consultation-romania`

### Purpose

List general consultation destinations and guide users to book.

### User Intent

Users want to book a general consultation in a specific country or understand available consultation types.

### Repeated Patterns

- Same `ConsultationListingTemplate`.
- Same hero style, rating block, destination cards, quote block, partners, pricing, how-it-works, trust, FAQ, and CTA.
- Same final CTA copy: "Start Your Online Consultation".

### UX Problems

- The page is too long for a listing task.
- Repeated rating and trust modules make the page feel padded.
- The doctor quote block and partner placeholders interrupt service selection.
- Country-specific decision criteria are buried.

### Content Problems

- Generic general consultation descriptions do not explain eligibility, what can be handled online, what requires emergency/in-person care, or prescription boundaries.

### SEO Problems

- These pages overlap with country home pages and `/ireland/general-consultation-*` service detail pages.
- If each country page uses similar H1/H2s with country swaps, cannibalization risk is high.

### Trust Problems

- Placeholder partner imagery or generic proof makes the page feel less legitimate.

### Redundancy Score (1-10)

9

### Severity

Critical

### Recommended Refactor

Turn each general consultation page into a short country-specific booking guide:

- What is available in this country
- Price and duration
- What doctors can help with
- What cannot be treated online
- Booking steps
- One FAQ block with only country-specific questions

Remove duplicate quote/partner/trust blocks unless they contain real local proof.

## Specialist Consultation Pages

Routes:

- `/specialty-ireland`
- `/specialty-portugal`
- `/specialty-spain`
- `/specialty-czechia`
- `/specialty-romania`

### Purpose

Help users browse specialist consultation categories.

### User Intent

Users want to find the right specialist and understand whether they can book directly online.

### Repeated Patterns

- Same `ConsultationListingTemplate` as general consultation pages.
- Same proof, pricing, how-it-works, trust, FAQ, and CTA sections.
- Same card layout for different specialties.

### UX Problems

- Specialist discovery needs comparison and filtering, not the same marketing story as GP consultation.
- Pricing and duration may differ by specialty but template implies sameness.
- Long repeated trust sections slow down specialist selection.

### Content Problems

- Specialty pages need clinical differentiation: symptoms, referral needs, age limits, required documents, prescription/referral path.

### SEO Problems

- Specialist listing pages may compete with individual specialist service detail pages.
- Country-specific specialist pages are too similar if content is country-name-swapped.

### Trust Problems

- Specialist pages require stronger clinician credential proof than general marketing trust copy.

### Redundancy Score (1-10)

9

### Severity

Critical

### Recommended Refactor

Use a specialist-directory template, not the general consultation listing template. Add specialty filters, availability, price ranges, and "which specialist do I need?" guidance.

## Ireland General Service Detail Pages

Routes:

- `/ireland/[serviceSlug]`
- Examples from route registry include many consultation slugs such as GP, prescription, sick note, mental health, sexual health, and related GP services.

### Purpose

Explain one Ireland general consultation service and convert the user to booking.

### User Intent

Users want to know if this specific consultation fits their symptoms and what happens after booking.

### Repeated Patterns

- Same `ServiceDetailTemplate`.
- Same hero eyebrow: "Consultation details".
- Same trust badges: "Online assessment", "Private and secure", "Clear follow-up guidance".
- Same article block and same `BookingCTA`.
- Fallback body copy is generic across services.

### UX Problems

- Medical service pages do not consistently answer service-specific questions.
- The template is too broad for clinical decision-making.
- CTA appears before enough care context is provided.

### Content Problems

- Fallback content says secure online consultation but does not explain symptoms, inclusions, exclusions, prescription rules, or urgent-care boundaries.
- Placeholder facts such as "20-30 min (placeholder)" and "From EUR 45 (placeholder)" are severe public trust risks if rendered.

### SEO Problems

- Generic service copy creates thin pages.
- Services can compete with `/service-page/[serviceSlug]` and `/services/[serviceSlug]` aliases.

### Trust Problems

- Clinical pages need safety language. Generic copy is not enough for healthcare.

### Redundancy Score (1-10)

8

### Severity

Critical

### Recommended Refactor

Create a clinical service-detail template with required content fields:

- Who this is for
- Common reasons to book
- What the clinician can do
- What cannot be treated online
- What to prepare
- Price/duration
- Prescription/referral/sick-note rules
- Urgent-care warning
- Service-specific FAQ

Do not publish or index a service page if required fields are missing.

## Ireland Specialist Service Detail Pages

Routes:

- `/ireland-specialist-consultations/[serviceSlug]`

### Purpose

Explain one specialist consultation and convert users to book the right specialty.

### User Intent

Users want confidence that the specialty matches their condition and that online consultation is appropriate.

### Repeated Patterns

- Same `ServiceDetailTemplate` as general service details.
- Same hero, article card, trust badges, and CTA.
- Same fallback model.

### UX Problems

- Specialist pages need higher specificity than GP pages, but the template treats them the same.
- There is no strong comparison between specialties.
- Users with ambiguous symptoms may not know which specialty to choose.

### Content Problems

- Needs specialist-specific medical scope, referral needs, records/images/lab requirements, and follow-up expectations.

### SEO Problems

- Specialist detail pages can cannibalize specialist listing pages when titles and descriptions are generic.

### Trust Problems

- Requires named specialist credentials or clinical governance proof, not generic trust badges.

### Redundancy Score (1-10)

8

### Severity

High

### Recommended Refactor

Create a `SpecialistServiceTemplate` distinct from GP service details. Include "Book this specialty if..." and "Choose another specialty if..." decision support.

## Dynamic Service Alias Pages

Routes:

- `/service-page/[serviceSlug]`
- `/services/[serviceSlug]`
- `/home-health-tests/[testSlug]`

### Purpose

Provide generic service-detail entry points.

### User Intent

Unclear. These routes may be legacy, admin-generated, campaign-oriented, or service aliases.

### Repeated Patterns

- Same service-detail logic as primary service pages.
- Generic metadata and fallback content.
- Alias route families overlap with canonical service URLs.

### UX Problems

- Users may land on different URLs for the same or similar service.
- Route purpose is not visible to users.
- Generic fallback pages create low-confidence experiences.

### Content Problems

- Risk of fallback text being public.
- Home health test pages need a different structure from online consultation pages.

### SEO Problems

- High duplicate-content risk.
- These should not index unless they are canonical, complete, and distinct.

### Trust Problems

- Medical test pages require sample collection, turnaround, result interpretation, and privacy details. Reusing consultation template weakens trust.

### Redundancy Score (1-10)

10

### Severity

Critical

### Recommended Refactor

Choose one canonical service URL strategy. Redirect or noindex aliases. Build a separate home-health-test template.

## Team Pages

Routes:

- `/ireland-team`
- `/portugal-team`
- `/spain-team`
- `/czechia-team`
- `/romania-team`

### Purpose

Introduce doctors and clinical team members by country.

### User Intent

Users want to verify clinician legitimacy, specialty, language, credentials, and availability.

### Repeated Patterns

- Same `DoctorTeamTemplate`.
- Same `TeamHero`, `FeaturedDoctor`, `DoctorsSection`, `TrustBar`, `BookingCTA`, `SocialProof`, and `CountryLinks`.
- Same country-links ending across all team pages.

### UX Problems

- Team pages feel like marketing landing pages instead of credential directories.
- Repeated trust/proof blocks distract from doctor verification.
- Country pages with sparse team data feel incomplete.

### Content Problems

- Some team content references migration/pending status.
- Doctor cards need meaningful credentials and clinical registration details.

### SEO Problems

- Country team pages should not all use similar title/description structures with only country swaps.
- Sparse team pages should not index until they have real clinicians.

### Trust Problems

- Public team pages must not imply incomplete profile migration.

### Redundancy Score (1-10)

8

### Severity

High

### Recommended Refactor

Turn team pages into credential-first directories:

- Country-specific clinician list
- Registration/credential details
- Languages
- Specialties
- Availability
- Link to relevant consultation pages

Remove repeated `BookingCTA`, `SocialProof`, and `CountryLinks` where they do not add new evidence.

## Doctor Profile Pages

Routes:

- `/ireland-team/[doctorSlug]`
- `/ireland-doctors/[doctorSlug]`
- `/portugal-team/[doctorSlug]`
- `/spain-team/[doctorSlug]`
- `/czechia-team/[doctorSlug]`
- `/romania-team/[doctorSlug]`

### Purpose

Help users evaluate and book with a specific clinician.

### User Intent

Users want credentials, specialties, languages, experience, availability, and booking path.

### Repeated Patterns

- Profile template endings repeat `TrustBar`, `BookingCTA`, `SocialProof`, and `CountryLinks`.
- Alternate Ireland doctor route duplicates team profile route.

### UX Problems

- Repeated generic proof takes attention away from the doctor.
- If availability is not real, "Book with doctor" behavior can feel misleading.

### Content Problems

- Profiles need structured credentials, registration, practice areas, languages, and appointment types.

### SEO Problems

- `/ireland-team/[doctorSlug]` and `/ireland-doctors/[doctorSlug]` are duplicate doctor profile families unless one redirects or canonicalizes.

### Trust Problems

- Doctor pages carry high medical trust weight. Generic profile content is more damaging here than on marketing pages.

### Redundancy Score (1-10)

8

### Severity

High

### Recommended Refactor

Choose one doctor profile URL family. Make the page clinician-first and remove generic site-wide proof blocks unless converted into credential proof.

## Static Marketing Pages

Routes:

- `/about`
- `/careers`
- `/gift-card`
- `/partner-clinics`
- `/corporate-plans`
- `/plans-pricing`
- `/pricing-plans/list`
- `/online-prescription`
- `/home-delivery`
- `/home-health-test`

### Purpose

Explain non-core service, company, pricing, or partnership information.

### User Intent

Varies widely by page. Pricing users want comparison. Careers users want roles. Partners want business process. Gift-card users want purchase and redemption details.

### Repeated Patterns

- Same `StaticMarketingTemplate`.
- Same hero eyebrow: "Online care made simple".
- Same trust badges: "Licensed clinicians", "Secure consultations", "Patient-first support".
- Same feature cards, FAQ layout, related links card, and `BookingCTA`.

### UX Problems

- Different tasks are forced into one marketing-page structure.
- Pricing pages need tables and plan logic, not generic feature cards.
- Careers needs open roles and hiring process, not booking CTA dominance.
- Gift-card needs redemption policy, purchase path, expiry/refund rules, not generic healthcare trust copy.
- Partner-clinics needs business credibility, partner process, requirements, and contact CTA.

### Content Problems

- Several static pages use future/admin-managed/fallback phrasing.
- Copy is generic and does not match each page's unique task.

### SEO Problems

- `/plans-pricing` and `/pricing-plans/list` duplicate pricing intent.
- Generic metadata weakens SERP differentiation.

### Trust Problems

- Future/pending policy language is unacceptable on public pages.

### Redundancy Score (1-10)

9

### Severity

Critical

### Recommended Refactor

Split static marketing pages into task-specific templates:

- Pricing template
- Careers template
- Gift card template
- Partner clinics template
- Prescription service template
- Home delivery template
- Home health test template

Do not use generic `StaticMarketingTemplate` for high-intent pages.

## Booking Pages

Routes:

- `/book-online`

### Purpose

Capture booking details and move users into the consultation flow.

### User Intent

Users are ready to book or are comparing final options.

### Repeated Patterns

- Uses `HeroSection` and final `BookingCTA`.
- Trust sidebar repeats broad trust claims.

### UX Problems

- Booking pages should be low-distraction. Extra marketing CTA can create unnecessary scroll and ambiguity.
- The page should answer final booking concerns inline instead of repeating general site trust modules.

### Content Problems

- Needs clear expectations: response time, payment, cancellation, medical emergency warning, what happens next.

### SEO Problems

- Booking page likely should index only if it contains useful booking information and not private intake states.

### Trust Problems

- Must clearly communicate privacy, data handling, and emergency exclusion.

### Redundancy Score (1-10)

6

### Severity

Medium

### Recommended Refactor

Simplify booking page. Remove generic bottom CTA. Use a compact trust/privacy sidebar and stepper.

## FAQ Page

Routes:

- `/frequent-asked-questions`

### Purpose

Answer common objections and support questions.

### User Intent

Users want fast answers about booking, cost, prescriptions, refunds, privacy, and availability.

### Repeated Patterns

- FAQ content appears as page sections elsewhere.
- Route naming uses "frequent-asked" rather than the more natural "frequently-asked" or `/faq`.

### UX Problems

- If every page also has FAQ, the dedicated FAQ page must provide better categorization and search.
- Current repeated FAQ pattern risks becoming a catch-all rather than decision support.

### Content Problems

- Needs grouped healthcare-specific answers, not generic marketing questions.

### SEO Problems

- FAQ snippets can compete with service-page FAQ content if repeated verbatim.

### Trust Problems

- Medical FAQ answers must avoid overpromising and should include urgent-care boundaries.

### Redundancy Score (1-10)

7

### Severity

Medium

### Recommended Refactor

Make `/faq` canonical if possible. Use the FAQ page as a comprehensive support hub. On service pages, include only service-specific FAQ items.

## Blog Index and Blog Articles

Routes:

- `/blog`
- `/post/[slug]`

### Purpose

Educate users and capture informational search demand.

### User Intent

Users want trustworthy healthcare guidance.

### Repeated Patterns

- Blog index uses generic cards.
- Blog article routes are slug-driven while `frontend/data/blog-posts.ts` is empty.
- Generated excerpts repeat the same article summary.

### UX Problems

- Thin blog content damages perceived expertise.
- Article pages do not appear to have a mature editorial system.

### Content Problems

- Repeated excerpt: "Patient-focused article introducing online consultation workflows, booking guidance, and care navigation."
- Articles need medical review, author, date, sources, and disclaimers.

### SEO Problems

- Empty/generated article pages are high-risk thin content.
- Dynamic blog pages should noindex unless real article content exists.

### Trust Problems

- Healthcare blog pages need author credentials and review dates.

### Redundancy Score (1-10)

10

### Severity

Critical

### Recommended Refactor

Noindex or 404 generated articles until real content exists. Add editorial metadata before indexing.

## Category Pages

Routes:

- `/category/[slug]`
- category slugs from route data

### Purpose

Group related content or services by category.

### User Intent

Users likely expect filtered services or articles.

### Repeated Patterns

- Category pages are template-driven with generic adapter-managed copy.
- Same feature-card layout as static pages.

### UX Problems

- Categories do not provide a clear unique task.
- If category pages do not list real grouped content, they feel like filler.

### Content Problems

- Generic category intro copy adds little value.

### SEO Problems

- Category pages can become thin indexed pages.
- They may cannibalize service listing pages.

### Trust Problems

- Adapter/fallback language should never appear publicly.

### Redundancy Score (1-10)

9

### Severity

High

### Recommended Refactor

Use categories only if they aggregate real services/articles. Otherwise noindex or remove.

## Legal Pages

Routes:

- `/legal-notices`
- `/term-and-conditions`
- `/privacy`
- `/return-and-refund-policy`
- aliases such as `/terms-and-conditions`, `/privacy-policy`, `/copy-of-privacy-policy`, `/refund-policy`, `/cookies-policy`, `/gdpr-compliance`

### Purpose

Provide legal, privacy, refund, cookie, and compliance information.

### User Intent

Users want official policy details.

### Repeated Patterns

- Same `LegalPageTemplate`.
- Alias pages duplicate policy intent.
- Fallback legal copy can say policy content is pending.

### UX Problems

- Legal pages should be concise and authoritative. Generic hero styling is less important than scannability and date/version clarity.

### Content Problems

- Placeholder legal copy is a severe trust and compliance issue.
- "Copy of Privacy Policy" should not exist as a public route.

### SEO Problems

- Legal aliases create duplicate policy pages.
- Policy aliases should redirect, not canonicalize indefinitely.

### Trust Problems

- Legal pages with pending/migration language undermine compliance trust.

### Redundancy Score (1-10)

10

### Severity

Critical

### Recommended Refactor

Redirect aliases to canonical legal pages. Noindex legal pages that are placeholders. Remove "copy" routes from public navigation and route inventory.

## Auth Pages

Routes:

- `/login`
- `/signup`

### Purpose

Authenticate users and create accounts.

### User Intent

Users want to access account, booking, admin, or user portal.

### Repeated Patterns

- Auth pages may share public-page header/footer and generic site styling.

### UX Problems

- Auth should preserve session on browser navigation.
- Navbar avatar should reflect authenticated state and link to the correct portal.

### Content Problems

- Auth copy should be functional, not marketing-heavy.

### SEO Problems

- Auth pages usually should be noindex.

### Trust Problems

- Login/session instability reduces confidence in the product.

### Redundancy Score (1-10)

4

### Severity

High for product UX, Low for redundancy

### Recommended Refactor

Keep auth pages focused. Use persistent auth state and role-aware avatar navigation. Noindex auth routes.

## Account and Portal Pages

Routes:

- `/account`
- `/patient`
- `/admin`
- `/admin/**`

### Purpose

Support authenticated users and administrators.

### User Intent

Users want to manage bookings, profiles, content, or admin workflows.

### Repeated Patterns

- Public and portal navigation states may overlap.
- Avatar behavior is not clearly role-aware.

### UX Problems

- If authenticated users navigate back and appear logged out, the app breaks expected session continuity.
- Navbar should not show generic login/avatar states inconsistently.

### Content Problems

- Admin/content-management language should not leak to public pages.

### SEO Problems

- Portal/admin pages should be noindex and protected.

### Trust Problems

- Session bugs reduce confidence in booking and account safety.

### Redundancy Score (1-10)

5

### Severity

High for product UX, Medium for public trust

### Recommended Refactor

Separate public navigation from authenticated navigation state. Avatar click should route by role: admin to admin portal, patient/user to user portal.

---

# Cross-Page Duplication Matrix

| Page/Route | Duplicate Of | Repeated Sections | Severity | Recommended Action |
|---|---|---|---|---|
| `/home` | `/` and country home family | Hero, trust, services, CTA | High | Make `/` canonical and decide whether `/home` redirects or acts as country hub |
| `/home-pt`, `/home-sp`, `/home-cz`, `/home-rm` | Each other | CountryHomeTemplate, quick actions, specialties, trust, CTA | Critical | Rewrite as country-specific availability pages |
| `/general-consultation-*` | Each other and country homes | ConsultationListingTemplate, ratings, quote, pricing, FAQ, CTA | Critical | Convert to country-specific booking guides |
| `/specialty-*` | General consultation pages | Same listing template and section order | Critical | Replace with specialist-directory template |
| `/ireland/[serviceSlug]` | `/service-page/[serviceSlug]`, `/services/[serviceSlug]` | ServiceDetailTemplate, same trust badges, same CTA | Critical | Pick canonical service URL and redirect/noindex aliases |
| `/ireland-specialist-consultations/[serviceSlug]` | Specialist listing pages and service aliases | ServiceDetailTemplate | High | Build specialist-specific service template |
| `/home-health-tests/[testSlug]` | Service detail aliases | Consultation-style detail template | High | Create home-test template or noindex until complete |
| `/plans-pricing` | `/pricing-plans/list` | StaticMarketingTemplate and pricing intent | Critical | Merge and redirect one route |
| `/privacy-policy` | `/privacy` | Legal policy content | Critical | 301 redirect to `/privacy` |
| `/copy-of-privacy-policy` | `/privacy` | Legal policy content | Critical | Remove or 301 redirect to `/privacy` |
| `/gdpr-compliance` | `/privacy` or dedicated compliance page | Privacy/compliance intent | High | Redirect to `/privacy` unless unique compliance content exists |
| `/terms-and-conditions` | `/term-and-conditions` | Terms policy | Critical | 301 redirect to canonical terms route |
| `/refund-policy` | `/return-and-refund-policy` | Refund policy | Critical | 301 redirect to canonical refund route |
| `/ireland-doctors/[doctorSlug]` | `/ireland-team/[doctorSlug]` | Doctor profile route family | High | Choose one doctor URL family |
| `/post/[slug]` | Other generated posts | Same generated excerpt/body model | Critical | Noindex/404 until real content exists |
| `/category/[slug]` | Listing/service pages | Generic category template | High | Aggregate real content or noindex |
| `/about`, `/careers`, `/gift-card`, `/partner-clinics` | Each other | StaticMarketingTemplate, hero, feature grid, FAQ, CTA | High | Split into task-specific page templates |

---

# Component Audit

| Component | Overused? | Problem | Recommended Variant Strategy |
|---|---:|---|---|
| `HeroSection` | Yes | Same visual rhythm across unrelated pages makes legal, blog, booking, and service pages feel templated | Keep base shell, add variants: homepage router, clinical service hero, legal document header, editorial blog header, booking step header |
| `BookingCTA` | Yes | Heavy repeated green CTA creates CTA fatigue and visual monotony | Create inline CTA, compact CTA row, service-fit CTA, booking support CTA, and final CTA. Use one per page by default |
| `TrustSignals` | Yes | Repeats generic trust claims instead of page-specific evidence | Split into local regulatory proof, security/privacy proof, clinical governance proof, and compact trust row |
| `HowItWorks` | Yes | Same three-step flow appears across pages and ignores route-specific care paths | Create service-specific care-path component and country-specific booking flow |
| `FAQSection` | Yes | Same accordion ending becomes filler | Use page-specific FAQs only. Dedicated FAQ page should own generic questions |
| `TrustBar` | Yes | Repeated hardcoded proof on doctor/team pages | Convert to credential bar or remove where doctor credentials already prove trust |
| `SocialProof` | Yes | Same "trusted by thousands" claim appears without context | Use only with substantiated source, or replace with country/service-specific reviews |
| `CountryLinks` | Yes | Repeated country pills at page endings can feel like SEO linking clutter | Keep only where cross-country routing helps the user |
| `StaticMarketingTemplate` | Yes | Forces unrelated pages into same structure | Split into pricing, careers, gift-card, partner, prescription, delivery, and testing templates |
| `ServiceDetailTemplate` | Yes | Too generic for medical service decisions | Split GP service, specialist service, prescription, test, and delivery templates |
| `ConsultationListingTemplate` | Yes | Used for both GP and specialist discovery despite different user tasks | Create separate GP booking guide and specialist directory templates |
| `CountryHomeTemplate` | Yes | Country pages feel cloned and overlong | Add mature-market and launch-market variants |
| `DoctorTeamTemplate` | Yes | Team pages behave like marketing pages instead of credential directories | Build clinician directory layout with filtering and credential-first cards |
| `DoctorProfileTemplate` | Partly | Generic endings reduce focus on the doctor | Use profile-specific CTA and credential proof only |
| `ConsultationDestinationCard` | Yes | Cards can repeat title/price/duration without enough differentiation | Add service-specific facts, symptoms, eligibility, and "best for" text |
| `PricingCard` | Partly | Pricing cards appear outside clear comparison context | Use only on pricing/service pages with clear included/excluded details |
| `BlogCard` | Partly | Can mask thin/generated article content | Require author, date, category, reading time, and real excerpt |
| `HealthcareMediaFrame` | Yes | Similar image treatment contributes to visual sameness | Add editorial, clinical diagram, doctor portrait, and document-style variants |

---

# Canonicalization Plan

## Routes to Redirect

| Source | Target | Reason |
|---|---|---|
| `/terms-and-conditions` | `/term-and-conditions` | Duplicate terms route |
| `/privacy-policy` | `/privacy` | Duplicate privacy route |
| `/copy-of-privacy-policy` | `/privacy` | Public "copy" route should not exist |
| `/refund-policy` | `/return-and-refund-policy` | Duplicate refund route |
| `/plans-pricing` or `/pricing-plans/list` | Choose one pricing route | Duplicate pricing intent |
| `/ireland-doctors/[doctorSlug]` or `/ireland-team/[doctorSlug]` | Choose one doctor profile family | Duplicate doctor profile intent |

## Routes to Merge

- Merge `/plans-pricing` and `/pricing-plans/list`.
- Merge legal aliases into canonical legal pages.
- Merge category pages into real service/blog category hubs only if they aggregate useful content.
- Merge country consultation pages with country home pages if the consultation pages cannot carry unique country-specific booking guidance.

## Routes to Canonicalize

- Canonical service detail URLs should be one clearly defined family.
- For Ireland GP services, use either `/ireland/[serviceSlug]` or `/services/[serviceSlug]`, not both.
- For Ireland specialist services, use `/ireland-specialist-consultations/[serviceSlug]` if it has unique specialist content.
- For home health tests, use `/home-health-tests/[testSlug]` only with a distinct test-page template.
- Blog articles should canonicalize to `/post/[slug]` only if real article content exists.

## Routes to Noindex

- `/login`
- `/signup`
- `/account`
- `/patient`
- `/admin/**`
- Dynamic blog articles without real content
- Category pages without real aggregation
- Service fallback pages missing required clinical fields
- Legal pages with pending/placeholder copy
- Alias routes that cannot be redirected immediately

## Duplicate Route Families

- Legal aliases
- Pricing aliases
- Service detail aliases
- Doctor profile aliases
- Country-name-swapped consultation pages
- Generated blog posts
- Generic category pages

---

# UX Refactor Plan

## Page Hierarchy Fixes

- Homepage: make it a routing and positioning page, not a long catch-all marketing page.
- Country pages: lead with local availability, services, pricing, languages, and country-specific booking expectations.
- GP consultation pages: reduce to a fast booking guide.
- Specialist pages: make them browsable directories with filters and comparison.
- Service pages: use clinical decision hierarchy before CTA.
- Pricing pages: use comparison tables and inclusion/exclusion details.
- Team pages: lead with credentials and clinician search.
- Blog pages: move to editorial layout with author/review metadata.
- Legal pages: use document-first layout, not marketing hero layout.

## Better Page Flow

Recommended service page order:

1. Service name, price, duration, and booking CTA
2. Who this is for
3. What the clinician can help with
4. What cannot be treated online
5. What happens during the consultation
6. What to prepare
7. Prescription/referral/sick-note rules
8. Service-specific FAQ
9. Small final CTA

Recommended country page order:

1. Country availability statement
2. Available services by category
3. Price and timing expectations
4. Local doctor/team proof
5. How booking works in that country
6. Country-specific FAQ
7. CTA

Recommended specialist page order:

1. Specialist directory intro
2. Filter/search by specialty or symptom
3. Specialty cards with "best for" guidance
4. Credentials and availability proof
5. Booking guidance
6. Specialty FAQ

## Component Reduction Strategy

- Remove default `BookingCTA` from templates and require pages to opt in.
- Replace full `TrustSignals` with smaller contextual trust modules.
- Use `FAQSection` only when the page has unique FAQs.
- Remove `CountryLinks` from doctor and service pages unless cross-country routing is relevant.
- Use `HowItWorks` only on pages where the flow is the primary user question.

## CTA Reduction Strategy

- One primary CTA near the top.
- One contextual CTA near the decision point.
- Avoid more than two CTA modules on standard pages.
- Change CTA language by page task.

## Trust Section Strategy

- Replace repeated generic trust with evidence:
  - doctor registration
  - clinical governance
  - privacy/security handling
  - country availability
  - real reviews with source
  - support response times
  - prescribing/referral rules

## Differentiation Strategy

- Country pages should look and read like local service hubs.
- Service pages should look like clinical explainers.
- Specialist pages should look like directories.
- Blog pages should look like editorial content.
- Legal pages should look like official documents.
- Pricing pages should look like decision tools.

---

# Content Rewrite Plan

## Generic Copy to Replace

Current pattern:

> Secure online consultation with licensed clinicians. Booking confirms the right next steps for your care.

Problem:

This can describe almost every page. It gives no service-specific reason to book.

Better service-page pattern:

> Book an online GP consultation for non-emergency symptoms such as coughs, stomach issues, skin concerns, medication questions, or follow-up advice. A clinician will review your request, discuss symptoms by video or phone where appropriate, and explain whether treatment, a prescription, referral, or in-person care is needed.

Current pattern:

> Book online and the clinic team will guide you to the right next step.

Problem:

This is safe but vague. It does not help the user choose.

Better page-specific alternatives:

- GP page: "Start with a GP consultation if you are unsure which service you need."
- Specialist page: "Choose a specialty based on your symptoms or referral need."
- Pricing page: "Compare consultation options before booking."
- Gift card page: "Send consultation credit with clear redemption instructions."
- Partner page: "Request a clinic partnership review."

Current pattern:

> Licensed clinicians, secure consultations, patient-first support.

Problem:

Repeated trust badges become wallpaper.

Better trust alternatives:

- "Irish-based GP consultations available online"
- "Private consultation notes handled through secure patient systems"
- "Prescription or referral only when clinically appropriate"
- "Emergency symptoms should be handled through urgent or emergency care"

## Internal Language to Remove

Remove or rewrite:

- "visual asset migration continues"
- "final clinic-specific artwork is approved"
- "Team profile migration pending"
- "during migration"
- "dedicated country homepage variant"
- "local route coverage"
- "managed via content adapters"
- "Policy placeholder content pending legal copy migration and compliance review"
- "Legacy compatibility route"
- "Template-driven marketing page"
- "Patient-focused blog article"
- "placeholder"
- "TODO"

Rewrite example:

Bad:

> Services and final localized copy are managed via content adapters.

Good:

> Online consultation services vary by country. Choose your location to see available appointment types, pricing, and follow-up options.

Bad:

> Policy placeholder content pending legal copy migration and compliance review.

Good:

> This policy explains how Global Health handles refunds, cancellations, and appointment changes. Last updated: [date].

## Weak Medical Specificity

Add required content to medical pages:

- Common symptoms or reasons to book
- Online suitability
- Red flags requiring emergency care
- Prescription/referral limitations
- Age limits
- Required documents or photos
- Expected duration
- Follow-up process
- Country-specific availability

## AI-Sounding Phrases to Reduce

- "Patient-first support"
- "Care navigation"
- "Right next step"
- "Online care made simple"
- "Trusted by thousands"
- "Seamless consultation experience"

These are not wrong, but they are overused and generic. Replace with concrete statements.

---

# Design System Refactor Plan

## Components Needing Variants

- `HeroSection`: needs clinical, directory, legal, editorial, pricing, and country variants.
- `BookingCTA`: needs inline, compact, service-specific, pricing-specific, and portal variants.
- `TrustSignals`: needs credential, security, country, review, and governance variants.
- `FAQSection`: needs compact service FAQ, support FAQ, legal FAQ, and pricing FAQ variants.
- `HealthcareMediaFrame`: needs image, portrait, document, map/local, and editorial variants.

## Components to Delete or Stop Using Publicly

- Any fallback component path that renders "placeholder", "adapter", "migration", "template-driven", or "TODO".
- Public legal alias pages that exist only for compatibility.
- Generic generated article/card content when no source content exists.

## Components to Simplify

- `BookingCTA`: reduce decoration and create smaller versions.
- `TrustSignals`: split from large green section into smaller trust proof modules.
- `HowItWorks`: stop forcing three steps with `steps.slice(0, 3)` when a page needs more or fewer steps.
- `CountryLinks`: use as contextual navigation, not default footer content.

## Layout Diversity Improvements

- Use document layout for legal pages.
- Use comparison layout for pricing pages.
- Use filterable directory layout for specialists and doctors.
- Use clinical explainer layout for service pages.
- Use editorial layout for blog pages.
- Use availability hub layout for country pages.

## Section-Order Diversification

Do not repeat hero, intro, cards, trust, FAQ, CTA as the default page sequence. Each route family should have a different information architecture based on intent.

---

# Priority Roadmap

| Priority | Problem | Recommended Fix | Expected Impact |
|---|---|---|---|
| P0 | Public internal language and placeholders | Remove or gate all `placeholder`, `adapter`, `migration`, `TODO`, `legacy`, `template-driven`, `fallback`, and `pending` public copy | Critical trust improvement and lower compliance risk |
| P0 | Duplicate legal routes | Redirect aliases to canonical legal pages and noindex incomplete legal content | Eliminates duplicate legal SEO risk and trust issues |
| P0 | Thin generated blog pages | Noindex or 404 generated `/post/[slug]` pages until real content exists | Prevents thin-content SEO damage |
| P0 | Service alias duplication | Choose canonical service URL families and redirect/noindex aliases | Reduces cannibalization and improves crawl clarity |
| P1 | `StaticMarketingTemplate` overuse | Split pricing, careers, gift card, partner, prescription, delivery, and testing into unique templates | Improves conversion clarity and perceived quality |
| P1 | `ConsultationListingTemplate` overuse | Separate GP booking guide from specialist directory | Reduces scroll fatigue and improves service selection |
| P1 | Generic medical service pages | Add required clinical fields and block indexing when incomplete | Improves trust, SEO depth, and booking confidence |
| P1 | Repeated `BookingCTA` | Replace default CTA banner with page-specific CTA variants | Reduces CTA fatigue and improves decision flow |
| P1 | Country-name-swapped pages | Rewrite country pages with local availability, pricing, languages, and clinical rules | Improves local SEO and user trust |
| P2 | Repeated trust sections | Replace site-wide trust blocks with contextual evidence modules | Makes proof more credible and less repetitive |
| P2 | Team pages feel templated | Rebuild as credential-first clinician directories | Improves medical legitimacy and doctor discovery |
| P2 | Pricing route duplication | Merge `/plans-pricing` and `/pricing-plans/list` | Improves SEO clarity and user path simplicity |
| P2 | FAQ repetition | Keep generic FAQ on support page and use service-specific FAQs elsewhere | Reduces duplicate content and improves answer relevance |
| P3 | Visual monotony | Add route-family-specific visual systems | Improves perceived craft and reduces cloned-page feeling |
| P3 | Country links repeated everywhere | Use cross-country links only where they support navigation | Reduces footer/link clutter |

---

# Implementation Notes

The fastest cleanup path is not a visual redesign first. It is content gating and route canonicalization first.

Recommended sequence:

1. Block public trust leaks and noindex thin/fallback routes.
2. Redirect legal/pricing/service/doctor aliases.
3. Split the most damaging templates: static marketing, consultation listing, and service detail.
4. Rewrite clinical service content with required fields.
5. Reduce CTA/trust/FAQ repetition.
6. Add visual variants after the information architecture is cleaner.

This order prevents search engines and users from seeing incomplete or duplicate pages while the broader UX refactor is underway.
