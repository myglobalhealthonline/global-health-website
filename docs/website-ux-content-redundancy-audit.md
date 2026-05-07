# Website UX & Content Audit

Audit date: 2026-05-08  
Scope: public website, route inventory, shared templates, content adapters, booking/auth touchpoints, and admin-facing content surfaces where they affect public content quality.

Source evidence reviewed:
- `frontend/data/routes.ts`
- `frontend/lib/routing/public-route-registry.ts`
- `frontend/lib/content/template-page-data.ts`
- `frontend/lib/content/marketing-page-data.ts`
- `frontend/lib/content/category-page-data.ts`
- `frontend/components/templates/*`
- representative App Router page files under `frontend/app/(site)`

## Executive Summary

The site is structurally over-templated. Many pages are technically live, but too many share the same hero pattern, trust badges, rating block, three-step process, green CTA banner, generic doctor quote, and "licensed clinicians / secure consultations / clear next steps" language. This creates a serious perception problem: the site looks large, but much of it reads like placeholder scaffolding.

The biggest problem is not one bad page. It is the cumulative repetition across page families:

- Country home pages repeat the same narrative with small country substitutions.
- General consultation pages for five countries share the same template, FAQ logic, pricing structure, trust language, and booking flow.
- Specialist pages for five countries use the same listing template and weak metadata.
- Ireland service detail pages are at high risk of near-duplicate content because fallback copy is reused across many medical conditions.
- Static marketing pages use generic adapter copy and repeated CTAs.
- Blog article pages are mostly generated from slugs with the same two-paragraph body.
- Legal aliases exist as content pages instead of clean redirects or canonical handling.

Most damaging UX patterns:

- Repeated "Start Your Online Consultation" CTAs appear on country pages, team pages, consultation listings, footer CTA, and booking pages.
- Trust proof is repeated but not deepened. "Licensed clinicians" and "secure consultations" appear everywhere, so the claim loses weight.
- Pages use the same green hero/section rhythm, which creates scroll fatigue and weak page identity.
- Important page types do not explain how they differ from adjacent pages. General consultation, specialist consultation, online prescription, home delivery, and health tests all converge toward the same booking message.
- SEO metadata is often generic, duplicated, or explicitly marked as "Template-driven".

Key recommendations:

- Collapse or redirect duplicate legacy/legal pages instead of rendering them as full marketing pages.
- Give each major page family a unique job: country hub, service category, service detail, booking, education, legal.
- Remove repeated trust/CTA sections from pages where they do not add new information.
- Rewrite fallback medical service detail copy before indexing or promoting those routes.
- Replace generic blog placeholder bodies with real article content or noindex/hide until ready.
- Create component variants so pages stop sharing the same hero, CTA, card grid, trust, FAQ, and doctor quote sequence.

---

# Global Issues Across Entire Site

## Repeated Patterns

| Issue | Severity | Why It Matters | UX Impact | Conversion Impact | SEO Impact |
|---|---|---|---|---|
| Same HeroSection pattern across static, legal, blog index, booking, and service detail pages | High | It makes every route feel like the same landing page with swapped text | Weak identity and visual fatigue | Visitors cannot quickly tell page type or next best action | Similar H1/intro structures dilute topical relevance |
| BookingCTA reused as a full-width green promotional banner on too many pages | High | The CTA stops feeling like a meaningful next step | Scroll fatigue and repeated endings | CTA blindness, weaker action hierarchy | Repeated boilerplate creates low unique-content ratio |
| "Licensed clinicians", "secure consultations", "clear next steps" language appears across templates | High | Trust proof becomes generic instead of credible | Claims feel copied, not earned | Trust does not compound because proof is not specific | Duplicate text across route families |
| Country pages use the same module order | High | Country hubs look like clones | Low differentiation between Ireland, Portugal, Spain, Czechia, Romania | Users may doubt local legitimacy | Country pages compete on same "online medical clinic" intent |
| Consultation listing pages reuse review/rating, doctor quote, partners, pricing, process, trust, FAQ, CTA | Critical | Listing pages become bloated and indistinct | Long pages before user gets clear decision support | Users have to scroll through repeated proof instead of comparing options | Thin unique content relative to repeated template chrome |
| Service detail pages use generic fallback paragraphs and facts | Critical | Medical condition pages need specificity and clinical boundaries | Pages feel unfinished or unsafe | Booking conversion depends on confidence; generic copy weakens it | High risk of duplicate/thin medical content |
| Blog articles generated from slugs with identical lead/body | Critical | The blog surface looks fake if indexed or browsed | Education section loses credibility | Blog cannot assist conversion if content is empty | Severe thin-content and cannibalization risk |
| Legal alias pages render as marketing/static pages with TODO copy | Critical | Legal trust is damaged when compliance pages read unfinished | Users see "legacy route" and TODO content | Compliance doubt can stop booking | Indexable duplicate/placeholder pages |

## Repeated Messaging

Most repeated claims:

- "Choose your country and connect with a licensed doctor in minutes."
- "100% online, no waiting rooms, confidential."
- "Licensed clinicians."
- "Secure consultations."
- "Clear follow-up guidance."
- "Patient-first support."
- "Book online and the clinic team will guide you to the right next step."
- "Country-aware routes."
- "Admin-managed pricing/service details."

Problem: these claims are not bad individually. They are overused without evidence. The site repeats the same safety promise, but rarely adds concrete proof such as doctor registration, jurisdiction rules, consultation limits, refund policy, expected response times, prescription limitations, partner pharmacy coverage, or actual review source details.

Recommended cleanup:

- Use "licensed clinicians" only where accompanied by names, registration numbers, country, and verification links.
- Use "secure" only where accompanied by GDPR/process details or privacy explanation.
- Use "clear next steps" only where the page says what next steps actually happen.
- Replace "country-aware route" with real local detail.

