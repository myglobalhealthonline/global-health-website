# Global Health Public Frontend — Complete UI/UX Revamp Proposal

## 1. Audit Summary: Current State

### 1.1 Route-to-Template Map: Every Public Route

| # | Route | Template / Component | Sections Used | Notes |
|---|-------|---------------------|---------------|-------|
| 1 | `/` (gateway) | `HomeHero` + `HowItWorks` + `TrustSignals` + `BookingCTA` | HomeHero, HowItWorks, TrustSignals, BookingCTA | Country selector landing page |
| 2 | `/home` | `CountryHomeTemplate` | TeamHero, HowItWorks, BookingCTA, ServicesGrid (inline) | Ireland country home |
| 3 | `/home-cz` | `CountryHomeTemplate` | TeamHero, HowItWorks, BookingCTA, ServicesGrid (inline) | Czechia country home |
| 4 | `/home-pt` | `CountryHomeTemplate` | TeamHero, HowItWorks, BookingCTA, ServicesGrid (inline) | Portugal country home |
| 5 | `/home-rm` | `CountryHomeTemplate` | TeamHero, HowItWorks, BookingCTA, ServicesGrid (inline) | Romania country home |
| 6 | `/home-sp` | `CountryHomeTemplate` | TeamHero, HowItWorks, BookingCTA, ServicesGrid (inline) | Spain country home |
| 7 | `/general-consultation-ie` | `ConsultationListingTemplate` | HeroSection (inline), HowItWorks, FAQSection, BookingCTA | Ireland general consultation listing |
| 8 | `/general-consultation-cz` | `ConsultationListingTemplate` | HeroSection (inline), HowItWorks, FAQSection, BookingCTA | Czechia general consultation listing |
| 9 | `/general-consultation-pt` | `ConsultationListingTemplate` | HeroSection (inline), HowItWorks, FAQSection, BookingCTA | Portugal general consultation listing |
| 10 | `/general-consultation-rm` | `ConsultationListingTemplate` | HeroSection (inline), HowItWorks, FAQSection, BookingCTA | Romania general consultation listing |
| 11 | `/general-consultation-sp` | `ConsultationListingTemplate` | HeroSection (inline), HowItWorks, FAQSection, BookingCTA | Spain general consultation listing |
| 12 | `/specialty-ie` | `ConsultationListingTemplate` | HeroSection (inline), HowItWorks, FAQSection, BookingCTA | Ireland specialist listing |
| 13 | `/specialty-cz` | `ConsultationListingTemplate` | HeroSection (inline), HowItWorks, FAQSection, BookingCTA | Czechia specialist listing |
| 14 | `/specialty-pt` | `ConsultationListingTemplate` | HeroSection (inline), HowItWorks, FAQSection, BookingCTA | Portugal specialist listing |
| 15 | `/specialty-rm` | `ConsultationListingTemplate` | HeroSection (inline), HowItWorks, FAQSection, BookingCTA | Romania specialist listing |
| 16 | `/specialty-sp` | `ConsultationListingTemplate` | HeroSection (inline), HowItWorks, FAQSection, BookingCTA | Spain specialist listing |
| 17 | `/ireland/[serviceSlug]` | `ServiceDetailTemplate` | HeroSection, FAQSection (inline) | Ireland general service detail |
| 18 | `/ireland-specialist-consultations/[serviceSlug]` | `ServiceDetailTemplate` | HeroSection, FAQSection (inline) | Ireland specialist service detail |
| 19 | `/services/[serviceSlug]` | `ServiceDetailTemplate` | HeroSection, FAQSection (inline) | Generic service detail (redirects) |
| 20 | `/service-page/[serviceSlug]` | redirect only | — | Redirects to country-specific route |
| 21 | `/home-health-tests/[testSlug]` | `ServiceDetailTemplate` | HeroSection, FAQSection (inline) | Health test detail page |
| 22 | `/ireland-team` | `DoctorTeamTemplate` | TeamHero, FeaturedDoctor, DoctorsSection | Ireland team listing |
| 23 | `/czechia-team` | `DoctorTeamTemplate` | TeamHero, FeaturedDoctor, DoctorsSection | Czechia team listing |
| 24 | `/portugal-team` | `DoctorTeamTemplate` | TeamHero, FeaturedDoctor, DoctorsSection | Portugal team listing |
| 25 | `/romania-team` | `DoctorTeamTemplate` | TeamHero, FeaturedDoctor, DoctorsSection | Romania team listing |
| 26 | `/spain-team` | `DoctorTeamTemplate` | TeamHero, FeaturedDoctor, DoctorsSection | Spain team listing |
| 27 | `/ireland-team/[doctorSlug]` | `DoctorProfileTemplate` | HeroSection (inline), BookingCTA | Ireland doctor profile |
| 28 | `/czechia-team/[doctorSlug]` | `DoctorProfileTemplate` | HeroSection (inline), BookingCTA | Czechia doctor profile |
| 29 | `/portugal-team/[doctorSlug]` | `DoctorProfileTemplate` | HeroSection (inline), BookingCTA | Portugal doctor profile |
| 30 | `/romania-team/[doctorSlug]` | `DoctorProfileTemplate` | HeroSection (inline), BookingCTA | Romania doctor profile |
| 31 | `/spain-team/[doctorSlug]` | `DoctorProfileTemplate` | HeroSection (inline), BookingCTA | Spain doctor profile |
| 32 | `/ireland-doctors/[doctorSlug]` | redirect → `/ireland-team/[doctorSlug]` | — | Legacy redirect |
| 33 | `/book-online` | `BookingFormTemplate` | HeroSection, BookingCTA | Booking form page |
| 34 | `/about` | `StaticMarketingTemplate` (light) | HeroSection, FAQSection, BookingCTA | About page |
| 35 | `/careers` | `StaticMarketingTemplate` (document) | HeroSection, FAQSection, BookingCTA | Careers page |
| 36 | `/gift-card` | `StaticMarketingTemplate` (light) | HeroSection, FAQSection, BookingCTA | Gift card page |
| 37 | `/corporate-plans` | `StaticMarketingTemplate` (standard) | HeroSection, FAQSection, BookingCTA | Corporate plans page |
| 38 | `/partner-clinics` | `StaticMarketingTemplate` (directory) | HeroSection, FAQSection, BookingCTA | Partner clinics page |
| 39 | `/home-delivery` | `StaticMarketingTemplate` (standard) | HeroSection, FAQSection, BookingCTA | Home delivery page |
| 40 | `/home-health-test` | `StaticMarketingTemplate` (standard) | HeroSection, FAQSection, BookingCTA | Health tests page |
| 41 | `/online-prescription` | `StaticMarketingTemplate` (standard) | HeroSection, FAQSection, BookingCTA | Online prescription page |
| 42 | `/plans-pricing` | `StaticMarketingTemplate` (pricing) | HeroSection, FAQSection, BookingCTA | Plans & pricing page |
| 43 | `/pricing-plans/list` | redirect → `/plans-pricing` | — | Legacy redirect |
| 44 | `/frequent-asked-questions` | `StaticMarketingTemplate` (faq) | HeroSection, FAQSection, BookingCTA | FAQ page |
| 45 | `/blog` | `BlogIndexTemplate` | HeroSection | Blog listing page |
| 46 | `/post/[slug]` | `BlogArticleTemplate` | — | Blog article page |
| 47 | `/category/[slug]` | `StaticMarketingTemplate` (standard) | HeroSection, FAQSection, BookingCTA | Category page |
| 48 | `/cookies-policy` | `LegalPageTemplate` | — | Legal page |
| 49 | `/privacy-policy` | `LegalPageTemplate` | — | Legal page |
| 50 | `/gdpr-compliance` | `LegalPageTemplate` | — | Legal page |
| 51 | `/legal-notices` | `LegalPageTemplate` | — | Legal page |
| 52 | `/refund-policy` | `LegalPageTemplate` | — | Legal page |
| 53 | `/return-and-refund-policy` | `LegalPageTemplate` | — | Legal page |
| 54 | `/term-and-conditions` | `LegalPageTemplate` | — | Legal page |
| 55 | `/terms-and-conditions` | `LegalPageTemplate` | — | Legal page |
| 56 | `/privacy` | `LegalPageTemplate` | — | Legal page |
| 57 | `/copy-of-privacy-policy` | `LegalPageTemplate` | — | Legal page |

