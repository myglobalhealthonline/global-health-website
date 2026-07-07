# Performance Optimization Audit

## Executive Summary

This audit reviewed the `global-health-website` repository, a Next.js 16 / React 19 frontend with a Fastify 5 / Prisma 7.8 / PostgreSQL backend. The codebase is visually polished and has strong security fundamentals, but performance is visibly sub-optimal, especially on mobile.

The biggest performance drains are:

1. **The entire public site shell is hydrated as a client component** because `SiteChrome`, `SiteHeader`, and `SiteFooter` use `usePathname()`. This forces React to hydrate far more DOM than necessary on every page.
2. **Images bypass Next.js optimization.** Many hero/card images set `unoptimized={true}` and the service catalog uses raw `<img>` tags, so visitors download full-resolution PNGs/JPGs instead of WebP/AVIF responsive sets.
3. **Heavy below-the-fold widgets load eagerly.** `DoctifyReviews`, `SameDayBooking`, the WebGL globe (`cobe`), and `MobileNav` are in the initial bundle even when they are not visible above the fold.
4. **There is no `next/dynamic` usage anywhere** in the reviewed frontend components, so nothing is code-split.
5. **The global stylesheet is monolithic** (`globals.css` ~9 000 lines) and `flag-icons` full CSS is loaded on every page.
6. **Backend scheduling runs in-process with `setInterval`.** Scaling to multiple replicas will duplicate cron work (emails, reminders, reconciliation sweeps).
7. **Database queries are generally paginated, but a few hot paths remain unbounded** and some indexes are missing on high-cardinality columns.

Overall risk rating: **High** for mobile performance and Core Web Vitals. The site will likely score 45–65 on mobile Lighthouse until the quick wins below are applied.

## Stack Detected

- **Framework:** Next.js 16.2.4 (App Router, standalone output, Turbopack root)
- **Frontend:** React 19.2.4, TypeScript 5, Tailwind CSS v4
- **Backend:** Fastify 5.2.1, TypeScript (strict), ESM via tsx
- **Database:** PostgreSQL 16, Prisma 7.8 with `@prisma/adapter-pg`
- **Auth:** HS256 JWT in HttpOnly cookie (`gh_auth`), optional TOTP 2FA
- **Styling:** Tailwind v4 CSS-first config, custom `gh-*` / `gh2-*` design tokens
- **Animation libraries:** Custom scroll-reveal components, `cobe` WebGL globe, CSS transitions; no Framer Motion or GSAP detected
- **Deployment:** Railway (backend via Nixpacks, frontend via Dockerfile)
- **Other important tools:** Stripe, S3-compatible storage, SendGrid/Gmail, WaSender WhatsApp, Playwright e2e, Vitest

## Commands Run

| Command | Result | Notes |
|---|---|---|
| `pnpm audit --audit-level=low` | Multiple vulnerabilities found | Critical `sanitize-html`, 4× High `next`, 3× Moderate `hono`/`postcss`/`@hono/node-server`. See `SECURITY_AUDIT.md`. |
| `pnpm typecheck` | Failed | Backend: `doctorAmountCents` missing from Prisma `ServiceDoctor` select (schema/code drift). Frontend: locale check passed, then `tsc --noEmit` passed. |
| `pnpm lint` | Failed | Frontend: 2 React 19 rule errors (`react-hooks/immutability`, `react-hooks/refs`) + 5 warnings. Backend lint not reached because frontend failed. |
| `cd frontend && pnpm build` | Succeeded | Standalone build completed in ~1m 43s. |
| `cd frontend && pnpm build:analyze` | Succeeded but no analyzer output emitted | Bundle analyzer plugin did not write `.next/analyze/`. Likely env/plugin configuration issue; recommend verifying `ANALYZE=true` reaches the plugin. |

## Repository Areas Reviewed

- `frontend/app/` — layouts, pages, route handlers, server actions
- `frontend/components/` — sections, layout, cards, cart, portal shells, calendar, chat
- `frontend/lib/` — API wrappers, i18n, routing, content sanitizers
- `frontend/proxy.ts` — edge auth/locale middleware
- `frontend/next.config.ts`, `frontend/app/globals.css`
- `frontend/public/` — images, logos, fonts
- `backend/src/app.ts` — Fastify plugins (CORS, helmet, compress, rate-limit, multipart)
- `backend/src/config/env.ts` — environment schema and production hard-fail guards
- `backend/src/routes/` — public, account, doctor, admin, payment, cron routes (sampled)
- `backend/src/modules/` — appointments, doctor-availability, subscriptions, gp-booking, orders
- `backend/src/lib/` — medical-access-guard, internal-scheduler, crypto, stripe client
- `backend/prisma/schema.prisma` — indexes, relations, enums
- `package.json`, `pnpm-workspace.yaml`, `docker-compose.yml`, `backend/railway.json`

Skipped: `node_modules/`, `.next/`, `backend/dist/`, `.git/`, lockfile internals, binary DOCX templates, generated docs.

## Biggest Performance Problems

