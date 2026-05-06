# Asset Inventory

Audit date: 2026-05-06

## Asset Replacement Plan — /home (Ireland)

### How Assets Flow Through the System

1. **Upload**: Admin navigates to `/admin/assets/new` → clicks "Upload image to bucket" → file goes to `POST /api/admin/media/upload` → stored in Railway Bucket (S3-compatible) → returns public URL like `https://<backend>/api/media/media/<uuid>-<filename>`
2. **Store metadata**: Admin fills `kind`, `key`, `path` (the public URL), `altText`, `usageNote`, `countryId` (Ireland) → saved to Prisma `Asset` table via `POST /api/admin/assets`
3. **Serve**: Public pages request `GET /api/media/<key>` → backend streams from S3 with `Cache-Control: public, max-age=31536000, immutable`
4. **Frontend render**: Components use `<Image src={asset.path} alt={asset.altText} />` where `asset.path` is the bucket URL

### Required Environment Variables

| Variable | Location | Purpose | Status |
|----------|----------|---------|--------|
| `NEXT_PUBLIC_API_URL` | Frontend `.env.local` | Points to backend for upload API | ✅ Set to `http://localhost:4000` locally |
| `S3_BUCKET` / `BUCKET` | Backend `.env` | Railway bucket name | ⚠️ Must be set in Railway dashboard |
| `S3_ENDPOINT` / `ENDPOINT` | Backend `.env` | S3-compatible endpoint | ⚠️ Must be set in Railway dashboard |
| `S3_REGION` / `REGION` | Backend `.env` | Bucket region | ⚠️ Must be set in Railway dashboard |
| `S3_ACCESS_KEY_ID` / `ACCESS_KEY_ID` | Backend `.env` | Bucket access key | ⚠️ Must be set in Railway dashboard |
| `S3_SECRET_ACCESS_KEY` / `SECRET_ACCESS_KEY` | Backend `.env` | Bucket secret | ⚠️ Must be set in Railway dashboard |
| `PUBLIC_MEDIA_ORIGIN` | Backend `.env` | Public origin for media URLs (optional) | ⚠️ Set if backend is behind proxy |

### Asset Replacement Checklist

| # | Asset Key | Desired File Type | Recommended Dimensions | Where It Appears | Current Fallback | Launch Priority | Business Approval Required |
|---|-----------|-------------------|------------------------|------------------|------------------|-----------------|---------------------------|
| 1 | `site-logo` | SVG or PNG with transparency | 220×54px (header), 400×100px (footer) | Header, mobile nav, footer | `global-health-wordmark-temp.svg` + stethoscope icon | **BLOCKER** | ✅ Yes — final brand identity |
| 2 | `ireland-hero` | JPG or WebP (photo) | 1600×900px (desktop), 800×600px (mobile crop) | `/home` hero right panel | `ireland-hero-ai.svg` (abstract green blobs) | **BLOCKER** | ✅ Yes — Wix export or commission |
| 3 | `ireland-doctor-spotlight` | JPG or WebP (photo) | 900×1100px (portrait) | `/home` doctor profile section | `doctor-spotlight-ai.svg` (abstract arch) | **BLOCKER** | ✅ Yes — Dr. Khoiamul Islam headshot |
| 4 | `ireland-home-delivery` | JPG or WebP (photo) | 1200×900px | `/home` home delivery section | `home-delivery-ai.svg` (abstract shapes) | **BLOCKER** | ✅ Yes — Wix export or commission |
| 5 | `ireland-cta` | JPG or WebP (photo) | 480×304px (footer CTA) | Shared footer CTA | `footer-cta-ai.svg` (abstract phone) | **BLOCKER** | ✅ Yes — Wix export or commission |
| 6 | `partner-logo-level-health` | SVG or PNG | 160×64px | `/home` partner band | Dashed placeholder slot | **PENDING** | ✅ Yes — business must provide file |
| 7 | `partner-logo-ip` | SVG or PNG | 160×64px | `/home` partner band | Dashed placeholder slot | **PENDING** | ✅ Yes — business must provide file |
| 8 | `partner-logo-coombe-pharmacy` | SVG or PNG | 160×64px | `/home` partner band | Dashed placeholder slot | **PENDING** | ✅ Yes — business must provide file |
| 9 | `partner-logo-doctify` | SVG or PNG | 160×64px | `/home` partner band | Dashed placeholder slot | **PENDING** | ✅ Yes — business must provide file |

