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
| 1 | Header (dark green bg, real logo) | White blurred header + temp wordmark | Text lockup "Global Health / ONLINE CLINIC" | ⚠️ PARTIAL |
| 2 | Quick tab row | Chip links | Same | ✅ CLOSE |
| 3 | Hero: "Ireland Online Medical Clinic" | Split hero with abstract SVG | Split hero with HealthcareMediaFrame fallback | ✅ CLOSE |
| 4 | Same-Day Consultation CTA | Dark green banner | Same | ✅ CLOSE |
| 5 | (Wix: large green decorative section) | About us section | **REMOVED** | ✅ MATCH |
| 6 | (Wix: tab nav, not homepage cards) | Specialist Consultations grid | **REMOVED** | ✅ MATCH |
| 7 | (Wix: not on homepage) | How it works | **REMOVED** | ✅ MATCH |
| 8 | Home Delivery | Bordered card | Dark green section + HealthcareMediaFrame fallback | ✅ IMPROVED |
| 9 | Partner logos (Level, IP, Pharmacy, Doctify) | Missing | Text trust strip when no logos uploaded | ⚠️ PARTIAL |
| 10 | Doctor spotlight | Image + quote + "Doctor profile" | HealthcareMediaFrame fallback + profile card | ✅ CLOSE |
| 11 | Trust signals (4 icons) | 5 cards with fake rating | 4 cards, no fake rating | ✅ CLOSE |
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
- Partner text trust strip: "Trusted by healthcare partners across Ireland"
- Hero H1: "Ireland Online Medical Clinic"
- Home delivery: dark green background with framed fallback visual

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
| No real hero photo | Hero feels generic | Upload via admin when approved |
| No real doctor headshot | Doctor spotlight lacks credibility | Upload via admin when approved |
| No real delivery photo | Delivery section feels abstract | Upload via admin when approved |
| No real CTA photo | Footer CTA less compelling | Upload via admin when approved |
| No final logo | Header looks temporary | Upload via admin when approved |
| No partner logos | Partner band is text-only | Upload via admin when approved |
| S3 env vars not confirmed | Cannot test upload pipeline | Verify Railway dashboard env vars |

## 6. Files Changed (Parity Pass)

| File | Change |
|------|--------|
| `frontend/components/media/HealthcareMediaFrame.tsx` | **NEW** Premium fallback media component |
| `frontend/components/sections/HeroSection.tsx` | Integrated HealthcareMediaFrame for fallback detection |
| `frontend/components/templates/CountryHomeTemplate.tsx` | Delivery dark section, doctor profile card, partner trust strip |
| `frontend/lib/content/home-page-presenters.ts` | Added `partnerTrustLine` propagation |
| `frontend/lib/content/template-page-data.ts` | Added `partnerTrustLine` to all countries |
| `frontend/app/(site)/page.tsx` | Stronger root homepage copy and trust badges |
| `frontend/components/templates/BookingFormTemplate.tsx` | Stronger form card, trust sidebar, next steps styling |
| `frontend/components/layout/SiteHeader.tsx` | Text-based brand lockup when no real logo |
| `frontend/components/layout/SiteFooter.tsx` | Text-based brand lockup when no real logo |
| `frontend/docs/public-website-qa.md` | Added Visual Rescue v2 section |
| `frontend/docs/wix-home-parity-audit.md` | This file |

## 7. Validation Results

| Check | Command | Result |
|-------|---------|--------|
| TypeScript | `pnpm typecheck` | ✅ Pass (0 errors) |
| Lint | `pnpm lint` | ✅ Pass (0 errors, 0 warnings) |
| Build | `pnpm build` | ✅ Pass (113/113 pages generated) |
| Backend tests | `pnpm --filter backend test` | ✅ Pass (82/82 tests) |