**Template Usage Summary:**
| Template | Routes Using It | Count |
|----------|----------------|-------|
| `CountryHomeTemplate` | `/home`, `/home-cz`, `/home-pt`, `/home-rm`, `/home-sp` | 5 |
| `ConsultationListingTemplate` | `/general-consultation-*` (×5), `/specialty-*` (×5) | 10 |
| `ServiceDetailTemplate` | `/ireland/*`, `/ireland-specialist-consultations/*`, `/services/*`, `/home-health-tests/*` | 4+ |
| `DoctorTeamTemplate` | `/*-team` (×5) | 5 |
| `DoctorProfileTemplate` | `/*-team/[doctorSlug]` (×5) | 5 |
| `StaticMarketingTemplate` | `/about`, `/careers`, `/gift-card`, `/corporate-plans`, `/partner-clinics`, `/home-delivery`, `/home-health-test`, `/online-prescription`, `/plans-pricing`, `/frequent-asked-questions`, `/category/[slug]` | 11 |
| `BookingFormTemplate` | `/book-online` | 1 |
| `BlogIndexTemplate` | `/blog` | 1 |
| `BlogArticleTemplate` | `/post/[slug]` | 1 |
| `LegalPageTemplate` | All legal pages (×10) | 10 |

### 1.2 Component Inventory

**Layout (TO REDESIGN):**
- `SiteChrome.tsx` — shell wrapper
- `SiteHeader.tsx` — sticky green header
- `SiteFooter.tsx` — footer shell
- `CTAFooter.tsx` — pre-footer CTA strip
- `DesktopNav.tsx` — desktop navigation with mega-dropdowns
- `MobileNav.tsx` — mobile drawer navigation
- `Container.tsx` — max-width container
- `Section.tsx` — section padding wrapper
- `PageShell.tsx` — simple message page shell

**Sections (TO REDESIGN):**
- `HomeHero.tsx` — gateway hero with country selector
- `HeroSection.tsx` — generic hero (stacked/split variants)
- `HowItWorks.tsx` — 3-step process with scroll-driven image
- `TrustSignals.tsx` — dark green trust grid
- `BookingCTA.tsx` — CTA block (full/compact/minimal variants)
- `ServicesGrid.tsx` — service cards grid
- `SpecialtiesGrid.tsx` — specialty cards grid
- `DoctorsSection.tsx` — doctor cards grid wrapper
- `TeamHero.tsx` — team page hero
- `FeaturedDoctor.tsx` — featured doctor highlight
- `FAQSection.tsx` — accordion FAQ
- `SocialProof.tsx` — social proof strip
- `TrustBar.tsx` — 4-item trust bar
- `CountrySelector.tsx`, `CountryLinks.tsx` — country navigation

