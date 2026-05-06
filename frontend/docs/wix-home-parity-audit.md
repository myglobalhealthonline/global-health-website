# Wix /home Parity Audit

Audit date: 2026-05-06
Source: `https://www.myglobalhealth.online/home`
Target: `https://frontend-global-health-website.up.railway.app/home`

## 1. Deploy Status

**❌ LATEST BUILD NOT DEPLOYED**

Screenshots captured 2026-05-06 from Railway show the OLD build. All sections that were removed in the parity pass are still visible:

- About section ✅ still visible
- Specialist Consultations grid ✅ still visible
- How it works ✅ still visible
- Ireland medical team cards ✅ still visible
- Ireland clinic FAQs ✅ still visible
- Partner logo placeholder band ❌ missing
- Trust section still shows "4.9/5 average rating" ✅ still visible

**Action required:** Railway deployment needs to be triggered. The code changes are committed and build passes locally (113 pages). Once Railway deploys the latest commit, the shortened composition will be visible.

## 2. Section Order Comparison (Code State vs Wix)

| Order | Wix Section | Hosted Before (Old Deploy) | Hosted After (Code) | Status |
|-------|-------------|---------------------------|---------------------|--------|
| 1 | Header (dark green bg, real logo) | White blurred header + temp wordmark | Same | ⚠️ PARTIAL |
| 2 | Quick tab row | Chip links | Same | ✅ CLOSE |
| 3 | Hero: "Ireland Online Medical Clinic" | Split hero with abstract SVG | Dark-framed SVG, "Ireland Online Medical Clinic" as H1 | ⚠️ PARTIAL |
| 4 | Same-Day Consultation CTA | Dark green banner | Same | ✅ CLOSE |
| 5 | (Wix: large green decorative section) | About us section | **REMOVED** | ✅ MATCH |
| 6 | (Wix: tab nav, not homepage cards) | Specialist Consultations grid | **REMOVED** | ✅ MATCH |
| 7 | (Wix: not on homepage) | How it works | **REMOVED** | ✅ MATCH |
| 8 | Home Delivery | Bordered card | Same | ✅ CLOSE |
| 9 | Partner logos (Level, IP, Pharmacy, Doctify) | Missing | **ADDED** placeholder band | ⚠️ PARTIAL |
| 10 | Doctor spotlight | Image + quote + "Doctor profile" | Same | ✅ CLOSE |
| 11 | Trust signals (4 icons) | 5 cards with fake rating | **4 cards**, no fake rating | ✅ CLOSE |
| 12 | Social proof (avatars, 4.9/5) | Combined into trust | **REMOVED** | ✅ SAFE |
| 13 | Country selector | Missing | Missing (acceptable) | ⚠️ PARTIAL |
| 14 | Footer CTA + footer | Booking CTA + footer + CTA footer | Same | ⚠️ PARTIAL |

## 3. Screenshot QA Summary

### Desktop (1440px) — Current Deploy (Old Build)
- Full page height: ~8,940px
- Contains all 5 sections that should be removed
- Trust section shows 5 cards including "4.9/5 average rating"
- No partner logo band

### Desktop (1440px) — Expected After Deploy
- Estimated page height: ~5,500px (removed About, Specialist, How it works, Medical team, FAQ)
- Trust section shows 4 cards (Licensed Doctors, Secure & Confidential, Fast Access, Available across Europe)
- Partner logo band with 4 dashed placeholder slots
- Hero H1: "Ireland Online Medical Clinic"

### Mobile (390px) — Current Deploy (Old Build)
- Full page height: ~11,794px
- Very long scroll with many card sections

### Mobile (390px) — Expected After Deploy
- Estimated page height: ~7,500px
- Significantly shorter, more focused journey

## 4. Asset Replacement Checklist

See `frontend/docs/asset-inventory.md` for full details.

| # | Asset | Priority | Business Approval |
|---|-------|----------|-------------------|
| 1 | Site logo (replace temp wordmark) | **BLOCKER** | Required |
| 2 | Ireland hero photo | **BLOCKER** | Required |
| 3 | Dr. Khoiamul Islam headshot | **BLOCKER** | Required |
| 4 | Home delivery photo | **BLOCKER** | Required |
| 5 | CTA lifestyle photo | **BLOCKER** | Required |
| 6-9 | Partner logos (4) | **PENDING** | Required |

### Upload Pipeline Status

| Component | Status |
|-----------|--------|
| `POST /api/admin/media/upload` | ✅ Exists (requires S3 env vars) |
| `GET /api/media/*` | ✅ Exists (requires S3 env vars) |
| Admin assets CRUD (`/api/admin/assets`) | ✅ Exists |
| Admin UI (`/admin/assets`) | ✅ Exists with upload component |
| `NEXT_PUBLIC_API_URL` | ✅ Set in frontend |
| S3/Railway Bucket env vars | ⚠️ Must be configured in Railway dashboard |

### Upload Steps (When Assets Are Available)

1. Log in as admin → `/admin/assets/new`
2. Select Country: Ireland
3. Select Kind: IMAGE (photos) or LOGO (brand assets)
4. Enter Key: e.g. `ireland-hero`
5. Click "Upload image to bucket" → select file → wait for public URL
6. Fill Alt text and Usage note
7. Save
8. Update frontend component to use the new asset path (or wire CMS lookup)

## 5. Remaining Visual Blockers

| Blocker | Impact | Resolution Path |
|---------|--------|-----------------|
| Railway not deployed | Cannot verify parity pass visually | Trigger Railway deployment |
| No real hero photo | Hero feels generic | Request Wix export or commission photography |
| No real doctor headshot | Doctor spotlight lacks credibility | Request clinic-approved headshot |
| No real delivery photo | Delivery section feels abstract | Request Wix export or commission |
| No real CTA photo | Footer CTA less compelling | Request Wix export or commission |
| No final logo | Header looks temporary | Request final brand asset |
| No partner logos | Partner band is placeholder only | Request logo files from business |
| S3 env vars not confirmed | Cannot test upload pipeline | Verify Railway dashboard env vars |

## 6. Files Changed (Parity Pass)

| File | Change |
|------|--------|
| `frontend/components/templates/CountryHomeTemplate.tsx` | Removed about/services/steps/doctors/faqs. Added partner band. |
| `frontend/lib/content/home-page-presenters.ts` | Simplified presenter. Added `showPartnerBand` + `partnerNames`. |
| `frontend/lib/content/template-page-data.ts` | Removed fake rating from trust items. Changed trust title. |
| `frontend/components/sections/HeroSection.tsx` | Dark green frame behind hero image, 95% opacity on SVG. |
| `frontend/components/sections/BookingCTA.tsx` | Uses CSS radius token. |
| `frontend/components/layout/CTAFooter.tsx` | Simplified layout, removed inner panel. |
| `frontend/docs/asset-inventory.md` | Full asset replacement plan with upload pipeline. |
| `frontend/docs/wix-home-parity-audit.md` | This file. |

## 7. Validation Results

| Check | Command | Result |
|-------|---------|--------|
| TypeScript | `pnpm typecheck` | ✅ Pass (0 errors) |
| Lint | `pnpm lint` | ✅ Pass (0 errors, 0 warnings) |
| Build | `pnpm build` | ✅ Pass (113/113 pages generated) |
| Backend tests | `pnpm --filter backend test` | ✅ Pass (82/82 tests) |
