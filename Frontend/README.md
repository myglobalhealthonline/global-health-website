# Global Health Platform

A scalable healthcare platform rebuilt from the existing Wix website into a clean, maintainable, responsive full-stack web application.

The goal of this project is to recreate the Global Health online clinic website in code while preserving the current public page structure, user journeys, brand experience, consultation booking flow, country-specific clinic pages, service pages, legal pages, blog content, and navigation patterns.

---

## Project Goal

Global Health is an online medical clinic that connects patients with licensed healthcare professionals through secure online consultations.

This repository rebuilds the existing Wix site at:

```txt
https://www.myglobalhealth.online
```

as a production-ready codebase using Next.js, React, TypeScript, Tailwind CSS, PostgreSQL, Prisma, and a clean component architecture.

The implementation must support:

- Desktop, tablet, and mobile layouts
- Fast loading pages
- Clean navigation
- Accessible UI
- SEO-friendly route structure
- Maintainable page/content data
- Scalable backend architecture
- Secure patient, doctor, and admin workflows
- Future migration away from Wix without breaking existing URLs

---

## Important Build Instruction

This is not a generic healthcare template.

The existing Wix website is the source of truth for:

- Page hierarchy
- Public navigation
- Landing page sections
- Country-specific clinic content
- Service categories
- Consultation service pages
- Blog/article routes
- Pricing and plans
- FAQ, legal, privacy, refund, and policy pages
- Calls to action
- Footer structure
- Tone of voice
- Trust signals
- Responsive behavior

Do not copy Wix implementation details, Wix scripts, or Wix-specific runtime code.

Rebuild the experience in clean, modern code.

Use the current site content, page structure, visual hierarchy, and user journeys as reference.

---

## Overview

The Global Health Platform connects patients with healthcare professionals across Europe through a fast, secure, and user-friendly web application.

It enables users to:

- Choose their country
- Select a general or specialist consultation
- Book an online appointment
- View doctors and clinic teams
- Read healthcare articles
- Explore pricing plans
- Access home delivery and home health test services
- Contact the clinic
- Manage account/login flows
- Receive care remotely

The platform must be designed for long-term scalability, including future admin dashboards, patient dashboards, doctor dashboards, payments, appointment management, and notification workflows.

---

## Product Principles

1. **Patient-first UX**
   - Users should understand what to do within seconds.
   - Every service page should lead clearly to booking.
   - Mobile users must be able to navigate and book easily.

2. **Country-aware experience**
   - Ireland, Portugal, Spain, Czechia, and Romania must each have clear entry points.
   - Country pages should share reusable components but support country-specific content.

3. **Trust and compliance**
   - Healthcare trust signals must be visible.
   - Legal, privacy, GDPR, refund, and policy pages must be preserved.
   - Avoid unsupported medical claims.

4. **Clean code over page duplication**
   - Reuse components.
   - Store services, countries, doctors, pricing, and blog metadata in structured data.
   - Prefer dynamic routes for repeated page types.

5. **Preserve existing URLs**
   - Existing public Wix URLs should continue to work after migration.
   - If a route is replaced by a cleaner internal route, add redirects.

---

## Tech Stack

### Frontend

#### Core Framework & UI

- Next.js 16
- React 19
- TypeScript
- App Router
- Server Components where appropriate

#### Styling & Components

- Tailwind CSS 4
- Radix UI
- shadcn/ui
- Lucide icons

#### Forms & Validation

- React Hook Form
- Zod
- Shared validation schemas

#### UX Enhancements

- Sonner for toasts
- Accessible modals, accordions, dropdowns, and mobile drawers
- Loading, empty, error, and success states

---

### Backend

#### Runtime & Infrastructure

- Node.js 20.19+
- Docker
- Next.js API routes
- Server Actions

#### Database & ORM

- PostgreSQL
- Prisma 7

#### Authentication & Security

- JWT using `jose`
- bcryptjs
- Secure cookies
- Role-based access control

---

### Shared / Full-Stack

- TypeScript
- Zod
- pnpm
- Docker Compose for local development
- ESLint
- Prettier
- Optional Playwright tests

---

## Core Features

### Public Website

- Homepage / country selector
- Ireland clinic page
- Portugal clinic page
- Spain clinic page
- Czechia clinic page
- Romania clinic page
- General consultation pages
- Specialist consultation pages
- Service detail pages
- Doctor/team pages
- Blog listing
- Blog article pages
- FAQ
- Careers
- Pricing plans
- Gift card page
- Partner clinics
- Home delivery
- Home health tests
- Online prescription
- Legal notices
- Terms and conditions
- Privacy policy
- GDPR/privacy compliance page
- Refund and return policy
- Product/category listing pages