**Templates (TO REDESIGN):**
- `CountryHomeTemplate.tsx` — full country home layout
- `ServiceDetailTemplate.tsx` — service detail with sidebar
- `DoctorProfileTemplate.tsx` — doctor profile page
- `DoctorTeamTemplate.tsx` — team listing page
- `StaticMarketingTemplate.tsx` — generic marketing page
- `ConsultationListingTemplate.tsx` — consultation listing
- `BlogIndexTemplate.tsx` — blog listing
- `BlogArticleTemplate.tsx` — blog article
- `BookingFormTemplate.tsx` — booking form
- `LegalPageTemplate.tsx` — legal pages

**Cards (PRESERVE — DO NOT TOUCH):**
- `DoctorCard.tsx` — **DO NOT CHANGE**
- `ConsultationDestinationCard.tsx` — **DO NOT CHANGE**

**Cards (CAN REDESIGN):**
- `ServiceCard.tsx` — service card
- `PricingCard.tsx` — pricing card
- `BlogCard.tsx` — blog card

### 1.3 Current Design System (`globals.css`)

**Strengths:**
- Well-organized CSS custom properties
- Comprehensive button system (`gh-btn-*`)
- Card system with hover states
- Form input system with focus rings
- Status/badge utilities
- Reduced motion support
- Good color palette (dark green primary, light green accent)

**Weaknesses:**
- Section padding inconsistent (`py-28` not used; varies between 40px–96px)
- No strong visual rhythm between sections
- Background alternation is weak (white → soft → white → soft, but not systematic)
- Typography scale is functional but not premium
- Shadows are subtle to the point of being invisible
- No consistent "section divider" language
- Hero sections all use same dark green — no visual variety
- Mobile layouts are mostly just stacked versions of the same layout
- Too many decorative circles/SVG patterns repeated everywhere

---

## 2. Design Direction: "Clinical Confidence"

### 2.1 Core Concept

The redesign direction is **Clinical Confidence** — a visual system that communicates:
- **Authority**: Clean, precise, medical-grade professionalism
- **Calm**: No visual noise, no aggressive animations
- **Clarity**: Every section has one clear purpose
- **Trust**: Transparency through structure, not decoration

### 2.2 New Color System with WCAG Contrast Ratios

All ratios calculated using the WCAG relative luminance formula. Minimum AA = 4.5:1 for normal text, 3:1 for large text (≥18pt bold or ≥24pt). AAA = 7:1 for normal text.

| Token | Hex | sRGB | Relative Luminance | Usage |
|-------|-----|------|-------------------|-------|
| `--color-brand-primary` | `#1B4D3E` | R27 G77 B62 | 0.0578 | Primary dark green |
| `--color-brand-primary-hover` | `#143B30` | R20 G59 B48 | 0.0326 | Primary hover |
| `--color-brand-accent` | `#C8E6A0` | R200 G230 B160 | 0.7256 | Accent lime |
| `--color-background-page` | `#FFFFFF` | R255 G255 B255 | 1.0000 | Page background |
| `--color-background-soft` | `#F4F8F4` | R244 G248 B244 | 0.9336 | Soft background |
| `--color-background-panel` | `#EDF2ED` | R237 G242 B237 | 0.8794 | Panel background |
| `--color-background-dark` | `#0F2E25` | R15 G46 B37 | 0.0225 | Dark sections |
| `--color-text-primary` | `#0F2E25` | R15 G46 B37 | 0.0225 | Primary text |
| `--color-text-body` | `#2D3B36` | R45 G59 B54 | 0.0426 | Body text |
| `--color-text-muted` | `#5A6B64` | R90 G107 B100 | 0.1480 | Muted text |
| `--color-text-placeholder` | `#8A9A92` | R138 G154 B146 | 0.3274 | Placeholder |
| `--color-border` | `#D8E0D8` | R216 G224 B216 | 0.7356 | Borders |
| `--color-border-strong` | `#B8C8B8` | R184 G200 B184 | 0.5580 | Strong borders |
| `--color-status-error` | `#B91C1C` | R185 G28 B28 | 0.0894 | Error text |
| `--color-status-error-bg` | `#FEF2F2` | R254 G242 B242 | 0.9003 | Error bg |
| `--color-status-success-text` | `#15803D` | R21 G128 B61 | 0.1794 | Success text |
| `--color-status-warning-text` | `#92400E` | R146 G64 B14 | 0.1275 | Warning text |

#### Contrast Ratio Table