## Layout Problems

Repeated layout sequence across major pages:

1. Centered hero or green hero.
2. Card grid.
3. Rating/trust block.
4. How it works.
5. Trust signals.
6. FAQ.
7. Booking CTA.

Severity: High

Why it matters: users stop scanning because every page has the same shape. A medical website needs confidence, but confidence should come from specificity, not repeated modules.

Better pattern:

- Country hub: local access, doctors, country rules, primary care routes.
- Consultation listing: comparison table, eligibility, prices, response time, doctor availability.
- Service detail: symptoms/eligibility, exclusions, preparation, what happens during consult, aftercare.
- Team page: doctor credibility and booking match.
- Booking page: form completion and friction reduction.
- Blog: education and contextual service links.

## Content Problems

Severity: Critical

Core issue: the copy is functional scaffolding, not finished marketing/healthcare content. Multiple files still reveal adapter and migration language:

- "Template-driven marketing page."
- "Admin-managed..."
- "Content pending."
- "TODO: Replace..."
- "Team profile migration pending."
- "Policy placeholder content pending legal copy migration and compliance review."
- "20-30 min (placeholder)."
- "From EUR 45 (placeholder)."

These phrases should not be visible on public pages or metadata. They hurt trust immediately.

## SEO Problems

Severity: Critical

Primary SEO risks:

- Keyword cannibalization across `general-consultation-*`, country homes, `book-online`, and service detail pages.
- Duplicate metadata descriptions such as "Template-driven marketing page", "Consultation listing template", and "Legal/static template page".
- Blog articles are thin and duplicative.
- Service detail pages share fallback copy.
- Legal aliases are rendered instead of redirected or canonical-only.
- Dynamic routes like `/services/[serviceSlug]`, `/service-page/[serviceSlug]`, `/ireland/[serviceSlug]`, and `/ireland-specialist-consultations/[serviceSlug]` overlap in purpose.

Recommended IA rule:

- One canonical URL per service intent.
- Legacy URLs should redirect where possible.
- If preserved for SEO, each must have self-contained, unique medical copy or a canonical tag strategy.

## Design Consistency vs Over-Repetition

Consistency is currently useful for development speed, but harmful for perception. The design system is too literal: same green bands, same rounded cards, same star proof, same CTA banner, same trust badges. Healthcare sites need familiarity, but also need page-specific confidence.

Keep:

- Common header/footer.
- Shared card primitives.
- Shared booking form controls.
- Shared legal article layout.

Reduce:

- Same green promotional band on every page.
- Same CTA block at every ending.
- Same star/rating display repeated in hero, about, consultation listing, and partner proof.
- Same doctor spotlight reused across listings and country pages.

---

# Page-by-Page Audit

## `/` - Global Entry Page

### Purpose
Country and language selection. Intended user intent is to choose the correct clinic location. Primary CTA is entering a local country hub. Clear identity: yes, but only if it stays focused on routing.

### What's Working
The page has a distinct job compared with normal landing pages. It can reduce wrong-country bookings.

### Main Problems
If it inherits too much country-home marketing content, it competes with local home pages. It should stay a gateway, not another homepage.

### Repeated Elements
The phrase "Choose your country and language" overlaps with country CTAs and booking flow copy.

### UX Issues
Avoid adding generic service blocks here. Users arriving here need fast routing.

### Content Issues
Needs clear country availability and language expectations, not broad brand claims.

### SEO Issues
Should target brand/navigation intent, not "online doctor" broadly, or it may compete with country home pages.

### Redundancy Score
4/10

### Recommended Fixes
Keep it as a clean selector. Add short local trust markers per country only if useful.

### Priority
Medium

## Country Home Pages: `/home`, `/home-pt`, `/home-sp`, `/home-cz`, `/home-rm`

### Purpose
Country-specific clinic hub. Intended user intent is "I am in this country and need online care." Primary CTA is GP/general consultation or specialist booking. Clear identity: weak outside Ireland.

### What's Working
The country hub structure is useful. Quick actions, country-specific routes, team links, and service cards can support real navigation.

### Main Problems
The non-Ireland pages are near-clones with country-name substitution. Copy uses phrases like "local route coverage", "visual asset migration continues", and "Team profile migration pending". This reads like internal implementation status.

### Repeated Elements
- Same hero structure.
- Same quick action nav.
- Same "Medical Consultations Wherever You Are" frame for non-Ireland countries.
- Same steps: choose location, choose consultation type, email confirmation.
- Same trust items: licensed clinicians, secure consultations, flexible booking, country hub.
- Same BookingCTA title: "Start Your Online Consultation".

### UX Issues
The page is too long for its unique value. It repeats homepage, service directory, doctor spotlight, partner/trust, and CTA sections in one route.

### Content Issues
Generic local claims without local proof. Ireland has more specific copy and IMC references; other countries rely on generic "licensed clinicians" language.

### SEO Issues
Country pages target similar "online medical clinic with GP and specialist consultation booking" metadata. That can work only if each page contains real local differentiation: language, provider credentials, prescription rules, pricing, coverage, response times, and local pathways.

### Redundancy Score
Ireland: 6/10. Non-Ireland: 9/10.

### Recommended Fixes
- Give each country hub a unique first screen: doctors, language, price range, local service availability, and country-specific compliance.
- Remove generic "migration pending" and "route coverage" language.
- Reduce repeated sections to: hero, local services, local doctors/trust, FAQ, booking.
- Do not reuse the same doctor spotlight on every country page.

### Priority
High

## General Consultation Listings: `/general-consultation-ie`, `/general-consultation-pt`, `/general-consultation-sp`, `/general-consultation-cz`, `/general-consultation-rm`

