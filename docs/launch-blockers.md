# Remaining Launch Blockers

> **Updated 2026-06-10.** Earlier versions of this file claimed payments,
> the doctor portal, and password reset were out of scope. All three are
> shipped and live. See `README.md` "What is shipped" and
> `docs/audits/repo-review-findings-2026-06-10.md` for current status.

These items require business, legal, or deployment-owner completion before
production go-live. They are **operational/sign-off** items, not missing
features.

- Official logo/brand assets final approval and replacement of temporary placeholders.
- Final legal/clinical copy sign-off for medical and policy pages.
- Production PostgreSQL instance provisioned and reachable from backend runtime.
- First production `ADMIN` account created and credentials handed over securely.
- Production `CORS_ALLOWED_ORIGINS` finalized to exact frontend/admin origins.
- **Credential rotation** — complete `docs/security/credential-rotation.md`
  (C9): rotate Railway Postgres password, S3 keys, Stripe webhook secret,
  JWT secret; change/remove the seed admin account.
- **PHI encryption** — set `PHI_ENCRYPTION_KEY` in production and run
  `scripts/encrypt-phi-backfill.ts` once to encrypt existing government-ID rows (H18).

## Shipped (previously listed as blockers)

- ✅ Stripe payments + webhooks (idempotent) — live.
- ✅ Doctor portal (`/doctor`) — live.
- ✅ Password-reset flow (hashed tokens, email delivery, expiry) — live.
- ✅ Admin CRUD across all entities — live.