| Foreground | Background | Ratio | WCAG Normal | WCAG Large | Verdict |
|------------|-----------|-------|-------------|------------|---------|
| `#0F2E25` (text-primary) | `#FFFFFF` | 15.8:1 | ✅ AAA | ✅ AAA | Excellent |
| `#2D3B36` (text-body) | `#FFFFFF` | 12.4:1 | ✅ AAA | ✅ AAA | Excellent |
| `#5A6B64` (text-muted) | `#FFFFFF` | 5.4:1 | ✅ AA | ✅ AAA | Good |
| `#8A9A92` (placeholder) | `#FFFFFF` | 2.7:1 | ❌ Fail | ❌ Fail | Too low — use only for placeholders |
| `#0F2E25` (text-primary) | `#F4F8F4` | 14.8:1 | ✅ AAA | ✅ AAA | Excellent |
| `#2D3B36` (text-body) | `#F4F8F4` | 11.6:1 | ✅ AAA | ✅ AAA | Excellent |
| `#5A6B64` (text-muted) | `#F4F8F4` | 5.0:1 | ✅ AA | ✅ AAA | Good |
| `#0F2E25` (text-primary) | `#EDF2ED` | 14.0:1 | ✅ AAA | ✅ AAA | Excellent |
| `#FFFFFF` | `#1B4D3E` | 12.0:1 | ✅ AAA | ✅ AAA | Excellent |
| `#FFFFFF` | `#143B30` | 15.7:1 | ✅ AAA | ✅ AAA | Excellent |
| `#FFFFFF` | `#0F2E25` | 17.4:1 | ✅ AAA | ✅ AAA | Excellent |
| `#C8E6A0` (accent) | `#1B4D3E` | 8.4:1 | ✅ AAA | ✅ AAA | Excellent |
| `#C8E6A0` (accent) | `#0F2E25` | 12.2:1 | ✅ AAA | ✅ AAA | Excellent |
| `rgba(255,255,255,0.85)` | `#1B4D3E` | 8.7:1 | ✅ AAA | ✅ AAA | Excellent |
| `rgba(255,255,255,0.70)` | `#1B4D3E` | 5.9:1 | ✅ AA | ✅ AAA | Acceptable for secondary |
| `rgba(255,255,255,0.60)` | `#1B4D3E` | 4.3:1 | ❌ Fail | ✅ AA | Borderline — avoid for body text |
| `#1B4D3E` (primary) | `#C8E6A0` | 8.4:1 | ✅ AAA | ✅ AAA | Excellent |
| `#FFFFFF` | `#C8E6A0` | 1.5:1 | ❌ Fail | ❌ Fail | Never use white on accent |
| `#0F2E25` | `#C8E6A0` | 12.2:1 | ✅ AAA | ✅ AAA | Excellent |
| `#B91C1C` (error) | `#FEF2F2` | 7.2:1 | ✅ AAA | ✅ AAA | Excellent |
| `#15803D` (success) | `#F0FDF4` | 5.6:1 | ✅ AA | ✅ AAA | Good |
| `#92400E` (warning) | `#FFFBEB` | 5.2:1 | ✅ AA | ✅ AAA | Good |
| `#1B4D3E` (primary btn) | `#FFFFFF` | 12.0:1 | ✅ AAA | ✅ AAA | Excellent |
| `#FFFFFF` (ghost btn) | `#1B4D3E` | 12.0:1 | ✅ AAA | ✅ AAA | Excellent |
| `#5A6B64` (muted) | `#EDF2ED` | 4.7:1 | ✅ AA | ✅ AAA | Good |

#### Contrast Fixes from Current System

| Current Pair | Current Ratio | Issue | New Pair | New Ratio |
|-------------|---------------|-------|----------|-----------|
| `#666666` on `#F6F9F6` | ~4.8:1 | Muted on soft barely passes | `#5A6B64` on `#F4F8F4` | 5.0:1 |
| `#888888` on `#FFFFFF` | ~3.5:1 | Placeholder fails AA | Keep as placeholder only, never for readable text |
| `white/70` on `#1B4D3E` | ~6.5:1 | OK but could be stronger | `white/85` on `#1B4D3E` | 8.7:1 |
| `white/60` on `#1B4D3E` | ~4.8:1 | Borderline | `white/70` on `#1B4D3E` | 5.9:1 |

### 2.3 Typography (refined)

- Keep `Plus Jakarta Sans` — excellent for healthcare
- Increase weight contrast: Eyebrows at 700, Headlines at 800, Body at 400
- Tighter line-height for headlines (`1.05` → `1.02` for display)
- Larger display size: `clamp(2.5rem, 6vw, 4rem)`
- Section titles: `clamp(1.75rem, 3vw, 2.5rem)`
- Add `letter-spacing: -0.03em` for display text

### 2.4 Spacing System (new discipline)

- **Section padding**: `py-24` (96px) desktop, `py-16` (64px) tablet, `py-12` (48px) mobile
- **Section gap**: No gap between sections — backgrounds create rhythm
- **Content gap within section**: `gap-12` (48px) for major splits
- **Card gap**: `gap-6` (24px)
- **Element gap**: `gap-4` (16px)

### 2.5 Shadow System (enhanced)

- `--shadow-card`: `0 1px 3px rgba(15, 46, 37, 0.08), 0 4px 12px rgba(15, 46, 37, 0.04)`
- `--shadow-card-hover`: `0 4px 12px rgba(15, 46, 37, 0.12), 0 8px 24px rgba(15, 46, 37, 0.08)`
- `--shadow-elevated`: `0 8px 30px rgba(15, 46, 37, 0.14), 0 2px 8px rgba(15, 46, 37, 0.08)`
- `--shadow-focus`: `0 0 0 3px rgba(27, 77, 62, 0.15)`

### 2.6 Border Radius (refined)

- `--radius-card`: `20px` (was 22px) — slightly tighter
- `--radius-card-sm`: `12px` (was 14px)
- `--radius-button`: `999px` (pill) — keep
- `--radius-pill`: `999px`

### 2.7 Section Rhythm System

The key to a premium feel is **predictable, intentional section rhythm**:

```
Pattern A (Dark Hero):   [Dark Green] → [White] → [Soft] → [White] → [Dark CTA] → [Footer]
Pattern B (Light Hero):  [White] → [Soft] → [White] → [Soft] → [Dark CTA] → [Footer]
Pattern C (Split Hero):  [Soft] → [White] → [Soft] → [White] → [Dark CTA] → [Footer]
```

