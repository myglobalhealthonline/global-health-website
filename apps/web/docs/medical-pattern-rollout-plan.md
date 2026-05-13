# Medical Pattern Rollout Plan

Date: 2026-05-08

## Goal

Bring back the subtle medical `+` pattern as a reusable visual signature across the public frontend. The pattern should make the site feel more clinical, hospital-grade, and premium without making pages noisy or reducing contrast.

The target look is similar to the doctor profile reference: dark green background, low-opacity repeated medical crosses, strong white text, lime accent details, and clean foreground content.

## Review Summary

Current changed files reviewed:

- `frontend/components/sections/HowItWorks.tsx`
- `frontend/docs/ui-ux-revamp-proposal.md`

Current implementation state:

- `HowItWorks.tsx` now uses all three step images again.
- Step image changes on hover/focus and scroll-triggered viewport activation.
- `HowItWorks.tsx` has an inline subtle medical `+` background pattern.
- The revamp proposal now says to keep purposeful clinical texture instead of removing all decoration.

Broader component surface reviewed:

- Layout primitives: `Section`, `Container`, `SiteHeader`, `SiteFooter`, `CTAFooter`
- Major sections: `HeroSection`, `HomeHero`, `TeamHero`, `TrustSignals`, `TrustBar`, `BookingCTA`, `HowItWorks`, `DoctorsSection`, `ServicesGrid`, `SpecialtiesGrid`, `FAQSection`
- Major templates: `CountryHomeTemplate`, `DoctorProfileTemplate`, `ConsultationListingTemplate`, `BookingFormTemplate`, `ServiceDetailTemplate`, `StaticMarketingTemplate`, `BlogArticleTemplate`, `LegalPageTemplate`

Key finding:

The visual language is now cleaner, but some sections became too plain. The medical `+` texture should be added to high-impact backgrounds and selected soft sections, not every card or every text block.

## Contract

Input:

- Existing Next.js frontend components and global CSS.
- Existing green/lime healthcare palette.
- Existing protected card components.

Output:

- A consistent medical `+` pattern system applied across key public UI sections.
- Minimal component edits using shared global utilities.
- No changes to protected card internals.

Goal:

- Make the UI feel more premium and medical while preserving readability, accessibility, route behavior, data contracts, and performance.

## Non-Negotiables

- Do not change `frontend/components/cards/DoctorCard.tsx`.
- Do not change `frontend/components/cards/ConsultationDestinationCard.tsx`.
- Do not place the pattern inside dense text bodies, form fields, legal articles, or card interiors where it competes with content.
- Maintain WCAG AA contrast minimum for all readable text.
- Use `aria-hidden` or pseudo-elements for decorative pattern layers.
- Pattern opacity must stay subtle: dark backgrounds around `0.08-0.16`, light backgrounds around `0.035-0.07`.

## Recommended Technical Approach

Create global pattern utilities in `frontend/app/globals.css` instead of repeating inline `backgroundImage` styles in many components.

Recommended utilities:

- `.gh-medical-pattern`
- `.gh-medical-pattern-dark`
- `.gh-medical-pattern-soft`
- `.gh-medical-pattern-panel`

Recommended behavior:

- Utility uses a pseudo-element overlay with `pointer-events: none`.
- Parent section must be `relative overflow-hidden`.
- Pattern sits behind content using `z-index`.
- Content wrappers get `relative z-10`.
- Use CSS variables for pattern color, opacity, and size.

Suggested CSS direction:

```css
.gh-medical-pattern {
  position: relative;
  overflow: hidden;
}

.gh-medical-pattern::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,...");
  background-size: var(--medical-pattern-size, 72px 72px);
  opacity: var(--medical-pattern-opacity, 0.08);
  z-index: 0;
}

.gh-medical-pattern > * {
  position: relative;
  z-index: 1;
}
```

## Application Map

### Phase 1: Foundation

Files:

- `frontend/app/globals.css`
- `frontend/components/layout/Section.tsx`

Work:

- Add shared medical pattern utilities.
- Add optional `pattern?: "none" | "soft" | "dark" | "panel"` prop to `Section`.
- Map `pattern` values to global classes.
- Keep default as `none` so existing pages do not change unexpectedly.

Acceptance:

- `Section` can apply the pattern without inline SVG in each component.
- Existing `variant` behavior remains unchanged.
- TypeScript passes.

### Phase 2: Dark Hero Sections

Files:

- `frontend/components/sections/HeroSection.tsx`
- `frontend/components/sections/TeamHero.tsx`
- `frontend/components/templates/DoctorProfileTemplate.tsx`
- `frontend/components/templates/CountryHomeTemplate.tsx`

Work:

