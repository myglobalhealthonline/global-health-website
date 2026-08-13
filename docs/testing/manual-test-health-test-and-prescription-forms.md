# Manual test — Health Test + Online Prescription admin forms

Covers the cleanup that landed for `/admin/health-tests` and
`/admin/online-prescriptions` after the form review.

## Prep

- [ ] Log in as ADMIN on the deployed site.
- [ ] Pick a country in the topbar (Ireland is fine for the seed data).
- [ ] Confirm "Health tests" and "Online prescriptions" both appear in
      the country-scoped sidebar (they're toggleable in /admin/country-
      features, so re-enable them there if missing).

---

## Area A — Health Test form

### A.1 Form fields are tidy
- [ ] Open `/admin/health-tests` → **+ New health test** → pick country
      → land on the create form.
- [ ] Visible fields (in order): Slug, Title, Short description, Price,
      Currency, Sample type, Results timeline, Product image,
      **Gallery images** (multi-image picker, up to 12), **Stock**,
      Sort order, SEO title, SEO description, "Health test active"
      checkbox.
- [ ] **NOT visible** (no public surface renders them yet): Hero button
      label, Detail intro, What this test covers, Why get tested,
      Extra sections, Legacy path.

> The legacy detail fields aren't editable from the form. PATCH is
> partial, so existing column values in the DB are preserved across
> edits — they just don't surface in the UI until a per-test detail
> page ships.

### A.2 Required-field validation surfaces clearly
> Note: Browser-level (HTML5) validation runs before the server. Empty
> slug/title/etc. get a native browser tooltip ("Please fill out this
> field") instead of a server banner — that's the expected, faster UX.
> Server messages only appear for things the browser can't pre-check
> (e.g. missing image upload).

- [ ] Hit **Create health test** with everything blank → browser
      tooltip on the first invalid field.
- [ ] Fill title + price + currency but **leave the image empty** →
      submit → page reloads with a friendly banner
      "Product image is required" (no Zod jargon).
- [ ] Upload a product image, fill the rest, submit → redirects to the
      health-test detail page with a green "Health test created" banner.

### A.3 Stock field behaviour
- [ ] Create a test with **Stock = blank** → save → re-open in edit →
      Stock field is empty (unlimited).
- [ ] Create another with **Stock = 0** → public listing should show a
      red "Sold out" pill and a disabled button.
- [ ] Edit it to **Stock = 3** → public listing shows an amber
      "Only 3 left" pill.
- [ ] Edit to **Stock = 50** → public listing shows neither badge.

> Public listing path is `/{country}/{lang}/tests`. Open in an incognito
> tab to bypass cache and confirm.

### A.4 Stock rejects bad input
> The Stock input is `type="number" min="0"`, so the browser blocks
> `-1` / `abc` / `1.5` natively (no round-trip). Server-side validation
> backs the same rules with friendly messages — exercise it via the
> API or `fetch('/api/admin/health-tests/<id>', { method: 'PATCH', … })`
> if you want to confirm.

- [ ] Type `-1` into Stock → browser refuses to accept it on blur /
      submit.
- [ ] Type `1.5` → browser rounds or rejects depending on the OS.
- [ ] (API call) PATCH `{ stock: -1 }` → response message
      "Stock must be zero or greater".
- [ ] (API call) PATCH `{ stock: 1.5 }` → response message
      "Stock must be a whole number (no decimals)".
- [ ] (API call) PATCH `{ stock: "abc" }` → response message
      "Stock must be a whole number".

### A.5 Edit doesn't destroy hidden data
- [ ] If you already have a real health test with non-null
      `detailIntro` / `whatThisTestCovers` etc. in the DB:
  - Open in edit → change only the title → save.
  - Re-query the DB (or hit the admin detail page at
    `/admin/health-tests/<id>`) and confirm the legacy fields still have
    their old values.

### A.7 Gallery multi-image round-trip
- [ ] Create or edit a health test → scroll to **Gallery images**.
- [ ] Click **Add an image** → pick a JPEG → it appears as a tile.
- [ ] Click **Add image** (the dashed slot to the right) → pick another
      file → second tile appears.
- [ ] Hover a tile → use the trash button to remove the middle tile →
      remaining tiles re-flow.
- [ ] Hover a tile → use the upload button to replace it with a different
      file → preview swaps.
- [ ] Counter at the top right of the field reads `N / 12`.
- [ ] Save the form → re-open the same test in edit → all the gallery
      tiles persist with the right preview images, in the order saved.
- [ ] Public `/{country}/{lang}/tests` listing **unchanged** — only the
      hero image renders today, gallery is parked for a future detail
      page.

### A.6 Public listing reads the new stock value
> Public `/tests` is cached by tag (`country:<code>:health-tests`).
> The admin save action calls `revalidateTag(…, "max")` so the next
> request rebuilds the route. No incognito needed — a normal hard
> refresh in the same tab will pick up the new data.

- [ ] Save a stock change in `/admin/health-tests/<id>/edit`.
- [ ] In another tab, hard-refresh `/{country}/{lang}/tests` (Ctrl + F5
      / Cmd + Shift + R).
- [ ] Card reflects the latest stock (badge state, Sold-out CTA, etc.).

> Dev-only gotcha: if you create a test via API (not the admin form),
> the tag never gets busted — the cache stays stale. Either use the
> admin form, or restart the dev server.

---

## Area B — Online Prescription form

> Online prescriptions reuse `/admin/services` filtered to
> `kind=PRESCRIPTION`. The form is shared with general/specialist
> services but the prescription view hides the irrelevant bits.

### B.1 Form fields are tidy
- [ ] `/admin/online-prescriptions` → **+ New** → land on
      `/admin/services/new?kind=PRESCRIPTION`.
- [ ] Visible fields: Country (pinned if you came from the listing),
      "This record will publish under Online prescriptions" notice,
      Slug, Title (name), Summary, Sort order, Duration (minutes),
      Starting price, Currency code, Hero image, **Gallery images**
      (multi-image picker, up to 12), "Service active" checkbox.
- [ ] **NOT visible** for the PRESCRIPTION kind: Category selector
      (only applies to Specialist consultations), Hero title, Hero
      description, CTA label, Detail body, Legacy path.

### B.1a Gallery multi-image round-trip
- [ ] Same flow as A.7 but on the prescription form.
- [ ] Save → re-open in edit → gallery tiles persist with previews.
- [ ] Public `/{country}/{lang}/prescriptions` still renders just the
      hero — gallery is saved for a future detail page.

### B.2 Validation
> Same HTML5-first behavior as A.2 — browser blocks empty required
> fields before they hit the server. That's expected.

- [ ] Submit blank → browser tooltip on the first invalid field.
- [ ] Fill name + slug + currency + price → submit → redirects to the
      service detail page with a success message.
- [ ] Public listing path: `/{country}/{lang}/prescriptions`. New
      prescription appears as a card with name, summary, duration pill,
      price pill, and "Add to cart" button (after a hard refresh — same
      revalidateTag pattern as A.6).

### B.3 Same form unchanged for General / Specialist consultations
- [ ] `/admin/general-consultations` → **+ New** → same form, no
      Category selector, no surprises.
- [ ] `/admin/specialist-consultations` → **+ New** → same form, but
      the Category dropdown is now required.

---

## When you find a bug

Format each finding like:

```
[A.X | B.X]  Headline
Steps:
  1. …
  2. …
Expected: …
Actual:   …
Screenshot / error / console output if relevant.
```

Drop the list back into chat and me'll triage + fix.