| Rank | Issue | Severity | Category | Files |
|---|---|---|---|---|
| 1 | Public site shell is a client boundary | High | frontend/rendering | `frontend/app/(site)/layout.tsx`, `frontend/components/layout/SiteChrome.tsx` |
| 2 | CartProvider re-renders entire layout | High | frontend/rendering | `frontend/app/(site)/layout.tsx`, `frontend/components/cart/CartContext.tsx` |
| 3 | Most images bypass Next.js optimization | High | assets/CWV | `frontend/components/sections/HomeHero.tsx`, `frontend/components/cards/DoctorCard.tsx`, `frontend/components/cards/ServiceCard.tsx`, etc. |
| 4 | No `next/dynamic` / code-splitting used | High | bundle | Entire `frontend/components` tree |
| 5 | Heavy below-fold widgets load eagerly | High | bundle/CWV | `frontend/components/sections/DoctifyReviews.tsx`, `frontend/components/sections/SameDayBooking.tsx`, `frontend/components/ui/cobe-globe.tsx` |
| 6 | Public folder contains multi-megabyte PNGs | Critical | assets | `frontend/public/logos/partners/cfm.png` (2.1 MB), `frontend/public/images/stock/*.png` (~1.9 MB each) |
| 7 | Hero plus-mask uses raw SVG `<image>` | Critical | assets/CWV | `frontend/components/sections/HeroPlusImage.tsx` |
| 8 | Global CSS is monolithic and very large | High | bundle/CWV | `frontend/app/globals.css` (~8 984 lines) |
| 9 | `flag-icons` full CSS loaded globally | Medium | bundle/assets | `frontend/app/layout.tsx` |
| 10 | Backend scheduler duplicates on multi-replica | High | backend/deployment | `backend/src/lib/internal-scheduler.ts`, `backend/src/server.ts` |

## Core Web Vitals Risk Assessment

### LCP Risks

**Risk: High.**

- Hero images are served unoptimized (`unoptimized={true}`) from CMS/Unsplash/`/api/media`. The browser downloads the full-resolution source.
- `HeroPlusImage` renders through a raw SVG `<image>` element, completely bypassing Next.js image optimization. This is the LCP element on `/doctors` and several service pages.
- No `<link rel="preload">` is emitted for above-the-fold hero images.
- Public-folder PNGs exceed 1 MB (up to 2.1 MB) and are not converted to AVIF/WebP.
- `next.config.ts` does not enable AVIF or explicit device/image sizes.

### CLS Risks

**Risk: Medium.**

- Most Next.js images use `fill` + `sizes`, which is good.
- `HeroPlusImage` SVG mask has no explicit intrinsic dimensions in some call paths.
- `DoctifyReviews` injects third-party scripts/iframes with `min-height` placeholders that may not match final content.
- Cookie banner and sticky booking bars are fixed-position; safe-area insets are missing on the cookie banner, which can cause small shifts on iOS.

### INP / Interaction Lag Risks

**Risk: Medium–High.**

- The entry page loads the `cobe` WebGL globe eagerly at 16 000 samples with a continuous `requestAnimationFrame` loop.
- `DoctorCarousel` calls three `setState` handlers on every scroll event.
- Meta Pixel loads `afterInteractive` as the first child of `<body>`.
- `MobileNav` renders its full drawer DOM eagerly on every page, including desktop.
- Monolithic CSS ~9 000 lines increases parse/match cost.

### TTFB Risks

**Risk: Medium.**

- The edge proxy (`frontend/proxy.ts`) now decodes JWT locally — good improvement vs. the prior backend round-trip.
- Backend compression (`@fastify/compress` with `br,gzip,deflate`) and immutable media cache headers are configured.
- No production build cache or CDN configuration was visible in the repo; TTFB depends on Railway edge performance.
- Some admin/order list endpoints fetch all rows without pagination.

## Frontend Rendering Issues

### 1. Whole public layout shell is a client boundary

`frontend/components/layout/SiteChrome.tsx` is `"use client"` only to read `usePathname()`. Because it wraps `<main>`, header, footer, trust bar, and disclaimer, every page under `(site)` loses static/server rendering of those elements.

**Fix:** Resolve the gateway-home flag from server `params`/`pathname` and pass it as a prop. Keep `SiteChrome` a Server Component; isolate scroll listener and mobile menu in tiny wrappers.

### 2. Header and footer are client components

`SiteHeader` and `SiteFooter` both call `usePathname()`. The header also attaches a scroll listener on every public page.

**Fix:** Pass `pathname`/`country`/`lang` from the server layout. Move the scroll glass-morphism toggle into a small client wrapper around just the header element.

### 3. CartProvider wraps the entire site

`frontend/app/(site)/layout.tsx` and `frontend/app/(auth)/layout.tsx` wrap the whole tree with `CartProvider`. When the cart fetch resolves, the provider value changes and every descendant re-renders.

**Fix:** Memoize the provider value with `useMemo`, and move the provider so it only wraps components that consume cart state (`SiteHeader` cart icon, cart pages, AddToCart buttons).

### 4. No code-splitting via `next/dynamic`

A grep for `next/dynamic` returned zero usages in `frontend/`. Heavy or below-fold components could be deferred:

- `DoctifyReviews`
- `SameDayBooking`
- `HeroBookingWizard`
- `CountryEntryGate` globe
- `MobileNav` drawer content
- Admin rich-text editor dialogs

### 5. Scroll-triggered reveals force client boundaries

`RevealOnScroll` is `"use client"`. Wrapping static sections with it turns server-rendered markup into hydrated client boundaries.

**Fix:** Keep sections as Server Components and wrap only the reveal behavior, or replace with CSS `@starting-style` / scroll-driven animations where supported.

### 6. `DoctorCarousel` re-renders on every scroll event

