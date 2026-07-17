# Post-Launch Hardening Plan — 2026-07-17

The 10 remaining code items after go-live blockers closed (see go-live-audit-review-2026-07-17.md §11 and phi-access-recovery-plan-2026-07-17.md — all their tasks are DONE). None of these block launch; ordered by risk × cheapness. Routing: **Fable = brain** (dispatch, review every diff, gate), **Opus = security items** (SEC-007/008, PRIV-002), **Sonnet 5 = everything else**. One task per fresh subagent; verify chain per commit: `prisma generate` → backend tsc → frontend tsc → lint → targeted tests.

## Wave 1 — quick wins (each ≤ half a day, no external dependency)

### 1. SEC-008 — PHI audit writes fail-closed (Opus, Medium)
- **Now:** `medical-access-guard.ts` (~line 210) swallows audit/alert write failures — a PHI read succeeds even when its mandatory audit row was never written.
- **Change:** for ALLOWED decisions on regulated reads, if `writeMedicalAccessLog` throws → deny the read (503/`AUDIT_UNAVAILABLE`), unless `PHI_AUDIT_EMERGENCY_BYPASS=true` (new env, default false, prod boot logs a loud warning when set). Denied decisions keep best-effort logging (blocking is already the outcome).
- **Watch out:** the security-alert write (`security-alert.service.ts`) stays best-effort — only the AUDIT row is load-bearing. Don't double-fail.
- **Test:** inject a throwing prisma mock (pattern exists in `medical-access-guard.test.ts` via `mock.module`): audit-write failure → read denied; bypass env → read allowed + warning logged.
- **Acceptance:** guard test file green; no route changes needed.

### 2. CACHE-001 — immutable caching scoped to hashed assets (Sonnet, Low)
- **Now:** `frontend/next.config.ts` (~line 159) gives 1-year `immutable` to extension-matched paths, including unhashed `/public` files — an overwritten `public/foo.png` never refreshes for repeat visitors.
- **Change:** immutable ONLY for `/_next/static/*` (content-hashed by Next). Unhashed public assets → `public, max-age=3600, must-revalidate` (or stale-while-revalidate). List which public files are actually referenced before choosing TTL.
- **Test/verify:** `pnpm --filter frontend build` + assert headers via the headers() unit shape or a build-output check; browser-verify one public asset header on the preview server.

### 3. i18n — consent + 2FA strings (Sonnet, follow-up)
- **Now:** Task 1 checkbox label EN-copy in all six `auth.json` files; Task 4 login-OTP screen uses inline `TWO_FA_STRINGS` (EN only, NOT in the locale bundle); doctor security-page copy updated in `en/doctor.json` only.
- **Change:** (a) real pt/es/cs/ro/de translations for `medicalConsentLabel`; (b) move `TWO_FA_STRINGS` into the auth locale namespace (all 6 locales) and wire `login/ui.tsx` to the bundle; (c) translate the two changed `doctor.json` keys in the other 5 locales.
- **Watch out:** `RegisterI18n`/locale union types — a key missing from ANY locale file fails tsc (this is by design; use it as the completeness check). Run `pnpm typecheck` (includes the locale key check) as the gate.
- **Translation source:** follow the repo's established OpenAI-translation convention (see scripts used for the 890-translation batch) or hand-translate — flag which was used in the commit.

### 4. A11y follow-ups (Sonnet, follow-up) — three sub-items, one commit each
- **4a. ColumnPriorityTable click-only rows:** `frontend/components/ColumnPriorityTable.tsx` (~94-99) has the same mouse-only span pattern fixed on the subscriptions table (see commit `ab6dde82` for the native-`<button aria-label>` pattern). Fix in the PRIMITIVE — every list page built on it inherits the fix. Check `PortalMobileCard` path stays as-is (already accessible).
- **4b. 15 public (site) page titles:** the title-less public pages are utility routes (cart/checkout/consent etc. — list in audit-review §"Stage 3"). Add per-page `metadata.title` (plain strings, localized where the route is locale-scoped; copy the `generateMetadata` pattern from `services/[serviceSlug]/page.tsx` ONLY where locale/params matter, else static).
- **4c. True SSR `lang`:** the big one — requires the multi-root-layout refactor (remove `<html>` from `app/layout.tsx`; give `(site)`, `(auth)`, `(admin)`, `(doctor)`, `(corporate)` route groups their own root layouts with their own `<html lang>`). Touches title/OG defaults, CookieBanner/ScrollToTop placement, MetaPixel consent gating, CSP nonce wiring. Treat as its own mini-project: Plan-agent design pass first, then implement behind a green build + full-route smoke (556 static pages must still generate). Do LAST of the a11y items; the inline-script mitigation (shipped) holds until then.

## Wave 2 — needs one decision or one external dependency