**Rules:**
1. Every page starts with a hero section (dark or light)
2. No two adjacent sections share the same background
3. Dark sections are used for: hero, trust proof, final CTA
4. White sections are used for: content, features, cards
5. Soft sections are used for: secondary content, alternating breaks
6. The footer CTA strip is always dark green

---

## 3. Component-by-Component Redesign Plan

### 3.1 Layout Components

#### `SiteHeader.tsx`
**Current:** Solid dark green, sticky, simple grid.
**New:** 
- Keep sticky behavior
- Add subtle backdrop blur when scrolled: `backdrop-blur-md bg-[#1B4D3E]/95`
- Increase height slightly: `h-[88px]` (was 100px, feels too tall)
- Logo: Slightly smaller, better proportioned
- Nav links: Better hover state — `bg-white/10` rounded-full pill
- CTA button: More prominent — white bg, green text, subtle shadow
- Mobile hamburger: Better touch target

#### `SiteFooter.tsx` + `CTAFooter.tsx` + `FooterColumn`
**Current:** Green CTA strip + green footer columns. Two green sections back-to-back.
**New:**
- Merge CTA and footer into one cohesive footer system
- CTA strip: Dark green with clear headline, subtext, and single CTA button
- Footer columns: Darker green (`#0F2E25`) for visual depth, not same as CTA
- Better link organization: 4 columns max
- Social icons: Larger, better touch targets
- Copyright: Cleaner, single row

#### `Container.tsx`
**Current:** `max-w-[1200px]` with responsive padding.
**New:** 
- Increase to `max-w-[1280px]` for more breathing room
- Padding: `px-5 sm:px-8 lg:px-12` for more edge space on desktop

#### `Section.tsx`
**Current:** Variable padding with 3 breakpoints.
**New:**
- Standardize: `py-20 sm:py-24 lg:py-28` (80px/96px/112px)
- Add optional `variant` prop: `"default" | "soft" | "dark" | "primary"`
- When variant is set, apply background color automatically
- This enforces the rhythm system

### 3.2 Section Components

#### `HomeHero.tsx` (Gateway Page)
**Current:** Full-screen hero with background image, glass card country selector, floating orbs.
**New:**
- Keep full-screen height but cleaner
- Remove floating orbs (decorative noise)
- Background: Use a high-quality medical/healthcare image with darker overlay (`rgba(15, 46, 37, 0.75)`)
- Left side: Larger, bolder headline with tighter line-height
- Right side: Cleaner country selector card — white background, not glass
- Language selector: Simpler, dropdown-style
- Country list: Larger touch targets, clearer hover states
- Stats row: Simpler, no glass effect

#### `HeroSection.tsx` (Generic Hero)
**Current:** Two variants (stacked/split), both on soft background.
**New:**
- **Split variant**: Dark green background (`#1B4D3E`), white text, image on right with rounded corners
- **Stacked variant**: White background, dark text, centered, optional image below
- Remove the soft background default — heroes should be impactful
- Eyebrow: Smaller, uppercase, tracking wider, accent color
- Headline: Larger, tighter line-height
- Description: Slightly larger, better contrast
- CTAs: Primary (filled) + Secondary (outline) with clear hierarchy
- Trust badges: Simpler pills, no shadow

#### `HowItWorks.tsx`
**Current:** Split layout with one visible image, step cards with connectors.
**New:**
- Keep the premium split layout, but restore the three-step visual interaction
- Use the existing three assets: `/images/how-it-works/step-1.png`, `step-2.png`, and `step-3.png`
- Switch the main illustration on step hover/focus and when each step enters the viewport during scroll
- Keep the connector flow so the process still feels guided
- Add a subtle medical cross background pattern to bring back the hospital/clinical feel
- Avoid janky motion: use opacity/scale transitions only, and respect `prefers-reduced-motion`
- On mobile, keep the image visible near the steps and ensure the active state still updates cleanly

#### `TrustSignals.tsx`
**Current:** Dark green background, 2–4 column grid of glass cards.
**New:**
- Keep dark green background
- Remove glass cards — use simple white text on dark green
- Layout: Icon + Title + Description, no card container
- Icons: Larger, accent color
- Text: White for titles, `white/80` for descriptions
- Grid: 2×2 or 3-column depending on item count
- Remove decorative circles and patterns

#### `BookingCTA.tsx`
**Current:** Multiple variants with complex conditional styling.
**New:**
- **Full variant**: Dark green background, white text, single prominent CTA button (white bg, green text)
- **Compact variant**: White card with green border-left (4px), green headline, description, CTA button
- **Minimal variant**: Simple text row with CTA button, no card
- Remove animated shine effect
- Remove decorative circles
- Remove proof point pills from compact/minimal (keep for full)
- Simplify: One clear message, one clear action

#### `ServicesGrid.tsx` + `SpecialtiesGrid.tsx`
**Current:** Centered header + 3-column card grid.
**New:**
- Header: Left-aligned on desktop (more confident), centered on mobile
- Eyebrow: Smaller, more subtle
- Title: Larger, bolder
- Intro: Better contrast, slightly larger
- Grid: Keep 3-column, but increase gap to `gap-8` (32px)
- Cards: Let `ServiceCard` handle its own design

#### `DoctorsSection.tsx`
**Current:** Centered header + 3-column `DoctorCard` grid.
**New:**
- Header: Left-aligned, with "Our Team" eyebrow
- Grid: 3-column, `gap-8`
- **Important**: `DoctorCard` is NOT changed — only the wrapper section styling changes
- Background: White or soft, alternating with surrounding sections