`frontend/components/sections/DoctorCarousel.tsx` updates `canPrev`, `canNext`, and `progress` state on every `onScroll`. React 19 batches the setters, but the component still re-renders and diffuses props to all cards.

**Fix:** Throttle with `requestAnimationFrame` and drive the progress bar via a CSS custom property (`--scroll-progress`) instead of React state.

### 7. React 19 lint errors indicate risky patterns

`pnpm lint` flagged:

- `frontend/app/(auth)/account/bookings/ui.tsx:169` — `window.location.href = ...` inside render path.
- `frontend/app/(doctor)/doctor/profile/_components/edit-form.tsx:227,249` — reading `ref.current` during render.

These can cause unexpected re-renders, stale reads, or hard-to-trace hydration issues.

## Mobile Performance & Rendering Issues

### 1. iOS input auto-zoom from 14 px font size

Inputs across login, register, checkout, consult forms, and profile use `text-sm` (~14 px). iOS Safari zooms the viewport when focusing any input whose font-size is < 16 px.

**Fix:** Set `input, select, textarea { font-size: 16px; }` for viewports ≤ 768 px.

### 2. Tables render as horizontal scroll on mobile

Doctor portal tables (`services-used-list.tsx`, `appointment-medical-notes-section.tsx`, `consultation-documents-modal.tsx`) have `min-w-[620px]` / `min-w-[640px]` with `overflow-x-auto` and no mobile card fallback.

**Fix:** Hide tables below `md:` and render `PortalMobileCard` stacks, as already done in the account payments page.

### 3. Full-viewport heroes on mobile

`PageHero`, `DoctorsHero`, `ServiceHero`, and `HomeHero` use `min-height: calc(100svh - var(--header-height))` at all breakpoints. They contain layered gradients, SVG noise, backdrop blur, and large watermarks.

**Fix:** Cap hero height on mobile (`max-h-[min(100svh-72px,760px)]`) and reduce decorative layers below `lg`.

### 4. Cobe globe always renders at 16 000 samples

`frontend/components/ui/cobe-globe.tsx` hard-codes `mapSamples: 16000` and runs a continuous `requestAnimationFrame` loop. This is expensive on mobile and drains battery.

**Fix:** Detect `navigator.hardwareConcurrency`, `connection.saveData`, and `prefers-reduced-motion`; reduce `mapSamples` to ~6 000 on mobile, pause when off-screen or hidden.

### 5. Small touch targets in booking funnel

The wizard back button is 24×24 px (below WCAG 2.5.5). Slot/benefit chips have small vertical padding.

**Fix:** Enlarge interactive elements to at least 44×44 px.

### 6. Fixed bottom bars can overlap

`StickyBookingCTA`, `MobileOrderTotalBar`, and `CookieBanner` are all fixed-position. The cookie banner does not use `env(safe-area-inset-bottom)`.

**Fix:** Add safe-area padding to the cookie banner and centralise a single bottom-sheet slot so only one fixed bar is mounted at a time.

## Asset & Bundle Issues

### 1. Hero plus-mask image bypasses Next.js optimization

`HeroPlusImage` uses raw SVG `<image href={src} />`. This is the LCP element on several pages and receives no format conversion or responsive sizing.

**Fix:** Replace with Next.js `<Image>` clipped via CSS `clip-path` or inline SVG mask. Add `priority`, `sizes`, and `fetchPriority="high"`.

### 2. Public folder contains multi-megabyte PNGs

| File | Size | Dimensions |
|---|---|---|
| `public/logos/partners/cfm.png` | 2.1 MB | 1536×1024 |
| `public/images/stock/blog.png` | 1.9 MB | 1448×1086 |
| `public/images/stock/plans.png` | 1.9 MB | 1448×1086 |
| `public/logos/partners/gdpr-green-gold.png` | 1.6 MB | 1254×1254 |
| `public/logos/partners/eu-star.png` | 1.2 MB | 2048×2048 |

These are displayed at card/logo sizes. Converting to AVIF/WebP and right-sizing would cut 5–8 MB from the public folder.

### 3. `next/image` config is minimal

`frontend/next.config.ts` only sets `remotePatterns`. AVIF, explicit device sizes, image sizes, and cache TTL are missing.

**Recommended addition:**

```ts
images: {
  remotePatterns,
  formats: ["image/avif", "image/webp"],
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2560],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  minimumCacheTTL: 60 * 60 * 24 * 365,
}
```

### 4. No image preloads for above-the-fold hero photos

LCP hero images use `priority` but no `<link rel="preload">` is emitted. Preloading can start the fetch 100–300 ms earlier.

### 5. `flag-icons` full CSS loaded globally

`frontend/app/layout.tsx` imports `flag-icons/css/flag-icons.min.css`. The app displays ~7 flags but downloads the full sprite CSS on every page.

**Fix:** Inline the few needed flags as SVG components or purge unused classes.

### 6. Global CSS is monolithic

`frontend/app/globals.css` is ~8 984 lines containing tokens, reset, component utilities, article styles, footer, portal, scrollbars, animations, etc. Compiled CSS chunks exceed 800 KB in dev.

**Fix:** Split by route concern (tokens + reset only in `globals.css`; section/component styles via CSS Modules or colocated `@import`). Audit dead rules with DevTools Coverage.

### 7. Third-party scripts lack preconnect

Meta Pixel (`connect.facebook.net`) and Doctify (`www.doctify.com`) load without `dns-prefetch` / `preconnect`.

