# Clinical editorial draft coverage

Source: `raw/editorial-storage-before-2026-09-13.json`, `data.clinical`.

- Covered 16 active staffed services and three doctor profiles in RO, EN, PT, ES, CS and DE, including native fallback fields and retained doctor FAQs.
- Inspected the dash-containing clauses as exact source fragments. Used colons for labels, commas for dependent clauses and appositives, parentheses for embedded lists, and sentence splits for independent statements. Rewrote selected repetitive promotional paragraphs and repaired run-together labels and biography phrasing.
- Scanned 1,093 nonempty eligible source fields; produced 225 exact row/field changes. Clear retained text and recently published service FAQs remain unchanged.
- Changes by snapshot table: services 17, serviceTranslations 117, doctors 3, doctorTranslations 36, doctorMarketTranslations 23, doctorFaqs 29.
- Excluded inactive services and unstaffed `evaluare-durere`. Service links are outside this drafting subtask.
- Preserved HTML tags and attributes byte-for-byte, all numeric sequences, names, registration numbers, clinical qualifications and held specialty claims. No em dashes remain in changed fields. No duplicate row/field changes.
- Czech retained Brindus FAQ identifies CMR as the Czech chamber (`České lékařské komory (ČLK)`) despite the Romanian registration record. Flagged for the parent task; not silently changed as punctuation.

Reproduce the draft and HTML invariants with `node seo/romania/draft-clinical-editorial.mjs`. The exact source-fragment inventory is a drafting aid, not a live-content transformation. The updater should consume only the final exact before/after JSON.

This is editorial cleanup of existing claims, not independent certification of retained clinical assertions, same-day availability promises, regional-access statistics or prescription-system assertions.
