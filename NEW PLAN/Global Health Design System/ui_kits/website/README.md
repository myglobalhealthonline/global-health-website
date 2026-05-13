# Global Health · Website UI Kit

A click-through recreation of the **myglobalhealth.online** marketing
site. Built directly from the production Next.js components in
`code-reference/components/` and the brand foundations in the project
root.

## Run it

Open `index.html` in the preview pane. Use the country selector on the
home screen to enter a country clinic; use the **Book consultation** CTA
to open a booking form.

## Screens

| Screen | What it shows |
| --- | --- |
| **Home / country selector** | Hero, language + country picker, stat chips, brand mark on photo background |
| **Country home** (e.g. Portugal) | Quick-action nav, dark hero with rating, availability banner, About section, Specialties grid, How it works (3 steps), Doctor spotlight, Trust grid, Booking CTA |
| **Booking** | Modal form — name, email, country, service, preferred time |

## Components

- `Components.jsx` — `Btn`, `Eyebrow`, `IconTile`, `Chip`, `Stars`,
  `FlagBadge`, plus all Lucide-style icons used in the kit.
- `Header.jsx` — sticky dark header with logo + desktop nav + mobile
  drawer button.
- `HomeHero.jsx` — country-selector hero with glass card.
- `Sections.jsx` — `TrustBar`, `HowItWorks`, `SpecialtiesGrid`,
  `DoctorSpotlight`, `BookingCTA`, `Availability`, `AboutSection`.
- `CountryHome.jsx` — composes the country-home screen.
- `BookingModal.jsx` — the booking flow.
- `App.jsx` — top-level screen router with simple `useState`.

## Faithfulness

- Colors, radii, shadows, type scale all read from `colors_and_type.css`
  via CSS variables. No magic numbers.
- Layout patterns match `CountryHomeTemplate.tsx`, `HomeHero.tsx`,
  `TrustBar.tsx`, `CTAFooter.tsx`, `SiteHeader.tsx` — see
  `code-reference/components/` for the originals.
- Lucide icons are inlined as SVG (no CDN dependency in the demo).
- Country flags rendered as simple CSS gradients (good enough for
  high-fidelity demo); production uses the `flag-icons` sprite.

## Known gaps

- Country home is filled out for **Portugal**. Other countries show the
  same structure with their name swapped in.
- Doctor profile, service detail, and blog templates are out of scope
  for this UI kit — they exist in `code-reference/components/templates/`
  if needed.