### 8. Lucide icon breadth

145 unique `lucide-react` icons are imported. Named imports tree-shake, but the breadth indicates many one-off icons. Audit for unused imports to avoid accidental bundle growth.

## Animation & Scroll Lag Issues

### 1. WebGL globe on entry page

`cobe` is statically imported and initializes immediately on `/`. It consumes GPU/CPU on first paint.

**Fix:** Load with `next/dynamic` + `ssr: false`. Reduce samples on low-power devices. Pause under `prefers-reduced-motion` or when tab is hidden.

### 2. Scroll-linked header glass-morph animation

`SiteHeader` toggles `backdrop-filter`, `max-width`, `border-radius`, and box-shadow on scroll. Reduced-motion class is applied but the listener still fires.

**Fix:** Prefer `opacity`/`transform` only; debounce or use CSS `scroll-timeline` where supported.

### 3. Doctify widgets cause layout shifts and auto-motion

`DoctifyReviews` injects remote scripts/iframes with placeholder heights. Carousel variant auto-scrolls with no reduced-motion guard.

**Fix:** Reserve exact aspect-ratio placeholder, lazy-load below the fold, pause carousels under `prefers-reduced-motion: reduce`.

### 4. No reduced-motion guard for the globe

`cobe-globe.tsx` does not check `prefers-reduced-motion`. Respect for motion preferences is present in `HeroReveal.tsx` and `RevealOnScroll.tsx`, but not for the most expensive animation.

## API / Backend Performance Issues

### 1. In-process scheduler duplicates work on horizontal scale

`backend/src/lib/internal-scheduler.ts` starts five `setInterval` loops inside the API process. There is no distributed lock or `RUN_SCHEDULER` gate.

**Impact:** Scaling the backend to 2+ Railway replicas duplicates every cron: double reminder emails, concurrent sweeps, double reconciliation alerts. Money paths have idempotency, but emails/WhatsApp do not.

**Fix:** Gate scheduler behind `RUN_SCHEDULER=true` (single worker replica) or add Postgres advisory-lock wrapper per job.

### 2. Some admin/corporate list endpoints are unbounded

Several `findMany` calls in admin/corporate routes lack `take`:

- `admin-clinics.route.ts` — `clinic.findMany({})`
- `admin-corporate.route.ts` — `corporatePlan`, `corporateCompany`, `corporateEmployee`, `corporateBeneficiary`, `corporateServiceRequest` lists
- `admin-assets.route.ts` — `asset.findMany` capped at 1000 but no pagination
- `admin-orders` page fetches all orders with no pagination parameters

**Fix:** Add server-driven pagination (`page`/`pageSize`) and propagate to the frontend admin tables.

### 3. Chat file upload trusts client MIME type

`backend/src/routes/consultation-chat.route.ts:339-352` uses `file.mimetype` directly without magic-byte sniffing. While the route checks an allowlist, a polyglot file declared as `image/jpeg` can still be stored and later served.

**Fix:** Run `verifySniffedMime()` (already used by `patient-upload.route.ts` and `medical-documents.route.ts`) on chat uploads.

### 4. Cron endpoints run on boot

`startInternalScheduler` runs `tickPrePayment`, `tickPostPayment`, `tickSubscriptionOps`, and `tickReconciliation` immediately on boot. A rolling deploy can trigger overlapping runs with the previous replica.

**Fix:** Add a short jitter or leader-elected startup delay, and rely on `RUN_SCHEDULER` gating.

### 5. Backend compression is configured

Positive finding: `@fastify/compress` is registered with `br,gzip,deflate` and 1 KB threshold. JSON responses shrink ~70%.

## Database Performance Issues

### 1. Missing composite indexes on hot query columns

`Appointment` has indexes on `clinicId`, `userId`, `email`, `doctorId`, and `status + createdAt`, but common filter/sort combinations are uncovered:

- `scheduledAt` — used in nearly every calendar/availability query
- `countryCode` + `status` — admin dashboards filter by country
- `doctorId` + `scheduledAt` — doctor calendar loads
- `paymentStatus` + `createdAt` — payment reconciliation
- `stripeSessionId` — webhook lookups (the column is not indexed)
- `userId` + `status` — account portal filtering

**Fix:** Add targeted composite indexes via migration:

```prisma
@@index([doctorId, scheduledAt])
@@index([countryCode, status, createdAt])
@@index([paymentStatus, createdAt])
@@index([stripeSessionId])
@@index([userId, status, createdAt])
```

### 2. `Order.appointmentIds` denormalized array still queried

`Order.appointmentIds` is a GIN-indexed `String[]` but the model now has a proper `OrderAppointment` join table. Code that still queries the array cannot enforce FK integrity and performs array-contains scans.

**Fix:** Migrate remaining readers/writers to `orderAppointments` relation and eventually drop the array column.

### 3. Slot generation has a race window

`ensureServiceSlotsForRange` pre-fetches existing slots then inserts with `createMany`. The DB exclusion constraint catches races, but the fallback one-by-one insert is slower and can happen frequently under concurrent booking of the same doctor.

**Fix:** The exclusion constraint is the real guard; ensure it is present in production and monitor for frequent `23P01` fallback paths.

### 4. Patient merge reads snapshot before transaction

`patient-merge.service.ts` reads duplicate/patient snapshots before opening the transaction. The data can become stale before the write set begins.