### Booking / Consultation Flow

Minimum version:

- Select country
- Select consultation type
- View service detail
- Click booking CTA
- Submit booking/contact form
- Show confirmation state

Future version:

- Appointment availability
- Doctor selection
- Patient account
- Payment
- Email confirmation
- Admin booking management
- Doctor dashboard

### Authentication

Minimum version:

- Login page
- Register page
- Forgot password page
- Protected account area placeholder

Future version:

- Patient dashboard
- Doctor dashboard
- Admin dashboard
- Appointment history
- Secure messaging
- Document upload

---

## Existing Site Route Inventory

The current Wix site has many public URLs. Preserve these routes wherever possible.

### Primary Routes

```txt
/
 /home
 /book-online
 /about
 /careers
 /blog
 /frequent-asked-questions
 /gift-card
 /plans-pricing
 /pricing-plans/list
 /online-prescription
 /home-delivery
 /home-health-test
 /partner-clinics
```

### Country Routes

```txt
/ireland-team
/general-consultation-ie
/specialty-ie

/home-cz
/czechia-team
/general-consultation-cz
/specialty-cz

/home-pt
/portugal-team
/general-consultation-pt
/specialty-pt

/home-sp
/spain-team
/general-consultation-sp
/specialty-sp

/home-rm
/romania-team
/general-consultation-rm
/specialty-rm
```

### Legal / Policy Routes

```txt
/legal-notices
/term-and-conditions
/copy-of-privacy-policy
/privacy
/return-and-refund-policy
```

Recommended additional aliases:

```txt
/terms-and-conditions -> /term-and-conditions
/privacy-policy -> /privacy
/refund-policy -> /return-and-refund-policy
/cookies-policy
/gdpr-compliance -> /privacy
```

### Category Routes

```txt
/category/all-products
/category/health-education
/category/telemedicine-devices
```

### Ireland General Consultation Service Routes

```txt
/ireland/medical-consultation
/ireland/pain-management-consultation
/ireland/travel-consultation
/ireland/erectyle-dysfunction-consultation
/ireland/self-referral
/ireland/diabetes-consultation
/ireland/sick-leave
/ireland/paediatric-primary-care-consultation
/ireland/family-medicine-consultation
/ireland/respiractory-infections
/ireland/hypertension-consultation
/ireland/driving-license-medical-certificate
/ireland/treatment-refill
/ireland/weight-loss-consultation
/ireland/mental-health-assessment-consultation
/ireland/referral-consultation
/ireland/migraine-consultation
/ireland/aesthetic-medicine-online-consultation
```

Important: some existing slugs appear misspelled, for example:

```txt
/ireland/erectyle-dysfunction-consultation
/ireland/respiractory-infections
```

Do not silently change these URLs. Preserve them for SEO and backwards compatibility. If cleaner aliases are created, add redirects.

Recommended aliases:

```txt
/ireland/erectile-dysfunction-consultation -> /ireland/erectyle-dysfunction-consultation
/ireland/respiratory-infections -> /ireland/respiractory-infections
```

### Ireland Specialist Consultation Routes

```txt
/ireland-specialist-consultations/cardiology-consultation
/ireland-specialist-consultations/pediatric-consultation
/ireland-specialist-consultations/orthopedic-consultation
/ireland-specialist-consultations/neurology-consultation
/ireland-specialist-consultations/gastroenterology-consultation
/ireland-specialist-consultations/urology-consultation
/ireland-specialist-consultations/rheumatology-consultation
/ireland-specialist-consultations/psychology-consultation
/ireland-specialist-consultations/nutrition-consultation
/ireland-specialist-consultations/endocrinology-consultation
/ireland-specialist-consultations/oncology-consultation
/ireland-specialist-consultations/venereology-consultation
/ireland-specialist-consultations/genetics-consultation
/ireland-specialist-consultations/psychiatry-consultation
/ireland-specialist-consultations/physiotherapy-consultation
/ireland-specialist-consultations/geriatrics-consultation
/ireland-specialist-consultations/dermatology-consultation
/ireland-specialist-consultations/immunoallergology-consultation
/ireland-specialist-consultations/pneumology-consultation
```

### Blog Routes