### Upload Steps (When Assets Are Available)

```
1. Log in as admin → /admin/assets/new
2. Select Country: Ireland
3. Select Kind:
   - site-logo → LOGO
   - ireland-hero → IMAGE
   - ireland-doctor-spotlight → IMAGE
   - ireland-home-delivery → IMAGE
   - ireland-cta → IMAGE
   - partner-* → LOGO
4. Enter Key: e.g. "ireland-hero"
5. Click "Upload image to bucket" → select file → wait for URL
6. Fill Alt text: e.g. "Doctor consulting with patient via video call"
7. Fill Usage note: e.g. "Ireland /home hero section — replaces AI illustration"
8. Save
9. Update frontend code to reference the new asset path (or wire CMS lookup)
```

### Current CMS Asset Table Status

| Check | Result |
|-------|--------|
| `Asset` model in Prisma schema | ✅ Exists with `kind`, `key`, `path`, `altText`, `countryId`, `isActive` |
| `AssetKind` enum | ✅ IMAGE, ICON, LOGO, BADGE, SOCIAL |
| Admin assets API (`/api/admin/assets`) | ✅ CRUD endpoints exist |
| Admin media upload (`/api/admin/media/upload`) | ✅ POST endpoint exists (requires S3 env vars) |
| Public media serve (`/api/media/*`) | ✅ GET endpoint exists (requires S3 env vars) |
| Admin UI (`/admin/assets`) | ✅ List, create, edit, upload UI exists |
| Upload component (`AssetPathWithUpload`) | ✅ Integrates with `NEXT_PUBLIC_API_URL` |

### Bucket/Media System Verification

| Check | How to Verify | Expected Result |
|-------|---------------|-----------------|
| Backend has S3 env vars | `echo $S3_BUCKET $S3_ENDPOINT` in Railway shell | All 5 vars set |
| Upload endpoint reachable | `POST /api/admin/media/upload` with auth cookie | Returns `{ok:true, data:{key, publicUrl}}` |
| Public media reachable | `GET /api/media/media/<uuid>-<filename>` | Returns image with `Cache-Control` header |
| Frontend can upload | Admin clicks "Upload image to bucket" | File uploads, path field populated |

### Notes

- **No Wix assets were hotlinked.**
- **No stock photography was introduced.**
- **All people visuals are illustrative** and should not be interpreted as real doctors or patients.
- Partner logo slots are rendered with dashed-border placeholders until approved assets are provided.
- The `@@unique([kind, key])` constraint means each `kind + key` pair can only exist once. Use country-scoped keys like `ireland-hero` rather than generic `hero`.

## Can Remain As Illustration (Non-Blocking)

| Asset Path | Usage Location | Notes | Status |
|------------|---------------|-------|--------|
| `frontend/public/images/hero/homepage-hero-ai.svg` | `/` global landing hero | Abstract illustration acceptable for global landing | Temporary acceptable |
| `frontend/public/images/hero/country-home-hero-ai.svg` | `/home-pt`, `/home-sp`, `/home-cz`, `/home-rm` | Shared across non-Ireland country pages | Temporary acceptable |
| `frontend/public/images/about/about-clinic-ai.svg` | Country about sections (if used) | Shared fallback | Temporary acceptable |
| `frontend/public/images/services/home-delivery-ai.svg` | Non-IE delivery sections | Shared fallback | Temporary acceptable |
| `frontend/public/icons/trust/*.svg` | Trust icon library | Safe abstract illustration assets | Can remain |
| `frontend/public/icons/services/*.svg` | Service icon library | Consistent line icons suitable for production | Can remain |

## Nice-to-Have (Post-Launch)

| Asset | Impact | Priority |
|-------|--------|----------|
| Custom branded icon set (replace Lucide in trust section) | Stronger brand identity | Low |
| Country flag SVGs for footer selector | Visual polish | Low |
| Animated hero illustration (Lottie) | Engagement | Low |