**Fix:** Re-read authoritative rows inside the transaction.

### 5. `doctorAmountCents` schema/code drift blocks typecheck

`pnpm typecheck` fails because `doctorAmountCents` is used in `doctor-services.service.ts` and `doctor-actions.route.ts` / `doctor-reports.route.ts` but no longer exists in the Prisma `ServiceDoctor` model. This indicates a migration/code mismatch that can cause runtime errors or feature breakage.

**Fix:** Either re-add the column to the schema + migration or remove the references.

## Deployment / Hosting Performance Issues

### 1. No production healthcheck configured

`backend/railway.json` and the frontend Railway config do not specify `healthcheckPath`. Railway promotes deploys once the port opens, even if the app is still running migrations or half-booted.

**Fix:** Add `"healthcheckPath": "/api/health"` on the backend and a frontend check in Railway deploy config.

### 2. Scheduler not isolated to a worker replica

As noted above, the internal scheduler runs in every API replica. Before any horizontal scaling, introduce a `RUN_SCHEDULER` env flag.

### 3. Static asset caching not explicit

`frontend/next.config.ts` only adds security headers. Next.js handles hashed chunks, but `/public` files without hashed filenames rely on default CDN behavior.

**Fix:** Add a `headers()` entry for static assets:

```ts
{
  source: "/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff2)",
  headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
}
```

### 4. Bundle analyzer does not emit output

`pnpm build:analyze` completed without writing `.next/analyze/`. This prevents quantifying bundle contributors.

**Fix:** Verify `ANALYZE=true` reaches the plugin (try `pnpm exec cross-env ANALYZE=true next build` or inline the env in `next.config.ts`). Add a CI step to archive analyzer output.

### 5. Local Postgres bind is loopback-only

`docker-compose.yml` binds Postgres to `127.0.0.1:5432`, which is correct for local dev.

## Detailed Findings

### Finding P-001: Public site shell is a client boundary

- **Severity:** High
- **Category:** frontend / rendering
- **Affected files:** `frontend/app/(site)/layout.tsx`, `frontend/components/layout/SiteChrome.tsx`, `frontend/components/layout/SiteHeader.tsx`, `frontend/components/layout/SiteFooter.tsx`
- **Problem:** `SiteChrome` is `"use client"` solely to call `usePathname()`. Because it wraps header, footer, trust bar, and main wrapper, every public page hydrates the entire shell.
- **Why it matters:** Forces React to hydrate a large DOM tree on first visit, increasing TTI and blocking the main thread, especially on low-end mobile.
- **Recommended fix:** Resolve `isGatewayHome` from server params and pass as a prop. Keep `SiteChrome`, `SiteHeader`, `SiteFooter` as Server Components. Isolate scroll listener and mobile menu in tiny wrappers.
- **Difficulty:** Medium
- **Expected impact:** High
- **Priority:** 1

### Finding P-002: CartProvider re-renders entire layout

- **Severity:** High
- **Category:** frontend / rendering
- **Affected files:** `frontend/app/(site)/layout.tsx`, `frontend/app/(auth)/layout.tsx`, `frontend/components/cart/CartContext.tsx`
- **Problem:** `CartProvider` wraps the full layout tree. When the cart fetch resolves, the provider value object changes and every descendant re-renders.
- **Why it matters:** A cart refresh on any page triggers a full layout re-render.
- **Recommended fix:** Memoize the provider value with `useMemo`. Move the provider lower so it only wraps `SiteHeader` and actual cart consumers.
- **Difficulty:** Easy
- **Expected impact:** High
- **Priority:** 1

### Finding P-003: Images bypass Next.js optimization

- **Severity:** High
- **Category:** assets / CWV
- **Affected files:** `frontend/components/sections/HomeHero.tsx`, `frontend/components/sections/PageHero.tsx`, `frontend/components/sections/ServiceHero.tsx`, `frontend/components/sections/DoctorsHero.tsx`, `frontend/components/cards/DoctorCard.tsx`, `frontend/components/cards/FeaturedDoctor.tsx`, `frontend/components/media/HealthcareMediaFrame.tsx`
- **Problem:** These components pass `unoptimized={true}` for remote and `/api/media/` images, disabling WebP/AVIF conversion, responsive `srcset`, and sizing.
- **Why it matters:** Visitors download full-resolution source images. LCP is delayed and mobile data is wasted.
- **Recommended fix:** Remove `unoptimized` for `/api/media/` paths (already allowed in `next.config.ts` remotePatterns). Add explicit `sizes` and `priority` for above-the-fold heroes.
- **Difficulty:** Easy
- **Expected impact:** High
- **Priority:** 1

### Finding P-004: Service catalog uses raw `<img>` tags

- **Severity:** High
- **Category:** assets / CWV
- **Affected files:** `frontend/components/sections/ServiceCatalog.tsx`, `frontend/components/cards/ServiceCard.tsx`
- **Problem:** Service tiles use plain `<img>` with `loading="lazy"` but no Next.js optimization, no `srcset`, no AVIF/WebP, no placeholder.
- **Why it matters:** Catalog images are often large CMS/admin uploads; they hurt LCP and page weight.
- **Recommended fix:** Convert to `next/image` with `fill` + `sizes` or explicit `width`/`height`. Remove the ESLint `no-img-element` override.
- **Difficulty:** Easy
- **Expected impact:** High
- **Priority:** 1

