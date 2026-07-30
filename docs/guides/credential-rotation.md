# C9 — Credential Rotation Checklist

> **Status**: OPEN — complete before next external pentest / public launch.

All items below must be done in Railway dashboard + local `.env` update.
Credentials were potentially exposed in dev `.env` files shared with local
developers who pointed at the production Railway DB.

---

## Railway dashboard (https://railway.app → project settings)

| Secret | Action | Notes |
|--------|--------|-------|
| Postgres password | Regenerate in Railway → Postgres → Settings | Update `DATABASE_URL` in all services |
| `S3_ACCESS_KEY_ID` | Rotate in Scaleway IAM → API keys | Update in Railway backend service env |
| `S3_SECRET_ACCESS_KEY` | Same as above | — |
| `STRIPE_WEBHOOK_SECRET` | Rotate in Stripe dashboard → Webhooks → reveal + roll | Update Railway env |
| `AUTH_JWT_SECRET` | Generate: `openssl rand -base64 48` | Update Railway env — invalidates all active sessions |
| `CRON_SECRET` | Generate: `openssl rand -base64 32` | Update Railway env + any external cron caller |

## Admin account

| Action | Where |
|--------|-------|
| Change `kinghassaan99@gmail.com` admin password | Admin panel → Users → edit |
| Remove `SEED_ADMIN_EMAIL` from Railway env vars | Railway backend service env |
| Remove `SEED_ADMIN_PASSWORD` from Railway env vars | Railway backend service env |

The server will **refuse to boot in production** if `SEED_ADMIN_EMAIL` is still
set to `kinghassaan99@gmail.com` (guard added in `backend/src/config/env.ts`).

## Local dev `.env` files

- Remove any Railway production `DATABASE_URL` from local `backend/.env`.
- Use a local Postgres instance or Railway's "Connect locally" feature
  (which creates a short-lived TCP proxy with a separate credential).
- Never share a `.env` file containing production secrets via Slack, email,
  or any channel — use Railway's variable management UI to share config.

## PHI encryption key

Once credentials above are rotated, enable PHI encryption for government ID
fields:

```bash
# 1. Generate a key
openssl rand -base64 32

# 2. Set PHI_ENCRYPTION_KEY in Railway env
# 3. Run the backfill once (encrypts existing plaintext rows)
PHI_ENCRYPTION_KEY=<key> pnpm --filter backend ts scripts/encrypt-phi-backfill.ts
```

See `backend/.env.example` for full documentation.