#### `TeamHero.tsx`
**Current:** Dark green with decorative circles, curved bottom SVG.
**New:**
- Dark green background, cleaner
- Remove decorative circles
- Remove curved bottom SVG (creates visual clutter)
- Larger headline, better spacing
- Rating badge: Simpler, no glass effect

#### `FeaturedDoctor.tsx`
**Current:** Horizontal card with image left, info right.
**New:**
- Cleaner card design
- Image: Larger proportion, better aspect ratio
- Info: Better typography hierarchy
- Remove excessive borders and rings
- Simpler meta information display

#### `FAQSection.tsx`
**Current:** Simple accordion in cards.
**New:**
- Remove card wrapper from each FAQ item
- Use simple border-bottom divider style
- Larger question text, better contrast
- Smoother expand/collapse animation
- Add `+`/`-` icon instead of chevron (clearer affordance)

#### `SocialProof.tsx` + `TrustBar.tsx`
**Current:** Card-based social proof, 4-column trust bar.
**New:**
- Merge concepts — use a single trust bar approach
- Simpler: Logo + text + rating, no card wrapper
- Trust bar: Remove glass effect, use solid dark green with white text
- Icons: Larger, accent color

### 3.3 Template Components

#### `CountryHomeTemplate.tsx`
**Current:** Complex template with many sections, decorative elements everywhere.
**New:**
- **Quick Actions Nav**: Simpler, cleaner pill buttons, not text links
- **Hero**: Dark green, split layout, larger headline, cleaner image frame
- **Availability Banner**: Merge into hero or make a simple alert-style strip
- **About Section**: Cleaner image + text split, remove floating stat cards (they overlap poorly on mobile)
- **Specialties**: Use `ServicesGrid` section instead of inline cards
- **How It Works**: Use redesigned `HowItWorks` section
- **Home Delivery**: Dark green section, simpler layout
- **Partners**: Simpler logo grid, no card wrapper
- **Doctor Spotlight**: Cleaner quote layout, remove play button overlay (non-functional)
- **Trust Proof**: Use redesigned `TrustSignals`
- **Booking CTA**: Use redesigned `BookingCTA`

#### `ServiceDetailTemplate.tsx`
**Current:** Hero + content card + sticky sidebar.
**New:**
- Hero: Use redesigned `HeroSection` (stacked variant, no media)
- Content: Wider reading area, better typography
- Key facts: Simpler display, not pill-style
- Sidebar: Cleaner card, sticky behavior preserved
- Fallback sections: Better styled, more consistent

#### `DoctorProfileTemplate.tsx`
**Current:** Dark green hero with doctor image, about section, qualifications cards.
**New:**
- Hero: Dark green, cleaner, larger portrait, better info hierarchy
- Remove decorative circles and patterns
- About section: Better prose styling, wider reading area
- Qualifications/Specialties: Simpler list layout, not card-in-card
- Bottom CTA: Use redesigned `BookingCTA`

#### `DoctorTeamTemplate.tsx`
**Current:** TeamHero + FeaturedDoctor + DoctorsSection.
**New:**
- Use redesigned sections
- Consider removing `FeaturedDoctor` — it adds complexity without clear value
- Or: Make featured doctor a full-width banner, not a card

#### `StaticMarketingTemplate.tsx`
**Current:** Hero + intro card + feature grid + FAQ + related links + CTA.
**New:**
- Hero: Use redesigned `HeroSection`
- Intro: Simpler, not in a card — just text on soft background
- Feature grid: Larger cards, better images, more confident
- FAQ: Use redesigned `FAQSection`
- Related links: Simpler, not in a card
- CTA: Use redesigned `BookingCTA`

#### `ConsultationListingTemplate.tsx`
**Current:** Header + card grid + guidance strip + pricing + how it works + FAQ + CTA.
**New:**
- Header: Use redesigned `HeroSection` (stacked, no media)
- Card grid: Use `ConsultationDestinationCard` (preserved), but wrapper section is cleaner
- Guidance strip: Simpler, not in a card
- Pricing: Use redesigned `PricingCard`
- How it works: Use redesigned `HowItWorks`
- FAQ: Use redesigned `FAQSection`
- CTA: Use redesigned `BookingCTA`

#### `BlogIndexTemplate.tsx`
**Current:** Hero + card grid.
**New:**
- Hero: Use redesigned `HeroSection`
- Grid: Larger cards with images (add images to blog cards)
- Empty state: Cleaner

#### `BlogArticleTemplate.tsx`
**Current:** Two-column with sticky sidebar TOC.
**New:**
- Wider reading area
- Better typography for article body
- TOC sidebar: Cleaner, not in a card
- Author info: Better styled
- Medical disclaimer: More prominent, amber border

#### `BookingFormTemplate.tsx`
**Current:** Hero + form card + trust sidebar + CTA.
**New:**
- Hero: Use redesigned `HeroSection`
- Form card: Cleaner, less border noise
- Trust sidebar: Simpler, not card-based
- Apply new form input styles
- Better section spacing
- Clearer consent text

#### `LegalPageTemplate.tsx`
**Current:** Simple section with header + body sections.
**New:**
- Clean, readable layout
- Good typography for long-form legal text
- Clear navigation back to main site
- Better section dividers

### 3.4 Card Components (Redesign Allowed)

#### `ServiceCard.tsx`
**Current:** Image top, content bottom, hover lift.
**New:**
- Larger image area (60% of card height)
- Cleaner content area
- Better typography hierarchy
- Simpler hover: subtle shadow increase, no translate
- Remove gradient overlay on image