```txt
/post/mounjaro-vs-ozempic-differences-benefits-and-when-to-use
/post/omeprazole-uses-benefits-side-effects-and-when-to-take-it-safely
/post/getting-a-gp-sick-note-online-simplified
/post/consulting-a-cardiologist-online-what-to-expect
/post/how-a-multidisciplinary-weight-loss-program-works-evidence-structure-benefits
/post/easily-schedule-your-online-doctor-appointment
/post/boost-your-health-with-online-healthcare-services
/post/top-online-medical-services-for-your-health-needs
/post/how-online-medical-consultations-work
/post/an-introduction-to-online-medical-consultations
/post/how-to-book-online-doctor-appointments
/post/how-to-read-an-ecg-a-patient-friendly-guide-by-global-health
/post/understanding-the-benefits-of-online-healthcare
/post/top-features-of-the-best-online-medical-services
/post/what-to-expect-from-a-medical-consultation-online
/post/understanding-online-medical-consultations
/post/steps-to-book-an-online-doctor-appointment
/post/discover-the-benefits-of-online-healthcare
/post/5-types-of-medicines-for-high-blood-pressure-what-you-need-to-know
/post/understanding-crp-c-reactive-protein-what-it-means-for-your-health
```

### Additional Discovered Routes To Audit

During site discovery, additional route families may appear. Audit them before launch:

```txt
/service-page/[slug]
/services/[slug]
/home-health-tests/[slug]
/ireland-doctors/[slug]
/corporate-plans
```

Examples found during discovery:

```txt
/service-page/ie-medical-consultation
/service-page/ie-aesthetic-medicine-online-consultat
/service-page/ie-mental-health-assessment
/service-page/ie-nutrition-consultation
/services/smoking-cessation-consultation
/services/treatementrefill
/home-health-tests/heart-health-home-test
/ireland-doctors/dr-mirza-aun-mohammad
/ireland-doctors/dr-tiago-miguel-figueira
/ireland-doctors/dr-fatima-ali
/ireland-doctors/dr-emmanuel-dabup
/ireland-doctors/dr-maristela-ferro-nepomuceno
/corporate-plans
```

---

## Recommended Routing Strategy

Use data-driven pages for repeated content.

### Static Pages

Use regular App Router pages for unique public pages:

```txt
app/(site)/page.tsx
app/(site)/home/page.tsx
app/(site)/book-online/page.tsx
app/(site)/about/page.tsx
app/(site)/careers/page.tsx
app/(site)/blog/page.tsx
app/(site)/frequent-asked-questions/page.tsx
app/(site)/gift-card/page.tsx
app/(site)/plans-pricing/page.tsx
app/(site)/online-prescription/page.tsx
app/(site)/home-delivery/page.tsx
app/(site)/home-health-test/page.tsx
app/(site)/partner-clinics/page.tsx
```

### Dynamic Pages

Use dynamic routes for repeated content:

```txt
app/(site)/post/[slug]/page.tsx
app/(site)/category/[slug]/page.tsx
app/(site)/ireland/[serviceSlug]/page.tsx
app/(site)/ireland-specialist-consultations/[serviceSlug]/page.tsx
app/(site)/service-page/[serviceSlug]/page.tsx
app/(site)/services/[serviceSlug]/page.tsx
app/(site)/home-health-tests/[testSlug]/page.tsx
app/(site)/ireland-doctors/[doctorSlug]/page.tsx
```

### Country Pages

Either preserve exact legacy slugs as static pages or build route adapters that load country data:

```txt
/home-cz
/home-pt
/home-sp
/home-rm
```

Recommended internal data model:

```ts
type CountryCode = "ie" | "pt" | "sp" | "cz" | "rm";

type CountryPage = {
  code: CountryCode;
  name: string;
  legacyHomePath: string;
  teamPath: string;
  generalConsultationPath: string;
  specialistPath: string;
  heroTitle: string;
  heroSubtitle: string;
  languages: string[];
  ctaLabel: string;
};
```

---

## Repository Structure

Use this structure as the baseline.