### Purpose
List general consultation options by country. Intended user intent is to choose a GP/primary-care route. Primary CTA is booking or selecting a service. Clear identity: weak.

### What's Working
Service cards can help comparison if they include duration, price, summary, and images.

### Main Problems
The template adds too much repeated proof around a simple decision task. The listing should prioritize comparison, eligibility, price, next availability, and "which one should I choose?"

### Repeated Elements
- "Your First Visit" badge.
- Doctify rating block.
- Repeated rating breakdown.
- Consultation card grid.
- Standalone "Excellent" card.
- Doctor spotlight with same quote.
- Partner placeholders.
- Pricing section.
- How booking works.
- Trust section.
- FAQ.
- Final booking CTA.

### UX Issues
High scroll fatigue. Users have to pass multiple proof blocks that do not help select a consultation. The repeated doctor quote interrupts the listing task.

### Content Issues
Country pages use generic descriptions and shared FAQ items. The content explains that services are "managed via adapters" or "confirmed during booking" instead of explaining the actual service.

### SEO Issues
Five pages target the same "general consultation" intent with thin country modifiers. The country-specific value is not strong enough yet.

### Redundancy Score
9/10

### Recommended Fixes
- Replace proof-heavy layout with comparison-first layout: condition/use case, duration, price, doctor type, prescription eligibility, booking route.
- Move rating/trust proof into one compact sidebar or strip.
- Remove repeated doctor spotlight and partner blocks from this template.
- Give each country page local FAQ and local metadata.

### Priority
Critical

## Specialist Consultation Listings: `/specialty-ie`, `/specialty-pt`, `/specialty-sp`, `/specialty-cz`, `/specialty-rm`

### Purpose
List specialist categories by country. Intended user intent is to choose a specialist. Primary CTA is service/category selection. Clear identity: currently only Ireland has more meaningful content.

### What's Working
Specialist category cards are a valid pattern for discovery.

### Main Problems
The same consultation listing template is used, so specialist pages feel too close to general consultation pages. Metadata for most country specialty pages says "Consultation listing template."

### Repeated Elements
- Same listing template.
- Same final booking CTA.
- Same trust patterns.
- Same page rhythm as general consultation.

### UX Issues
Specialist discovery needs categories, body-system navigation, urgency/eligibility information, and doctor availability. Current layout treats specialist care like a generic product grid.

### Content Issues
Non-Ireland pages use seeded specialty lists with generic descriptions.

### SEO Issues
Specialist pages can be strong SEO hubs, but current metadata and copy are too generic. They may compete with individual specialist service detail pages.

### Redundancy Score
Ireland: 7/10. Non-Ireland: 9/10.

### Recommended Fixes
- Make specialist pages category hubs, not general listing clones.
- Use specialty-specific sections: "common reasons to book", "when to choose GP first", "available specialists", "pricing by specialty".
- Add internal links to individual specialist service pages with descriptive anchors.

### Priority
High

## Ireland General Service Detail Pages

URLs include `/ireland/medical-consultation`, `/ireland/pain-management-consultation`, `/ireland/travel-consultation`, `/ireland/diabetes-consultation`, `/ireland/weight-loss-consultation`, `/ireland/migraine-consultation`, and related legacy service slugs.

### Purpose
Explain one medical consultation type and move the user to booking. Intended user intent is specific health concern research. Primary CTA is booking. Clear identity: depends on whether admin service content exists; fallback content is weak.

### What's Working
The route structure can support useful SEO service pages if content is unique.

### Main Problems
Fallback copy is repeated:
"Secure online consultation with licensed clinicians. Booking confirms the right next steps for your care."
The same two body paragraphs appear for many service pages when admin content is missing.

### Repeated Elements
- Same hero eyebrow: "Consultation details".
- Same trust badges: online assessment, private and secure, clear follow-up guidance.
- Same key fact structure.
- Same final "Book this consultation" CTA.

### UX Issues
Medical detail pages are too shallow. Users need to know if the service fits their problem, what is excluded, what to prepare, what outcomes are realistic, and when urgent care is needed.

### Content Issues
Critical lack of specificity. For example, diabetes, weight loss, migraine, sick leave, and driving-license certificate pages should not share the same generic content pattern.

### SEO Issues
Critical thin/duplicate medical content risk. Google is stricter for health content. Generic pages can damage overall site trust.

### Redundancy Score
10/10 when fallback copy is used. 6/10 if admin-managed detail content exists.

### Recommended Fixes
- Do not index fallback service detail pages.
- Create a content template per condition: overview, who it is for, who it is not for, what doctor can/cannot do online, preparation, price/duration, aftercare, FAQ.
- Add medical review/credential signals.
- Fix typo route `/ireland/erectyle-dysfunction-consultation` with canonical strategy.

### Priority
Critical

## Ireland Specialist Service Detail Pages

URLs include `/ireland-specialist-consultations/cardiology-consultation`, `/pediatric-consultation`, `/orthopedic-consultation`, `/neurology-consultation`, `/dermatology-consultation`, `/psychiatry-consultation`, and others.

### Purpose
Explain a specialist consultation and lead to booking. Intended user intent is specialist-care research. Primary CTA is booking. Clear identity: weak if fallback content is used.

### What's Working
The URL family is clean and SEO-friendly.

### Main Problems
The page contract is the same as general service details. Specialist pages need a stronger clinical differentiation and referral logic.

### Repeated Elements
- Same HeroSection.
- Same article card.
- Same key facts.
- Same final BookingCTA.

### UX Issues
Users choosing a specialist often have more anxiety and more complex decision criteria. The page does not explain when a specialist is appropriate versus a GP.

