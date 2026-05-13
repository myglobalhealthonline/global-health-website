# UI/UX Remaining Work Plan

Date: 2026-05-08

## Purpose

This plan reviews the current public frontend after the UI/UX revamp and medical-pattern pass, then identifies what still needs improvement. It intentionally does not prescribe exact visual layouts. The next AI agent should inspect the code and decide the final design solutions, using this document only to understand priority, scope, and guardrails.

## Current State Reviewed

Reviewed areas:

- `frontend/app/(site)/**`
- `frontend/components/layout/**`
- `frontend/components/sections/**`
- `frontend/components/templates/**`
- `frontend/components/cards/**`
- `frontend/app/globals.css`
- `frontend/docs/ui-ux-revamp-proposal.md`
- `frontend/docs/medical-pattern-rollout-plan.md`

Current foundation status:

- Global design tokens exist in `frontend/app/globals.css`.
- Reusable medical `+` pattern utilities exist in `frontend/app/globals.css`.
- `Section.tsx` supports `variant` and `pattern` props.
- Medical pattern is already applied to several major surfaces.
- `HowItWorks.tsx` has the three-image hover/focus/scroll behavior restored.
- `DoctorCard.tsx` and `ConsultationDestinationCard.tsx` remain protected.

## Non-Negotiables

- Do not change `frontend/components/cards/DoctorCard.tsx`.
- Do not change `frontend/components/cards/ConsultationDestinationCard.tsx`.
- Do not break existing routes, data contracts, props, API behavior, SEO metadata, or content sources.
- Do not put decorative patterns directly behind dense body copy, legal content, form fields, or card interiors.
- Maintain WCAG AA contrast minimum.
- Keep changes incremental and verify after each phase.

## Design Direction For The Next Agent

Let the next AI agent decide the specific creative solution.

The target outcome should be:

- More premium.
- More medical and hospital-like.
- Less plain than the current clean version.
- Stronger section identity across page types.
- Better mobile-specific composition, not just stacked desktop layouts.
- Consistent use of the subtle medical `+` pattern where it helps atmosphere.
- Clear conversion paths without aggressive or cluttered CTAs.

The agent should avoid:

- Making every page look identical.
- Adding the pattern everywhere.
- Over-designing legal/blog reading pages.
- Replacing protected card designs.
- Large architecture rewrites.

## What Is Already Mostly Complete

### Foundation

Files:

- `frontend/app/globals.css`
- `frontend/components/layout/Section.tsx`
- `frontend/components/layout/Container.tsx`

Status:

- Design tokens, section variants, medical pattern utilities, and responsive container primitives are in place.

Remaining:

- Audit CSS variables for consistency and unused tokens.
- Confirm pattern opacity on real devices and screenshots.
- Confirm no pseudo-element overlay blocks interactions.

### Medical Pattern Rollout

Files already using pattern:

- `HomeHero.tsx`
- `HeroSection.tsx`
- `TeamHero.tsx`
- `DoctorProfileTemplate.tsx`
- `CountryHomeTemplate.tsx`
- `HowItWorks.tsx`
- `BookingCTA.tsx`
- `CTAFooter.tsx`
- `TrustSignals.tsx`
- `TrustBar.tsx`
- `DoctorsSection.tsx`
- `ServicesGrid.tsx`
- `SpecialtiesGrid.tsx`
- `ConsultationListingTemplate.tsx`
- `BookingFormTemplate.tsx`
- `StaticMarketingTemplate.tsx`

Remaining:

- Visual QA is required. Some sections may now have too much pattern repetition, especially when multiple patterned sections appear back-to-back.
- The next agent should decide where to reduce, increase, or remove pattern usage based on screenshots.

### How It Works

File:

- `frontend/components/sections/HowItWorks.tsx`

Status:

- Three image assets are used.
- Active image changes on hover/focus and scroll-triggered viewport state.
- Medical pattern is present through the shared `Section` pattern prop.

Remaining:

- Browser QA for scroll behavior on mobile and desktop.
- Confirm sticky image behavior does not create awkward spacing on short screens.
- Confirm images are correct and visually high-quality.

## Highest Priority Remaining Work

### 1. Visual QA And Pattern Balance

Pages to inspect:

- `/`
- `/home`
- `/general-consultation-ie`
- `/specialty-ie`
- `/ireland-team`
- `/ireland-team/[doctorSlug]`
- `/book-online`

Sections to inspect:

- `HomeHero`
- `HeroSection`
- `TeamHero`
- `DoctorProfileTemplate` hero
- `CountryHomeTemplate` hero
- `BookingCTA`
- `TrustSignals`
- `TrustBar`
- `HowItWorks`

What needs deciding:

- Which patterned sections look premium.
- Which patterned sections feel too busy.
- Whether dark sections need stronger pattern opacity.
- Whether soft/white sections need lower opacity or no pattern.
- Whether repeated patterned sections need plain separators between them.

Acceptance:

- The site has a clear medical identity without becoming visually noisy.

