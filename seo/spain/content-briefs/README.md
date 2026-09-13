# Exact Spain review packet

Open `review-packet.html` for side-by-side copy; `exact-drafts.json` is its structured
payload. There are 140 unapproved page candidates in 27 groups. `link-drafts.json`
contains seven reversible obsolete-callout changes. Existing useful answers are
retained: dermatology replaces three of nine; four empty FAQ sets receive 3/3/3/2
questions. Profile booking answers use stored consultation languages and retain
existing emergency passages where present.

Review includes naturalness in each locale and equivalence of service-specific
Spanish answers to the broader translated preparation/procedure answers. No reviewed
claim, reviewer name or review date is invented.

Non-ES records of the four vascular/aesthetic services store no copy and render the
Spanish record. `body-localization.json` supplies localized title, description, H1
and body for all four of those services in EN/DE/CS/PT/RO. Localized copy was
drafted and reviewed, not native-speaker or clinically approved.

`clinical-review-register.csv` one directory above binds each current payload hash.
The generator preserves actual review records and refuses changed approved payloads.
`storage-mutation-manifest.json` is now built from the authenticated snapshot: 25
candidate groups, 9 held groups. Approval must bind its SHA-256 (ledger §56.5) and
each group hash. It is not a production dry-run.

Applicable rule: [ledger §43.5](../../../docs/plans/seo-control-state.md#435-spains-remaining-dependencies-none-of-which-are-code)
requires “A named Spain-registered clinician reviewer, with a doctor id” and
“A review-age policy.” Section 43.4 requires enforcement “at the point of write.”
Nomination alone is not clinical approval; approval alone is not production consent.