### Content Issues
Generic detail copy will be especially harmful here because each specialty has distinct expectations.

### SEO Issues
High cannibalization risk with `/specialty-ie` and blog posts about cardiology/online consultation.

### Redundancy Score
9/10

### Recommended Fixes
- Add specialty-specific sections and doctor match info.
- Use specialist-specific FAQ.
- Link from each specialty card to only one canonical detail page.

### Priority
Critical

## Service Alias Families: `/service-page/[serviceSlug]`, `/services/[serviceSlug]`, `/home-health-tests/[testSlug]`

### Purpose
Dynamic service detail routing. Intended user intent varies by service. Primary CTA is booking. Clear identity: unclear because multiple URL families can represent similar service content.

### What's Working
These routes support admin-managed service records.

### Main Problems
The site has overlapping service detail families. Without strict canonical rules, users and search engines can encounter duplicate or near-duplicate pages.

### Repeated Elements
Same ServiceDetailTemplate and fallback behavior.

### UX Issues
Route logic is not visible to users, but duplicated URL families can create inconsistent navigation and backlinks.

### Content Issues
Fallback content is too generic for dynamic service pages.

### SEO Issues
Critical canonicalization risk.

### Redundancy Score
8/10

### Recommended Fixes
- Define canonical service URL rules by service kind.
- Redirect non-canonical dynamic families when a canonical route exists.
- Noindex fallback service pages.

### Priority
Critical

## Team Pages: `/ireland-team`, `/portugal-team`, `/spain-team`, `/czechia-team`, `/romania-team`

### Purpose
Build clinician trust and help users choose a doctor/team. Primary CTA is booking. Clear identity: weak for countries with thin doctor data.

### What's Working
The team page is a valuable trust asset. Doctor profiles can strongly improve healthcare conversion.

### Main Problems
The template ends with generic trust/social proof/country links, and the doctors intro says content is "country-managed through content adapters and future admin data."

### Repeated Elements
- Same TeamHero.
- Same FeaturedDoctor pattern.
- Same DoctorsSection intro.
- Same TrustBar.
- Same BookingCTA.
- Same SocialProof.
- Same CountryLinks.

### UX Issues
Doctor credibility gets diluted by boilerplate sections. Users want doctor qualifications, languages, availability, specialties, and registration links.

### Content Issues
Avoid internal content-management language. It tells users the page is unfinished.

### SEO Issues
Team pages should target country + doctors/online clinic trust. Current metadata says "Doctor/team listing template for [country]", which is not search-facing copy.

### Redundancy Score
8/10

### Recommended Fixes
- Make each team page doctor-first and country-specific.
- Remove generic SocialProof/CountryLinks if they repeat footer/nav.
- Add language, registration, specialty, availability, and booking relevance per doctor.

### Priority
High

## Doctor Profile Pages

URL families: `/ireland-team/[doctorSlug]`, `/ireland-doctors/[doctorSlug]`, plus other country team dynamic profiles.

### Purpose
Establish individual clinician trust and route users to booking. Primary CTA is booking or profile-specific consultation. Clear identity: depends on doctor data quality.

### What's Working
Doctor profile pages are strategically important for trust and E-E-A-T.

### Main Problems
Fallback bio says the profile "will be synced with final admin-managed profile details." That is not public-facing copy.

### Repeated Elements
Same profile template, same fallback specialties, same booking guidance.

### UX Issues
If doctor profiles are thin, they create distrust instead of trust.

### Content Issues
Profiles need real credentials, registration links, languages, specialties, availability, and patient-facing bio.

### SEO Issues
Duplicate doctor routes like `/ireland-team/[doctorSlug]` and `/ireland-doctors/[doctorSlug]` need canonical handling.

### Redundancy Score
7/10

### Recommended Fixes
- Pick one canonical doctor URL family.
- Hide or noindex fallback doctor profiles.
- Require complete profile fields before publication.

### Priority
High

## Static Marketing Pages: `/about`, `/careers`, `/gift-card`, `/plans-pricing`, `/pricing-plans/list`, `/partner-clinics`, `/corporate-plans`

### Purpose
Support secondary business questions. Primary CTA is usually booking. Clear identity: weak on most pages.

### What's Working
Pages are lightweight and consistently structured.

### Main Problems
The same `StaticMarketingTemplate` makes these pages feel like thin variations of the same page. Most have three generic feature cards and the same bottom CTA.

### Repeated Elements
- Hero eyebrow: "Online care made simple".
- Trust badges: licensed clinicians, secure consultations, patient-first support.
- Intro card.
- Three feature cards.
- Related links card.
- Default bottom CTA.

### UX Issues
Every static page reads like a placeholder landing page. Pricing, gift cards, careers, and partner clinics require different UX patterns.

### Content Issues
Examples:
- Gift Card says final redemption policy will be confirmed later.
- Careers says hiring details will be managed later.
- Partner Clinics says detailed listings will be managed later.
- Corporate Plans says final plan details are future-managed.

### SEO Issues
Metadata repeats "Template-driven marketing page." Several pages are too thin to rank or convert.

### Redundancy Score
8/10

### Recommended Fixes
- Redesign each page around its real intent.
- Pricing needs price tables and comparison, not generic feature cards.
- Gift card needs purchase/redeem policy and trust.
- Partner clinics needs locations/partners or should stay hidden.
- Corporate plans needs B2B funnel, eligibility, contact path, and proof.

### Priority
High

## Online Prescription, Home Delivery, Home Health Test

URLs: `/online-prescription`, `/home-delivery`, `/home-health-test`

### Purpose
List specialized service categories and lead to booking. Primary CTA is booking/selecting service. Clear identity: moderate, but still template-heavy.

### What's Working
These pages use service data and have more tailored steps/trust sections than generic static pages.

