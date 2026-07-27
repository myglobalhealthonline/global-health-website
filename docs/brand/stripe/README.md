# Stripe branding assets

Transparent-background Global Health marks, sized for Stripe's Dashboard
branding slots. Generated from `docs/design-fetch/global-health-design-system/
project/assets/brand/logo-full-color.png`.

## Upload these

Dashboard → **Settings → Business → Branding**, per Stripe account.

| Slot | File | Why |
|---|---|---|
| Logo | `gh-stripe-logo-horizontal-on-dark.png` | Checkout renders the header logo at roughly 44px tall on the brand-colour panel. The stacked lockup puts the wordmark at about a fifth of that and it turns to mush; side-by-side gives the wordmark most of the height. White wordmark so it reads on forest. |
| Icon | `gh-stripe-icon-512.png` | Square globe, white grid. Used where the surface is the brand colour. |

## Colours

| Setting | Value | Token |
|---|---|---|
| Brand color | `#1D4B36` | `--color-brand-primary` (forest deep) |
| Accent color | `#B0F122` | `--color-brand-accent` (brand lime) |

Brand color is the big one — it drives the Checkout summary panel that is
currently Stripe's default green. It is **not settable from the API**; hosted
Checkout takes it from the Dashboard only.

## Do this on every account

One-off payments route to a per-country Stripe account (`backend/src/lib/
stripe/client.ts`): `pt` → Portugal, `cz` → Czech, everything else → Ireland.
Branding is per account, so brand all three or PT/CZ patients still get the
green page. If `STRIPE_SECRET_KEY_PT` / `_CZ` are unset that market falls back
to the Ireland account, and therefore to Ireland's branding.

## The other files

| File | Use |
|---|---|
| `gh-stripe-logo-horizontal.png` | Horizontal lockup, forest wordmark — light surfaces |
| `gh-stripe-logo-1024-on-dark.png` | Stacked lockup, white wordmark — dark surfaces, large only |
| `gh-stripe-logo-1024.png` | Stacked lockup, forest wordmark — invoices, receipts, letterhead |
| `gh-stripe-icon-512-on-light.png` | Square globe, forest grid — light surfaces |
| `_preview.png` | Every asset on forest and on white, plus a Checkout panel mock |

## Regenerating

`python make-stripe-assets.py` (in this folder; needs Pillow). Two traps if you
redo this by hand:

1. The ECG trace inside the globe is white, and so are the grid lines — keying
   every white pixel guts the mark.
2. Those grid lines **touch** the outer white background at the globe's edge,
   so even a flood fill from the border leaks inward along them and hollows the
   globe out. You only see the damage once the result sits on a non-white
   background.

The script fills inward from the border, stops at solid artwork, then restores
anything cleared inside the globe — located as the convex span of the lime
pixels, which excludes the dark ECG tail hanging off to the left.