```txt
global-health-platform/
├── app/
│   ├── (site)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── home/
│   │   │   └── page.tsx
│   │   ├── book-online/
│   │   │   └── page.tsx
│   │   ├── about/
│   │   │   └── page.tsx
│   │   ├── careers/
│   │   │   └── page.tsx
│   │   ├── blog/
│   │   │   └── page.tsx
│   │   ├── post/
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   ├── frequent-asked-questions/
│   │   │   └── page.tsx
│   │   ├── gift-card/
│   │   │   └── page.tsx
│   │   ├── plans-pricing/
│   │   │   └── page.tsx
│   │   ├── pricing-plans/
│   │   │   └── list/
│   │   │       └── page.tsx
│   │   ├── online-prescription/
│   │   │   └── page.tsx
│   │   ├── home-delivery/
│   │   │   └── page.tsx
│   │   ├── home-health-test/
│   │   │   └── page.tsx
│   │   ├── home-health-tests/
│   │   │   └── [testSlug]/
│   │   │       └── page.tsx
│   │   ├── partner-clinics/
│   │   │   └── page.tsx
│   │   ├── category/
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   ├── ireland/
│   │   │   └── [serviceSlug]/
│   │   │       └── page.tsx
│   │   ├── ireland-specialist-consultations/
│   │   │   └── [serviceSlug]/
│   │   │       └── page.tsx
│   │   ├── ireland-doctors/
│   │   │   └── [doctorSlug]/
│   │   │       └── page.tsx
│   │   ├── service-page/
│   │   │   └── [serviceSlug]/
│   │   │       └── page.tsx
│   │   ├── services/
│   │   │   └── [serviceSlug]/
│   │   │       └── page.tsx
│   │   ├── legal-notices/
│   │   │   └── page.tsx
│   │   ├── term-and-conditions/
│   │   │   └── page.tsx
│   │   ├── privacy/
│   │   │   └── page.tsx
│   │   └── return-and-refund-policy/
│   │       └── page.tsx
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── forgot-password/
│   │       └── page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   └── route.ts
│   │   ├── appointments/
│   │   │   └── route.ts
│   │   ├── contact/
│   │   │   └── route.ts
│   │   └── newsletter/
│   │       └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   ├── not-found.tsx
│   ├── loading.tsx
│   └── error.tsx
├── components/
│   ├── layout/
│   │   ├── SiteHeader.tsx
│   │   ├── SiteFooter.tsx
│   │   ├── MobileNav.tsx
│   │   ├── DesktopNav.tsx
│   │   ├── ClinicsDropdown.tsx
│   │   └── CTAFooter.tsx
│   ├── sections/
│   │   ├── HeroSection.tsx
│   │   ├── CountrySelector.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── TrustSignals.tsx
│   │   ├── Testimonials.tsx
│   │   ├── ServicesGrid.tsx
│   │   ├── SpecialtiesGrid.tsx
│   │   ├── BookingCTA.tsx
│   │   ├── DoctorsSection.tsx
│   │   ├── PartnersSection.tsx
│   │   ├── PricingSection.tsx
│   │   └── FAQSection.tsx
│   ├── cards/
│   │   ├── ServiceCard.tsx
│   │   ├── DoctorCard.tsx
│   │   ├── BlogCard.tsx
│   │   ├── PricingCard.tsx
│   │   ├── ClinicCard.tsx
│   │   └── HealthTestCard.tsx
│   ├── forms/
│   │   ├── BookingForm.tsx
│   │   ├── ContactForm.tsx
│   │   ├── NewsletterForm.tsx
│   │   └── AuthForm.tsx
│   └── ui/
│       └── shadcn-generated-components/
├── content/
│   ├── pages/
│   ├── blog/
│   ├── legal/
│   └── policies/
├── data/
│   ├── navigation.ts
│   ├── routes.ts
│   ├── countries.ts
│   ├── services.ts
│   ├── specialist-services.ts
│   ├── doctors.ts
│   ├── pricing-plans.ts
│   ├── blog-posts.ts
│   ├── faqs.ts
│   └── legal-links.ts
├── lib/
│   ├── auth/
│   │   ├── auth.ts
│   │   ├── password.ts
│   │   ├── session.ts
│   │   └── roles.ts
│   ├── db/
│   │   └── prisma.ts
│   ├── validations/
│   │   ├── auth.schema.ts
│   │   ├── booking.schema.ts
│   │   ├── contact.schema.ts
│   │   └── shared.schema.ts
│   ├── seo/
│   │   ├── metadata.ts
│   │   └── structured-data.ts
│   ├── utils/
│   │   ├── cn.ts
│   │   ├── format-date.ts
│   │   └── slug.ts
│   └── constants.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/
│   ├── images/
│   ├── icons/
│   ├── logos/
│   └── social/
├── tests/
│   ├── e2e/
│   └── unit/
├── docker-compose.yml
├── Dockerfile
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── eslint.config.mjs
├── prettier.config.js
├── .env.example
└── README.md
```

---

## Navigation Requirements

### Desktop Header