### Main Problems
They still use ConsultationListingTemplate, so they visually resemble general/specialist consultation listings.

### Repeated Elements
- Listing grid.
- Three-step process.
- Trust cards.
- Shared FAQ items from template data.
- Final BookingCTA.

### UX Issues
Different service types need different decision support. Prescription, delivery, and health tests are not all "consultation listings".

### Content Issues
Some copy says "Admin-managed" in metadata and page descriptions. That is internal language.

### SEO Issues
These pages can target distinct transactional keywords, but metadata is operational rather than patient-facing.

### Redundancy Score
7/10

### Recommended Fixes
- Give each its own template variant.
- Prescription page: eligibility, exclusions, medication refill rules, clinician review limits.
- Home delivery page: coverage, pharmacy partners, delivery areas, timing.
- Health test page: test types, sample flow, result interpretation, follow-up.

### Priority
High

## Booking Page: `/book-online`

### Purpose
Capture booking requests. Intended user intent is ready-to-book. Primary CTA is form submission. Clear identity: yes.

### What's Working
The form is concrete and functional. Signed-in users can get prefilled fields.

### Main Problems
The page still opens with HeroSection and ends with another BookingCTA. For a conversion form, the form should be the main experience.

### Repeated Elements
- HeroSection trust badges.
- Trust cards below form.
- Bottom CTA back to same form.

### UX Issues
Ready-to-book users should reach the form faster. The bottom "Need urgent support?" CTA repeats the same action instead of handling urgent-care safety.

### Content Issues
"Need urgent support?" is risky wording for a medical site because urgent support may mean emergency care, not booking a routine consultation.

### SEO Issues
Booking page should not compete with service pages. It should be optimized for branded/direct conversion.

### Redundancy Score
6/10

### Recommended Fixes
- Move form higher.
- Replace final CTA with safety guidance and contact/urgent-care disclaimer.
- Reduce generic trust cards to one privacy/response-time strip.

### Priority
High

## FAQ Page: `/frequent-asked-questions`

### Purpose
Answer common booking/consultation questions. Primary CTA is booking. Clear identity: weak because it uses StaticMarketingTemplate.

### What's Working
FAQ page is useful if questions are real and comprehensive.

### Main Problems
Only two common questions are defined in marketing data, plus a generic intro.

### Repeated Elements
StaticMarketingTemplate hero, trust badges, intro, bottom CTA.

### UX Issues
FAQ should be searchable or grouped by topic: booking, pricing, prescriptions, privacy, refunds, countries, doctors.

### Content Issues
Too shallow. It does not answer enough objections.

### SEO Issues
FAQ page has weak metadata and thin body.

### Redundancy Score
7/10

### Recommended Fixes
- Expand FAQ into topic groups.
- Use real objections from booking flow.
- Add internal links to relevant pages.

### Priority
Medium

## Blog Index: `/blog`

### Purpose
Education and organic discovery. Primary CTA is currently "Book Online". Clear identity: partially.

### What's Working
Blog index has patient education positioning.

### Main Problems
The post cards are generated from route slugs and use the same excerpt for every post.

### Repeated Elements
Every visible post excerpt: "Patient-focused article introducing online consultation workflows, booking guidance, and care navigation."

### UX Issues
Users cannot tell why one article is different from another.

### Content Issues
No unique excerpts in seed data. `frontend/data/blog-posts.ts` is empty.

### SEO Issues
Blog index sends weak relevance signals and may expose thin article pages.

### Redundancy Score
9/10

### Recommended Fixes
- Populate real blog metadata: excerpt, category, reviewed-by, updated date.
- Hide posts without real bodies.
- Add category filters only when content volume supports them.

### Priority
Critical

## Blog Articles: all `/post/...` routes

### Purpose
Answer specific educational queries and guide to relevant service pages. Primary CTA should be contextual. Clear identity: no.

### What's Working
The route inventory has useful article topics.

### Main Problems
All posts render the slug as title plus the same lead and same two paragraphs.

### Repeated Elements
- Same lead.
- Same body paragraph 1.
- Same body paragraph 2.
- Same article card layout.

### UX Issues
Articles feel empty. Users arriving from search would bounce.

### Content Issues
Critical placeholder content. Topics like Mounjaro, Ozempic, blood pressure, CRP, ECG, and cardiology need clinically careful content.

### SEO Issues
Critical thin-content and YMYL quality risk. Do not index these until real content exists.

### Redundancy Score
10/10

### Recommended Fixes
- Noindex all generated blog articles until real content exists.
- Prioritize 5 highest-intent articles and write full content.
- Add medical review metadata and citations.
- Link articles to specific relevant service pages, not generic booking only.

### Priority
Critical

## Category Pages: `/category/all-products`, `/category/health-education`, `/category/telemedicine-devices`

### Purpose
Group content or services. Primary CTA varies. Clear identity: weak.

### What's Working
The categories can support browse/navigation.

### Main Problems
They are still static template pages with broad feature cards.

### Repeated Elements
Same hero + intro + feature-card + bottom-CTA structure.

### UX Issues
Category pages do not behave like useful category pages. They do not show enough real items.

### Content Issues
"All products and services" overlaps with `/plans-pricing`, `/general-consultation-ie`, `/specialty-ie`, and `/book-online`.

### SEO Issues
Thin category pages can create low-quality indexed pages.

### Redundancy Score
8/10

### Recommended Fixes
- Either make them real indexes with item lists or remove/noindex.
- Use categories to support blog/service IA only if enough content exists.

### Priority
Medium

## Legal Pages: `/legal-notices`, `/term-and-conditions`, `/privacy`, `/return-and-refund-policy`, `/cookies-policy`

