# Audit 2 — Execution Plan

**Scope:** `PERFORMANCE_OPTIMIZATION_AUDIT2.md` (P-001…P-022) + `SECURITY_AUDIT2.md` (S-001…S-027).
**Model roles:** **Fable 5** owns architecture — design decisions, cross-cutting contracts, spec review, and final review gates. **Sonnet 5** owns execution — implementing well-specified changes, writing tests/migrations/docs, and running verification commands. A finding marked *design-gated* must have a Fable-approved spec before Sonnet implements it.

## 0. Prerequisites (before any implementation wave)

| # | Item | Why | Owner |
|---|---|---|---|
| 0.1 | Rotate/revoke the Make.com webhook (S-001) at the provider | Live credential in tracked history; every day it stands is exposure | Human (Hassaan) — only rotation itself; code removal is 1.3 |
| 0.2 | Stand up an isolated local/CI test Postgres so `pnpm --filter backend test` runs | 82 backend test files are currently blocked by the test guard; the RBAC/session/medical-guard work (S-003/4/5/16) cannot be safely verified without them | Sonnet 5 (docker-compose service + `.env.test`), Fable 5 reviews guard config |
| 0.3 | Pick working branch + merge base (Dev-hassaan carries uncommitted redesign work) | 27+ findings touch shared files; a dirty branch multiplies conflicts | Human decision |
| 0.4 | Add secret scanning (gitleaks) to CI now, independent of the rest of S-025 | Prevents an S-001 recurrence while the rest of the plan runs | Sonnet 5 |

## 1. Workstream map (deduplicated across both audits)

The two audits overlap heavily. Implement each row ONCE; do not run the perf and security items as separate fixes.

| Workstream | Merges findings | Design-gated? | Design owner | Implementation |
|---|---|---|---|---|
| W1 Secrets & data-flow | S-001, S-019, S-026, S-027 (+P-015 pixel part) | Partial — DPA/channel policy decisions are Fable+legal; code removal/consent gating is mechanical | Fable 5 | Sonnet 5 |
| W2 Identity & registration claiming | S-002, S-016, S-023, S-024 | Yes — pre-verification session model + atomic claim flow | Fable 5 | Sonnet 5 |
| W3 RBAC / session resolver | S-003, S-004, S-006, S-007, S-013 | Yes — single async session resolver contract (DB role, isActive, tokenVersion, 2FA assurance, country scope, capabilities) is the linchpin; everything else in W3 conforms to it | Fable 5 | Sonnet 5 |
| W4 Medical-access guard consolidation | S-005, S-014, S-015 | Yes — endpoint coverage matrix + guard-as-prehandler contract | Fable 5 | Sonnet 5 |
| W5 Outbox / worker / lifecycle | P-006, P-007, P-019, S-008 (durable audit), S-022, P-018 (shutdown part) | Yes — queue topology, idempotency keys, worker image split, advisory-lock connection pinning | Fable 5 | Sonnet 5 |
| W6 Static shell / CSP strategy | P-001, S-010, P-002, P-008, P-016 | Yes — **critical interaction:** nonce-based CSP forces dynamic rendering, which conflicts with restoring static/PPR output. One decision must cover both: static public pages get hash/report-only CSP, dynamic portals get nonce CSP. Locale slicing and cart-island scoping ride the same layout refactor | Fable 5 | Sonnet 5 |
| W7 Availability & homepage query shape | P-004, P-005, P-012, P-013 | Yes for P-005 (set-based slot materialization); P-004/P-013 are mechanical | Fable 5 (P-005 only) | Sonnet 5 |
| W8 API hygiene | P-011, P-017, P-020+S-014 (one cache-header policy), S-009, S-020, S-021, S-023 | No — audits already specify the fixes | — | Sonnet 5 |
| W9 Frontend quick wins | P-003, P-009, P-010, P-015, P-022 | No | — | Sonnet 5 |
| W10 CI / supply chain / observability | P-021+S-025 (one CI workstream), P-018 (telemetry part) | No | — | Sonnet 5 |
| W11 GDPR deletion & storage | S-017, S-018, S-011, S-012 | Yes — retention map and signing-key architecture | Fable 5 | Sonnet 5 |

## 2. Sequencing

**Wave A — immediate, parallel-safe (no design gate):** 0.1–0.4, W9 all, W8 timeout/no-store/cache-header items, S-006 env hard-fail, `MANUAL_BOOKING_COOKIE` move, readiness `/ready` endpoint, availability cache-semantics change, W1 code parts (delete webhook fallback, consent-gate pixel, WhatsApp content minimization).
**Wave B — design sprints (Fable 5, can run during Wave A):** W2, W3, W4, W5, W6 specs + W7 P-005 spec. Output: one short spec per workstream (contract, touched files, test plan) appended to this file or `docs/plans/`.
**Wave C — gated implementation (Sonnet 5, parallel by lane):** W3 first (W2 and W4 both depend on the session resolver), then W2+W4 in parallel, then W5, then W6, then W7.
**Wave D — verification:** run both audits' Manual Verification Plans; backend integration tests on the test DB (0.2); authorization matrix tests (S audit §1); bundle/analyzer budgets; RUM/Lighthouse baselines.

Lane conflict warnings for parallel Sonnet agents:
- `frontend/app/(site)/layout.tsx` and `frontend/app/layout.tsx` are touched by W6, W9 (P-015), and W1 (S-027) — one lane only, sequence internally.
- `backend/src/modules/auth/auth.service.ts` is touched by W2 and W3 — W3's resolver lands first.
- `backend/src/routes/payments.route.ts` is touched by W5 (outbox) and W8 (S-023) — sequence within one lane.

## 3. Review gates

1. Every Wave C merge requires: `pnpm typecheck && pnpm lint && pnpm build` green, backend tests green on test DB, and a Fable 5 review pass against the workstream spec.
2. W3/W4 additionally require the allow/deny authorization matrix tests passing for all six roles.
3. W5 requires a simulated slow-provider test proving webhook response time stays bounded.
4. W6 requires build-output route classification proof (static/PPR restored) AND report-only CSP telemetry before enforcement.
5. No history scrub for S-001 until rotation is confirmed (0.1).

## 4. Known context from prior rounds (do not re-fight)

- Security round-3 (11 findings) already shipped to prod 2026-07-08 (`a5f41631`); this audit's findings are the NEXT layer, not regressions of that work.
- `ADMIN_PHI_REQUIRE_REASON` is deliberately dormant — S-006's hard-fail must account for the planned enablement, not silently flip it.
- Client-side `IdleLogout` already exists and is wired into admin/portal shells; S-013's remaining gap is server-side session TTL/rotation, not the idle timer.
- `pnpm.overrides` must stay mirrored across root/frontend/backend (`scripts/check-override-drift.mjs`) — any W10 dependency work must respect this.