The header should include:

- Logo
- Clinics dropdown
- About dropdown
- Blog
- FAQ
- eGift Card
- Log In
- Primary CTA, such as `Start Consultation`, `Book Online`, or `Call Us`

### Clinics Dropdown

Group clinic navigation by country.

Recommended structure:

```txt
Clinics
├── Ireland
│   ├── Ireland Home
│   ├── Ireland Team
│   ├── General Consultation
│   ├── Specialist Consultation
│   ├── Online Prescriptions
│   ├── Home Delivery
│   ├── Plans & Pricing
│   ├── Health Tests
│   └── Partner Clinics
├── Czechia
│   ├── Czechia Home
│   ├── Czechia Team
│   ├── General Consultation
│   └── Specialist Consultation
├── Portugal
│   ├── Portugal Home
│   ├── Portugal Team
│   ├── General Consultation
│   └── Specialist Consultation
├── Spain
│   ├── Spain Home
│   ├── Spain Team
│   ├── General Consultation
│   └── Specialist Consultation
└── Romania
    ├── Romania Home
    ├── Romania Team
    ├── General Consultation
    └── Specialist Consultation
```

### About Dropdown

```txt
About
├── Ireland Team
├── Portugal Team
├── Romania Team
├── Czechia Team
├── Spain Team
└── Careers
```

### Mobile Navigation

Use a slide-out drawer or full-screen menu.

Requirements:

- Logo at top
- Close button
- Accordion groups for Clinics and About
- Clear CTA button
- Large touch targets
- Sticky bottom booking CTA if appropriate
- No horizontal scrolling
- Tested at 320px, 375px, 390px, 430px, 768px, 1024px, 1440px

### Footer Navigation

Footer should include:

```txt
Company
├── Careers
├── Contact us
├── Clinics
└── About us

Clinics
├── Ireland
├── Portugal
├── Spain
├── Czechia
└── Romania

Legal
├── Blog
├── FAQ
└── How it works

Information
├── Legal Notices
├── Terms and Conditions
├── Cookies Policy
├── Refund and Return Policy
└── Privacy Policy
```

Also include:

- Contact email
- Copyright
- Brand/company ownership line
- CTA strip for `Start Your Online Consultation`
- Trust badges / GDPR / secure care messaging

---

## Component Design System

### Layout Components

- `SiteHeader`
- `DesktopNav`
- `MobileNav`
- `ClinicsDropdown`
- `SiteFooter`
- `PageShell`
- `Section`
- `Container`

### Section Components

- `HeroSection`
- `CountrySelector`
- `HowItWorks`
- `TrustSignals`
- `Testimonials`
- `ServicesGrid`
- `SpecialtiesGrid`
- `DoctorsSection`
- `PricingSection`
- `FAQSection`
- `BookingCTA`

### Card Components

- `CountryCard`
- `ServiceCard`
- `SpecialistServiceCard`
- `DoctorCard`
- `BlogCard`
- `PricingCard`
- `PartnerClinicCard`
- `HealthTestCard`

### Form Components

- `BookingForm`
- `ContactForm`
- `NewsletterForm`
- `LoginForm`
- `RegisterForm`

### UI Rules

- Use reusable primitives from `components/ui`.
- Use semantic HTML.
- Use accessible buttons and links.
- Do not use divs as buttons.
- Every form input must have a label.
- Every image must have meaningful alt text unless decorative.
- Use loading and error states for all async interactions.

---

## Responsive Design Requirements

The site must be fully responsive.

### Breakpoints

Use Tailwind breakpoints as the baseline:

```txt
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

### Mobile

- Single-column layout
- Large CTAs
- Menu drawer
- Cards stacked vertically
- Forms optimized for thumbs
- No overflow-x
- Images cropped responsibly
- Sticky booking CTA where useful

### Tablet

- Two-column grids where appropriate
- Navigation may remain mobile drawer until desktop breakpoint
- Hero sections should avoid cramped text
- Booking cards should remain readable

### Desktop

- Full navigation
- Multi-column service grids
- Large hero sections
- Rich footer
- Dropdown menus

---

## Styling Direction

The implementation should visually follow the existing site but with cleaner code and stronger consistency.

General direction:

- Healthcare-focused
- Clean
- Professional
- Calm
- Trustworthy
- Modern
- Accessible
- Not overly decorative

Recommended UI treatment:

- Generous spacing
- Rounded cards
- Clear CTAs
- Soft section backgrounds
- Consistent typography scale
- Strong contrast
- Trust badges and reassurance sections
- Country cards with flag or location imagery
- Service cards with simple icons

---

## Data-Driven Content Model

Avoid hardcoding repeated page content inside components.

Use structured content files.

### `data/countries.ts`

```ts
export const countries = [
  {
    code: "ie",
    name: "Ireland",
    homePath: "/home",
    teamPath: "/ireland-team",
    generalPath: "/general-consultation-ie",
    specialistPath: "/specialty-ie",
    languages: ["English", "Portuguese", "Spanish", "Urdu", "Arabic"],
  },
  {
    code: "pt",
    name: "Portugal",
    homePath: "/home-pt",
    teamPath: "/portugal-team",
    generalPath: "/general-consultation-pt",
    specialistPath: "/specialty-pt",
    languages: ["Portuguese", "English", "French", "Spanish"],
  },
  {
    code: "sp",
    name: "Spain",
    homePath: "/home-sp",
    teamPath: "/spain-team",
    generalPath: "/general-consultation-sp",
    specialistPath: "/specialty-sp",
    languages: ["Spanish", "Portuguese", "French", "Urdu"],
  },
  {
    code: "cz",
    name: "Czechia",
    homePath: "/home-cz",
    teamPath: "/czechia-team",
    generalPath: "/general-consultation-cz",
    specialistPath: "/specialty-cz",
    languages: ["Czech", "English"],
  },
  {
    code: "rm",
    name: "Romania",
    homePath: "/home-rm",
    teamPath: "/romania-team",
    generalPath: "/general-consultation-rm",
    specialistPath: "/specialty-rm",
    languages: ["Romanian", "English"],
  },
] as const;
```

### `data/navigation.ts`

```ts
export const mainNavigation = [
  {
    label: "Clinics",
    type: "dropdown",
    items: [
      {
        label: "Ireland",
        href: "/home",
        children: [
          { label: "Ireland Team", href: "/ireland-team" },
          { label: "General Consultation", href: "/general-consultation-ie" },
          { label: "Specialist Consultation", href: "/specialty-ie" },
          { label: "Online Prescriptions", href: "/online-prescription" },
          { label: "Home Delivery", href: "/home-delivery" },
          { label: "Plans & Pricing", href: "/plans-pricing" },
          { label: "Health Tests", href: "/home-health-test" },
          { label: "Partner Clinics", href: "/partner-clinics" },
        ],
      },
      {
        label: "Portugal",
        href: "/home-pt",
        children: [
          { label: "Portugal Team", href: "/portugal-team" },
          { label: "General Consultation", href: "/general-consultation-pt" },
          { label: "Specialist Consultation", href: "/specialty-pt" },
        ],
      },
      {
        label: "Spain",
        href: "/home-sp",
        children: [
          { label: "Spain Team", href: "/spain-team" },
          { label: "General Consultation", href: "/general-consultation-sp" },
          { label: "Specialist Consultation", href: "/specialty-sp" },
        ],
      },
      {
        label: "Czechia",
        href: "/home-cz",
        children: [
          { label: "Czechia Team", href: "/czechia-team" },
          { label: "General Consultation", href: "/general-consultation-cz" },
          { label: "Specialist Consultation", href: "/specialty-cz" },
        ],
      },
      {
        label: "Romania",
        href: "/home-rm",
        children: [
          { label: "Romania Team", href: "/romania-team" },
          { label: "General Consultation", href: "/general-consultation-rm" },
          { label: "Specialist Consultation", href: "/specialty-rm" },
        ],
      },
    ],
  },
  {
    label: "About",
    type: "dropdown",
    items: [
      { label: "Ireland Team", href: "/ireland-team" },
      { label: "Portugal Team", href: "/portugal-team" },
      { label: "Romania Team", href: "/romania-team" },
      { label: "Czechia Team", href: "/czechia-team" },
      { label: "Spain Team", href: "/spain-team" },
      { label: "Careers", href: "/careers" },
    ],
  },
  { label: "Blog", href: "/blog" },
  { label: "FAQ", href: "/frequent-asked-questions" },
  { label: "eGift Card", href: "/gift-card" },
] as const;
```

---

## Database Model Draft

Use Prisma for backend data.

Minimum suggested models:

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String?
  role         UserRole @default(PATIENT)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  appointments Appointment[]
}

enum UserRole {
  PATIENT
  DOCTOR
  ADMIN
}

model Doctor {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  title       String
  bio         String
  countryCode String
  imageUrl    String?
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  appointments Appointment[]
}

model Service {
  id          String   @id @default(cuid())
  slug        String   @unique
  title       String
  summary     String
  description String
  countryCode String?
  category    ServiceCategory
  durationMin Int?
  priceCents  Int?
  currency    String?
  active      Boolean @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  appointments Appointment[]
}

enum ServiceCategory {
  GENERAL
  SPECIALIST
  PRESCRIPTION
  HOME_DELIVERY
  HOME_TEST
  CORPORATE
}

model Appointment {
  id          String            @id @default(cuid())
  userId      String?
  doctorId    String?
  serviceId   String
  status      AppointmentStatus @default(PENDING)
  patientName String
  patientEmail String
  patientPhone String?
  countryCode String
  startsAt    DateTime?
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user    User?   @relation(fields: [userId], references: [id])
  doctor  Doctor? @relation(fields: [doctorId], references: [id])
  service Service @relation(fields: [serviceId], references: [id])
}

enum AppointmentStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
}
```