### Purpose
Compliance and trust. Primary CTA should not be booking. Clear identity: partly.

### What's Working
LegalPageTemplate separates legal content from marketing pages.

### Main Problems
Legal content is placeholder text in `buildLegalCopy`. That is unacceptable for public compliance pages.

### Repeated Elements
Same legal hero, same article card, same "Status" and "Scope" structure.

### UX Issues
Legal pages should be plain, direct, and complete. Current pages feel unfinished.

### Content Issues
"Policy placeholder content pending legal copy migration and compliance review."

### SEO Issues
Trust signals suffer. Search engines and users can detect placeholder legal content.

### Redundancy Score
9/10

### Recommended Fixes
- Replace with approved legal copy.
- Remove booking CTA from legal hero or make it secondary/footer-only.
- Add last updated date and responsible entity.

### Priority
Critical

## Legal Alias Pages: `/terms-and-conditions`, `/privacy-policy`, `/copy-of-privacy-policy`, `/refund-policy`, `/gdpr-compliance`

### Purpose
Legacy compatibility. Primary CTA should be redirect/canonical. Clear identity: no.

### What's Working
Canonical paths are tracked in route registry.

### Main Problems
They render as StaticMarketingTemplate pages with "legacy route" and TODO copy.

### Repeated Elements
Same "Legacy compatibility route" intro and TODO body.

### UX Issues
Users see unfinished internal language.

### Content Issues
TODO copy is public-facing.

### SEO Issues
Critical duplicate/placeholder legal pages.

### Redundancy Score
10/10

### Recommended Fixes
- Replace with 301 redirects when possible.
- If redirects cannot be used, render a minimal canonical notice with noindex.

### Priority
Critical

## Auth Pages: `/login`, `/register`, `/forgot-password`

### Purpose
Account access. Primary CTA is authentication. Clear identity: yes.

### What's Working
Focused forms and trust panel.

### Main Problems
Trust language repeats the public marketing claims. The login page does not need more "licensed clinicians"; it needs account security, session persistence, and portal clarity.

### Repeated Elements
"Secure & confidential", "Licensed clinicians", "Clear next steps".

### UX Issues
Auth pages should be utilitarian. Marketing blocks can distract from task completion.

### Content Issues
Trust panel could be more account-specific.

### SEO Issues
These pages should remain blocked from indexing, which robots config already suggests.

### Redundancy Score
5/10

### Recommended Fixes
- Keep auth pages lean.
- Replace healthcare trust copy with account-specific reassurance.

### Priority
Low

## Account Pages: `/account`, `/account/bookings`

### Purpose
Patient session and booking history. Primary CTA is viewing/managing bookings. Clear identity: moderate.

### What's Working
These pages are functional and less marketing-heavy.

### Main Problems
If the public navbar does not reflect session state, users think they are logged out when navigating back.

### Repeated Elements
Limited; operational consistency is acceptable here.

### UX Issues
Need clear portal entry and persistent avatar/menu.

### Content Issues
No major content redundancy.

### SEO Issues
Should not be indexed.

### Redundancy Score
3/10

### Recommended Fixes
- Maintain session-aware header.
- Keep account UI restrained and task-focused.

### Priority
Medium

## Admin App: `/admin/*`

### Purpose
Manage countries, services, doctors, content pages, FAQs, assets, blog posts, appointments, and pricing. Primary CTA depends on admin task. Clear identity: functional.

### What's Working
Operational consistency is useful here. Reused forms/tables are not the same problem as public-site marketing repetition.

### Main Problems
Admin-created public content can leak internal phrases into public pages if placeholders are not gated.

### Repeated Elements
Repeated gh-card tables/forms are acceptable.

### UX Issues
Admin surfaces should flag incomplete public content before publication.

### Content Issues
Need publish-readiness checks: no TODO, no placeholder, no migration, no admin-managed wording, no missing SEO title/description.

### SEO Issues
Admin content controls public SEO. Missing validation creates site-wide SEO debt.

### Redundancy Score
2/10 for admin UI; 8/10 for public content governance risk.

### Recommended Fixes
- Add content quality validation before active/public publishing.
- Add status badges for "draft", "ready", "missing SEO", "placeholder copy".

### Priority
High

---

# Cross-Page Duplication Matrix

| Page | Duplicate With | Repeated Sections | Severity | Recommended Action |
|---|---|---|---|---|
| `/home-pt`, `/home-sp`, `/home-cz`, `/home-rm` | Each other | Country hero, steps, trust, booking CTA, doctor spotlight | High | Rewrite country hubs with local details |
| `/general-consultation-*` | Each other | Hero, rating, card grid, quote, pricing, steps, trust, FAQ, CTA | Critical | Build comparison-first consultation template |
| `/specialty-*` | Each other and `/general-consultation-*` | Same listing template and CTA stack | High | Create specialist-specific category template |
| `/ireland/*consultation` | Other service details | Same fallback description/body/key facts/CTA | Critical | Replace fallback copy or noindex |
| `/ireland-specialist-consultations/*` | Other specialist details | Same ServiceDetailTemplate fallback | Critical | Add specialty-specific content |
| `/services/[serviceSlug]` | `/service-page/[serviceSlug]`, `/ireland/[serviceSlug]` | Same dynamic service detail route intent | Critical | Define canonical URL family and redirect duplicates |
| `/about`, `/careers`, `/gift-card`, `/partner-clinics`, `/corporate-plans` | Each other | StaticMarketingTemplate hero, intro card, feature grid, CTA | High | Redesign each page around unique intent |
| `/plans-pricing` | `/pricing-plans/list` | Pricing/plans intent and booking CTA | High | Merge into one pricing page |
| `/online-prescription`, `/home-delivery`, `/home-health-test` | Consultation listing pages | Same listing, how-it-works, trust, FAQ, CTA | High | Build service-type templates |
| `/blog` | All generated post pages | Same excerpts and education CTA | Critical | Add real article metadata |
| `/post/*` | Every other `/post/*` | Same lead and body | Critical | Noindex until full content exists |
| `/privacy`, `/privacy-policy`, `/copy-of-privacy-policy`, `/gdpr-compliance` | Each other | Privacy/legal intent and placeholder legacy copy | Critical | Redirect/noindex aliases |
| `/term-and-conditions`, `/terms-and-conditions` | Each other | Terms intent | Critical | Redirect alias |
| `/return-and-refund-policy`, `/refund-policy` | Each other | Refund intent | Critical | Redirect alias |
| Team pages | Each other | TeamHero, doctor cards, TrustBar, CTA, SocialProof, CountryLinks | High | Make doctor/team data country-specific |

