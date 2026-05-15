# Wix to Coded Platform: Adjusted Product Plan

**Plan date:** 2026-05-15  
**Current live reference:** https://www.myglobalhealth.online  
**Target platform:** Custom Next.js frontend + backend/admin in this repo  
**Brand:** Global Health  
**Phase 1 scope:** Country-first marketing website + Super Admin portal  
**Not a goal:** Rebuilding Wix feature-for-feature

---

## 1. Product Direction

This rebuild should **not** copy Wix page-for-page or feature-for-feature.

Wix is reference only for:

- current services offered
- current clinic/country coverage
- current business positioning
- current content themes

The new platform should follow a different product model:

- user lands on a global entry page
- user selects **country**
- user selects **language**
- system opens the website for that specific clinic context
- from that point onward, the entire experience is scoped to that country clinic
- navbar still allows switching **country** and **language**
- all main navigation, pages, content, and service discovery remain country-specific

This means the new platform is a **multi-country clinic system**, not a clone of the current Wix site.

---

## 2. Core Flow

### 2.1 Entry flow

Phase 1 public flow should be:

1. Visitor lands on global entry page.
2. Visitor selects country.
3. Visitor selects language.
4. Visitor is taken into that clinic website context.
5. All navigation from there is specific to that country clinic.

### 2.2 In-site behavior

Once inside a clinic:

- homepage is for that clinic only
- doctor listing/profile pages are for that clinic only
- general consultation pages are for that clinic only
- specialist consultation pages are for that clinic only
- content and CTA flow should speak only to that selected clinic/country
- navbar includes country switcher and language switcher
- switching country changes the full clinic context
- switching language changes presentation, not business scope

### 2.3 What this avoids

This avoids Wix problems such as:

- duplicated country pages with inconsistent structure
- mixed country messaging on shared pages
- scattered routing like `/home-sp`, `/general-consultation-ie`, `/specialty-rm`
- product sprawl from legacy offers that are not part of the new build

---

## 3. Phase 1 Website Scope

Phase 1 should stay intentionally small.

### 3.1 Required public page groups

For each country clinic, Phase 1 needs these admin-driven page groups:

- homepage
- doctors
- general consultation
- specialist consultation

These are the minimum core surfaces.

### 3.2 Phase 1 page intent

**Homepage**

- clinic landing page for selected country
- trust, positioning, CTA, service overview
- should explain what this clinic offers in that country

**Doctors**

- doctor directory and/or profiles for that clinic
- trust-building surface
- clinic-specific doctor content only

**General consultation**

- primary service landing page for standard consultation flow
- country-specific copy, pricing, CTA, details

**Specialist consultation**

- service landing page for specialist care
- country-specific structure, specialties, CTA, details

### 3.3 Optional later additions

Not required in Phase 1 unless business confirms them:

- subscriptions
- pricing plans
- gift cards
- referral system
- loyalty system
- health tests
- home delivery
- partner clinics
- portal/account
- doctor dashboard
- full blog
- large FAQ system

If added later, architecture should support them, but Phase 1 should not be shaped around them.

---

## 4. Information Architecture

### 4.1 Recommended route model

Use country-first routing.

Recommended shape:

```text
/
/select-country
/[country]
/[country]/doctors
/[country]/doctors/[slug]
/[country]/general-consultation
/[country]/specialist-consultation
```

If language must also be explicit in URL:

```text
/
/select-country
/[country]/[lang]
/[country]/[lang]/doctors
/[country]/[lang]/doctors/[slug]
/[country]/[lang]/general-consultation
/[country]/[lang]/specialist-consultation
```

### 4.2 Routing principle

Country is primary context. Language is secondary context.

- country determines clinic/business context
- language determines presentation layer
- page set should remain structurally same within each country

### 4.3 Navigation principle

Inside a clinic, navbar should focus only on that clinic's pages:

- Home
- Doctors
- General Consultation
- Specialist Consultation
- Country switcher
- Language switcher
- Primary CTA

Do not overload nav with Wix legacy items that are not in new Phase 1 scope.

---

## 5. UX Direction

### 5.1 UX goal

The new UX should feel like entering a specific clinic, not browsing a messy multi-country brochure.

### 5.2 Key UX rules

- country selection happens first
- language selection happens immediately after or within the same entry flow
- once inside, user should not wonder which clinic they are browsing
- all trust content should match selected country
- all CTAs should route within that clinic context
- service discovery should stay simple in Phase 1

### 5.3 Homepage UX

Homepage should answer:

1. What clinic is this?
2. What core services are available here?
3. Why should the user trust this clinic?
4. What should the user do next?

### 5.4 Navigation UX

Navbar should not mirror Wix.

It should:

- be lighter
- be clearer
- avoid clutter
- avoid pages not in current build scope
- allow clinic switching without confusing main navigation

### 5.5 Country switch UX

Switching country should be treated as changing clinic context, not just changing locale.

That means:

- homepage changes
- doctor set changes
- consultation pages change
- service messaging changes
- legal/compliance details can change

---

## 6. Admin Portal Scope

Phase 1 admin should manage the minimum content model required for the country-based clinic website.