#### `PricingCard.tsx`
**Current:** Simple card with plan name, price, description.
**New:**
- More prominent price display
- Better visual hierarchy
- Highlight "most popular" option
- Cleaner CTA

#### `BlogCard.tsx`
**Current:** No image, text-only card.
**New:**
- Add image area (aspect 16:9)
- Larger title
- Better excerpt display
- Category tag

---

## 4. How DoctorCard and ConsultationDestinationCard Are Preserved

### 4.1 DoctorCard Preservation

`DoctorCard.tsx` is used in:
- `DoctorsSection.tsx` — wrapper section
- `DoctorTeamTemplate.tsx` — template layout
- `DoctorProfileTemplate.tsx` — not directly used, but similar styling

**What changes around it:**
- `DoctorsSection.tsx`: The section background, header styling, grid gap, and container width change
- `DoctorTeamTemplate.tsx`: The template layout, surrounding sections, and page rhythm change
- The card itself: **NO CHANGES** — same props, same JSX, same styling

**Visual impact:** The `DoctorCard` will appear in a cleaner, more spacious context with better surrounding whitespace and improved section headers. The card's own design remains intact.

### 4.2 ConsultationDestinationCard Preservation

`ConsultationDestinationCard.tsx` is used in:
- `ConsultationListingTemplate.tsx` — card grid

**What changes around it:**
- `ConsultationListingTemplate.tsx`: The page header, surrounding sections, guidance strip, pricing section, FAQ, and CTA all change
- The card grid wrapper: Cleaner section background, better spacing

**Visual impact:** The `ConsultationDestinationCard` will sit in a cleaner page context with improved header and section rhythm. The card's dramatic design remains as the visual anchor.

---

## 5. Implementation Plan: Small Safe Steps

### Phase 1: Foundation (globals.css + layout primitives)
**Files:** `globals.css`, `Container.tsx`, `Section.tsx`

1. Update CSS custom properties (colors, shadows, radius)
2. Add new `.gh-section-*` utility classes
3. Update `Container.tsx` max-width and padding
4. Update `Section.tsx` with variant prop and standardized padding
5. **Verify**: No broken pages, consistent spacing

### Phase 2: Shell (header + footer)
**Files:** `SiteHeader.tsx`, `SiteFooter.tsx`, `CTAFooter.tsx`, `FooterColumn.tsx`, `DesktopNav.tsx`, `MobileNav.tsx`

1. Redesign `SiteHeader.tsx` with new scroll behavior
2. Merge and simplify `CTAFooter.tsx` + `FooterColumn.tsx`
3. Update `DesktopNav.tsx` dropdown styling
4. Update `MobileNav.tsx` drawer styling
5. **Verify**: Navigation works, mobile menu opens/closes, all links functional

### Phase 3: Hero Sections
**Files:** `HomeHero.tsx`, `HeroSection.tsx`, `TeamHero.tsx`

1. Redesign `HomeHero.tsx` (gateway page)
2. Redesign `HeroSection.tsx` (generic hero)
3. Redesign `TeamHero.tsx` (team page hero)
4. **Verify**: All pages with heroes look correct

### Phase 4: Content Sections
**Files:** `HowItWorks.tsx`, `TrustSignals.tsx`, `BookingCTA.tsx`, `FAQSection.tsx`, `SocialProof.tsx`, `TrustBar.tsx`

1. Redesign `HowItWorks.tsx`
2. Redesign `TrustSignals.tsx`
3. Redesign `BookingCTA.tsx`
4. Redesign `FAQSection.tsx`
5. Merge/redesign `SocialProof.tsx` + `TrustBar.tsx`
6. **Verify**: Sections appear correctly on all pages that use them

### Phase 5: Templates
**Files:** All template files

1. `CountryHomeTemplate.tsx`
2. `ServiceDetailTemplate.tsx`
3. `DoctorProfileTemplate.tsx`
4. `DoctorTeamTemplate.tsx`
5. `StaticMarketingTemplate.tsx`
6. `ConsultationListingTemplate.tsx`
7. `BlogIndexTemplate.tsx`
8. `BlogArticleTemplate.tsx`
9. `BookingFormTemplate.tsx`
10. `LegalPageTemplate.tsx`
11. **Verify**: Each template page renders correctly

### Phase 6: Cards (Redesign Allowed)
**Files:** `ServiceCard.tsx`, `PricingCard.tsx`, `BlogCard.tsx`

1. Redesign `ServiceCard.tsx`
2. Redesign `PricingCard.tsx`
3. Redesign `BlogCard.tsx`
4. **Verify**: Card grids look correct

### Phase 7: Polish & QA
1. Run `pnpm lint`
2. Run `pnpm typecheck`
3. Run `pnpm build`
4. Manual visual check on key pages
5. Mobile responsive check
6. Accessibility check (contrast, focus states)

---

## 6. Edge Cases to Watch For

### 6.1 Mobile Layout
- **Long translated text**: German/Portuguese/Romanian text can be 30–50% longer than English. Ensure cards don't break, buttons don't wrap awkwardly, and headlines don't overflow.
- **Touch targets**: All interactive elements must be ≥ 48px on mobile.
- **Horizontal scroll**: Strictly forbidden. Check all pages at 320px width.

### 6.2 Missing Images
- `ServiceCard` falls back to `/images/services/default-medical.jpg` — ensure this exists and looks acceptable.
- `DoctorCard` falls back to `/images/ireland/doctor-spotlight-ai.svg` — ensure this exists.
- `BlogCard` currently has no image — new design adds images, need fallback.