- Add dark medical pattern to all dark green hero sections.
- Match the screenshot style: pattern visible but quiet, text fully readable.
- Use lime accent pills/buttons over the patterned dark background.
- Avoid placing pattern over image-heavy areas unless overlay contrast is controlled.

Acceptance:

- Doctor profile hero has the clinical cross texture.
- Country home hero has the same visual language.
- Generic split hero and team hero feel related, not random.

### Phase 3: CTA And Trust Sections

Files:

- `frontend/components/sections/BookingCTA.tsx`
- `frontend/components/layout/CTAFooter.tsx`
- `frontend/components/sections/TrustSignals.tsx`
- `frontend/components/sections/TrustBar.tsx`

Work:

- Add dark pattern to full-width green CTA/trust surfaces.
- Keep card/panel content clean above the pattern.
- Do not add extra decorative circles unless needed for depth.

Acceptance:

- Final CTAs look premium instead of flat green blocks.
- Trust sections retain strong contrast and do not become busy.

### Phase 4: Guided Process And Soft Sections

Files:

- `frontend/components/sections/HowItWorks.tsx`
- `frontend/components/sections/ServicesGrid.tsx`
- `frontend/components/sections/SpecialtiesGrid.tsx`
- `frontend/components/sections/DoctorsSection.tsx`
- `frontend/components/templates/ConsultationListingTemplate.tsx`

Work:

- Replace the inline pattern in `HowItWorks.tsx` with the shared utility.
- Add soft pattern only to large section backgrounds, not to individual service cards.
- Use lower opacity on white/soft backgrounds.
- Keep consultation cards untouched.
- Keep doctor cards untouched.

Acceptance:

- Process section keeps the three-image scroll/hover behavior.
- Listing/team sections feel clinical without altering protected card designs.

### Phase 5: Forms And Content Pages

Files:

- `frontend/components/templates/BookingFormTemplate.tsx`
- `frontend/components/templates/ServiceDetailTemplate.tsx`
- `frontend/components/templates/StaticMarketingTemplate.tsx`

Work:

- Add pattern to page-level hero or section backgrounds only.
- Avoid pattern directly behind form fields.
- Avoid pattern inside content cards or long paragraphs.

Acceptance:

- Booking page gains clinical atmosphere without hurting form clarity.
- Marketing/service pages feel consistent with the rest of the site.

### Phase 6: Pages To Avoid Or Use Sparingly

Files:

- `frontend/components/templates/LegalPageTemplate.tsx`
- `frontend/components/templates/BlogArticleTemplate.tsx`
- `frontend/components/cards/DoctorCard.tsx`
- `frontend/components/cards/ConsultationDestinationCard.tsx`

Rules:

- Legal pages: no pattern behind body text. Optional very subtle header only.
- Blog article pages: no pattern behind article copy. Optional top metadata band only.
- Protected cards: do not change.

## Edge Cases

- Long translated headings can overlap decorative backgrounds if foreground spacing is too tight.
- Low-opacity pattern on soft green can become muddy on lower-quality displays.
- Dark pattern sections need white or lime text only; muted gray text can fail contrast.
- Sticky image/process sections must not create horizontal scroll on mobile.
- Pattern pseudo-elements must not block clicks, hovers, or focus.
- Data SVG utilities must not bloat CSS with multiple duplicated versions.

## Manual Verification Plan

Run:

```bash
pnpm --filter frontend typecheck
pnpm --filter frontend lint
pnpm --filter frontend build
```

Visual check these routes:

- `/`
- `/home`
- `/general-consultation-ie`
- `/specialty-ie`
- `/ireland-team`
- `/ireland-team/[doctorSlug]`
- `/book-online`
- `/about`
- `/plans-pricing`
- `/privacy-policy`

Viewport checks:

- 320px mobile
- 390px mobile
- 768px tablet
- 1024px laptop
- 1440px desktop

Accessibility checks:

- Text contrast remains AA or better.
- Pattern is decorative and not announced by screen readers.
- Focus states remain visible on patterned sections.
- Reduced motion still disables nonessential motion.

## Recommended Next Implementation Order

1. Add global medical pattern utilities.
2. Update `Section.tsx` with optional `pattern` prop.
3. Replace `HowItWorks.tsx` inline pattern with the shared utility.
4. Add dark pattern to `HeroSection`, `TeamHero`, and `DoctorProfileTemplate`.
5. Add dark pattern to `BookingCTA`, `CTAFooter`, `TrustSignals`, and `TrustBar`.
6. Add soft pattern to selected wrapper sections only.
7. Run typecheck, lint, build, then do browser visual QA.

## Success Criteria

- The site regains the hospital/medical feel shown in the reference image.
- Pattern use feels consistent, not random.
- Premium contrast and readability are preserved.
- Protected doctor and consultation cards remain unchanged.
- The implementation uses reusable utilities rather than duplicated inline SVG styles.