### Finding P-005: Hero plus-mask uses raw SVG `<image>`

- **Severity:** Critical
- **Category:** assets / CWV
- **Affected files:** `frontend/components/sections/HeroPlusImage.tsx`, callers in `DoctorsHero.tsx`, `PageHero.tsx`
- **Problem:** The hero portrait is rendered with `<image href={src} />` inside an SVG, bypassing Next.js optimization entirely.
- **Why it matters:** This is the LCP element on several pages; PNG/JPG sources up to 1.4 MB are delivered as-is.
- **Recommended fix:** Replace with Next.js `<Image>` clipped via CSS `clip-path` or inline SVG mask. Keep the plus shape but let Next.js generate responsive WebP/AVIF srcsets.
- **Difficulty:** Medium
- **Expected impact:** High
- **Priority:** 1

### Finding P-006: No `next/dynamic` code-splitting

- **Severity:** High
- **Category:** bundle
- **Affected files:** All `frontend/components`
- **Problem:** No component uses `next/dynamic`. Heavy or below-fold widgets are bundled into the initial JS.
- **Why it matters:** First-party JS is larger than necessary; TTI is delayed.
- **Recommended fix:** Dynamically import `DoctifyReviews`, `SameDayBooking`, `HeroBookingWizard`, `cobe-globe`, `MobileNav` drawer content, and admin rich-text dialogs. Use `ssr: false` only for genuinely browser-only widgets (globe).
- **Difficulty:** Medium
- **Expected impact:** High
- **Priority:** 2

### Finding P-007: Heavy below-fold widgets load eagerly

- **Severity:** High
- **Category:** bundle / CWV
- **Affected files:** `frontend/components/sections/DoctifyReviews.tsx`, `frontend/components/sections/SameDayBooking.tsx`, `frontend/components/sections/CountryEntryGate.tsx`, `frontend/components/ui/cobe-globe.tsx`
- **Problem:** `DoctifyReviews` injects a third-party script on mount. `SameDayBooking` fetches availability on mount regardless of viewport. The `cobe` globe initializes immediately.
- **Why it matters:** These compete with LCP/hero resources and block the main thread.
- **Recommended fix:** Lazy-load behind IntersectionObserver or `next/dynamic`. For the globe, reduce samples on mobile and respect `prefers-reduced-motion`.
- **Difficulty:** Medium
- **Expected impact:** High
- **Priority:** 2

### Finding P-008: Multi-megabyte PNGs in `/public`

- **Severity:** Critical
- **Category:** assets
- **Affected files:** `frontend/public/logos/partners/cfm.png` (2.1 MB), `frontend/public/images/stock/blog.png` (1.9 MB), `frontend/public/images/stock/plans.png` (1.9 MB), `frontend/public/logos/partners/gdpr-green-gold.png` (1.6 MB), `frontend/public/logos/partners/eu-star.png` (1.2 MB)
- **Problem:** Uncompressed/unquantized PNGs are served directly from `/public` and skipped by `next/image`.
- **Why it matters:** These dominate page weight on any page that displays them.
- **Recommended fix:** Convert to AVIF/WebP, run `oxipng`/`cwebp`/`avifenc`, and right-size dimensions. Target < 100 KB each, < 30 KB for logos.
- **Difficulty:** Low
- **Expected impact:** High
- **Priority:** 1

### Finding P-009: `next/image` config lacks formats, sizes, and cache TTL

- **Severity:** High
- **Category:** assets / CWV / deployment
- **Affected files:** `frontend/next.config.ts`
- **Problem:** `images: { remotePatterns }` only. AVIF, device sizes, image sizes, and `minimumCacheTTL` are not configured.
- **Why it matters:** Next.js defaults to WebP only and a conservative cache TTL; AVIF savings (20–30%) are left on the table.
- **Recommended fix:** Add `formats: ["image/avif", "image/webp"]`, explicit `deviceSizes`/`imageSizes`, and `minimumCacheTTL: 60 * 60 * 24 * 365`.
- **Difficulty:** Low
- **Expected impact:** Medium
- **Priority:** 2

### Finding P-010: No hero image preloads

- **Severity:** High
- **Category:** CWV / assets
- **Affected files:** `frontend/app/layout.tsx`, hero components
- **Problem:** LCP hero images use `priority` but no `<link rel="preload">` is emitted in layout or page metadata.
- **Why it matters:** LCP image fetch starts after HTML/JS/CSS parse; preloading can start it 100–300 ms earlier.
- **Recommended fix:** Emit preload links in page metadata for the active hero variant per viewport.
- **Difficulty:** Medium
- **Expected impact:** Medium
- **Priority:** 2

### Finding P-011: Monolithic global CSS

- **Severity:** High
- **Category:** bundle / CWV
- **Affected files:** `frontend/app/globals.css`
- **Problem:** One ~8 984-line stylesheet is imported by every page. Dev CSS chunks exceed 800 KB.
- **Why it matters:** Large CSS blocks rendering, increases parse/selector-match cost, and consumes memory even for unused rules.
- **Recommended fix:** Split into `tokens.css`, `reset.css`, and route/component-specific imports. Audit dead rules with DevTools Coverage. Use Tailwind v4’s CSS-first config to avoid duplication.
- **Difficulty:** Medium
- **Expected impact:** Medium
- **Priority:** 3

### Finding P-012: `flag-icons` full CSS loaded globally