---

# Consolidation Recommendations

## Pages That Should Merge

| Current Pages | Recommendation | Reason |
|---|---|---|
| `/plans-pricing` and `/pricing-plans/list` | Merge into `/plans-pricing` | Same user intent: understand pricing |
| `/privacy-policy`, `/copy-of-privacy-policy`, `/gdpr-compliance` | Redirect or noindex to `/privacy` | Duplicate privacy/compliance intent |
| `/terms-and-conditions` | Redirect to `/term-and-conditions` or fix canonical URL naming | Duplicate terms intent |
| `/refund-policy` | Redirect to `/return-and-refund-policy` | Duplicate refund intent |
| `/service-page/[serviceSlug]` and `/services/[serviceSlug]` | Pick one canonical dynamic service route | Avoid duplicate service detail pages |
| `/ireland-team/[doctorSlug]` and `/ireland-doctors/[doctorSlug]` | Pick one canonical doctor URL family | Avoid doctor profile duplication |

## Sections That Should Be Removed

- Remove doctor spotlight from generic consultation listing pages.
- Remove partner placeholder blocks from consultation listing pages unless real logos/assets exist.
- Remove standalone "Excellent" rating card when rating already appears in hero.
- Remove repeated final BookingCTA from legal pages.
- Remove repeated bottom CTA from static pages where it repeats the hero CTA without adding new decision support.
- Remove internal migration/TODO/status copy from public content.

## Content That Should Be Rewritten

- Every fallback service detail paragraph.
- Every generated blog article body.
- All legal policy copy.
- Non-Ireland country home copy.
- Pricing, gift card, partner clinics, careers, corporate plans.
- FAQ copy, grouped by user concern.

## Components That Need Redesign

- `ConsultationListingTemplate`: split into variants by service type.
- `BookingCTA`: create quieter variants or reduce usage.
- `StaticMarketingTemplate`: too generic for pricing/careers/gift-card/partners.
- `CountryHomeTemplate`: create country-specific content slots.
- `ServiceDetailTemplate`: add medical-specific structure.

## Areas Needing Stronger Differentiation

- Country-specific pages.
- GP/general vs specialist.
- Prescription vs delivery vs health tests.
- Category pages vs blog vs service pages.
- Pricing vs corporate plans.
- Legal canonical pages vs legacy aliases.

---

# Component Cleanup Plan

## Components to Keep

| Component | Keep Because | Needed Change |
|---|---|---|
| `HeroSection` | Useful base pattern | Add variants and stop using same trust badges everywhere |
| `BookingFormTemplate` | Functional conversion surface | Move form higher and reduce duplicate CTA |
| `ServiceDetailTemplate` | Good route shell | Add medical content slots and noindex fallback state |
| `DoctorProfileTemplate` | Strategically important | Require complete doctor data |
| `DoctorsSection` | Useful trust builder | Avoid generic adapter intro |
| `FAQSection` | Useful objection handling | Use page-specific questions |

## Components to Redesign

| Component | Problem | Redesign Direction |
|---|---|---|
| `ConsultationListingTemplate` | Too bloated and repeated | Comparison-first, compact trust, service-specific variants |
| `BookingCTA` | Overused and too visually loud | Add compact inline CTA and footer-only CTA variants |
| `StaticMarketingTemplate` | Creates thin cloned pages | Replace with page-specific templates |
| `CountryHomeTemplate` | Too many repeated modules | Create country-specific evidence slots |
| `BlogArticleTemplate` | Too simple for medical content | Add reviewed-by, update date, table of contents, contextual CTA |

## Components to Delete or Stop Using Publicly

| Component/Pattern | Action |
|---|---|
| Legacy StaticMarketingTemplate pages with TODO copy | Replace with redirects/noindex |
| Partner text placeholders | Remove unless real partner proof exists |
| Duplicate Doctify star blocks | Consolidate into one proof module |
| Same doctor quote on multiple listings | Remove except where attached to a real doctor profile |

## Components Overused Across Pages

- `BookingCTA`
- `HeroSection`
- `TrustSignals`
- `HowItWorks`
- `ConsultationListingTemplate`
- `StaticMarketingTemplate`
- Rounded card grids
- Star rating blocks

---

# UX Improvement Plan

## Structural Improvements

1. Create a canonical IA map:
   `/country-home` -> `/general-consultation-country` -> `/service-detail` -> `/book-online`

2. Separate service discovery from service proof:
   Listing pages should compare options first. Proof should be compact and contextual.

3. Collapse legacy aliases:
   Keep legacy URL value through redirects/canonicals, not full placeholder pages.

4. Promote doctor trust where it matters:
   Doctor/team pages and service detail pages should carry clinician proof. Generic listing pages should not repeat unrelated doctor quotes.

## Better Page Flow Recommendations

