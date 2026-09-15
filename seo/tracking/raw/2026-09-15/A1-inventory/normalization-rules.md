# URL normalization rules (A1, 2026-09-15)

- scheme: `https`
- host: `www.myglobalhealth.online` (apex + `http://` + bare `myglobalhealth.online` 301 here — confirmed in A0)
- trailing slash: stripped, except for the root `/` itself (confirmed: trailing slash 308s to no-slash)
- path case: preserved as-is (no case-folding — several legacy Wix slugs carry mixed case, e.g. `dr-yliana-muñoz-bravo`)
- query strings: kept as a **separate raw row**, flagged `parameter` in `inventory_state`/notes rather than merged into the base URL's row
- percent-decoding: NOT applied — raw percent-encoded octets are preserved verbatim in `normalized_url`
- fragment (`#...`): stripped