- **Severity:** Medium
- **Category:** bundle / assets
- **Affected files:** `frontend/app/layout.tsx`, `frontend/components/ui/Flag.tsx`
- **Problem:** `import "flag-icons/css/flag-icons.min.css"` ships hundreds of flag classes on every page even though only ~7 flags are rendered.
- **Why it matters:** Extra render-blocking CSS and unused sprite references.
- **Recommended fix:** Inline the used flags as SVG components or purge unused classes with a scoped Tailwind content scan.
- **Difficulty:** Low
- **Expected impact:** Medium
- **Priority:** 3

### Finding P-013: `DoctorCarousel` scroll handler re-renders on every event

- **Severity:** Medium
- **Category:** rendering / interaction
- **Affected files:** `frontend/components/sections/DoctorCarousel.tsx`
- **Problem:** `onScroll` calls three `setState` setters on every scroll event.
- **Why it matters:** Causes React re-renders and prop diffusion to all carousel cards during scrolling.
- **Recommended fix:** Throttle with `requestAnimationFrame` and write progress to a CSS custom property instead of React state.
- **Difficulty:** Low
- **Expected impact:** Medium
- **Priority:** 3

### Finding P-014: Meta Pixel loads early in body

- **Severity:** Medium
- **Category:** CWV / third-party
- **Affected files:** `frontend/app/layout.tsx`
- **Problem:** The Meta Pixel `<Script strategy="afterInteractive">` is the first child of `<body>`. It executes early and competes with INP.
- **Why it matters:** Third-party scripts are a leading cause of poor INP/LCP.
- **Recommended fix:** Move to `strategy="lazyOnload"` unless marketing requires sooner. Add `preconnect` to `connect.facebook.net`. Load only after cookie consent if required by jurisdiction.
- **Difficulty:** Low
- **Expected impact:** Medium
- **Priority:** 3

### Finding P-015: Mobile input font size triggers iOS zoom

- **Severity:** Critical
- **Category:** mobile / UX
- **Affected files:** Login, register, checkout, consult forms, profile forms
- **Problem:** Inputs use `text-sm` (~14 px). iOS Safari zooms the viewport when focusing inputs with font-size < 16 px.
- **Why it matters:** Breaks checkout funnel; users must pinch-zoom back out.
- **Recommended fix:** Add global rule: `@media (max-width: 768px) { input, select, textarea { font-size: 16px; } }`.
- **Difficulty:** Low
- **Expected impact:** High
- **Priority:** 1

### Finding P-016: Doctor portal tables not mobile-friendly

- **Severity:** High
- **Category:** mobile / UX
- **Affected files:** `frontend/app/(doctor)/doctor/appointments/[id]/_components/services-used-list.tsx`, `appointment-medical-notes-section.tsx`, `consultation-documents-modal.tsx`
- **Problem:** Tables have fixed `min-w-[620px]`/`min-w-[640px]` with horizontal scroll and no mobile card fallback.
- **Why it matters:** Doctors on phones/tablets cannot read appointment data without awkward horizontal scrolling.
- **Recommended fix:** Provide `PortalMobileCard` stacks below `md:` and hide the table, mirroring the account payments page.
- **Difficulty:** Medium
- **Expected impact:** High
- **Priority:** 2

### Finding P-017: Cobe globe not adapted for mobile/low-power

- **Severity:** High
- **Category:** rendering / mobile
- **Affected files:** `frontend/components/ui/cobe-globe.tsx`, `frontend/components/sections/CountryEntryGate.tsx`
- **Problem:** `mapSamples: 16000` is hard-coded; continuous `requestAnimationFrame` loop runs regardless of device or motion preference.
- **Why it matters:** High GPU/CPU cost on mobile, battery drain, dropped frames.
- **Recommended fix:** Detect `navigator.hardwareConcurrency`, `connection.saveData`, and `prefers-reduced-motion`; reduce samples on mobile, pause when off-screen.
- **Difficulty:** Medium
- **Expected impact:** High
- **Priority:** 2

### Finding P-018: In-process scheduler duplicates on scale

- **Severity:** High
- **Category:** backend / deployment
- **Affected files:** `backend/src/lib/internal-scheduler.ts`, `backend/src/server.ts`
- **Problem:** Five cron loops run inside every API replica via `setInterval`. No distributed lock or leader election.
- **Why it matters:** Two replicas = double emails/WhatsApp/reminders. Money paths are idempotent; communications are not.
- **Recommended fix:** Introduce `RUN_SCHEDULER=true` env flag (single worker replica) or Postgres advisory-lock wrapper per job.
- **Difficulty:** Medium
- **Expected impact:** High
- **Priority:** 2

### Finding P-019: Missing composite indexes on hot Appointment columns

- **Severity:** Medium
- **Category:** database
- **Affected files:** `backend/prisma/schema.prisma` (`Appointment` model)
- **Problem:** No indexes on `scheduledAt`, `countryCode + status`, `doctorId + scheduledAt`, `paymentStatus + createdAt`, `stripeSessionId`, `userId + status`.
- **Why it matters:** Sequential scans on the largest table as data grows; webhook lookups slow down.
- **Recommended fix:** Add composite indexes via migration (see Database Performance Issues section).
- **Difficulty:** Easy
- **Expected impact:** Medium
- **Priority:** 3

### Finding P-020: Bundle analyzer does not emit output