---

## SEO Requirements

Every public page must include:

- Metadata title
- Metadata description
- Canonical path
- Open Graph title
- Open Graph description
- Open Graph image where available
- Structured data where appropriate

Recommended structured data:

- `MedicalOrganization`
- `Physician`
- `Service`
- `FAQPage`
- `Article`
- `BreadcrumbList`

Keep existing page slugs where possible to protect search rankings.

---

## Accessibility Requirements

- Use semantic landmarks: `header`, `nav`, `main`, `section`, `footer`
- Use one `h1` per page
- Maintain heading hierarchy
- Ensure color contrast is readable
- All interactive elements must be keyboard accessible
- Dropdowns must support keyboard navigation
- Mobile menu must trap focus when open
- Forms must show accessible validation errors
- CTAs must be real links or buttons
- Images must have alt text
- Avoid auto-playing media

---

## Performance Requirements

Target:

- Lighthouse Performance: 90+
- Lighthouse Accessibility: 95+
- Lighthouse Best Practices: 95+
- Lighthouse SEO: 95+

Implementation rules:

- Use Next.js `Image`
- Optimize all images
- Avoid loading unnecessary JavaScript on static pages
- Use Server Components for content-heavy pages
- Lazy-load below-the-fold sections when useful
- Use static generation for public marketing pages
- Cache route data where appropriate
- Avoid client components unless interactivity is required

---

---

## Asset Migration Requirements

The rebuild must preserve the visual identity of the existing Wix website.

The AI agent must audit and migrate all visible brand and UI assets used on the current website, including:

- Logo files
- Clinic/country images
- Doctor/team profile photos
- Trust badges
- Certification badges
- Payment or security badges
- Icons used in service cards
- Blog images
- Hero images
- Footer graphics
- Social sharing images
- Any decorative or background imagery that contributes to the existing design

### Asset Rules

1. Download or export the same assets from the existing site only when the team has the right to reuse them.
2. Store all migrated assets inside `public/images`, `public/logos`, `public/icons`, or another clearly named folder.
3. Do not hotlink images from Wix.
4. Do not depend on Wix CDN URLs in production code.
5. Use `next/image` for all meaningful images.
6. Add descriptive alt text for all non-decorative images.
7. Compress large images before production.
8. Preserve logo proportions and badge clarity on mobile, tablet, and desktop.
9. If an image cannot be extracted safely, add a clear TODO with the original page URL and asset description.
10. Do not replace real brand assets with random stock images unless explicitly approved.

### Suggested Asset Folder Structure

```txt
public/
├── logos/
│   ├── global-health-logo.svg
│   └── global-health-logo-dark.svg
├── images/
│   ├── hero/
│   ├── clinics/
│   ├── doctors/
│   ├── services/
│   ├── blog/
│   └── backgrounds/
├── icons/
│   ├── services/
│   ├── countries/
│   └── ui/
└── badges/
    ├── trust/
    ├── security/
    └── certifications/
```

### Asset Audit Deliverable

Create this file during Phase 1:

```txt
docs/asset-inventory.md
```

It should include:

```txt
Asset name
Current page URL
Current asset URL or source
Recommended local path
Usage location
Alt text
Status: migrated / needs replacement / needs approval
```


## Development Workflow

### Prerequisites

- Node.js 20.19+
- pnpm
- PostgreSQL
- Docker

### Installation

```bash
git clone <your-repo-url>
cd global-health-platform
pnpm install
```

### Environment Variables

Create `.env.local`:

```bash
cp .env.example .env.local
```

