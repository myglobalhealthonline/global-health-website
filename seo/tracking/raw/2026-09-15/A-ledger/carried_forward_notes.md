# A-ledger carried-forward notes (2026-09-15)

## Sections read
§0 preamble; §5 ledger, all tables (L893-1237); §6 watchlist + 09-03 recheck
(L1835-1943); §7 NOW..CLOSED (L1944-3690); §27 in full, L24-698 (27.14-27.24
precede the ## 27 heading at L412, so both ranges were read, not just ~412-698);
§41 (L7898-8012); §42 incl. 42.3-42.5 (L8012-8183); §43 (L8183-8306); §44/46-49
(cross-refs only, L8306-8422); §50 (L8422-8456); §52 (L8572-8753); §53
(L8753-8771); §54-55 Romania (L8771-9155); §56 Spain (L9155-9901, via the §56.13
cross-check plus final 56.9-56.15 as the superseding state, not every phase note);
§57 Brazil (L9901-10026); §58 (L10026-10102); §59 through §59.16, whose final
"Left by owner decision" line (L10467) is Brazil's canonical open list.

## Dropped as closed (order of magnitude)
- §5: of ~60 tracked IDs, ~45 are CLOSED/FALSE POSITIVE/EXPECTED BEHAVIOR/VERIFIED;
  15 carried forward.
- §6: 6 of 12 named rows resolved in the 09-03 recheck (Telmo Coelho, legacy PT
  doctor, legacy Wix consultation, /about, /blog, /pt/about).
- §7: the CLOSED list (~25 tickets, L3677) is not carried, per instructions.
- §41: Defects 1 and 3 closed 2026-09-04 (§42.2); dropped.
- Confirmed closed only by reading past their own section: SEO-GROWTH-007/-017
  ("WAITING FOR GOOGLE" in §5, resolved by the §6 09-03 recheck); SEO-TEST-001,
  SEO-SCHEMA-003 and the §52.6 root-sameAs finding (closed by §56.13, L9846);
  Romania's unstaffed evaluare-durere (§55.6); Brazil "Only Ireland" pricing
  (§59.14); §43.5's Spain register/reviewer/policy gaps (superseded by §56);
  Defect 2 / Romania FAQs (closed by §55.3); check-locale-keys failure (passing
  again by end of §59.1).

## Ambiguities (not resolved, both citations kept)
1. **Ireland lab hub €89 price.** §7 NOW (L3481): "CLOSED — fixed in production
   2026-09-02 ... no correction is outstanding." §7 MANUAL (L3639) still lists
   fixing it as needing owner authorization; §41 (L7782-7785) narrates it as
   "reported as open on 2026-09-03" then "already fixed." Not carried (evidence
   favors closed); the MANUAL row was simply never edited to match.
2. **SEO-DOC-004.** §5 (L1016) status: "CLOSED ... disposition still unresolved" —
   yet its own Next-action cell says a production re-probe and the §14.8 disposition
   check are "still owed." Carried as SEO-DOC-004-DISPOSITION rather than dropped.

## Output
84 rows in `carried_forward.csv`; this notes file.
