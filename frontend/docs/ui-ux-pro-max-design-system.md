# Global Health — UI/UX Pro Max Design System

## Product Category
Medical Clinic / Healthcare SaaS Platform

## Design Pattern
**Trust & Authority + Conversion**

Patients must feel safe before they book. Admins must feel in control. Every screen must answer:
- Is this real?
- Is this safe?
- What do I do next?

## Design Style
**Accessible & Ethical + Minimalism with Soft UI**

- No decorative clutter
- No fake social proof
- No unsupported medical claims
- Surfaces have subtle depth (shadows, not flat)
- Generous spacing calms anxiety
- Strong hierarchy guides action
- Green = health, trust, growth
- White = cleanliness, clarity
- Soft gray = secondary information

---

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Primary Dark | `#1B4D3E` | Headings, primary buttons, accents, trust |
| Primary Light | `#C8E6A0` | Icon circles, soft highlights, decorative only |
| Background | `#FFFFFF` | Card surfaces, main content |
| Soft Background | `#F6F9F6` | Page backgrounds, section alternates |
| Panel Background | `#F3F6F3` | Subtle panels, filter bars, empty states |
| Body Text | `#333333` | Primary reading text |
| Muted Text | `#666666` | Captions, helper text, metadata |
| Light Muted | `#888888` | Placeholder text, disabled hints |
| Border | `#E5E5E5` | Card borders, dividers, input borders |
| Border Strong | `#D1D5D1` | Focused borders, active states |
| Hero Overlay | `rgba(27, 77, 62, 0.55)` | Hero image readability only |
| Error | `#DC2626` | Validation errors, destructive actions |

### Dark surfaces (admin headers, trust panels)
- Background: `#1B4D3E`
- Text: `#FFFFFF`
- Muted text: `rgba(255,255,255,0.82)`
- Border: `rgba(255,255,255,0.12)`

---

## Typography Scale

| Token | Size | Weight | Line-height | Usage |
|-------|------|--------|-------------|-------|
| Display | `clamp(2.1rem, 5vw, 3.5rem)` | 800 | 1.08 | Page H1, hero headlines |
| H1 | `clamp(1.9rem, 3.7vw, 3.1rem)` | 800 | 1.08 | Page titles |
| H2 | `clamp(1.5rem, 2.8vw, 2.35rem)` | 800 | 1.15 | Section headings |
| H3 | `clamp(1.13rem, 1.6vw, 1.35rem)` | 700 | 1.25 | Card titles |
| Body Large | `clamp(1rem, 1.15vw, 1.12rem)` | 400 | 1.7 | Lead paragraphs |
| Body | `1rem` | 400 | 1.65 | Standard body |
| Small | `0.92rem` | 400 | 1.6 | Captions, helpers |
| Eyebrow | `11px` | 700 | 1.2 | Labels, kickers (uppercase, tracking 0.18em) |

---

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| Section XL | `112px` (`py-28`) | Major section breaks |
| Section LG | `80px` (`py-20`) | Standard sections |
| Section MD | `64px` (`py-16`) | Compact sections |
| Section SM | `40px` (`py-10`) | Tight groupings |
| Card Padding LG | `40px` (`p-10`) | Large cards, auth forms |
| Card Padding MD | `24px` (`p-6`) | Standard cards |
| Card Padding SM | `16px` (`p-4`) | Dense cards, tables |
| Grid Gap LG | `32px` (`gap-8`) | 2-3 column grids |
| Grid Gap MD | `24px` (`gap-6`) | 3-4 column grids |
| Grid Gap SM | `16px` (`gap-4`) | Tight grids |

---

## Card System

All cards share this DNA:
- White background (`#FFFFFF`)
- `1px` border (`#E5E5E5`)
- Border radius: `22px` (`--radius-card`)
- Shadow: `0 2px 8px rgba(27,77,62,0.06), 0 8px 24px rgba(27,77,62,0.04)`
- Hover (interactive): `translateY(-1px)` + stronger shadow
- Padding: `24px` mobile, `32px` tablet, `40px` desktop