### 6.1 Admin-managed content areas

Admin should manage:

- countries
- languages available per country
- homepage content per country
- doctors per country
- general consultation page content per country
- specialist consultation page content per country
- assets/media
- SEO fields

### 6.2 Required admin capabilities

For each managed surface, admin should support:

- draft/publish
- title/subtitle/hero content
- body sections
- CTA labels/targets
- SEO title
- SEO description
- social/share image
- ordering/sorting where needed

### 6.3 Doctor admin requirements

Doctor records should support:

- full name
- slug
- photo
- country
- specialty
- short summary
- long bio
- languages
- qualifications
- registration/licensing info if needed
- SEO metadata
- publish status

### 6.4 Consultation page admin requirements

General consultation page and specialist consultation page should support:

- country
- locale/language version
- hero section
- trust sections
- content sections
- pricing text or pricing notes if applicable
- CTA blocks
- FAQs if needed
- SEO metadata
- publish status

---

## 7. Recommended Data Model Direction

The data model should support a small but expandable clinic system.

### 7.1 Core entities for Phase 1

Minimum recommended entities:

- `Country`
- `CountryLocale` or equivalent
- `Doctor`
- `DoctorSpecialty` or specialty tagging
- `Page`
- `PageTranslation` or localized page fields
- `Asset`
- `SEO fields` on page-like entities

### 7.2 Suggested page model

Instead of hardcoding every content block as separate one-off structures, use a manageable page model for Phase 1.

Suggested logical page types:

- `HOME`
- `GENERAL_CONSULTATION`
- `SPECIALIST_CONSULTATION`

Each page should be scoped by:

- country
- language/locale
- page type

This keeps Phase 1 simple and extensible.

### 7.3 Doctor model direction

Doctors should be country-scoped.

If later needed, same doctor can appear in multiple countries through a join model, but Phase 1 can stay simpler if business rules allow one primary clinic/country per doctor.

### 7.4 What not to force into Phase 1 schema

Do not shape Phase 1 around Wix legacy features unless approved:

- subscription plans
- referral programs
- loyalty logic
- e-commerce product catalog
- partner clinic marketplace
- patient portal objects
- doctor dashboard objects

Keep room for them later, but do not let them distort the first build.

---

## 8. SEO Direction

Phase 1 still needs strong SEO, but around the smaller real scope.

### 8.1 SEO priorities

- clean country-first URLs
- localized metadata
- unique home page content per country
- unique consultation page content per country
- doctor profile SEO
- canonical tags
- `hreflang`
- sitemap generation
- structured data where relevant

### 8.2 Most important public SEO pages in Phase 1

- country homepage
- doctor pages
- general consultation pages
- specialist consultation pages

### 8.3 Avoid Wix carry-over mistakes

Do not carry over:

- duplicate locale homepage patterns
- duplicated filler content
- overbuilt page inventory without strategy
- weak page identity across templates

---

## 9. Migration Strategy

### 9.1 What to keep from Wix

Keep only what supports the new product:

- countries served
- real doctor/service content
- useful trust content
- legal/compliance content that remains valid after review
- existing business messaging that is still accurate

### 9.2 What not to copy from Wix by default

Do not automatically rebuild:

- subscriptions
- pricing plan system
- Wix booking structure
- loyalty pages
- referral pages
- gift card flow
- unused or weak legacy pages
- overgrown service sprawl

### 9.3 Migration principle

Wix is source material, not target structure.

The new coded platform should be:

- cleaner
- smaller
- country-scoped
- admin-driven
- easier to grow intentionally

---

## 10. Recommended Phase 1 Deliverables

### 10.1 Public website

- global country/language selection entry page
- country-scoped homepage
- country-scoped doctors listing/profile flow
- country-scoped general consultation page
- country-scoped specialist consultation page
- navbar with country switcher and language switcher
- SEO setup

### 10.2 Admin portal

- manage countries
- manage languages per country
- manage homepage content
- manage doctor content
- manage general consultation content
- manage specialist consultation content
- manage assets
- manage SEO metadata

### 10.3 Technical

- stable country-first routing
- structured content model
- localization support
- publish workflow
- sitemap
- canonical tags
- `hreflang`

---

## 11. Priority Decisions Needed

Before implementation, these decisions should be finalized:

1. Should language be part of URL or session/state only?
2. Is the entry experience two-step (country, then language) or one combined selector?
3. Are doctor pages required in Phase 1 as listing only, or listing + profile pages?
4. Will consultation pages be single landing pages, or support multiple modular sections from admin?
5. Will pricing be shown in Phase 1, and if yes, where is source of truth?
6. Will booking CTA link out, open form, or stay informational in Phase 1?
7. Which countries are in launch scope on day one?

---

## 12. Adjusted Summary

The rebuild should be treated as a **new country-based clinic platform**, not a cloned Wix website.

Phase 1 should stay focused on:

- country selection
- language selection
- one clinic context at a time
- homepage
- doctors
- general consultation
- specialist consultation
- admin management of those surfaces

Everything else should be considered optional expansion after the core model is stable.
