# Admin Portal · Design Brief for Claude Code

Hand `admin-portal-reference.html` to Claude Code together with this brief.
The HTML file is a single, offline-capable, click-through prototype of the
super-admin portal — open it in any browser to see every screen.

## What it shows

A fully styled, interactive recreation of the 9 admin screens from
`PLAN.md` §7:

1. **Login** — Forest split-screen with brand mark left, form right.
2. **Dashboard** — 4 stat cards, recent activity feed, quick-actions panel.
3. **Countries** list — table with drag-handles, status pills, stat counts.
4. **Country edit** — metadata, hero, contact, sidebar with visibility +
   stats + danger zone.
5. **Categories matrix** — categories × 5 country columns × toggle cells.
6. **Doctors** list — name with avatar, country chips, status, edit/more.
7. **Doctor edit** — profile form + sidebar with photo + per-country
   assignments (M:N toggle list).
8. **Services** list — segmented control for 4 service types, table.
9. **Service edit** — form (basics / pricing / SEO) + sidebar (cover image,
   visibility, assigned doctors, audit trail).

Sidebar navigation, country picker (top-right), and the service-type
segmented control are all interactive. State is persisted in
`localStorage`, so refreshing returns you to the same screen.

## Design conventions to match

### Colors (CSS variables, all already declared in the file)

| Token | Value | Use |
| --- | --- | --- |
| `--brand` | `#1B4D3E` | Primary buttons, links, focused state |
| `--brand-hover` | `#143B30` | Hover on primary |
| `--brand-dark` | `#0F2E25` | Sidebar background, login left panel |
| `--accent` | `#C8E6A0` | UI-safe mint — icon-tile backgrounds, on-dark CTAs |
| `--accent-vivid` | `#B0F122` | Marketing only (notification dots, hero highlights) |
| `--surface` | `#FFFFFF` | Cards |
| `--surface-soft` | `#F4F8F4` | Page background |
| `--fg1` | `#0F2E25` | Headings |
| `--fg2` | `#2D3B36` | Body |
| `--fg3` | `#5A6B64` | Muted, captions |
| `--border` | `#D8E0D8` | Card borders |

**Status pills:** Published = brand green tint; Draft = neutral grey;
Inactive = red tint; Pending = amber tint. See the `Pill` atom.

### Typography

- **Display** (headings): Plus Jakarta Sans, weight 800, letter-spacing
  `-0.02em`, line-height 1.1. (Substitutes for Gilroy — see project
  README; swap to Gilroy WOFF2 if licensed.)
- **Body**: Plus Jakarta Sans, weight 400/500/700, line-height 1.6.
- **Eyebrow**: 11px, weight 700, `letter-spacing: 0.18em`, uppercase,
  brand-colored. Above almost every section header.

### Spacing & shape

- **Buttons:** fully pill (`border-radius: 999px`), 44px (md) or 48px (lg)
  tall, sentence case, no terminal punctuation.
- **Cards:** white, `border-radius: 16px`, 1px border at `--border`,
  forest-tinted soft shadow.
- **Inputs:** 44px tall, `border-radius: 12px`, focus ring is
  `0 0 0 3px rgba(27,77,62,0.15)` (alpha-forest).
- **Section vertical rhythm:** 16/24/32 px stack — never odd one-offs.
- **Shadows are forest-tinted**, never neutral black.

### Iconography

Lucide-style stroke icons, 2px stroke, rounded line-cap. Inside a 36-44px
rounded-square tile with `rgba(200,230,160,0.30)` background and brand
color. Sized 14/16/18/20/24.

### Layout

- **Admin shell:** 260px dark sidebar (forest-night) + 64px topbar +
  cream content area.
- **Sidebar:** two sections — `Global` and `<Country>`. Country-scoped
  section dims when "All countries" is active.
- **Page header pattern:** Eyebrow → H1 (28-32px) → description (15px
  muted) → right-aligned action buttons. Use `PageHeader` atom.
- **Table pattern:** Header row uses `--surface-soft` background and 11px
  uppercase-tracked column labels. Body rows have 1px top borders.

### Interaction

- **Hover:** shadow lifts soft → card-hover, `translateY(-1px)`. Never
  scale.
- **Press:** translateY back to 0.
- **Animation:** 150-180ms ease-out, transform + box-shadow only. No
  bounces, no spins.

## How to share with Claude Code

1. Save `admin-portal-reference.html` somewhere in your repo (e.g.
   `docs/admin-reference.html`).
2. Save this brief alongside it (e.g. `docs/admin-brief.md`).
3. Tell Claude Code:
   > "Match the design and component patterns in
   > `docs/admin-reference.html`. The conventions are explained in
   > `docs/admin-brief.md`. Use the same color tokens, spacing, type
   > scale, and component anatomy. Implement with shadcn/ui + Tailwind
   > using these CSS variables as the brand layer."

The HTML file is self-contained: no external assets, no network calls,
no build step. Claude Code can read the markup directly to understand
the patterns.

## Component reference (what's inside the HTML)

| Atom | What it is | File of origin |
| --- | --- | --- |
| `Btn` | Pill button — `primary`, `secondary`, `soft`, `ghost`, `accent`, `danger` | `Atoms.jsx` |
| `Pill` | Status badge — `published`, `draft`, `pending`, `active`, `inactive`, `brand`, `neutral` | `Atoms.jsx` |
| `Eyebrow` | All-caps section kicker | `Atoms.jsx` |
| `Field`, `Input`, `TextArea`, `Select` | Form atoms with shared base style | `Atoms.jsx` |
| `Toggle` | On/off switch (brand-green when on) | `Atoms.jsx` |
| `FlagBadge`, `CountryChip` | Country indicators | `Atoms.jsx` |
| `Card` | White surface with rounded corners + soft shadow | `Atoms.jsx` |
| `Sidebar`, `Topbar`, `CountryPicker`, `PageHeader` | App shell | `Shell.jsx` |

## Mapping to Tailwind + shadcn (suggested)

If you're using Tailwind 4 + shadcn:

```ts
// tailwind.config.ts theme extensions
colors: {
  brand:        { DEFAULT: 'var(--brand)', hover: 'var(--brand-hover)', dark: 'var(--brand-dark)' },
  accent:       { DEFAULT: 'var(--accent)', vivid: 'var(--accent-vivid)' },
  surface:      { DEFAULT: 'var(--surface)', soft: 'var(--surface-soft)' },
  fg:           { 1: 'var(--fg1)', 2: 'var(--fg2)', 3: 'var(--fg3)' },
},
borderRadius: { card: '16px', button: '999px', input: '12px' },
boxShadow: {
  card:       '0 1px 3px rgba(15,46,37,0.08), 0 4px 12px rgba(15,46,37,0.04)',
  cardHover:  '0 4px 12px rgba(15,46,37,0.12), 0 8px 24px rgba(15,46,37,0.08)',
  focus:      '0 0 0 3px rgba(27,77,62,0.15)',
},
```

For shadcn `Button`, override the `primary` variant to use `bg-brand`,
`rounded-button`, `min-h-12`, weight 700.
