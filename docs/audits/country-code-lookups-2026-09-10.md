# Country-code lookup audit

Scope: similar failures to the missing GBP settings. Country rows on the live system use lowercase codes (`br`, `cz`, `ie`, `pt`, `ro`, `es`). No production records or application code were changed during this audit.

## Confirmed findings

### 1. Clinic pickers hide configured clinics when a country is selected

`backend/src/routes/admin-clinics.route.ts:37` uppercases the requested code, then line 40 performs an exact `country.code` relation filter. The frontend helper at `frontend/lib/admin/admin-api/countries.ts:112` also uppercases it. All real lowercase country rows therefore fail the filter.

Affected callers include creating appointments, editing an appointment, and doctor availability setup. Their clinic dropdown can be empty even when a clinic is configured for that country.

Proof: an isolated Fastify route test with a synthetic clinic in country `ie` returned one clinic without a country filter and zero for `?countryCode=ie`. Both requests succeeded with HTTP 200. No live clinic or patient data was accessed.

Fix at the backend relation filter: match country codes case-insensitively. Retain active-clinic and existing authorization filters. Add a regression using lowercase stored codes and both input cases.

### 2. Saving a country data policy rejects an existing country

`backend/src/routes/admin-data-policy.route.ts:65` uppercases every input. Lines 76–77 then call `country.findUnique` with that uppercase code. On the live lowercase convention, a valid country is reported as missing before `upsertDataPolicy` can run.

Proof: an isolated Fastify PUT with a synthetic `ie` Country row and valid policy payload returned HTTP 404, “Country not found”; the mocked policy writer was never called.

Fix only the Country lookup with case-insensitive matching. Keep the policy's own uppercase country-code convention intact. Do not change policy values or country records as part of this repair. Test both input cases and genuinely missing countries.

### 3. Public page-content endpoints accept uppercase codes but fail to resolve them

`backend/src/validations/admin-page-content.schema.ts:117` accepts either case. `backend/src/routes/page-content.route.ts:33` and `backend/src/modules/page-content/page-content.service.ts:362` perform exact country-code lookups. The sibling `/pages` route and `pages.service.ts:268` have the same lookup pattern.

Read-only live verification:

- `/api/countries/ie/page-content/HOME`: HTTP 200, content present.
- `/api/countries/IE/page-content/HOME`: HTTP 404, “Country not found”.

This is a lower-priority API consistency defect: normal lowercase site routes still work. Normalize at the shared parameter boundary or use case-insensitive resolution in both the default-locale and content lookups. Preserve inactive/draft behavior and locale fallback.

## Checked and not reported as bugs

Admin calendar scopes normalize through `buildCountryCodeFilter`. Declared coverage normalizes to lowercase before its exact lookup. Core public country resolution, subscription feature checks, commission lookup and birthday campaigns already match case-insensitively. Frontend header/switcher data is normalized; registration and booking country controls normalize before comparisons. Exact ID lookups are unaffected.

Generated-document country-name resolution and other exact code lookups were inspected, but are not reported as confirmed user-facing failures without evidence of a mismatched input producer. No broad casing replacement is recommended.

## Recommended fix order and evidence

Fix clinic pickers and policy saves first, then the two public content routes. Keep lowercase Country storage and existing display/setting-key conventions; this needs lookup fixes, not a database migration.

Verification: two temporary mocked route reproductions passed assertions for the current failures; the temporary file was removed after the audit. The public endpoint comparison above was read-only. Frontend investigation found no further verified issue. This report is the only retained change.
