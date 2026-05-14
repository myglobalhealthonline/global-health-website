# Global Health — Master Build Plan

**Brand:** Global Health · *Medicine Without Borders*
**Repo:** `myglobalhealthonline/global-health-website`
**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL · Prisma 7 · Railway
**Document version:** 1.0 — supersedes all prior stage documents

---

## Table of contents

1. [Project overview](#1-project-overview)
2. [Brand identity](#2-brand-identity)
3. [Technology stack](#3-technology-stack)
4. [Architecture](#4-architecture)
5. [Data model](#5-data-model)
6. [Page inventory](#6-page-inventory)
7. [Admin portal specification](#7-admin-portal-specification)
8. [Design system](#8-design-system)
9. [Image and asset management](#9-image-and-asset-management)
10. [Implementation phases](#10-implementation-phases)
11. [Deployment](#11-deployment)
12. [Healthcare compliance and data protection](#12-healthcare-compliance-and-data-protection)
13. [Security](#13-security)
14. [Testing strategy](#14-testing-strategy)
15. [Performance budget](#15-performance-budget)
16. [Local development setup](#16-local-development-setup)
17. [Concrete code patterns](#17-concrete-code-patterns)
18. [Acceptance criteria](#18-acceptance-criteria)
19. [Future scope](#19-future-scope)

---

## 1. Project overview

### 1.1 Vision

A scalable global healthcare platform that connects patients with licensed doctors through online consultations. Patients pick a country, choose a service, and book. Admins manage every country, doctor, and service from a single super-admin portal.

The platform replaces the current Wix site at `myglobalhealth.online` with a clean, code-owned, production-grade web application that scales to additional countries without rewrites.

### 1.2 Scope — v1 (current build)

- **Public marketing site** at `www.myglobalhealth.online`
- **Super admin portal** at `admin.myglobalhealth.online`
- All public pages currently on Wix, rebuilt with the new design system
- DB-driven content for countries, doctors, services, categories
- Static handcrafted pages for home, about, FAQ, blog, legal
- Booking intake form (writes to `Appointment` table; no payment yet)

### 1.3 Out of scope (deferred)

- **Patient portal** with login, history, prescription requests — v2
- **Payment integration** (Stripe / local providers) — v2
- **Doctor portal** with clinical workflows — separate repo, not built here
- **Email transactional flows** (reset password, booking confirmation) — placeholder for v1, full implementation v2
- **Multilingual translations** — each country shows content in its primary language as entered by admin; auto-translation is not in scope

### 1.4 Success criteria for v1

- Admin can add a new country end-to-end (name, hero, languages, currency) and have it appear on the public site within minutes without a deploy
- Admin can publish a new service in any country, with category, price, doctor assignments, and image
- All 200+ existing Wix URLs continue to resolve (no SEO loss)
- Public site Lighthouse scores: Performance 90+, Accessibility 95+, SEO 95+
- Brand identity (Global Health green palette, Gilroy typography) applied consistently across both apps

---

## 2. Brand identity

### 2.1 Color palette

Pulled directly from the *Manual da Marca* (brand manual).

| Token | Hex | RGB | Usage |
|---|---|---|---|
| **GH Forest** | `#1D4B36` | 29, 75, 54 | Primary brand color. Hero backgrounds, admin sidebar, header, primary buttons. |
| **GH Olive** | `#8FB021` | 143, 176, 33 | Secondary brand color. Logo accent, supporting elements, badges. |
| **GH Lime** | `#B0F122` | 176, 241, 34 | High-energy accent. CTAs, focus states, success highlights. |
| **GH White** | `#FFFFFF` | 255, 255, 255 | Card surfaces, body backgrounds, text on dark green. |
| **GH Gray** | `#6D6D6D` | 109, 109, 109 | Body text on light surfaces, muted labels, secondary content. |

#### Semantic color mapping

Beyond the brand colors above, we derive tonal variations for UI states:

```
GH Forest scale (for surfaces and text on light)
  --gh-forest-50:  #E8F0EC    very light tint, hover surfaces
  --gh-forest-100: #C8DBD0
  --gh-forest-200: #8FB39D
  --gh-forest-500: #1D4B36    BASE
  --gh-forest-700: #143324    pressed buttons, dark mode emphasis
  --gh-forest-900: #0B1F15    deepest, rarely used

GH Lime scale (for CTAs and highlights)
  --gh-lime-100:   #F0FCD0
  --gh-lime-300:   #D7F87A
  --gh-lime-500:   #B0F122    BASE
  --gh-lime-700:   #8FB021    olive (also a brand color)

Neutral scale (for surfaces, borders, body text)
  --neutral-50:   #FAFAF9
  --neutral-100:  #F4F4F3
  --neutral-200:  #E5E5E3
  --neutral-300:  #D1D1CE
  --neutral-500:  #6D6D6D    GH Gray base
  --neutral-700:  #404040
  --neutral-900:  #171717

System colors (state feedback)
  --success: #16A34A          green that complements GH Forest
  --warning: #CA8A04          amber
  --danger:  #DC2626          red
  --info:    #0284C7          blue (sparingly — keep brand green dominant)
```

#### Color rules

- **GH Forest** is the dominant brand color. Use generously: nav, hero, primary buttons.
- **GH Lime** is high-energy. Reserve for moments of activation — primary CTAs ("Book a consultation"), the bell icon notification dot, focus rings.
- **GH Olive** sits between Forest and Lime — use for supporting accents, secondary buttons, "active" states in admin nav.
- **Never** use pure black (`#000`) — use `--neutral-900` for darkest text.
- **Avoid blue accents** — they clash with the brand palette. Use Forest tints for "info" semantics instead of standard blue where possible.

### 2.2 Typography

| Family | Weight | Usage |
|---|---|---|
| **Gilroy Black** | 900 | Hero titles, page headers, brand statements, key emphasis |
| **Gilroy Bold** | 700 | Section headings, card titles, buttons |
| **Gilroy SemiBold** | 600 | Subheadings, labels, navigation |
| **Gilroy Regular** | 400 | Body text, descriptions, default UI |

Gilroy is a commercial typeface — ensure you have the appropriate license (it's available from Type Type Foundry). Self-host the woff2 files in `public/fonts/` for both apps; do not load from a CDN you don't control.

#### Fallback stack

```css
font-family: "Gilroy", "Avenir Next", "Avenir", -apple-system, BlinkMacSystemFont, sans-serif;
```

#### Type scale (Tailwind)

```
text-xs:    12px / 16px line-height    — fine print, table meta
text-sm:    14px / 20px                — body default, labels
text-base:  16px / 24px                — long-form body
text-lg:    18px / 28px                — emphasized body
text-xl:    20px / 28px                — small headings
text-2xl:   24px / 32px                — card titles
text-3xl:   30px / 36px                — section headings
text-4xl:   36px / 40px                — page titles
text-5xl:   48px / 1.1                 — hero titles (admin smaller, public larger)
text-6xl:   64px / 1.0                 — hero on public homepage
```

### 2.3 Logo usage

The brand manual provides four logo variants:
1. **Green on dark green** — primary mark, logo on Forest background
2. **All white on dark green** — alternative for backgrounds with the EKG line lost in green-on-green
3. **Green on white** — for light backgrounds, business cards, admin sidebar
4. **Full color on white** — most versatile for documents, footers

#### Where to use which

- **Public site header** (white background): Full color on white
- **Public site footer** (Forest background): All white
- **Public hero sections** (Forest background): All white or Green-on-dark
- **Admin sidebar** (white/light surface): Full color on white, compact size (32px tall)
- **Admin login** (light card on Forest): Full color on white
- **Email/PDF**: Full color on white

Store the logo as SVG in `apps/web/public/logos/` and `apps/admin/public/logos/`. Provide a horizontal lockup (logo + wordmark inline) for tight header spaces.

### 2.4 Visual principles

These guide every design decision:

- **Trustworthy first, beautiful second.** This is healthcare — clarity and confidence beat decoration.
- **Generous whitespace.** Medical content can feel heavy; breathing room makes it approachable.
- **One bold accent at a time.** A page might have one Lime CTA, one Olive badge, otherwise restraint.
- **Forest carries the brand.** When in doubt, more Forest. The Lime is the spark, not the foundation.
- **Photography is human and grounded.** Real medical settings, diverse faces, warm light. Avoid sterile stock photography.
- **No glassmorphism, no gradients on text, no purple, no neon.** These clash with the brand's editorial calm.

### 2.5 Voice and tone

- **Reassuring without overpromising.** Don't make medical claims; do communicate competence.
- **Plain language.** A patient with no medical background should understand every CTA.
- **Direct.** Short sentences. Strong verbs. "Book a consultation," not "Schedule your appointment today!"
- **Multilingual-aware.** Copy that translates well — avoids idioms, double meanings, country-specific references.

---

## 3. Technology stack

### 3.1 Confirmed stack

**Frontend (both apps):**
- Next.js 16 (App Router, Server Components, Server Actions)
- React 19
- TypeScript 5.x (strict mode)
- Tailwind CSS 4 with the brand tokens above
- shadcn/ui as the component primitive layer
- Radix UI primitives (under shadcn)
- React Hook Form + Zod for forms
- Lucide React for icons
- Sonner for toasts

**Backend:**
- Node.js 20.19+
- PostgreSQL 16 (Railway)
- Prisma 7 (schema, migrations, generated client)
- JWT auth via `jose`
- `bcryptjs` for password hashing
- Railway Object Storage (S3-compatible) for images via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`

**Tooling:**
- pnpm workspaces
- ESLint + Prettier
- Docker Compose for local Postgres
- Playwright for E2E (optional, post-launch)

### 3.2 Why these choices

- **Two Next.js apps over one** — admin and public have different audiences, different security needs, different scaling profiles. Separating them at the app level (not just the route level) means admin bundle never ships to public visitors and admin can be deployed with stricter constraints later (IP allowlist, etc.).
- **Prisma owns the schema in `backend/`** — single source of truth. Both apps import the generated client.
- **Tailwind 4 with CSS variables** — brand tokens defined once in CSS variables, consumed by Tailwind utilities. Theme changes happen in one file.
- **Railway for everything** — Postgres, object storage, app deploys, all in one provider. Simpler ops than splitting across Vercel/Supabase/Cloudflare for v1.

---

## 4. Architecture

### 4.1 Monorepo layout

```
global-health-website/
├── apps/
│   ├── web/                       Public site → www.myglobalhealth.online
│   │   ├── app/
│   │   │   ├── (site)/            Marketing pages
│   │   │   ├── [country]/         Country-scoped public routes
│   │   │   ├── api/               Public APIs (booking intake, revalidate)
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   ├── lib/
│   │   ├── public/
│   │   │   ├── fonts/             Gilroy woff2 files
│   │   │   ├── logos/             Brand SVGs
│   │   │   └── images/
│   │   └── tailwind.config.ts
│   │
│   └── admin/                     Admin portal → admin.myglobalhealth.online
│       ├── app/
│       │   ├── (auth)/
│       │   ├── (dashboard)/
│       │   │   ├── countries/
│       │   │   ├── categories/
│       │   │   ├── doctors/
│       │   │   ├── [country]/     Country-scoped admin routes
│       │   │   └── settings/
│       │   ├── api/
│       │   └── middleware.ts
│       ├── components/
│       └── tailwind.config.ts
│
├── packages/
│   ├── db/                        Prisma schema, client, seed
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   └── index.ts               Exports the singleton client
│   │
│   ├── ui/                        Shared shadcn components (optional)
│   ├── design-tokens/             Brand CSS variables, Tailwind preset
│   └── lib/                       Shared Zod schemas, types, constants
│
├── docs/
│   ├── PLAN.md                    This document
│   ├── BRAND.md                   Brand guidelines deep-dive
│   ├── ROUTES.md                  Full route inventory + redirects
│   └── DEPLOYMENT.md
│
├── pnpm-workspace.yaml
├── docker-compose.yml
├── package.json
└── README.md
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### 4.2 The country axis

Every piece of dynamic content hangs off a `Country` row. The country is the primary axis of the entire platform.

```
        ┌──────────────┐
        │   Country    │ ← admin manages list, hero copy, currency
        └──────┬───────┘
               │
   ┌───────────┼───────────┬──────────────┬──────────────┐
   ▼           ▼           ▼              ▼              ▼
┌────────┐ ┌─────────┐ ┌───────────┐ ┌────────────┐ ┌──────────┐
│ Service│ │ Doctor  │ │ Category  │ │Appointment │ │ Hero copy│
│  (FK)  │ │ (M:N)   │ │  (M:N via │ │   (FK)     │ │  (cols on│
│        │ │         │ │ enablement│ │            │ │  Country)│
└────────┘ └─────────┘ └───────────┘ └────────────┘ └──────────┘
```

- **Service → Country** is many-to-one (FK). Each service lives in one country; if you offer the same service in two countries, that's two rows.
- **Doctor ↔ Country** is many-to-many via `DoctorCountry`. The same doctor can practice in multiple countries with per-country sort order and active flag.
- **Category ↔ Country** is many-to-many via `CategoryCountry`. Categories are global (Cardiology is Cardiology everywhere), but each country toggles which categories appear.
- **Appointment → Country** is many-to-one (FK). Every booking belongs to one country.

### 4.3 Static vs dynamic page split

| Type | Stays static (handcrafted in code) | Becomes dynamic (admin-managed) |
|---|---|---|
| **Homepage** | Root `/` with country picker | Per-country home `/[country]` content (hero, featured services) |
| **About** | `/about` page | Country team pages `/[country]/team` |
| **FAQ** | `/frequent-asked-questions` | — |
| **Blog** | `/blog` and `/post/[slug]` (MDX in code per your decision) | — |
| **Legal** | `/privacy`, `/terms`, `/refund-policy`, `/cookies`, `/gdpr` | — |
| **Careers** | `/careers` page | — |
| **Doctors** | — | All doctor profiles and team lists |
| **Services** | — | All consultations, prescriptions, health tests |
| **Categories** | — | Global, with per-country enablement |
| **Countries** | — | The axis itself |
| **Pricing pages** | `/plans-pricing` v1 (static) | Could migrate v2 if needed |

### 4.4 Public site URL structure

We preserve every existing Wix URL for SEO. New canonical structure runs in parallel via redirects.

**Preserved legacy URLs (no breaking changes):**

```
/                                  /home
/about                             /careers
/blog                              /post/[slug]
/frequent-asked-questions          /gift-card
/plans-pricing                     /online-prescription
/home-delivery                     /home-health-test
/partner-clinics                   /legal-notices
/term-and-conditions               /privacy
/return-and-refund-policy          /copy-of-privacy-policy

# Country-specific (slugs preserved):
/home (Ireland)                    /home-pt   /home-sp   /home-cz   /home-rm
/ireland-team                      /portugal-team  /spain-team
/czechia-team                      /romania-team
/general-consultation-ie           /general-consultation-pt   (etc.)
/specialty-ie                      /specialty-pt   (etc.)

# Service detail pages (Ireland — keep misspelled slugs):
/ireland/[service-slug]
/ireland-specialist-consultations/[service-slug]
/ireland-doctors/[doctor-slug]
/service-page/[slug]
/services/[slug]
/home-health-tests/[slug]
/category/[slug]
```

**New canonical structure (added alongside, with redirects from legacy):**

```
/[country]                         e.g. /ie  /pt  /es  /cz  /rm
/[country]/team
/[country]/general
/[country]/specialist
/[country]/prescriptions
/[country]/health-tests
/[country]/doctors/[doctor-slug]
/[country]/services/[service-slug]
```

Redirect rules live in `next.config.ts`. Example: `/general-consultation-ie` → 301 → `/ie/general`. Both URLs render correctly; the canonical link in `<head>` points to the new one so Google migrates rankings over time.

### 4.5 Admin URL structure

```
/login                             Public login page
/                                  Dashboard (auth required)
/countries                         List of countries
/countries/[id]                    Edit country
/categories                        Global categories + country matrix
/categories/[id]                   Edit category
/doctors                           All doctors
/doctors/new
/doctors/[id]                      Edit doctor (M:N country assignments)
/admin-users                       Manage admins
/audit                             Audit log
/settings                          Account settings

# Country-scoped (active country in URL):
/[country]                         Country dashboard
/[country]/content                 Edit hero, contact, languages
/[country]/general                 General consultations list
/[country]/general/[id]
/[country]/specialist
/[country]/specialist/[id]
/[country]/prescriptions
/[country]/prescriptions/[id]
/[country]/health-tests
/[country]/health-tests/[id]
/[country]/appointments            Booking requests
```

The active country lives in the URL (single source of truth). The country dropdown in the topbar rewrites the URL when changed. Cookie stores the last-selected country to default new sessions back to it.

### 4.6 Cache invalidation between apps

The two apps are deployed separately. When admin publishes a change, the public site needs to know.

Pattern: admin server actions, after a successful DB write, POST to `https://www.myglobalhealth.online/api/revalidate` with a shared secret and a cache tag. The public site's revalidate route calls Next.js `revalidateTag()`. Within seconds the public site rebuilds the affected pages.

Tagging convention:

```
country:ie                         Whole country (hero, etc.)
country:ie:services                Service list for IE
country:ie:doctors                 Doctor list for IE
service:[id]                       Single service detail page
doctor:[slug]                      Single doctor detail page
```

---

## 5. Data model

The full Prisma schema lives in `packages/db/prisma/schema.prisma`. Highlights below — see the `schema.prisma` file in the outputs for the complete definition.

### 5.1 Core entities

| Model | Purpose | Key fields |
|---|---|---|
| **Country** | The axis. Manages enabled countries, hero content, currency, contact. | `code`, `slug`, `name`, `currency`, `languages`, `heroTitle`, `heroSubtitle`, `status` (DRAFT/PUBLISHED), `active` |
| **Category** | Global pool of specialties (Cardiology, etc.) | `slug`, `name`, `type` (GENERAL/SPECIALIST), `iconUrl` |
| **CategoryCountry** | Join: which categories are enabled in which countries | `categoryId`, `countryId`, `active`, `sortOrder` |
| **Doctor** | Public-facing doctor profile (not a login account) | `slug`, `name`, `title`, `bio`, `imageUrl`, `languages`, `registrationNumber` |
| **DoctorCountry** | Join: M:N doctor ↔ country with per-country flags | `doctorId`, `countryId`, `sortOrder`, `active` |
| **Service** | Consultations, prescriptions, health tests — unified | `slug`, `title`, `type` (4 enums), `countryId`, `categoryId`, `priceCents`, `status` (DRAFT/PUBLISHED) |
| **User** | Admins (and future patients) | `email`, `passwordHash`, `role` (PATIENT/ADMIN/SUPER_ADMIN) |
| **AdminAuditLog** | Every admin mutation logged | `userId`, `action`, `entity`, `entityId`, `countryId`, `metadata`, `createdAt` |
| **Appointment** | Booking intake (no payment in v1) | `serviceId`, `countryId`, `patientName/Email/Phone`, `status`, `notes` |

### 5.2 Enums

```prisma
enum UserRole          { PATIENT  ADMIN  SUPER_ADMIN }
enum CategoryType      { GENERAL  SPECIALIST }
enum ServiceType       { GENERAL  SPECIALIST  PRESCRIPTION  HEALTH_TEST }
enum PublishStatus     { DRAFT  PUBLISHED }
enum AppointmentStatus { PENDING  CONFIRMED  CANCELLED  COMPLETED }
```

### 5.3 Important constraints

- `Service.@@unique([countryId, slug])` — same slug can exist in two countries (different rows, different content)
- `DoctorCountry.@@unique([doctorId, countryId])` — one assignment per doctor-country pair
- `CategoryCountry.@@unique([categoryId, countryId])` — same constraint for category enablement
- `Country.code` and `Country.slug` are independently unique (ISO code vs URL slug)
- `User.email` is the login identifier (case-insensitive in queries)

### 5.4 Publish workflow

Both `Service` and `Country` have a `status: PublishStatus` field.

- **DRAFT**: Visible only in admin. Public site queries filter `status = PUBLISHED`.
- **PUBLISHED**: Live on the public site.
- A separate `active: boolean` flag temporarily hides without losing publish state.

Workflow:
1. Admin creates new service → starts as DRAFT
2. Admin edits, saves repeatedly → still DRAFT
3. Admin clicks "Publish" → status flips to PUBLISHED, audit log records, cache invalidates
4. Later edits create an "unpublished changes" state (admin can save as draft or publish again)

For v1, "unpublished changes" is detected by comparing `updatedAt` vs a `publishedAt` field — to be added if/when needed. Simpler v1: every edit promotes to PUBLISHED unless admin explicitly chooses "Save as draft."

---

## 6. Page inventory

### 6.1 Public site pages — static (handcrafted)

| Route | Component | Notes |
|---|---|---|
| `/` | `app/(site)/page.tsx` | Country picker hero |
| `/about` | `app/(site)/about/page.tsx` | Static company story |
| `/careers` | `app/(site)/careers/page.tsx` | Job listings (static for v1) |
| `/blog` | `app/(site)/blog/page.tsx` | MDX index |
| `/post/[slug]` | `app/(site)/post/[slug]/page.tsx` | MDX article rendering |
| `/frequent-asked-questions` | `app/(site)/faq/page.tsx` | Accordion |
| `/gift-card` | `app/(site)/gift-card/page.tsx` | Marketing |
| `/plans-pricing` | `app/(site)/plans-pricing/page.tsx` | Static for v1 |
| `/online-prescription` | `app/(site)/online-prescription/page.tsx` | Marketing for the feature, services dynamic underneath |
| `/home-delivery` | `app/(site)/home-delivery/page.tsx` | Marketing |
| `/home-health-test` | `app/(site)/home-health-test/page.tsx` | Marketing for the feature, services dynamic underneath |
| `/partner-clinics` | `app/(site)/partner-clinics/page.tsx` | Static directory v1 |
| `/legal-notices`, `/term-and-conditions`, `/privacy`, `/return-and-refund-policy`, `/cookies` | Each its own route | MDX or hardcoded |
| `/legal-notices` ↔ `/gdpr-compliance` | Alias | Redirect |

### 6.2 Public site pages — dynamic (DB-driven)

| Route | Data source | Notes |
|---|---|---|
| `/[country]` and legacy `/home-{cc}` | `Country` row + featured `Service` | Hero from country, services from country's published services |
| `/[country]/team` and legacy `/{country}-team` | `Doctor` filtered by country | Sorted by `DoctorCountry.sortOrder` |
| `/[country]/general` and legacy `/general-consultation-{cc}` | `Service` where `type=GENERAL` and country | Grid of cards |
| `/[country]/specialist` and legacy `/specialty-{cc}` | `Service` where `type=SPECIALIST` and country | Grid of cards |
| `/[country]/services/[slug]` and legacy `/{country}/{slug}` and `/service-page/{slug}` and `/services/{slug}` | Single `Service` | Full detail page with booking CTA |
| `/[country]/doctors/[slug]` and legacy `/{country}-doctors/{slug}` | Single `Doctor` | Profile + assigned services |
| `/[country]/prescriptions` | `Service` where `type=PRESCRIPTION` | |
| `/[country]/health-tests` and legacy `/home-health-tests/[slug]` | `Service` where `type=HEALTH_TEST` | |
| `/category/[slug]` | `Category` + related services | |

### 6.3 Admin pages

See [Section 7](#7-admin-portal-specification) for the full admin spec.

### 6.4 URL redirect matrix

All 200+ legacy URLs map to canonical new structures via 301 redirects in `next.config.ts`. The redirect map lives in `docs/ROUTES.md` (to be created during Phase 1 — site audit).

A condensed view:

```ts
// next.config.ts
async redirects() {
  return [
    { source: '/home', destination: '/ie', permanent: true },
    { source: '/home-pt', destination: '/pt', permanent: true },
    { source: '/home-sp', destination: '/es', permanent: true },
    { source: '/home-cz', destination: '/cz', permanent: true },
    { source: '/home-rm', destination: '/rm', permanent: true },
    { source: '/ireland-team', destination: '/ie/team', permanent: true },
    // ... and so on
  ];
}
```

---

## 7. Admin portal specification

### 7.1 Authentication

- **Login at** `/login`. Email + password, server-rendered form.
- **Session**: JWT signed with `jose`, stored in httpOnly secure cookie.
- **Middleware** at `apps/admin/middleware.ts` redirects all unauthenticated requests to `/login`, with `?next=` for post-login redirect.
- **Roles**: `ADMIN` (full read/write for v1, country restrictions in v2) and `SUPER_ADMIN` (additionally can manage admin users).
- **Logout** clears the cookie and writes an audit row.
- **Password reset**: placeholder in v1 — manual reset by SUPER_ADMIN via a "send reset link" button that displays a one-time URL in the UI for the SUPER_ADMIN to share manually. Email-based reset arrives in v2.

### 7.2 Layout shell

Every admin page (except `/login`) renders inside this shell:

```
┌─────────────────────────────────────────────────────────┐
│  Topbar                                                  │
│  [Logo] [Breadcrumb]    [Country Picker ▾] [User ▾]    │
├──────────┬──────────────────────────────────────────────┤
│ Sidebar  │  Content area                                │
│          │                                              │
│ Global   │  (page-specific)                             │
│ ├ Dash   │                                              │
│ ├ Countries                                             │
│ ├ Categories                                            │
│ ├ Doctors                                               │
│ └ Admins │                                              │
│          │                                              │
│ Ireland  │                                              │
│ ├ Home   │                                              │
│ ├ General│                                              │
│ ├ Spec.  │                                              │
│ └ ...    │                                              │
└──────────┴──────────────────────────────────────────────┘
```

The sidebar's lower section (country-scoped nav) updates its label and entries based on the active country.

### 7.3 The active country dropdown

The single most important UX element of the admin.

- Sits in the topbar, always visible
- Shows the current country (e.g. "Ireland") with a flag icon
- Click opens a list: All countries / Ireland / Portugal / Spain / Czechia / Romania
- Selecting a country rewrites the URL (e.g. from `/admin/doctors` to `/admin/doctors?country=pt`, or from `/admin/ie/general` to `/admin/pt/general`)
- Selection persists in a cookie (`gh_admin_active_country`) for the next session
- "All countries" only available on global list views (doctors, categories) — country-scoped views auto-redirect to a chosen country

### 7.4 Screens

Detailed wireframes for all 9 key screens live in `admin-wireframes.html` (artifact). Summary of each:

1. **Login** — Single form, brand-styled, "Forgot password" placeholder link.
2. **Dashboard** — Stats (active countries, doctors, services live, pending appointments), recent activity from `AdminAuditLog`, quick action sidebar.
3. **Countries list** — Drag-to-reorder table. Toggle active/inactive. Status badge. Counts of doctors/services per country.
4. **Country edit** — Form with metadata (code/slug/currency/languages), hero content (draft-able), contact, deactivate-zone sidebar.
5. **Categories list** — Matrix layout. Rows = categories, columns = countries, cells = toggle. Quick scan of category coverage across the platform.
6. **Doctors list** — Table with country chips per doctor. Filter by country dropdown. Search by name/slug/registration.
7. **Doctor edit** — Split layout. Form (name, title, bio, languages, registration). Sidebar with image upload, country assignment list (each row toggles `DoctorCountry.active`), per-country sort order.
8. **Services list** — One screen, four sidebar entries (General / Specialist / Prescriptions / Health Tests) preset the `type` filter. Country-scoped. Drag to reorder.
9. **Service edit** — Single form for all 4 types. Conditional category dropdown. Price + currency (defaults to country). Pricing/logistics, full description, SEO meta. Sidebar: cover image, visibility toggles, audit trail of recent edits.

Beyond these 9, secondary screens for **Admin Users** (list, invite, deactivate), **Audit Log** (filterable chronological view), **Country Content** (the per-country hero/contact editor — same fields as country edit but accessed via the country-scoped nav), and **Appointments** (booking requests, status updates, contact patient).

### 7.5 Form patterns

All forms follow the same anatomy:

- Field labels: `Gilroy SemiBold 12px`, neutral-700
- Inputs: 40px tall, 1px border neutral-300, 6px radius, focus ring 2px GH-Lime
- Help text: 11px neutral-500 under the input
- Required fields marked with red asterisk after the label
- Error state: red border + red text below input
- Save bar at the bottom: sticky on long forms, "Save as draft" (secondary) and "Publish" (primary GH-Forest button)
- All forms managed by React Hook Form with Zod schemas from `packages/lib/`
- Optimistic UI for toggles (flip immediately, rollback on error with Sonner toast)

### 7.6 List patterns

- Toolbar at top: search input (max-w-sm), filter chips, "Add new" primary button
- Table: striped on hover, sticky header, column sort affordances on headers where sortable
- Each row has a "Row actions" cell on the right: Edit (default), overflow menu for less common actions (Duplicate, Delete)
- Empty state: friendly message + primary CTA
- Pagination: 25 per page default, server-rendered with query params
- Bulk select: checkbox column on the left, bulk action bar appears at bottom when selections exist (v1.1, not v1.0)

---

## 8. Design system

### 8.1 Tailwind configuration

Brand tokens consumed via CSS variables, exposed as Tailwind utilities. Full config in `tailwind.config.ts` (artifact).

```ts
// tailwind.config.ts (excerpt)
export default {
  theme: {
    extend: {
      colors: {
        'gh-forest': {
          DEFAULT: 'hsl(var(--gh-forest))',
          50: 'hsl(var(--gh-forest-50))',
          // ... full scale
          900: 'hsl(var(--gh-forest-900))',
        },
        'gh-olive':  'hsl(var(--gh-olive))',
        'gh-lime':   { DEFAULT: 'hsl(var(--gh-lime))', /* ... */ },
        // neutral, success, warning, danger, info...
      },
      fontFamily: {
        sans:    ['Gilroy', 'Avenir Next', 'system-ui', 'sans-serif'],
        display: ['Gilroy', 'sans-serif'], // Black weight
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
        xl: '14px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(29, 75, 54, 0.04)',
        DEFAULT: '0 1px 3px rgba(29, 75, 54, 0.08), 0 1px 2px rgba(29, 75, 54, 0.04)',
        md: '0 4px 6px rgba(29, 75, 54, 0.05), 0 2px 4px rgba(29, 75, 54, 0.04)',
        lg: '0 10px 15px rgba(29, 75, 54, 0.08), 0 4px 6px rgba(29, 75, 54, 0.04)',
      },
    },
  },
};
```

Note the shadows use Forest-tinted black for cohesion with the brand.

### 8.2 Component primitives (shadcn-based)

We use shadcn/ui as the foundation, customized to match the brand. Components we'll customize:

- **Button**: GH-Forest primary, neutral secondary, ghost variant, GH-Lime "energetic" variant for high-impact CTAs (e.g. "Book a consultation" on hero)
- **Input / Select / Textarea**: 40px height, focus ring in GH-Lime with 30% opacity
- **Card**: White surface, neutral-200 border, radius lg, subtle shadow
- **Dialog / Modal**: White surface, focus trap, escape closes
- **DropdownMenu**: For country picker, user menu, row actions
- **Table**: Header neutral-50 background, hover neutral-50 rows, striped optional
- **Toast (Sonner)**: GH-Forest for success, danger for errors, warning amber for warnings
- **Toggle / Switch**: Off = neutral-300, On = GH-Forest. Disabled state = neutral-200
- **Badge**: Pill shape, semantic colors for status indicators
- **Tabs**: Underline style, active tab in GH-Forest
- **Accordion**: For FAQ, country dropdown sections in admin sidebar

### 8.3 Common patterns

**Country chip** (used throughout admin and public):
```html
<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
             bg-neutral-100 border border-neutral-200 text-neutral-700">
  <img src="/flags/ie.svg" class="w-3.5 h-2.5 rounded-sm" />
  Ireland
</span>
```

**Status badge** (Published / Draft):
```html
<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
             bg-gh-forest-50 text-gh-forest-700">Published</span>
```

**Empty state**:
```html
<div class="text-center py-16">
  <div class="mx-auto w-12 h-12 rounded-full bg-neutral-100 mb-4"></div>
  <h3 class="font-bold text-neutral-900">No doctors yet</h3>
  <p class="text-sm text-neutral-500 mt-1 mb-6">Add your first doctor to get started.</p>
  <Button>Add a doctor</Button>
</div>
```

**Loading skeleton** (cards, tables): use Tailwind's `animate-pulse` on neutral-100 blocks.

### 8.4 Iconography

- **Lucide React** for all interface icons. Standardized sizes: 14px (inline), 16px (default), 20px (emphasis), 24px (hero).
- **Custom SVG icons** for: country flags, the brand logo, the EKG/heartbeat motif (can be used decoratively in headers/dividers).
- **Service category icons**: Use Lucide's medical icons (Heart, Brain, Stethoscope, etc.) at the category level, custom uploaded icons (admin can upload) at the service level.

### 8.5 Spacing scale

Tailwind's default 4px-based scale, but use these as primary increments:
- `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96`

Avoid odd one-offs (`p-5`, `gap-7`) unless absolutely needed.

### 8.6 Motion

- **Transitions**: 150ms ease-out default for hover/active states.
- **Page transitions**: None (Next.js handles this).
- **Loading**: Skeletons over spinners wherever possible.
- **Toasts**: Slide-in from bottom-right, 300ms ease-out, auto-dismiss after 4s for success, manual dismiss for errors.
- **Modal**: Fade backdrop 200ms, scale-in modal 200ms.
- **No hero animations.** This is healthcare. Calm, not bouncy.

---

## 9. Image and asset management

### 9.1 Railway Object Storage setup

Railway Object Storage is S3-compatible. We use it for all user-uploaded images: doctor photos, service cover images, category icons, country flags (if customized).

**Environment variables (both `admin/.env` and `backend/.env`):**
```
RAILWAY_S3_ENDPOINT=https://...
RAILWAY_S3_BUCKET=globalhealth-media
RAILWAY_S3_REGION=auto
RAILWAY_S3_ACCESS_KEY=...
RAILWAY_S3_SECRET_KEY=...
RAILWAY_S3_PUBLIC_URL=https://cdn.myglobalhealth.online
```

### 9.2 Presigned upload flow

Files never touch our server. The admin requests a presigned URL, browser PUTs directly to Railway, returned URL gets saved in the DB.

```
1. Admin clicks "Upload" in doctor edit form
2. Browser → POST /api/upload/presign { filename, contentType, kind: 'doctor' }
3. Server validates auth, generates presigned PUT URL (5 min expiry)
4. Server returns { uploadUrl, publicUrl }
5. Browser → PUT uploadUrl with file bytes
6. On success, browser stores publicUrl in form state
7. Form submit → updates Doctor.imageUrl with publicUrl
```

### 9.3 Asset bucket structure

```
globalhealth-media/
├── doctors/
│   └── [doctor-id]/
│       ├── profile-2026-05-12.jpg
│       └── profile-original.jpg
├── services/
│   └── [service-id]/
│       └── cover-[hash].jpg
├── categories/
│   └── [category-id]/
│       └── icon-[hash].svg
├── countries/
│   └── [country-code]/
│       ├── flag.svg
│       └── hero-[hash].jpg
└── blog/                       (post-launch, when blog moves to CMS)
```

### 9.4 Image optimization

- Use Next.js `<Image>` component everywhere on the public site.
- Configure `next.config.ts` to allow the Railway CDN domain in `images.remotePatterns`.
- Generate AVIF + WebP variants automatically via Next.js.
- Recommended source dimensions: Doctor portraits 800×800, service covers 1200×800, country heroes 1920×1080.
- Compress server-side before upload using `sharp` in the presigned URL handler (resize + quality 85).

### 9.5 Asset migration from Wix

Phase 1 deliverable: `docs/asset-inventory.md` — audit of all current Wix assets with target local paths and migration status. Process:

1. Crawl current Wix site, list all `static.wixstatic.com` URLs in use.
2. For each, identify usage location (page, alt text, dimensions).
3. Download approved assets to a staging folder.
4. Re-upload to Railway with the bucket structure above.
5. Update content / seed data to reference new URLs.
6. Verify no production references remain to Wix CDN.

---

## 10. Implementation phases

Each phase is **2–5 days of focused work** for a single developer. Phases are sequenced — don't parallelize across them until the dependencies are clear.

### Phase 0 — Foundation and branding (2 days)

**Goal**: Repo restructured, brand system in place, both apps boot.

- ☐ Restructure repo to `apps/web` + `apps/admin` + `packages/*`
- ☐ Bootstrap `apps/admin` as fresh Next.js 16 + Tailwind 4 + shadcn
- ☐ Install Gilroy font files in `apps/web/public/fonts` and `apps/admin/public/fonts`
- ☐ Create `packages/design-tokens` with the brand CSS variables (Forest scale, Lime scale, neutrals)
- ☐ Apply tokens to both `tailwind.config.ts` files via a shared preset
- ☐ Create brand logo SVGs in both `public/logos/` directories
- ☐ Update `pnpm-workspace.yaml` and root `package.json`
- ☐ Both apps render a placeholder page in brand colors at the correct URL
- ☐ Document the design system in `docs/BRAND.md`

**Acceptance**: `pnpm --filter web dev` shows a Forest-green welcome page in Gilroy. Same for admin. No errors.

### Phase 1 — Schema and auth (3 days)

**Goal**: New schema applied, super admin can log in.

- ☐ Replace `packages/db/prisma/schema.prisma` with the new schema (Country axis, M:N joins, PublishStatus, AdminAuditLog)
- ☐ **Migration A**: additive — add new tables and nullable `countryId` FK columns
- ☐ Write backfill script (`packages/db/prisma/backfill.ts`): seed 5 countries, populate FKs from existing `countryCode` strings
- ☐ Run backfill against dev DB, verify counts
- ☐ **Migration B**: drop `countryCode` columns, make `countryId` NOT NULL
- ☐ Update `packages/db/prisma/seed.ts` with full data (5 countries, all categories, super admin user)
- ☐ Run `pnpm db:seed` — verify super admin can be queried
- ☐ Build login page in `apps/admin/app/(auth)/login/page.tsx`
- ☐ Build `apps/admin/middleware.ts` — JWT verification, redirect to login if unauth
- ☐ Build server actions: `login`, `logout`
- ☐ Test login flow with seeded super admin credentials

**Acceptance**: Super admin can log in. Unauthenticated request to `/admin/*` redirects to `/login`. JWT cookie set securely. Audit log row created on login.

### Phase 2 — Admin shell and Countries CRUD (4 days)

**Goal**: Admin can manage countries end to end.

- ☐ Build admin layout: sidebar, topbar, content area
- ☐ Build country picker dropdown (reads/writes cookie + URL)
- ☐ Build dashboard page with placeholder stat cards
- ☐ Build `/countries` list page (table, search, drag-to-reorder via dnd-kit)
- ☐ Build `/countries/[id]` edit form (metadata, hero, contact, deactivate)
- ☐ Build "Add country" flow (modal or full page)
- ☐ Wire all CRUD to Prisma via server actions
- ☐ Add audit log writes to every mutation
- ☐ Style every component to match Phase 0 brand tokens

**Acceptance**: Super admin can create a 6th country, edit it, toggle active, see it in the list. All actions appear in audit log. Public site doesn't crash (still reading from static data — that comes in Phase 5).

### Phase 3 — Categories and Doctors (4 days)

**Goal**: Admin can manage the global category pool and the M:N doctor roster.

- ☐ Build `/categories` matrix view (rows = categories, cols = countries, cells = toggle)
- ☐ Build category create/edit drawer
- ☐ Wire toggle to `CategoryCountry` upserts/deletes (optimistic UI)
- ☐ Build `/doctors` list page with country filter
- ☐ Build `/doctors/[id]` edit form (split layout)
- ☐ Build the country assignment sidebar (`DoctorCountry` add/remove/toggle)
- ☐ Build the `/api/upload/presign` route for Railway image upload
- ☐ Build the image upload component (drag & drop, preview, progress)
- ☐ Test multi-country doctor: assign Dr. X to IE and PT, verify rows in `DoctorCountry`
- ☐ Test sort order: doctor #2 in IE list, #1 in PT list

**Acceptance**: Admin can add a new doctor with photo, assign them to 3 countries with different sort orders, suspend them in one country, and see all changes audited.

### Phase 4 — Services CRUD (4 days)

**Goal**: Admin can manage all 4 service types in any country.

- ☐ Build `ServiceForm` component (reused across all 4 types)
- ☐ Build `/[country]/general` list page
- ☐ Build `/[country]/specialist` list page (mostly identical config)
- ☐ Build `/[country]/prescriptions` list page (no category dropdown)
- ☐ Build `/[country]/health-tests` list page (no category dropdown)
- ☐ Build `/[country]/[type]/[id]` edit pages — all four route to the same form, just preset the type
- ☐ Implement draft/publish workflow (status field, two buttons)
- ☐ Implement currency override per service
- ☐ Drag-to-reorder services within a list

**Acceptance**: Admin can create a new service in any country, save as draft, edit it, publish it, see it in the list with status badge. All audit-logged.

### Phase 5 — Public site goes dynamic (5 days)

**Goal**: Public site reads from DB. Replaces `data/*.ts` files.

- ☐ Build the country-scoped public layout (`/[country]/layout.tsx`)
- ☐ Build dynamic country home page reading `Country` + featured `Service`
- ☐ Build dynamic team page reading `Doctor` filtered by country
- ☐ Build dynamic service list pages (general, specialist, prescriptions, health tests)
- ☐ Build dynamic service detail page with booking CTA
- ☐ Build dynamic doctor profile page
- ☐ Set up Next.js cache tags on all data fetches
- ☐ Build `/api/revalidate` endpoint with shared secret
- ☐ Update admin server actions to ping the revalidate endpoint after every successful mutation
- ☐ Build legacy URL redirect map in `next.config.ts` (`/home-pt` → `/pt`, etc.)
- ☐ Apply brand styling to all pages (this is the visual launch)

**Acceptance**: Public site renders fully from DB. Admin publishes a change, public page updates within 30 seconds. All legacy URLs resolve (200 or 301).

### Phase 6 — Country content editor and polish (3 days)

**Goal**: Admin can edit every country's hero copy, contact info, and FAQ entries without a deploy.

- ☐ Build `/[country]/content` page in admin
- ☐ Form covers hero title/subtitle/CTA, contact phone/email/whatsapp, languages
- ☐ Verify public site reflects changes after publish
- ☐ Build admin appointments page (`/[country]/appointments`) — list, view, change status
- ☐ Build empty states for every list view
- ☐ Build loading skeletons for every data fetch
- ☐ Toast notifications for every action
- ☐ Test mobile responsive for admin (tablet primary; phone usable)
- ☐ Test mobile responsive for public site (phone primary)

**Acceptance**: Admin can edit Spain's hero subtitle, click Publish, refresh Spain's public homepage, see the new text within 30 seconds. Mobile views don't break.

### Phase 7 — Launch prep (3 days)

**Goal**: Production-ready deploy.

- ☐ Set up production Railway environment (Postgres, two app services, object storage)
- ☐ Configure custom domains: `www.myglobalhealth.online` and `admin.myglobalhealth.online`
- ☐ Set up env vars in production (database URL, JWT secret, S3 keys, revalidate secret)
- ☐ Run migrations against production DB
- ☐ Run seed against production (creating super admin)
- ☐ Migrate Wix assets to Railway bucket (per `docs/asset-inventory.md`)
- ☐ Smoke test every legacy URL redirect in production
- ☐ Configure `robots.txt` and `sitemap.xml` generation
- ☐ Run Lighthouse audits — meet 90/95/95/95 targets
- ☐ Run accessibility scan (axe DevTools), fix any AA failures
- ☐ Set up uptime monitoring (Railway built-in, or external like Better Stack)
- ☐ Set up error tracking (Sentry recommended)
- ☐ Document admin password reset procedure for the team
- ☐ Switch DNS from Wix to Railway

**Acceptance**: `www.myglobalhealth.online` and `admin.myglobalhealth.online` both serve from Railway. Old Wix site can be turned off. No SEO regressions in first 7 days.

---

## 11. Deployment

### 11.1 Domains

- `www.myglobalhealth.online` → `apps/web` deployment
- `admin.myglobalhealth.online` → `apps/admin` deployment
- `cdn.myglobalhealth.online` → Railway Object Storage CNAME (or direct bucket URL)
- `myglobalhealth.online` (no www) → 301 to `www.myglobalhealth.online`

### 11.2 Railway services

| Service | Type | Purpose |
|---|---|---|
| `gh-postgres` | Database | Shared Postgres for both apps |
| `gh-web` | Service | Public site, builds from `apps/web` |
| `gh-admin` | Service | Admin portal, builds from `apps/admin` |
| `gh-storage` | Object Storage | Image bucket |

Both web services share the same Postgres but have their own env vars.

### 11.3 Environment variables

**Shared (both apps):**
```
DATABASE_URL=postgresql://...
RAILWAY_S3_ENDPOINT=...
RAILWAY_S3_BUCKET=globalhealth-media
RAILWAY_S3_REGION=auto
RAILWAY_S3_ACCESS_KEY=...
RAILWAY_S3_SECRET_KEY=...
RAILWAY_S3_PUBLIC_URL=https://cdn.myglobalhealth.online
NODE_ENV=production
```

**Web only:**
```
NEXT_PUBLIC_SITE_URL=https://www.myglobalhealth.online
NEXT_PUBLIC_ADMIN_URL=https://admin.myglobalhealth.online
REVALIDATE_SECRET=<long random string, shared with admin>
```

**Admin only:**
```
NEXT_PUBLIC_APP_URL=https://admin.myglobalhealth.online
JWT_SECRET=<long random string>
JWT_EXPIRES_IN=7d
COOKIE_NAME=gh_admin_session
REVALIDATE_SECRET=<same as web>
PUBLIC_SITE_URL=https://www.myglobalhealth.online
SEED_ADMIN_EMAIL=admin@myglobalhealth.online    (one-time, for initial seed)
SEED_ADMIN_PASSWORD=<one-time strong>           (one-time, change immediately)
```

### 11.4 CI/CD

Railway's GitHub integration: every push to `main` triggers a build for both apps. Preview deployments on PRs.

For pre-launch: protect `main`, require PR review, run typecheck + lint on PR.

---

## 12. Healthcare compliance and data protection

This is a medical platform serving the EU. Compliance is non-negotiable.

### 12.1 GDPR foundation

Global Health operates in Ireland, Portugal, Spain, Czechia, and Romania — all EU member states. GDPR applies in full to every record.

**Legal basis for processing:**
- **Patient enquiries / appointments**: legitimate interest + explicit consent at the booking form
- **Doctor profiles**: contract / public-interest publication of professional credentials
- **Admin logs**: legitimate interest in security and accountability
- **Marketing emails (future)**: explicit opt-in consent

**Patient data minimisation:** the `Appointment` table stores only what's necessary for the consultation booking: name, email, phone, reason for visit, country. No medical history is collected on the marketing site (that happens in the doctor portal, post-v1).

### 12.2 Data subject rights

Build these endpoints from day one — the admin portal needs a tooling page (`/admin/data-requests`) for v1.1:

- **Right to access**: Admin can export a single patient's data as JSON given an email lookup.
- **Right to erasure**: Soft-delete with 30-day grace period, hard-delete after. Audit log entry retained per legal-basis exception.
- **Right to rectification**: Admin can edit appointment data via the appointment edit form.
- **Right to data portability**: Same as access — JSON export.
- **Right to object / withdraw consent**: Form on the public site `/privacy/withdraw-consent`.

### 12.3 Data residency

- Postgres on Railway: confirm the region is set to **EU West (Amsterdam)** during provisioning. The default could be US — verify before going live.
- Railway Object Storage: same — EU region only.
- Backups: Railway daily backups, retain 30 days.
- No analytics that ship data outside the EU (no Google Analytics — use Plausible or self-hosted Umami).

### 12.4 Cookie consent

Build a cookie banner (use a privacy-aware library like `vanilla-cookieconsent` or roll your own minimal one):

- Default to **essential cookies only** (session cookie, country preference)
- Explicit opt-in for analytics
- No tracking scripts before consent
- Cookie preferences modal accessible from the footer

### 12.5 Medical content disclaimers

Every service page MUST include:

- Disclaimer that online consultations are not a substitute for emergency care
- Link to local emergency numbers (per country: 112 EU-wide, country-specific where relevant)
- Statement that the consulting doctor is licensed in the patient's country
- Refund policy clearly linked

Store these as static partials in `apps/web/components/MedicalDisclaimer.tsx` to ensure consistency.

### 12.6 Privacy policy and terms

These must be live at launch:

- `/privacy` — comprehensive GDPR-compliant privacy policy (engage a lawyer; this is not a draft-your-own situation for medical)
- `/terms` — terms of service
- `/cookies` — cookie policy
- `/gdpr-compliance` — GDPR statement with data controller info
- `/refund-policy` — refund and cancellation terms

Each country may need a localised version. For v1, English versions live at `/privacy`, country-specific versions can be added under `/[country]/privacy` if legal counsel advises.

### 12.7 Doctor credential verification

Every doctor profile must include:
- Registration number (e.g. `IMC 123456` for Ireland)
- The regulatory body name
- A statement of which countries they're licensed to practise in

Add a `verifiedAt` timestamp on the `Doctor` model in v1.1 — for v1, manual verification process documented in `/docs/doctor-onboarding.md`.

---

## 13. Security

### 13.1 Authentication and session

- **Password hashing**: `bcryptjs` with cost factor 12 (minimum)
- **JWT signing**: `jose` library, HS256 algorithm, secret minimum 32 random bytes
- **Session lifetime**: 7 days, sliding renewal on activity
- **Cookies**: `httpOnly: true`, `secure: true` (production), `sameSite: 'lax'`, `path: '/admin'`
- **Password requirements**: minimum 12 characters, enforced server-side via Zod schema
- **Failed login attempts**: rate-limited to 5 per 15 minutes per email (use Upstash Redis or in-memory for v1, Redis for v2)

### 13.2 Authorisation

- `middleware.ts` checks JWT on every `/admin/*` route
- Role check on every server action (don't trust the client)
- Country-restricted access deferred to v2 (in v1, all admins have full access)
- The `AdminAuditLog` records actor, action, target, and timestamp for every mutation

### 13.3 Input validation

Every server action validates with Zod **before** touching the database:

```ts
// packages/lib/schemas/service.ts
import { z } from "zod";

export const serviceCreateSchema = z.object({
  type: z.enum(["GENERAL", "SPECIALIST", "PRESCRIPTION", "HEALTH_TEST"]),
  countryId: z.string().cuid(),
  categoryId: z.string().cuid().nullable(),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(200),
  priceCents: z.number().int().nonnegative().max(1_000_000),
  durationMinutes: z.number().int().positive().max(480).nullable(),
  // ...
});
```

### 13.4 SQL injection

Prisma's parameterised queries prevent SQL injection by default. **Never** use `$queryRawUnsafe`. If you need raw SQL, use `$queryRaw` with the template literal form which auto-parameterises.

### 13.5 XSS

- Next.js JSX rendering auto-escapes. Don't use `dangerouslySetInnerHTML` unless the content is sanitised first.
- Rich-text content from the admin (service descriptions) must be sanitised. Use `isomorphic-dompurify` on the render path with an allowlist of tags.
- Content-Security-Policy header configured in `next.config.ts`:

```ts
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://cdn.myglobalhealth.online;
  font-src 'self' data:;
  object-src 'none';
  frame-ancestors 'none';
`.replace(/\s{2,}/g, ' ').trim();
```

### 13.6 CSRF

Server Actions in Next.js have built-in CSRF protection via the same-origin check. Don't expose mutation endpoints via `/api/*` unless they're idempotent reads or have their own CSRF handling.

### 13.7 File upload security

- Presigned URLs scoped to specific content types and max sizes
- Server validates file extension and MIME type on the receiving end
- Upload to a quarantine prefix first (`/uploads/pending/`), promote to final location after validation
- Maximum file sizes enforced: 2MB for profile photos, 5MB for service covers
- Strip EXIF data from uploaded images (use `sharp` server-side)

### 13.8 Environment secrets

- `.env.local` for development (gitignored, never committed)
- Production secrets in Railway environment variables (never in code)
- Rotate `JWT_SECRET` and `REVALIDATE_SECRET` quarterly
- Rotate S3 credentials when an admin leaves the team

### 13.9 Security headers

Configure in `next.config.ts`:

```ts
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: cspHeader },
];
```

### 13.10 Dependency security

- Run `pnpm audit` weekly (CI step)
- Use Dependabot or Renovate for automated PRs
- Lock major versions in `package.json` (caret-pin minor)
- Review every dependency added — favour well-maintained, low-transitive-dep packages

---

## 14. Testing strategy

### 14.1 Testing pyramid

```
                  ┌──────────┐
                  │  E2E     │  ~5 critical flows
                  │ (Playwright)
                  └──────────┘
                ┌──────────────┐
                │  Integration │  Server actions + DB
                │   (Vitest)   │
                └──────────────┘
              ┌──────────────────┐
              │     Unit tests   │  Pure functions, Zod schemas
              │     (Vitest)     │
              └──────────────────┘
              ┌──────────────────┐
              │   Type checking  │  TypeScript strict mode
              └──────────────────┘
```

### 14.2 What to test in v1

**Unit (must-have):**
- All Zod schemas in `packages/lib/schemas/`
- Slug generation utility
- Price formatting helpers
- Currency conversion (if any)
- Date/time formatters

**Integration (must-have):**
- Login flow (correct credentials → JWT issued, wrong → rejected)
- Service create/update/delete via server actions
- Doctor M:N country assignment (add, remove, suspend)
- Category enablement matrix toggle
- Audit log writes on every mutation

**E2E (nice-to-have for v1, must-have for v1.1):**
- Admin logs in, creates a service in Ireland, publishes it, sees it on the public IE page
- Admin adds a doctor, assigns to two countries, verifies appearance on both team pages
- Public visitor books a consultation, appointment row created
- Legacy URL `/home-pt` redirects to `/pt`

### 14.3 Test database

- Local: separate `globalhealth_test` Postgres database, reset between test runs
- CI: ephemeral Postgres container, seed minimal fixtures
- Never use production data in tests

### 14.4 CI pipeline

Run on every PR:

1. `pnpm install --frozen-lockfile`
2. `pnpm typecheck` (both apps)
3. `pnpm lint`
4. `pnpm test:unit`
5. `pnpm test:integration` (with test DB)
6. `pnpm build` (both apps)
7. (Optional, slower) `pnpm test:e2e`

Block merge if any step fails.

---

## 15. Performance budget

### 15.1 Public site targets

| Metric | Budget | How measured |
|---|---|---|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s on 4G | Lighthouse, real-user via Vercel Speed Insights or self-hosted |
| **FID** / **INP** (Interaction to Next Paint) | ≤ 200ms | Web Vitals |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | Web Vitals |
| **TTFB** (Time to First Byte) | ≤ 800ms | Server response on a country home page |
| **First-load JS** | ≤ 200KB gzipped | `next build` output |
| **Image weight per page** | ≤ 500KB total | manual audit |

### 15.2 Strategies

- **Server Components by default** — only mark `'use client'` when state or browser APIs are needed
- **Static generation** for country pages with `revalidateTag()` for fresh content on admin publish
- **Image optimisation** via Next.js `<Image>` everywhere — AVIF + WebP variants, proper `sizes` attribute
- **Font subsetting** — Gilroy woff2 files include only Latin glyphs needed (slim down with `glyphhanger` if needed)
- **Code splitting** — dynamic imports for heavy components (rich-text editor, country switcher dropdown if it grows)
- **No client-side data fetching** on public pages unless absolutely needed (booking form is one of the few exceptions)

### 15.3 Admin portal targets

Admin has different priorities (data-dense, behind auth, low-traffic):
- LCP ≤ 3s acceptable
- First-load JS ≤ 400KB gzipped acceptable
- Prioritise interactivity over initial load

### 15.4 Monitoring

- Vercel Speed Insights or **Plausible Analytics** (self-hosted in EU) for real-user metrics
- Sentry for error tracking (with EU region selected)
- Railway built-in service metrics for server resources

---

## 16. Local development setup

### 16.1 Prerequisites

- **Node.js** 20.19+ (use `nvm` or `fnm`)
- **pnpm** 9+ (`npm i -g pnpm`)
- **Docker Desktop** (for local Postgres)
- **Git**

### 16.2 First-time setup

```bash
# Clone
git clone git@github.com:myglobalhealthonline/global-health-website.git
cd global-health-website

# Install deps
pnpm install

# Start local Postgres
docker compose up -d

# Copy env files
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
cp packages/db/.env.example packages/db/.env

# Generate Prisma client
pnpm --filter @gh/db generate

# Run migrations
pnpm --filter @gh/db migrate:dev

# Seed
pnpm --filter @gh/db seed

# Start both apps in parallel (uses pnpm's --parallel)
pnpm dev
```

### 16.3 docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: gh
      POSTGRES_PASSWORD: gh_local
      POSTGRES_DB: globalhealth_dev
    volumes:
      - gh_postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "gh"]
      interval: 5s
      timeout: 5s
      retries: 5

  postgres_test:
    image: postgres:16-alpine
    ports:
      - "5433:5432"
    environment:
      POSTGRES_USER: gh
      POSTGRES_PASSWORD: gh_local
      POSTGRES_DB: globalhealth_test
    tmpfs:
      - /var/lib/postgresql/data

volumes:
  gh_postgres:
```

### 16.4 Common commands

```bash
pnpm dev                          # Both apps in parallel
pnpm --filter web dev             # Public site only (port 3000)
pnpm --filter admin dev           # Admin only (port 3001)
pnpm --filter @gh/db studio       # Prisma Studio (DB GUI)
pnpm --filter @gh/db migrate:dev  # Create + apply a new migration
pnpm --filter @gh/db reset        # Nuke + reseed DB
pnpm typecheck                    # All apps + packages
pnpm lint                         # ESLint everything
pnpm test                         # All tests
pnpm build                        # Production build, both apps
```

### 16.5 Recommended VS Code extensions

- Prisma (Prisma syntax highlighting)
- Tailwind CSS IntelliSense
- ESLint
- Error Lens
- GitLens
- TypeScript Importer

---

## 17. Concrete code patterns

These are the patterns to reuse across the codebase. Copy, adapt, ship.

### 17.1 The Prisma singleton

`packages/db/index.ts`:

```ts
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const db =
  globalThis.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalThis.__prisma = db;

export * from "@prisma/client"; // re-export types/enums
```

### 17.2 Server action pattern

Every admin mutation follows this shape:

`apps/admin/app/actions/services.ts`:

```ts
"use server";

import { revalidateTag } from "next/cache";
import { db } from "@gh/db";
import { requireAdmin } from "@/lib/auth";
import { serviceUpdateSchema } from "@gh/lib/schemas/service";
import { writeAudit } from "@/lib/audit";
import { invalidatePublicCache } from "@/lib/revalidate";

export async function updateService(input: unknown) {
  // 1. Auth
  const user = await requireAdmin();

  // 2. Validate
  const data = serviceUpdateSchema.parse(input);

  // 3. Mutate
  const updated = await db.service.update({
    where: { id: data.id },
    data: {
      title: data.title,
      slug: data.slug,
      priceCents: data.priceCents,
      // ...
    },
    include: { country: true },
  });

  // 4. Audit
  await writeAudit({
    userId: user.id,
    action: "service.update",
    entity: "Service",
    entityId: updated.id,
    countryId: updated.countryId,
    metadata: { changes: data },
  });

  // 5. Invalidate caches
  revalidateTag(`service:${updated.id}`);
  revalidateTag(`country:${updated.country.slug}:services`);

  // 6. Ping public site
  await invalidatePublicCache([
    `service:${updated.id}`,
    `country:${updated.country.slug}:services`,
  ]);

  return { ok: true, service: updated };
}
```

### 17.3 Auth helper

`apps/admin/lib/auth.ts`:

```ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import { db } from "@gh/db";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function getSessionUser() {
  const token = (await cookies()).get(process.env.COOKIE_NAME!)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const user = await db.user.findUnique({ where: { id: payload.sub as string } });
    if (!user || user.role === "PATIENT") return null;
    return user;
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireSuperAdmin() {
  const user = await requireAdmin();
  if (user.role !== "SUPER_ADMIN") redirect("/");
  return user;
}
```

### 17.4 Presigned upload route

`apps/admin/app/api/upload/presign/route.ts`:

```ts
import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";
import { randomUUID } from "crypto";

const presignSchema = z.object({
  kind: z.enum(["doctor", "service", "country", "category"]),
  filename: z.string().min(1).max(200),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]),
  size: z.number().int().positive().max(5 * 1024 * 1024), // 5MB
});

const s3 = new S3Client({
  region: process.env.RAILWAY_S3_REGION!,
  endpoint: process.env.RAILWAY_S3_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.RAILWAY_S3_ACCESS_KEY!,
    secretAccessKey: process.env.RAILWAY_S3_SECRET_KEY!,
  },
  forcePathStyle: true,
});

export async function POST(req: Request) {
  await requireAdmin();
  const body = presignSchema.parse(await req.json());

  const ext = body.filename.split(".").pop() ?? "bin";
  const key = `${body.kind}s/${randomUUID()}.${ext}`;

  const cmd = new PutObjectCommand({
    Bucket: process.env.RAILWAY_S3_BUCKET!,
    Key: key,
    ContentType: body.contentType,
    ContentLength: body.size,
  });

  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 300 });
  const publicUrl = `${process.env.RAILWAY_S3_PUBLIC_URL}/${key}`;

  return NextResponse.json({ uploadUrl, publicUrl, key });
}
```

### 17.5 Revalidate ping (admin → public)

`apps/admin/lib/revalidate.ts`:

```ts
export async function invalidatePublicCache(tags: string[]) {
  if (!process.env.PUBLIC_SITE_URL || !process.env.REVALIDATE_SECRET) return;
  try {
    await fetch(`${process.env.PUBLIC_SITE_URL}/api/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: process.env.REVALIDATE_SECRET, tags }),
    });
  } catch (err) {
    console.error("Public cache invalidation failed", err);
    // Don't fail the admin action if cache invalidation fails
  }
}
```

`apps/web/app/api/revalidate/route.ts`:

```ts
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { secret, tags } = await req.json();
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  for (const tag of tags) revalidateTag(tag);
  return NextResponse.json({ ok: true, revalidated: tags });
}
```

### 17.6 Country dropdown — single source of truth

`apps/admin/components/CountryPicker.tsx`:

```tsx
"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function CountryPicker({ countries, current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function selectCountry(slug: string) {
    // Country-scoped routes: replace the segment
    const match = pathname.match(/^\/[a-z]{2,3}\//);
    if (match) {
      const newPath = pathname.replace(/^\/[a-z]{2,3}\//, `/${slug}/`);
      router.push(newPath);
      return;
    }
    // Global routes: query param
    const next = new URLSearchParams(params);
    next.set("country", slug);
    router.push(`${pathname}?${next.toString()}`);
    // Persist for next session
    document.cookie = `gh_admin_active_country=${slug};path=/;max-age=31536000;samesite=lax`;
  }
  // ... render dropdown
}
```

---

## 18. Acceptance criteria

The project ships v1 when:

- ☐ All 200+ legacy Wix URLs resolve (200 or 301)
- ☐ Admin can manage countries, doctors, categories, all 4 service types end-to-end
- ☐ Public site reflects admin changes within 30 seconds
- ☐ Brand identity is consistent across both apps (verified by visual audit)
- ☐ Mobile responsive at 320, 375, 768, 1024, 1440 widths
- ☐ Lighthouse: Performance 90+, Accessibility 95+, SEO 95+, Best Practices 95+
- ☐ No console errors on any public route
- ☐ Audit log captures every admin mutation
- ☐ Booking intake form writes to `Appointment` table and confirms to user
- ☐ Production env vars set, custom domains active, SSL valid
- ☐ Wix site disabled with DNS pointing to Railway

---

## 19. Future scope

These are explicitly **not** in v1, captured here so we don't lose track.

### v1.1 (post-launch polish, 2-4 weeks after launch)

- Bulk operations in admin (select multiple services, bulk publish/unpublish)
- Service duplication (clone a service from IE to PT with one click)
- Better mobile admin (currently tablet-primary)
- Email-based password reset
- Sitemap auto-generation per country

### v2 — Patient portal and booking

- Patient register/login on the public site
- Patient profile, appointment history
- Real booking flow: select slot, optional video call link
- Stripe (or local) payment integration
- Booking confirmation emails
- "My prescriptions" view
- Document upload

### v3 — Doctor portal (separate repo)

- Doctor authentication (separate app, separate domain)
- Schedule management
- Appointment notes, prescriptions
- Patient messaging (with end-to-end encryption)
- Compliance: GDPR data subject requests, audit logs, etc.

### v4 — Content and SEO scaling

- Move blog from MDX to admin-managed CMS (when content velocity demands it)
- Programmatic SEO pages ("Online cardiologist in Lisbon" etc.)
- Multilingual translation infrastructure
- A/B testing on booking funnels

---

## Appendix A: Decision log

Decisions made during planning, captured for posterity:

| Date | Decision | Rationale |
|---|---|---|
| Stage 2 | Path-based admin URL ruled out in favor of subdomain | Cleaner deploy separation, IP allowlist option later |
| Stage 2 | Doctor ↔ Country is M:N | One licensed doctor may practice across multiple EU countries online |
| Stage 2 | Categories are global with country enablement | Cardiology is Cardiology; per-country toggle is cleaner than duplicating |
| Stage 2 | Blog stays in MDX in code | UI consistency matters more than admin management for v1 content velocity |
| Stage 2 | Multi-admin with full access | Country-restricted RBAC deferred to v2 |
| Stage 3 | One `Service` table, four types via enum | 90% field overlap; one form, four views is cleaner than four tables |
| Stage 3 | Draft/Published as separate from Active toggle | Different concerns: work-in-progress vs temporarily hidden |
| Stage 3 | Railway bucket for images via presigned URLs | S3-compatible, no server bandwidth, scales to GB files |
| Stage 4 | Two-step migration (additive → backfill → drop) | Single migration would drop `countryCode` and fail NOT NULL |
| Stage 4 | Romania slug stays `rm` not `ro` | Preserves existing Wix URLs for SEO |
| Stage 4 | Audit log enabled from day 1 | Cheap to add, expensive to retrofit |
| Stage 5 | Brand: GH Forest + Lime, Gilroy typography | From provided Manual da Marca |

---

*End of plan. Updates to this document should bump the version and append to the decision log.*
