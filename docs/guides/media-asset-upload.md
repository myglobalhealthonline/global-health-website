# Media asset upload guide (Railway bucket)

This project stores uploaded binaries in a **private Railway bucket** (S3-compatible) and serves them publicly via the backend **`GET /api/media/*`** proxy.

## Backend environment (Railway)

Reference: Railway **Storage Buckets** docs ([guide](https://docs.railway.com/guides/storage-buckets-guide)).

1. Create or select your bucket and link credentials to the **backend** service (Variables → variable references / AWS SDK preset).
2. Ensure these resolve at runtime (Railway preset aliases map automatically — see `backend/src/config/env.ts`):

   - **`S3_ENDPOINT`** — typically `https://storage.railway.app`
   - **`S3_REGION`** — often `auto`
   - **`S3_BUCKET`** — bucket name
   - **`S3_ACCESS_KEY_ID`** / **`S3_SECRET_ACCESS_KEY`**
3. **`PUBLIC_MEDIA_ORIGIN`** — HTTPS origin of the API **without trailing slash** (e.g. `https://backend-xxxx.up.railway.app`). Keeps upload JSON aligned behind proxies.

## Frontend environment

- **`NEXT_PUBLIC_API_URL`** — must point at the same API origin used for `/api/media/…` URLs so:

  - `next/image` `remotePatterns` include your API host (`frontend/next.config.ts`).
  - Trusted CMS URLs include that host (`frontend/lib/content/asset-media-url.ts`).
- **`NEXT_PUBLIC_MEDIA_ALLOWED_HOSTS`** (optional) — comma-separated extra hostnames if media URLs ever use another approved HTTPS origin.

## Uploading from Admin → Assets

1. Log in as **ADMIN**.
2. Open **Assets** → **New asset** (or edit an existing row).
3. Use **Upload image to bucket** — JPEG, PNG, WebP, GIF, or SVG, **max 5 MB**.
4. The form fills **Path or URL** with the JSON response `publicUrl` (`https://…/api/media/media/<uuid>-<filename>`).
5. Save with:

   - **Kind**: `IMAGE` or `LOGO` as appropriate.
   - **Key**: must match a slot from `frontend/lib/content/public-asset-slots.ts` (see below).
   - **Alt text**: required for `IMAGE` / `LOGO`; use accurate, approval-safe wording.

## Recommended asset keys

Canonical keys live in **`frontend/lib/content/public-asset-slots.ts`**.

**Global**

- `site-logo` — header/footer wordmark replacement.
- `footer-cta` — optional visual on the green footer CTA strip.
- `homepage-hero` — `/` landing hero image.

**Ireland `/home`**

- `ireland-hero`
- `ireland-doctor-spotlight`
- `ireland-home-delivery`
- `ireland-cta` (final on-page booking CTA visual; falls back to `footer-cta` if unset)
- Partner logos: `partner-logo-level-health`, `partner-logo-ip`, `partner-logo-pharmacy`, `partner-logo-doctify`
- Trust row images: `trust-licensed`, `trust-secure`, `trust-fast-access`, `trust-europe`

**Doctors / team (optional)**

- `doctor-dr-khoiamul-islam`, `doctor-dr-mirza-aun-mohammad`, `ireland-clinic-team`

## How the URL is used

- Only **active** assets from **`GET /api/assets`** are merged into pages.
- Paths must pass **`resolveTrustedAssetUrl`**: same-site **`/…`** paths **or** **`https://`** URLs on the allowed API host whose pathname starts with **`/api/media/`**.
- Unsafe paths, inactive rows, or mismatched hosts → **template falls back** to existing local SVGs.

## Fallback behaviour

- `/home` hero defaults to `/images/hero/ireland-hero-ai.svg` when `ireland-hero` is missing.
- Doctor spotlight falls back to `/images/ireland/doctor-spotlight-ai.svg`.
- Home delivery falls back to `/images/ireland/home-delivery-ai.svg`.
- Partner band **does not render** until at least one partner logo asset exists (no dashed placeholders).

## Compliance warning

Do **not** upload clinical imagery, doctor portraits, or partner marks **without written approval**. Use only business-exported or rights-cleared files. Do **not** hotlink **Wix** or third-party CDNs in asset paths.

## Smoke checks

1. Upload PNG/JPEG/WebP/SVG in Admin → confirm **`GET`** on returned `/api/media/…` returns `200` with correct `Content-Type`.
2. Create asset row with a recommended **key** → reload `/home` → image replaces placeholder where wired.
3. Deactivate asset or delete path → page shows **fallback** SVG again.
