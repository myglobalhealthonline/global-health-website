# Manual browser test — session 2026-05-18

Covers what landed in commits `48d298d`…`4dd6512`:

1. Doctor photo render fix (`48d298d`, `a189f29`, `875cec1`)
2. New brand logos + favicon (`fedb049`, `c347642`, `1e0f60b`)
3. FlagBadge ISO resolution for admin-added countries (`cf38ab1`)
4. Per-country sidebar toggles + "Pages" controller (`2463eb7`, `4dd6512`)
5. Portal role lockdown — admins can't peek at `/doctor` or `/account` (`087e71c`)

## Prep

- [ ] Wait until Railway finishes deploying the backend after the most recent push (look for `[ensure-schema] applied/skipped: Country.enabledFeatures` in the backend logs).
- [ ] Hard-refresh once: **Ctrl + Shift + R** on the production frontend URL to bust the favicon and logo cache.
- [ ] Have three accounts ready: 1 ADMIN, 1 DOCTOR, 1 PATIENT. Keep three browser profiles or use incognito windows so cookies don't bleed across roles.

---

## Area 1 — Doctor profile photo

### 1.1 Existing photo renders in doctor portal
- [ ] Log in as **DOCTOR**.
- [ ] Visit `/doctor/profile`.
- [ ] In the "Profile photo" card, the existing image appears inside the 128×128 circle.

**Pass if:** A real cropped image fills the circle.
**Fail if:** The circle shows "rofile" text, a broken-image icon, or only the brand gradient with initials when a photo was previously uploaded.

### 1.2 Upload a new photo (doctor portal)
- [ ] On `/doctor/profile`, click **Replace photo** → pick a JPEG ≤5 MB.
- [ ] Watch the button label change to **Uploading…** then settle on **Replace photo**.
- [ ] The circle immediately shows the new image (no page refresh needed).
- [ ] DevTools Network tab: request to `/api/doctor/profile/photo` returns **200** with `{ ok: true, data: { key, path, publicUrl } }`.
- [ ] Subsequent request for `${NEXT_PUBLIC_API_URL}/api/media/media/doctors/<doctorId>/<uuid>-<filename>` returns **200** (NOT 400, NOT 404).

### 1.3 Same doctor's photo shows on the admin doctor detail page
- [ ] Log in as **ADMIN** (different browser profile).
- [ ] Visit `/admin/doctors` → click the doctor you just updated.
- [ ] The "Profile image" tile shows the new photo.

### 1.4 Same doctor's photo shows on the public profile
- [ ] Open an incognito window (no auth).
- [ ] Navigate to `/{country}/{lang}/doctors/{doctor-slug}`.
- [ ] The doctor's photo loads on the public profile card.

### 1.5 Remove + restore
- [ ] Back in `/doctor/profile`, click **Remove**, confirm the dialog.
- [ ] The circle falls back to the green-on-green gradient initials.
- [ ] Upload a different image → circle updates.

---

## Area 2 — Brand assets

### 2.1 Public site header (light surface)
- [ ] Open `/` in a clean tab.
- [ ] Header brand area shows the **green-text** "Global Health · MEDICINE ANYTIME ANYWHERE" wordmark (NOT the green-tile placeholder "g" badge).
- [ ] Wordmark height is roughly 44 px and proportional.

### 2.2 Mobile drawer
- [ ] Resize the window to < 768 px or use DevTools device toolbar.
- [ ] Tap the hamburger → drawer opens.
- [ ] Top of drawer shows the **green-text** wordmark (drawer is white).

### 2.3 Admin sidebar (dark surface)
- [ ] Visit `/admin` (logged in as admin).
- [ ] Top of the dark sidebar shows the **white-text** wordmark, NO CSS-inverted look (text + the EKG line should look properly designed, not posterized).

### 2.4 Doctor + patient sidebars
- [ ] As **DOCTOR**, visit `/doctor` — same white-text wordmark in the dark sidebar.
- [ ] As **PATIENT**, visit `/account` — same white-text wordmark.

### 2.5 Footer (dark surface)
- [ ] Public site → scroll to bottom.
- [ ] "Global Health" wordmark (white) lives in the footer brand block, NOT clipped inside a circular avatar.

### 2.6 Favicon (browser tab)
- [ ] Tab icon shows the globe-only mark, not the old default Next.js icon, not the old "g" tile.
- [ ] DevTools → Application → Manifest / Service Worker shows `/icon.png` is served (Status 200).
- [ ] iOS-only (optional): add to home screen → icon matches the globe.

### 2.7 Old assets gone
- [ ] DevTools → Network → filter `logos/global-health-official` → no requests fire.
- [ ] Same for `global-health-logo-placeholder.svg` and `global-health-wordmark-temp.svg`.

---