Example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/global_health"
JWT_SECRET="replace-with-secure-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Start Database

```bash
docker compose up -d
```

### Prisma Setup

```bash
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma db seed
```

### Run Development Server

```bash
pnpm dev
```

Open:

```txt
http://localhost:3000
```

---

## Suggested Package Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write .",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "test:e2e": "playwright test"
  }
}
```

---

## Implementation Phases

### Phase 1: Site Audit

- Crawl the current Wix site
- Confirm all public routes
- Screenshot key pages at desktop, tablet, and mobile widths
- Extract navigation structure
- Extract footer structure
- Identify repeated section patterns
- Identify service templates
- Identify blog templates
- Identify doctor/team templates
- Identify legal pages

Deliverable:

```txt
docs/site-audit.md
docs/route-inventory.md
docs/component-map.md
```

### Phase 2: Project Foundation

- Install Next.js 16, React 19, TypeScript, Tailwind CSS 4
- Configure shadcn/ui
- Configure ESLint and Prettier
- Create base layout
- Create theme tokens
- Create typography system
- Create header/footer
- Create mobile navigation
- Create route data files

### Phase 3: Public Marketing Pages

Build:

- Root homepage
- Ireland homepage
- Portugal homepage
- Spain homepage
- Czechia homepage
- Romania homepage
- About
- Careers
- FAQ
- Pricing
- Gift card
- Partner clinics
- Online prescription
- Home delivery
- Home health tests

### Phase 4: Service Pages

Build reusable templates for:

- General consultation pages
- Specialist consultation pages
- Wix-compatible `/service-page/[slug]` pages
- `/services/[slug]` pages
- Home health test detail pages

### Phase 5: Blog

Build:

- Blog index
- Article detail pages
- Category/tag support
- Related posts
- SEO metadata
- Article structured data

### Phase 6: Backend

Build:

- Prisma schema
- Auth
- Appointment model
- Booking API
- Contact API
- Newsletter API
- Admin placeholders

### Phase 7: QA and Launch Prep

- Test all legacy routes
- Test redirects
- Test mobile navigation
- Test forms
- Run Lighthouse
- Validate metadata
- Validate sitemap
- Validate robots.txt
- Check broken links
- Check accessibility
- Prepare deployment

---

## Acceptance Criteria

The project is ready when:

- All listed existing routes load successfully
- No route returns unexpected 404
- Header navigation is clear on desktop and mobile
- Footer navigation includes company, clinics, legal, and information sections
- Mobile layout works from 320px width upward
- Tablet layout is clean and not cramped
- Desktop layout is polished
- Service pages are generated from reusable data/templates
- Blog pages are generated from reusable data/templates
- Booking CTAs are visible on all service and country pages
- Forms validate correctly
- Legal pages are present
- SEO metadata exists for public pages
- No Wix runtime scripts are required
- Code is typed, formatted, and maintainable
- Lighthouse scores meet target thresholds

---

## AI Agent Notes

When working on this codebase:

1. Do not create a generic healthcare website.
2. Match the existing Global Health site structure and user journey.
3. Preserve existing URLs.
4. Build reusable components instead of one-off pages.
5. Use route/content data files for repeated pages.
6. Keep navigation simple and patient-friendly.
7. Prioritize responsive behavior.
8. Use accessible components.
9. Do not invent medical claims.
10. Do not add backend functionality unless the README or task explicitly asks for it.
11. If page content is missing, add a clear TODO and use a safe placeholder rather than making claims.
12. Keep code complete, typed, and production-ready.
13. Avoid abbreviated snippets in implementation tasks.
14. Always update route inventory when adding or changing routes.

---

## Definition of Done For Each Page

Each page must include:

- Correct route
- Correct metadata
- One clear `h1`
- Responsive hero section
- Primary CTA
- Relevant page content
- Footer CTA
- Working navigation links
- Mobile layout
- Tablet layout
- Desktop layout
- Empty/error state if applicable
- No TypeScript errors
- No obvious accessibility violations

---

## Deployment Notes

Recommended deployment:

- Vercel for Next.js app
- Managed PostgreSQL for production database
- Environment variables configured in deployment provider
- Preview deployments for pull requests
- Production domain mapped after full route QA

Before switching from Wix:

- Export/replace all approved images
- Confirm ownership and usage rights for assets
- Audit all URLs
- Configure redirects
- Generate sitemap
- Set robots.txt
- Check analytics
- Check search console
- Run final form tests
- Confirm legal page content