- **Severity:** Medium
- **Category:** deployment / bundle
- **Affected files:** `frontend/next.config.ts`, `frontend/package.json`
- **Problem:** `pnpm build:analyze` completed but `.next/analyze/` was not created, so bundle contributors cannot be quantified.
- **Why it matters:** Without analyzer output, targeted bundle optimization is guesswork.
- **Recommended fix:** Verify `ANALYZE=true` reaches the plugin. Try `pnpm exec cross-env ANALYZE=true next build`. Add a CI step to archive analyzer artifacts.
- **Difficulty:** Low
- **Expected impact:** Medium
- **Priority:** 3

## Prioritized Performance Fix Roadmap

### Immediate Fixes — 1 Day

1. **Set mobile input font-size to 16 px** — global one-liner CSS fix for iOS zoom.
2. **Remove `unoptimized` for `/api/media/` images** and add `sizes` to hero/card images.
3. **Convert `ServiceCard` / `ServiceCatalog` `<img>` to `next/image`.**
4. **Memoize `CartContext` value** with `useMemo` so cart updates do not re-render the whole layout.
5. **Optimize public-folder PNGs** — convert largest 5 files to AVIF/WebP and right-size.
6. **Enable AVIF + deviceSizes + cache TTL** in `frontend/next.config.ts`.
7. **Fix React 19 lint errors** (`window.location.href` in render path, ref reads during render).
8. **Add `preconnect`/`dns-prefetch`** for `connect.facebook.net` and `www.doctify.com`.

### Short-Term Fixes — 2 to 5 Days

1. **Refactor `SiteChrome`, `SiteHeader`, `SiteFooter` to Server Components** and pass pathname/country/lang from server layout. Isolate scroll/mobile behaviors in small client wrappers.
2. **Introduce `next/dynamic`** for `DoctifyReviews`, `SameDayBooking`, `HeroBookingWizard`, `MobileNav` drawer, and admin rich-text dialogs.
3. **Lazy-load the `cobe` globe** and adapt sample count / pause for mobile and reduced-motion.
4. **Throttle `DoctorCarousel` scroll handler** and drive progress via CSS custom property.
5. **Add hero image preloads** in page metadata.
6. **Replace global `flag-icons` CSS** with inline SVG flags.
7. **Add mobile card fallbacks** for doctor portal tables.
8. **Cap hero height on mobile** and reduce decorative layers.
9. **Add `RUN_SCHEDULER` env gate** to isolate cron work to one backend replica.
10. **Fix bundle analyzer** so `ANALYZE=true` emits `.next/analyze/`.

### Medium-Term Fixes — 1 to 2 Weeks

1. **Split `globals.css`** into tokens/reset + route/component-specific styles; audit dead rules.
2. **Add missing composite indexes** on `Appointment` and other hot tables.
3. **Migrate remaining `Order.appointmentIds` readers** to the `OrderAppointment` join table.
4. **Add server-driven pagination** to admin/corporate list endpoints and frontend tables.
5. **Implement IntersectionObserver-driven data fetching** for below-fold sections.
6. **Add explicit long-lived `Cache-Control`** for `/public` static assets.
7. **Fix `doctorAmountCents` schema/code drift** so `pnpm typecheck` passes.

### Long-Term Improvements

1. **Adopt a real job queue / scheduler** (e.g. BullMQ with Redis, or Railway cron + separate worker service) instead of in-process `setInterval`.
2. **Add performance budgets** to CI (max initial JS, max image weight, Lighthouse score thresholds).
3. **Implement a CDN + edge caching strategy** for public pages and `/api/media`.
4. **Run Lighthouse / WebPageTest** on every deploy against `/`, `/ie/en`, and `/ie/en/gp-appointment`.
5. **Monitor Core Web Vitals** in production (Vercel Analytics, Real User Monitoring, or LogRocket).
6. **Consider replacing `cobe` globe** with a static image or CSS animation for entry page.

## Recommended Performance Budget

| Budget | Target | Current Estimate |
|---|---|---|
| Total page weight (mobile) | < 1.5 MB | 3–8 MB on image-heavy pages |
| Hero LCP image transfer | < 100 KB | 120 KB – 2.1 MB depending on path |
| Public folder total | < 5 MB | > 20 MB |
| Global CSS gzipped | < 50 KB | ~200+ KB inferred from 800+ KB dev chunk |
| First-party JS per route | < 250 KB gzipped | Unknown — analyzer output missing |
| Third-party scripts | < 100 KB | Meta Pixel + Doctify + flag-icons |
| API response time (p95) | < 300 ms | Not measured; target for public reads |
| Lighthouse Performance (mobile) | ≥ 85 | Likely 45–65 |
| LCP | < 2.5 s | Risk > 4 s on 3G |
| CLS | < 0.1 | Likely 0.05–0.15 |
| INP | < 200 ms | Risk > 300 ms |
| TTFB | < 600 ms | Depends on Railway edge; CDN would help |

## Final Notes

- Static analysis identified the major performance risks, but real-world numbers require Lighthouse/WebPageTest runs on the live `/ie/en` and `/` routes after the quick wins are applied.
- The build succeeds, but the typecheck and lint failures should be fixed immediately; they indicate schema/code drift and React 19 anti-patterns that can cause runtime instability.
- The backend has good fundamentals (compression, immutable media cache, rate-limiting defaults) but needs scheduler isolation before horizontal scaling.
- No exploit scripts or harmful payloads were generated. All recommendations are defensive and fix-oriented.