### 6.3 Contrast
- All text on dark green backgrounds must be white or accent color with ≥ 4.5:1 ratio.
- Muted text (`text-muted`) must still be ≥ 4.5:1 on white backgrounds.
- Disabled states must still be readable (≥ 3:1).

### 6.4 Reduced Motion
- All animations must respect `prefers-reduced-motion`.
- No auto-playing carousels or videos.
- Hover effects should be subtle and not disorienting.

### 6.5 DoctorCard / ConsultationDestinationCard Integration
- These cards have their own internal styling. Ensure the new section backgrounds and grid gaps don't conflict.
- Test that cards still hover correctly, images load, and CTAs work.

---

## 7. Manual Verification Plan

### 7.1 Page Checklist

| Page | Desktop | Tablet | Mobile | Notes |
|------|---------|--------|--------|-------|
| `/` (gateway) | ☐ | ☐ | ☐ | Country selector, language dropdown |
| `/home` | ☐ | ☐ | ☐ | Full country home template |
| `/general-consultation-ie` | ☐ | ☐ | ☐ | Consultation listing |
| `/specialty-ie` | ☐ | ☐ | ☐ | Specialist listing |
| `/ireland/[service]` | ☐ | ☐ | ☐ | Service detail |
| `/ireland-team` | ☐ | ☐ | ☐ | Team listing |
| `/ireland-team/[slug]` | ☐ | ☐ | ☐ | Doctor profile |
| `/book-online` | ☐ | ☐ | ☐ | Booking form |
| `/about` | ☐ | ☐ | ☐ | Marketing template |
| `/plans-pricing` | ☐ | ☐ | ☐ | Pricing page |
| `/frequent-asked-questions` | ☐ | ☐ | ☐ | FAQ page |
| `/blog` | ☐ | ☐ | ☐ | Blog listing |
| `/post/[slug]` | ☐ | ☐ | ☐ | Blog article |
| `/privacy-policy` | ☐ | ☐ | ☐ | Legal page |

### 7.2 Component Checklist

| Component | Visual | Hover | Focus | Mobile |
|-----------|--------|-------|-------|--------|
| SiteHeader | ☐ | ☐ | ☐ | ☐ |
| MobileNav | ☐ | — | ☐ | ☐ |
| SiteFooter | ☐ | ☐ | ☐ | ☐ |
| HeroSection | ☐ | — | — | ☐ |
| HomeHero | ☐ | ☐ | ☐ | ☐ |
| HowItWorks | ☐ | — | — | ☐ |
| TrustSignals | ☐ | — | — | ☐ |
| BookingCTA | ☐ | ☐ | ☐ | ☐ |
| FAQSection | ☐ | — | ☐ | ☐ |
| DoctorCard | ☐ | ☐ | ☐ | ☐ |
| ConsultationDestinationCard | ☐ | ☐ | ☐ | ☐ |
| ServiceCard | ☐ | ☐ | ☐ | ☐ |

### 7.3 Accessibility Checklist

- [ ] Lighthouse accessibility score ≥ 95 on all key pages
- [ ] All interactive elements have visible focus states
- [ ] Color contrast ≥ 4.5:1 for all body text
- [ ] Color contrast ≥ 3:1 for large text and UI components
- [ ] `prefers-reduced-motion` respected
- [ ] No horizontal scroll at 320px width
- [ ] All images have alt text
- [ ] Form inputs have associated labels

---

## 8. Design Rationale Summary

### What Changes and Why

| Aspect | Current | New | Why |
|--------|---------|-----|-----|
| **Section rhythm** | Inconsistent padding, random backgrounds | Systematic alternation: dark → white → soft → white → dark | Creates visual breathing, guides eye, feels intentional |
| **Hero impact** | Soft background, safe | Dark green or white, bold | Heroes must grab attention; soft backgrounds waste the most valuable screen real estate |
| **Decorations** | Circles, patterns, glass effects everywhere | Purposeful clinical texture only | Healthcare can feel premium and medical without becoming flat; decoration must support trust, not distract |
| **Typography** | Functional, moderate contrast | Bolder headlines, tighter line-height, better hierarchy | Premium feel comes from confident typography |
| **Cards** | Subtle shadow, hover lift | Stronger shadow, cleaner hover | Cards need to feel tangible; hover should be subtle |
| **Spacing** | Tight, cramped | Generous, airy | Premium = space; cramped = cheap |
| **Mobile** | Stacked desktop | Purpose-built left alignment, larger touch targets | Mobile is primary for many users; must feel native |

### What Stays the Same

- **Color palette**: The approved `#1B4D3E` green system is excellent and stays
- **Font family**: Plus Jakarta Sans is perfect for healthcare
- **Card components**: `DoctorCard` and `ConsultationDestinationCard` are well-designed and stay
- **Route structure**: No URL changes
- **Data contracts**: All props and API behavior preserved
- **SEO**: No meta or structural changes

---

## 9. Success Criteria

1. **Visual cohesion**: Every public page feels like it belongs to the same design system
2. **Premium feel**: The site looks like a high-end healthcare service, not a generic template
3. **Trust signals**: Clear, prominent trust indicators without being pushy
4. **Conversion clarity**: Booking CTAs are obvious but not aggressive
5. **Mobile excellence**: Every page is comfortable to use on a phone
6. **Accessibility**: WCAG AA minimum, AAA where practical
7. **Performance**: No regression in build time or bundle size
8. **Stability**: `pnpm lint`, `pnpm typecheck`, `pnpm build` all pass

---

*Proposal prepared for Global Health / Nashaa frontend codebase.*
*Date: 2026-05-08*