**Card types:**
- **Surface Card**: Default, for content
- **Action Card**: Hover lift, cursor pointer, for dashboard items
- **Panel Card**: No hover, for tables/filter bars inside cards

---

## Button System

| Type | Background | Text | Border | Hover | Usage |
|------|------------|------|--------|-------|-------|
| Primary | `#1B4D3E` | White | none | `#143B30` | Main CTA |
| Secondary | White | `#1B4D3E` | `2px #1B4D3E` | `#1B4D3E` bg, white text | Secondary action |
| Soft | `#F6F9F6` | `#1B4D3E` | none | `#F0F3F0` | Low emphasis |
| Danger | `#FEF2F2` | `#991B1B` | `1px #FECACA` | `#FECACA` | Destructive |
| Ghost (dark bg) | White | `#1B4D3E` | none | `#F6F9F6` | On dark surfaces |

All buttons:
- Min height: `48px`
- Border radius: `999px` (pill)
- Font: `15px`, weight `700`
- Padding: `0 28px`
- Shadow: subtle soft shadow
- Focus: `2px` outline offset `2px`

---

## Form System

**Inputs:**
- Height: `48px`
- Background: white
- Border: `1px solid #E5E5E5`
- Border radius: `12px` (`--radius-card-sm`)
- Focus: border `#1B4D3E`, shadow `0 0 0 3px rgba(27,77,62,0.08)`
- Placeholder: `#888888`
- Error: border `#DC2626`, shadow `0 0 0 3px rgba(220,38,38,0.08)`

**Labels:**
- Font: `14px`, weight `700`
- Color: `#333333`
- Required asterisk: `#1B4D3E`

**Helper text:**
- Font: `14px`
- Color: `#666666`

**Consent/checkbox blocks:**
- Background: `#F6F9F6`
- Border radius: `12px`
- Padding: `16px`

---

## Badge/Status System

| Status | Background | Text | Border |
|--------|------------|------|--------|
| Success | `#F0FDF4` | `#166534` | `#BBF7D0` |
| Warning | `#FFFBEB` | `#78350F` | `#FDE68A` |
| Error | `#FEF2F2` | `#991B1B` | `#FECACA` |
| Info | `#F0F9FF` | `#075985` | `#BAE6FD` |
| Neutral | `#F6F9F6` | `#333333` | `#E5E5E5` |

All badges:
- Pill shape (`999px` radius)
- Font: `12px`, weight `600`
- Padding: `4px 12px`

---

## Admin Dashboard System

**Dashboard hero:**
- Dark green background (`#1B4D3E`)
- White text
- Session context (name, email, role)
- Scope disclaimer

**Dashboard cards:**
- Large action cards (not button lists)
- Icon in soft green circle
- Title + description
- Hover lift
- Clear action link

**CRUD pages:**
- Page header with title + action bar
- Filter panel: subtle background, rounded, grouped inputs
- Table: white surface, hover row highlight, proper status badges
- Empty state: centered, icon, helpful copy, CTA
- Form: grouped fields, clear sections, strong submit

---

## Patient Account System

**Account page:**
- Soft background page
- Profile card: avatar placeholder, name, email, details
- Action grid: bookings, book new, settings
- Settings as disabled button (not fake link)

**Bookings page:**
- Header with title + book CTA
- Booking cards (not just text):
  - Status badge top-right
  - Country + consultation type
  - Date created
  - Notes preview
  - Clear visual hierarchy
- Empty state: intentional illustration feel

---

## Image/Illustration Treatment

- Use existing approved/temporary local assets only
- Do not hotlink external assets
- Illustration containers: soft background (`#F6F9F6`), rounded corners
- Images on dark backgrounds: subtle border + rounded corners
- All images: `object-cover`, stable dimensions

---

## Anti-Patterns (Forbidden)

- Generic button-list dashboard
- Cramped forms with tiny text
- Weak CTAs that blend into body copy
- Random gradients (especially purple/blue)
- Fake stats, testimonials, review counts
- Unsupported medical claims
- Decorative clutter without purpose
- Flat white boxes with no depth
- Mobile overflow/horizontal scroll (except contained tables)
- Doctor portal/login confusion
- AI-generated faces presented as real doctors