### 2. Gateway Home Page

Route:

- `/`

Main files:

- `frontend/app/(site)/page.tsx`
- `frontend/components/sections/HomeHero.tsx`
- `frontend/components/sections/HowItWorks.tsx`
- `frontend/components/sections/TrustSignals.tsx`
- `frontend/components/sections/BookingCTA.tsx`

Needs attention:

- The country/language selection experience is business-critical and should feel more premium.
- Mobile layout of the country selector needs careful review.
- Hero image overlay and pattern density need visual tuning.
- Stats row, language dropdown, and country list need stronger hierarchy.

Let AI decide:

- Whether to keep the split hero.
- Whether to make the selector more editorial, more app-like, or more concierge-like.
- Whether to add a stronger trust/credential strip before users choose a country.

### 3. Country Home Pages

Routes:

- `/home`
- `/home-cz`
- `/home-pt`
- `/home-rm`
- `/home-sp`

Main file:

- `frontend/components/templates/CountryHomeTemplate.tsx`

Needs attention:

- Quick actions nav still feels functional rather than premium.
- Availability banner is a plain green panel and may need richer treatment.
- About section image/text area needs stronger composition.
- Inline specialties/service cards may need a more distinctive section design.
- Home delivery and doctor spotlight sections need visual review.
- Partner/trust sections may feel too plain depending on content.

Let AI decide:

- Whether country pages should use a consistent layout or country-specific accents.
- Which sections should be dark, white, or soft.
- Whether some inline card grids should become shared section components.

### 4. Consultation Listing Pages

Routes:

- `/general-consultation-ie`
- `/general-consultation-cz`
- `/general-consultation-pt`
- `/general-consultation-rm`
- `/general-consultation-sp`
- `/specialty-ie`
- `/specialty-cz`
- `/specialty-pt`
- `/specialty-rm`
- `/specialty-sp`

Main file:

- `frontend/components/templates/ConsultationListingTemplate.tsx`

Protected component:

- `ConsultationDestinationCard.tsx`

Needs attention:

- The top page header is still a plain white centered header and may not match the premium hero language.
- Guidance strip needs stronger visual hierarchy.
- Pricing block needs design review.
- Final CTA needs review for specialist vs GP modes.

Let AI decide:

- Whether listing pages need a dark patterned hero, a light editorial hero, or a split layout.
- Whether GP and specialist pages should have visibly different framing.
- How to make the preserved consultation cards feel integrated into the page.

### 5. Doctor Team Pages

Routes:

- `/ireland-team`
- `/czechia-team`
- `/portugal-team`
- `/romania-team`
- `/spain-team`

Main files:

- `frontend/components/templates/DoctorTeamTemplate.tsx`
- `frontend/components/sections/TeamHero.tsx`
- `frontend/components/sections/FeaturedDoctor.tsx`
- `frontend/components/sections/DoctorsSection.tsx`

Protected component:

- `DoctorCard.tsx`

Needs attention:

- `TeamHero` has the pattern, but the rest of the page needs stronger rhythm.
- `FeaturedDoctor` should be reviewed; it may need a more premium feature-band treatment.
- `DoctorsSection` has the protected cards, but wrapper spacing/header/background still needs QA.

Let AI decide:

- Whether the featured doctor should remain a card, become a banner, or be simplified.
- Whether doctor team pages should emphasize credentials, availability, languages, or trust first.

### 6. Doctor Profile Pages

Routes:

- `/ireland-team/[doctorSlug]`
- `/czechia-team/[doctorSlug]`
- `/portugal-team/[doctorSlug]`
- `/romania-team/[doctorSlug]`
- `/spain-team/[doctorSlug]`

Main file:

- `frontend/components/templates/DoctorProfileTemplate.tsx`

Needs attention:

- Hero now has the right medical-pattern direction, but it needs screenshot QA against the reference.
- Portrait/image composition may need tuning on mobile.
- Back link, specialty pill, meta row, and CTAs need hierarchy review.
- About, qualifications, and specialties sections are still comparatively plain.
- Bottom CTA needs consistency with the rest of the profile page.

Let AI decide:

- Whether hero should be text-left/image-right or image-left/text-right.
- Whether credentials should be grouped into a premium trust panel.
- Whether profile pages should have more clinical editorial structure.

### 7. Booking Page

Route:

- `/book-online`

Main file:

- `frontend/components/templates/BookingFormTemplate.tsx`

Needs attention:

- This is the most conversion-sensitive page.
- Pattern is applied to the section, but it must not reduce form clarity.
- Form layout, trust sidebar, error states, consent text, and signed-in patient state need careful QA.
- Mobile form flow should feel easier and less dense.

Let AI decide:

- Whether to keep the current two-column form/trust layout.
- Whether trust proof should be above, beside, or below the form on mobile.
- Whether the form should feel more clinical, more concierge-like, or more minimal.

### 8. Static Marketing Pages

Routes:

- `/about`
- `/careers`
- `/gift-card`
- `/corporate-plans`
- `/partner-clinics`
- `/home-delivery`
- `/home-health-test`
- `/online-prescription`
- `/plans-pricing`
- `/frequent-asked-questions`
- `/category/[slug]`

Main file:

- `frontend/components/templates/StaticMarketingTemplate.tsx`

Needs attention:

- Many pages share the same template, so changes here have wide impact.
- Template needs more page-type variation so pages do not feel generic.
- Feature grids, related links, FAQ placement, and CTA rhythm need review.
- Pricing-related pages may need a stronger plan-comparison treatment.

Let AI decide:

- Which page variants deserve different layouts.
- Whether template props should drive visual mode.
- Whether some marketing pages should use a dark hero while others stay light.

### 9. Service Detail Pages

Routes:

- `/ireland/[serviceSlug]`
- `/ireland-specialist-consultations/[serviceSlug]`
- `/services/[serviceSlug]`
- `/home-health-tests/[testSlug]`

Main file:

- `frontend/components/templates/ServiceDetailTemplate.tsx`

Needs attention:

- Detail content and sidebar need stronger premium treatment.
- Key facts, suitability, body copy, and booking action need clearer hierarchy.
- Sticky sidebar behavior needs mobile and tablet QA.

Let AI decide:

- Whether service pages should feel more like clinical landing pages or structured documentation.
- Whether sidebar should stay sticky or become a stronger inline booking panel.

### 10. Blog And Legal Pages

Routes:

- `/blog`
- `/post/[slug]`
- `/privacy-policy`
- `/terms-and-conditions`
- `/cookies-policy`
- `/gdpr-compliance`
- `/legal-notices`
- `/refund-policy`
- `/return-and-refund-policy`
- `/term-and-conditions`
- `/privacy`
- `/copy-of-privacy-policy`

Main files:

- `frontend/components/templates/BlogIndexTemplate.tsx`
- `frontend/components/templates/BlogArticleTemplate.tsx`
- `frontend/components/templates/LegalPageTemplate.tsx`

Needs attention:

- Blog index likely needs richer cards and editorial hierarchy.
- Blog article should prioritize readability over decoration.
- Legal pages should stay clean and should not receive heavy pattern backgrounds.

Let AI decide:

- Whether blog index should get image-led cards or remain text-led.
- Whether legal pages need a minimal header refresh only.

## Component-Level Remaining Work

### Layout

Files:

- `SiteHeader.tsx`
- `DesktopNav.tsx`
- `MobileNav.tsx`
- `SiteFooter.tsx`
- `CTAFooter.tsx`

Needs attention:

- Header and navigation need final mobile/desktop QA.
- Dropdowns need visual consistency with the new premium system.
- Footer should be checked for link density, pattern use, and CTA/footer transition.

### Cards That Can Be Changed

Files:

- `ServiceCard.tsx`
- `PricingCard.tsx`
- `BlogCard.tsx`

Needs attention:

- These can be improved if they look weaker than the rest of the new system.
- Do not make them compete with `ConsultationDestinationCard`.
- Make hover states consistent and non-janky.

### Cards That Must Not Be Changed

Files:

- `DoctorCard.tsx`
- `ConsultationDestinationCard.tsx`

Needs attention:

- Only adjust the sections around them.
- Do not edit internals.

## Recommended Implementation Order

1. Run visual QA screenshots for the key routes before changing more code.
2. Tune medical pattern usage and opacity globally.
3. Improve gateway `/` page.
4. Improve doctor profile pages.
5. Improve country home template.
6. Improve consultation listing template.
7. Improve booking form page.
8. Improve team pages and featured doctor section.
9. Improve service detail template.
10. Improve static marketing template variants.
11. Improve blog index/article and legal pages lightly.
12. Final pass on header, nav, footer, and reusable cards that are allowed to change.

## Verification Plan

Run after each major phase:

```bash
pnpm --filter frontend typecheck
pnpm --filter frontend lint
pnpm --filter frontend build
```

Manual route QA:

- `/`
- `/home`
- `/general-consultation-ie`
- `/specialty-ie`
- `/ireland-team`
- `/ireland-team/[doctorSlug]`
- `/book-online`
- `/about`
- `/plans-pricing`
- `/blog`
- `/post/[slug]`
- `/privacy-policy`

Viewport QA:

- 320px
- 390px
- 768px
- 1024px
- 1440px

Accessibility QA:

- Text contrast on patterned dark sections.
- Text contrast on patterned soft sections.
- Focus states on nav, dropdowns, form fields, CTAs, and accordions.
- No pattern interfering with clicks.
- No horizontal scroll on mobile.
- Reduced motion honored.

## Definition Of Done

- The public site feels premium, medical, and coherent.
- Every major page group has been visually reviewed.
- Pattern usage is intentional and not overused.
- Conversion pages are clearer, not just prettier.
- Protected card components remain unchanged.
- Typecheck, lint, and build pass.
