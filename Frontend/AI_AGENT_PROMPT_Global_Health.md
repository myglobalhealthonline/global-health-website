# AI Agent Prompt: Rebuild Global Health Wix Website In Code

You are a senior full-stack engineer and product-minded frontend architect.

We are cloning/rebuilding our existing Wix website into a clean, maintainable, responsive codebase.

Current website:

```txt
https://www.myglobalhealth.online
```

Project name:

```txt
Global Health Platform
```

Your job is to rebuild the existing public website and prepare the codebase for future full-stack healthcare platform features.

## Core Objective

Recreate the current Wix website as a production-ready Next.js application.

This is not a generic healthcare template.

The Wix site is the source of truth for:

- Page structure
- Navigation
- Country selection flow
- Clinic pages
- Service pages
- Blog pages
- Legal pages
- Footer structure
- CTA placement
- Tone of voice
- Trust signals
- Responsive layout intent

Do not copy Wix runtime code, Wix scripts, or Wix-specific implementation.

Rebuild the site using clean, modern code.

## Required Tech Stack

Use:

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Radix UI / shadcn
- React Hook Form
- Zod
- Sonner
- Lucide icons
- Node.js 20.19+
- PostgreSQL
- Prisma 7
- JWT using `jose`
- bcryptjs
- pnpm
- Docker

## Required Responsiveness

The website must work well on:

- Mobile
- Tablet
- Desktop

Test these widths:

```txt
320px
375px
390px
430px
768px
1024px
1280px
1440px
```

No horizontal scrolling is allowed.

The implementation must not treat responsiveness as optional. Every page, header, footer, dropdown, card grid, form, CTA section, doctor profile, service page, and blog page must be checked on mobile, tablet, and desktop.

Mobile navigation must be clean, easy to use, and thumb-friendly.

## Important Route Requirement

Preserve the existing Wix URLs wherever possible.

If you create a cleaner internal route, add redirects so the existing URL still works.

Some current routes include spelling mistakes. Preserve them for compatibility.

Examples:

```txt
/ireland/erectyle-dysfunction-consultation
/ireland/respiractory-infections
```

You may add cleaner aliases, but the original URLs must still work.

## Main User Journey

A patient should be able to:

1. Land on the homepage.
2. Choose their country.
3. Select general consultation or specialist consultation.
4. View service details.
5. Click a clear booking CTA.
6. Submit a booking/contact form or reach the booking page.
7. Receive a clear confirmation state.

## Navigation Requirements

Build a clean header with:

- Logo
- Clinics dropdown
- About dropdown
- Blog
- FAQ
- eGift Card
- Log In
- Main CTA

Clinics dropdown must be grouped by country:

- Ireland
- Portugal
- Spain
- Czechia
- Romania

Mobile navigation must use a drawer or full-screen menu with accordion groups.

Footer must include:

- Company
- Clinics
- Legal
- Information
- Contact email
- CTA strip
- Copyright

## Repository Structure

Use the repository structure described in `README.md`.

Do not dump all code into a few large files.

Use:

- `components/layout`
- `components/sections`
- `components/cards`
- `components/forms`
- `components/ui`
- `data`
- `lib`
- `content`
- `prisma`
- `tests`

## Implementation Rules

1. Use App Router.
2. Use Server Components by default.
3. Use Client Components only when interactivity is needed.
4. Keep repeated pages data-driven.
5. Use TypeScript strictly.
6. Use Zod for validation.
7. Use reusable section components.
8. Use real semantic HTML.
9. Use accessible forms and navigation.
10. Use Next.js metadata for SEO.
11. Use dynamic routes for blogs, services, doctors, and categories.
12. Avoid hallucinating medical claims.
13. Add TODO comments where content needs business confirmation.
14. Do not rely on Wix code.
15. Do not use placeholder-only architecture. Build complete, copy-paste-ready files when asked.


## Asset Migration Requirement

You must audit the existing Wix website and preserve the real visual assets where legally and technically possible.

This includes:

- Logo
- Badges
- Trust/certification graphics
- Doctor photos
- Country/clinic images
- Hero images
- Blog images
- Service icons
- Footer graphics

Rules:

1. Do not hotlink Wix CDN images in production.
2. Download/export the same assets only when the team has rights to reuse them.
3. Store assets locally under `public/logos`, `public/images`, `public/icons`, and `public/badges`.
4. Use `next/image`.
5. Preserve image proportions and clarity across mobile, tablet, and desktop.
6. Add descriptive alt text.
7. If an asset cannot be safely migrated, add a TODO in `docs/asset-inventory.md`.
8. Do not replace real brand assets with random stock images unless explicitly approved.

Create:

```txt
docs/asset-inventory.md
```

Track every important asset with:

```txt
Asset name
Current page URL
Current asset URL/source
Recommended local path
Usage location
Alt text
Migration status
```

## Deliverables

When implementing, produce complete files, not partial snippets.

First build:

1. Project foundation
2. Global layout
3. Header
4. Footer
5. Navigation data
6. Homepage
7. Country pages
8. Service page template
9. Blog template
10. Booking/contact form
11. Legal page placeholders
12. Route redirects

Then build backend features.

## Acceptance Criteria

The result is acceptable only when:

- The public website is responsive on mobile, tablet, and desktop.
- Navigation is clean and easy.
- Existing important URLs are preserved.
- Country pages are clear.
- Consultation pages have strong booking CTAs.
- Blog pages render correctly.
- Legal pages exist.
- Code is clean and organized.
- No TypeScript errors.
- No obvious accessibility issues.
- No Wix runtime dependency remains.