### 5. Error monitoring (Sonnet; BLOCKED on provider choice — owner picks)
- **Decision needed:** Sentry (recommended: Next.js + Fastify SDKs, self-serve, EU data residency option — relevant for health data) vs alternatives. Owner supplies DSN.
- **Then:** frontend `instrumentation.ts` + `app/error.tsx`/`global-error.tsx` report with PHI-safe scrubbing (strip URLs' query strings — capability tokens; no request bodies); backend Fastify error hook → Sentry with the same redaction; release tagging = git SHA; source-map upload OFF until reviewed (audit flagged public source-map exposure as a gate).
- **Acceptance:** thrown test error in staging appears in dashboard with release tag and NO token/PHI in the event payload.

### 6. Integration + E2E green (Sonnet; BLOCKED on Docker Desktop running)
- **Step 1:** `docker compose up -d postgres-test` → `pnpm --filter backend test:db:setup` → `pnpm --filter backend test:db`. Triage the 17 failures + 15 cancelled from the audit run — classify each: (a) stale test vs new behavior (SEC-002 guard, SEC-001b scoping, RS256-only will have broken assumptions), (b) env/config, (c) REAL regression. Fix (a) by updating tests to assert the NEW (correct) behavior; escalate (c) to Fable immediately.
- **Step 2:** QA-001 — make `playwright.config.ts` hermetic: start isolated Postgres (compose), run migrations + seed deterministic accounts (patient/doctor/admin with 2FA pre-enrolled or trusted-device pre-seeded), start backend, start frontend via `node .next/standalone/server.js` (NOT `next start` — standalone output), then run the suite. Auth E2E must cover the NEW login flow (email OTP screen).
- **Acceptance:** `pnpm --filter backend test:db` 0 fail; `CI=true pnpm e2e` green locally.

### 7. CI-001 — CI gates (Sonnet, Medium; do AFTER item 6 so the E2E gate has something green to run)
Extend `.github/workflows/ci.yml` (keep SHA-pinned actions):
- `permissions: contents: read` at workflow top (least privilege).
- Dependency review action (PR-time) + Dependabot config (`.github/dependabot.yml`: npm weekly, grouped minor/patch, security daily).
- SAST: CodeQL (JS/TS) as a separate workflow.
- SBOM: CycloneDX generation (`@cyclonedx/cyclonedx-npm` or pnpm plugin) uploaded as artifact.
- E2E job: the hermetic suite from item 6 (postgres service container).
- `pnpm audit --audit-level=high` gate (already have gitleaks; audit needs the graph-disclosure approval — owner already implicitly approves by adding the CI step).
- **Deliberately deferred:** deploy-approval environments + artifact provenance/signing — needs Railway workflow decisions; separate task.

## Wave 3 — security refactors with product/legal input

### 8. SEC-007 — CMS CSS isolation (Opus, Medium; before untrusted CMS authors get access)
- **Now:** backend sanitizer allows `<style>` (`sanitize-html.ts` ~59); frontend scopes blog CSS by string/brace parsing (`scope-blog-html.ts` ~40) — parser-differential XSS/exfil risk.
- **Decision for owner (pick one):**
  - (a) **Drop author CSS entirely** (strip `<style>`; blog styling comes from the design system) — simplest, safest; check how many live blog posts actually use inline `<style>` first (query BlogPost content, report count).
  - (b) Real CSS parser (postcss) server-side: parse → whitelist properties/selectors → re-serialize scoped. Heavier.
  - (c) Sandbox CMS pages in an iframe with CSP. Biggest change.
- **Recommendation:** (a) if the live-content count is low; else (b).
- **Test:** fuzz corpus — nested at-rules, escaped braces, `url()` exfil attempts, `@import`, malformed selectors — sanitized output contains none.

### 9. PRIV-002 — deletion/anonymization completion (Opus + LEGAL; Medium)
- **Now:** `country-data-policy.service.ts` (~123) discards request fields; anonymization retains email, storage keys, appointments, orders, session state.
- **Legal input needed FIRST (owner books it):** per-jurisdiction retention rules — medical records typically have MANDATORY retention (e.g. 8+ years) that overrides GDPR erasure; invoices have tax retention. The code can't be written before these rules are decided. Provide legal the current field-by-field retention table (Opus generates it as step 1 — read-only audit of what anonymization keeps today).
- **Then:** implement per-country policy: revoke sessions + trusted devices, null/tombstone storage objects not under retention, scrub identity fields, keep retention-mandated clinical/invoice rows keyed to a tombstone id, write an auditable completion record (who/when/what-kept-why).
- **Test:** deletion request → assert scrubbed fields, retained-by-law fields, session revocation, completion record.

## Explicitly out of this plan (tracked elsewhere)
- Ops: credential rotation, backups/restore drill, Railway env vars, prod deploy + migrate/backfill runs (owner, go-live checklist).
- Live verification sweep (TLS/headers/CSP/CORS/smoke) — needs deployed URL; run at deploy time.
- Corporate-invite consent gap + `CORPORATE_ADMIN` 2FA question — product decisions, one-line changes once answered.

## Suggested order
Fresh session per wave. Wave 1: 1 → 2 → 3 → 4a → 4b (4c its own session). Wave 2: owner starts Docker + picks provider → 6 → 5 → 7. Wave 3: 8 after owner picks a/b/c; 9 after legal.
