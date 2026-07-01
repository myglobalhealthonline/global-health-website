# Admin Authenticated Screenshot Pass

This pass starts the post-redesign visual review using real authenticated portal rendering.

## Run Inputs

- Site: `http://localhost:3000`
- API: `http://127.0.0.1:4000`
- Browser: `C:\Users\kingh\Downloads\chrome-win\chrome.exe`
- Portal: Admin
- Widths: 320px, 390px, 430px, 768px, 1024px, 1280px, 1440px, 1920px

## Result

| Metric | Count |
|---|---:|
| Admin checklist routes selected | 63 |
| Static routes captured at all 8 required widths | 40 |
| Dynamic routes skipped pending concrete IDs | 23 |
| Authenticated screenshots captured | 320 |
| Login redirects in manifests | 0 |

## Manifest Batches

- `docs/portal-redesign/authenticated-screenshots/2026-06-30T23-24-21-546Z/results.json`
- `docs/portal-redesign/authenticated-screenshots/2026-06-30T23-28-21-172Z/results.json`
- `docs/portal-redesign/authenticated-screenshots/2026-06-30T23-32-44-655Z/results.json`
- `docs/portal-redesign/authenticated-screenshots/2026-06-30T23-37-15-523Z/results.json`
- `docs/portal-redesign/authenticated-screenshots/2026-06-30T23-43-23-041Z/results.json`
- `docs/portal-redesign/authenticated-screenshots/2026-06-30T23-47-48-914Z/results.json`
- `docs/portal-redesign/authenticated-screenshots/2026-06-30T23-53-22-405Z/results.json`

## Remaining Admin Work

- Review the captured screenshots visually and record issues/fixes.
- Provide concrete route replacements for dynamic admin paths through `PORTAL_SCREENSHOT_ROUTE_MAP_JSON`.
- Rerun the skipped dynamic routes once safe test IDs exist.