Country home:
1. Country-specific hero with local proof.
2. Fast path: GP, specialist, prescription/support.
3. Local doctors/languages.
4. Local FAQ.
5. Compact CTA.

Consultation listing:
1. H1 and one-line decision framing.
2. Filter/search/category chips.
3. Comparison cards/table.
4. Eligibility and pricing notes.
5. Compact trust strip.
6. FAQ.

Service detail:
1. Specific service H1.
2. Who it is for / not for.
3. What happens online.
4. Price/duration/doctor type.
5. Preparation.
6. Aftercare.
7. Booking CTA.

Blog article:
1. Real article content.
2. Medical reviewer/update info.
3. Educational structure.
4. Contextual service links.
5. Booking CTA only when relevant.

## Hierarchy Fixes

- Use one primary CTA per page.
- Reduce full-width CTA repetition.
- Make pricing/duration/eligibility visible before social proof on service-selection pages.
- Do not use same green band for every major trust or CTA section.
- Keep legal pages plain and complete.

## Make Pages Feel Unique

- Country pages: local rules, doctor languages, registration, price ranges, local partner coverage.
- Service details: condition-specific clinical scope.
- Specialist pages: category navigation and specialist decision support.
- Static pages: unique template by user intent.
- Blog: topical education with medical review.

---

# Content Rewrite Strategy

## Tone Improvements

Current tone: generic healthcare SaaS scaffolding.  
Target tone: specific, clinically responsible, calm, practical.

Avoid:
- "Patient-first support"
- "Clear next steps"
- "Country-aware route"
- "Admin-managed"
- "Template-driven"
- "Future content workflows"
- "Migration pending"

Use:
- "A doctor reviews your symptoms and medical history before advising next steps."
- "If symptoms suggest urgent care, do not use online booking."
- "Available in Ireland with English-speaking clinicians."
- "Prescription decisions are made by the clinician after review."

## Messaging Cleanup

Current repeated message:
"Choose your country and connect with a licensed doctor in minutes."

Better page-specific versions:

- Country home: "Book an online consultation with a clinician licensed for care in Ireland."
- General consultation: "Choose a GP consultation for common symptoms, follow-up advice, sick notes, referrals, and routine care questions."
- Specialist consultation: "Choose a specialist when your concern needs focused review beyond a first GP assessment."
- Prescription: "Start with a clinical review. Prescriptions are issued only when appropriate and legally permitted."
- Home delivery: "Delivery availability depends on location and partner pharmacy coverage."
- Booking page: "Submit your request. The clinic team confirms the right appointment route and next steps."

## Reduce Fluff

Remove any section that does not answer one of these:

- Can I use this service?
- What does it cost?
- How long does it take?
- Who provides care?
- What happens after I book?
- What are the limits?
- Why should I trust this?

## Improve Specificity

Add:

- Country and language availability.
- Doctor registrations and councils.
- Service duration and price.
- Prescription/referral limits.
- Response time expectations.
- Local partner/coverage details.
- Real review source and count.
- Last reviewed/updated dates for medical content.

## Reduce Repetition

Create a content rule:

Each page gets one main trust claim, one main CTA, and one page-specific FAQ set. Shared trust blocks should be compact and not repeated in hero, body, and footer.

---

# Priority Action Roadmap

| Priority | Issue | Recommended Fix | Estimated Impact |
|---|---|---|---|
| Critical | Blog articles are placeholder duplicates | Noindex/hide generated posts until real content exists | Very high SEO risk reduction |
| Critical | Service detail fallback copy duplicated across medical pages | Add noindex for fallback pages and write unique service content | Very high trust and SEO improvement |
| Critical | Legal pages and aliases contain placeholder/TODO copy | Replace legal copy and redirect/noindex aliases | Very high trust/compliance improvement |
| Critical | Multiple service URL families overlap | Define canonical URL rules and redirects | High SEO cleanup |
| High | General consultation pages are bloated clones | Redesign as comparison-first pages | High conversion improvement |
| High | Country home pages are cloned outside Ireland | Add local proof/content by country | High trust and SEO improvement |
| High | Static marketing pages use generic feature grids | Create page-specific templates for pricing/gift/corporate/partners/careers | Medium-high conversion improvement |
| High | Repeated BookingCTA creates CTA fatigue | Add compact CTA variants and remove unnecessary instances | Medium-high UX improvement |
| High | Team pages expose internal adapter/future-data language | Replace with public-facing doctor/team copy | High trust improvement |
| High | Metadata repeats "Template-driven" and "Consultation listing template" | Write unique titles/descriptions per route | High SEO improvement |
| Medium | FAQ content is thin and reused | Build topic-based FAQ library | Medium conversion and SEO improvement |
| Medium | Category pages are thin | Convert to real indexes or noindex/remove | Medium SEO cleanup |
| Medium | Doctor profile duplicate route families | Pick canonical doctor profile route | Medium SEO cleanup |
| Low | Auth pages repeat marketing trust copy | Make auth copy account/security specific | Low-medium UX improvement |

---

# Practical First Sprint

Recommended first implementation sprint:

1. Add a publication guard or audit script that flags public copy containing `TODO`, `placeholder`, `template-driven`, `admin-managed`, `migration`, `future content`, or `adapter`.
2. Noindex or hide generated blog posts and fallback service pages.
3. Redirect/noindex legal alias pages.
4. Replace legal canonical page copy.
5. Rewrite `/general-consultation-ie`, `/specialty-ie`, and `/book-online` because these are most likely to affect conversion.
6. Redesign `ConsultationListingTemplate` to remove duplicate doctor quote, partner placeholders, duplicate rating block, and repeated CTA sections.
7. Create unique metadata for all primary routes.

This sequence removes the most damaging trust and SEO problems before investing in broader visual redesign.
