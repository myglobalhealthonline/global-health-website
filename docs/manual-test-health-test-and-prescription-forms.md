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
      Currency, Sample type, Results timeline, Product image, **Stock**,
      Sort order, SEO title, SEO description, "Health test active"
      checkbox.
- [ ] **NOT visible** (these were noise — public listing doesn't render
      them and there's no detail page): Gallery image paths, Hero
      button label, Detail intro, What this test covers, Why get tested,
      Extra sections, Legacy path.

> Why hidden but not deleted: existing rows may have data in those
> columns. Hidden inputs preserve them across saves.

### A.2 Required-field validation surfaces clearly
- [ ] Hit **Create health test** with everything blank.
- [ ] Page reloads with an error banner explaining what's missing.
- [ ] Try again with title + price + currency but **no image** → backend
      rejects with a clear message (`productImagePath` is required).
- [ ] Upload a product image, fill the rest, submit → redirects to the
      health-test detail page with a green "Health test created" toast/
      banner.

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
- [ ] Try `Stock = -1` → save fails with "Stock must be zero or greater".
- [ ] Try `Stock = abc` → save fails with "Stock must be a whole number".
- [ ] Try `Stock = 1.5` → same rejection (whole numbers only).

### A.5 Edit doesn't destroy hidden data
- [ ] If you already have a real health test with non-null
      `detailIntro` / `whatThisTestCovers` etc. in the DB:
  - Open in edit → change only the title → save.
  - Re-query the DB (or hit the admin detail page at
    `/admin/health-tests/<id>`) and confirm the legacy fields still have
    their old values.

### A.6 Public listing reads the new stock value
- [ ] `/{country}/{lang}/tests` in an incognito tab.
- [ ] Card pulls the latest stock without a deploy.

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
      Starting price, Currency code, Hero image, "Service active"
      checkbox.
- [ ] **NOT visible** for the PRESCRIPTION kind: Category selector
      (only applies to Specialist consultations), Hero title, Hero
      description, CTA label, Detail body, Legacy path.

### B.2 Validation
- [ ] Submit blank → page reloads with the relevant error.
- [ ] Save with name, slug, currency, and price filled → redirect to
      the service detail page with a success message.
- [ ] Public listing path: `/{country}/{lang}/prescriptions`. New
      prescription appears as a card with name, summary, duration pill,
      price pill, and "Add to cart" button.

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