## Area 3 — Flag rendering for admin-added countries

### 3.1 Dashboard "Country health" table
- [ ] Log in as **ADMIN**, visit `/admin`.
- [ ] In the "Country health" panel, every row's country cell shows a real flag — including **Brazil** (🇧🇷) and **Malta** (🇲🇹).
- [ ] No row should show the green gradient placeholder rectangle.

### 3.2 Topbar country picker
- [ ] Click the country picker in the admin topbar → open the dropdown.
- [ ] Each country option has its real flag rendered next to its name (Brazil + Malta included).

### 3.3 Add a new country with a common name
- [ ] Visit `/admin/countries` → **New country**.
- [ ] Create one with name **Germany**, slug **germany**, code **de**.
- [ ] Return to `/admin` — Germany row in "Country health" shows the German flag (🇩🇪).

### 3.4 Edge case — unknown slug
- [ ] Create a country with slug `lemuria` (no real ISO match), name `Lemuria`.
- [ ] The row falls back to the brand gradient placeholder rather than rendering a wrong flag.

---

## Area 4 — Per-country sidebar toggles ("Pages")

> Requires the Railway redeploy to have applied the schema patch. If `Country.enabledFeatures` doesn't exist yet, every list will be empty and you'll see "Could not load countries". Wait for the redeploy.

### 4.1 New sidebar entry
- [ ] As **ADMIN**, pick a country from the topbar (e.g. Ireland).
- [ ] Sidebar's COUNTRY section now starts with **Pages** (with a layered-icon), followed by Country home, Country content, Page content, Services, etc.
- [ ] The old "Pages" item is now labelled **Page content**.

### 4.2 Pages screen renders
- [ ] Click **Pages** → land on `/admin/country-features`.
- [ ] Page header says "Pages" with country name in the description.
- [ ] Card shows the active country with its flag + "9 of 9 pages enabled".
- [ ] Table lists 9 rows: Country home, Country content, Page content, Services, General consultations, Specialist consultations, Online prescriptions, Health tests, Appointments.
- [ ] Every toggle is **ON** by default.

### 4.3 Toggle a single feature off
- [ ] Flip **Health tests** off.
- [ ] Success banner appears.
- [ ] Sidebar no longer shows "Health tests" under the active country.
- [ ] Direct URL `/admin/health-tests` still loads (it's just hidden from the nav, not access-gated).
- [ ] Card counter updates: "8 of 9 pages enabled".

### 4.4 Toggle it back on
- [ ] Flip **Health tests** on again.
- [ ] Sidebar gets it back. Counter says "9 of 9".

### 4.5 Pages controller itself stays visible
- [ ] Flip **every other** feature off, one by one.
- [ ] Sidebar should be left with just "Pages" — the controller cannot be hidden by itself.
- [ ] Flip them all back on so the country isn't crippled.

### 4.6 Per-country isolation
- [ ] Pick **Czechia** from topbar → confirm everything is enabled there.
- [ ] Flip **Online prescriptions** off for Czechia.
- [ ] Switch topbar back to **Ireland** → "Online prescriptions" should still be visible for Ireland (toggles are per-country, not global).

### 4.7 No country selected
- [ ] In the topbar, clear the country (click "Global" / "All countries" — whichever the picker offers).
- [ ] The COUNTRY section in the sidebar should dim (greyed out, unclickable). "Pages" included.

---

## Area 5 — Portal role lockdown

### 5.1 Admin attempts `/doctor`
- [ ] Logged in as **ADMIN**, type `/doctor` in the address bar → Enter.
- [ ] Browser redirects to `/admin`. Final URL ends in `/admin`.

### 5.2 Admin attempts `/account`
- [ ] Same browser, navigate to `/account`.
- [ ] Redirects to `/admin`.

### 5.3 Doctor attempts `/account`
- [ ] Log in as **DOCTOR**.
- [ ] Navigate to `/account`.
- [ ] Redirects to `/doctor`.

### 5.4 Doctor attempts `/admin`
- [ ] Same doctor session, navigate to `/admin`.
- [ ] Redirects to `/doctor` (existing behaviour — should still hold).

### 5.5 Patient attempts `/admin` and `/doctor`
- [ ] Log in as **PATIENT**.
- [ ] `/admin` → redirects to `/account`.
- [ ] `/doctor` → redirects to `/account`.

### 5.6 Unauthenticated
- [ ] Sign out everywhere, hit `/admin`, `/doctor`, `/account` in turn.
- [ ] Each should land on `/login?next=<original-path>`.

---

## When you find a bug

Format each finding like:

```
[Area X.Y]  Headline
Steps:
  1. …
  2. …
Expected: …
Actual:   …
Screenshot / network response / console error if relevant.
```

Drop the list back into chat — me triage + fix.
