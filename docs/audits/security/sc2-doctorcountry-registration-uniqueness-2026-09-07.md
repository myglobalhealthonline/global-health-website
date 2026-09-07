# SC-2 — `DoctorCountry.registrationNumber` uniqueness

**Date:** 2026-09-07 · **Status:** investigation only, no schema change made ·
**Decision:** open, user's call

Investigation-only item from the 2026-09-05 repository audit. No constraint was
added and no migration was written. Production was queried read-only, with
explicit approval, and no registration number appears anywhere in this document
or in the query output that produced it.

## 1. Schema as it stands

`backend/prisma/schema.prisma`, model `DoctorCountry` (line 1063):

```prisma
/// Doctor's license number issued by `chamberEntity` for this country.
registrationNumber       String?
```

Indexes on the model — none of them touches `registrationNumber`:

```prisma
@@unique([doctorId, countryId])
@@index([countryId, active])
@@index([countryId, isVerified])
@@index([countryId, directorAccess])
@@index([doctorId])
```

So the only uniqueness the table enforces today is one row per doctor per
country. A registration number is free text, 64 characters after
`normalizeString`, and nothing stops two rows carrying the same one.

## 2. Can the same number legitimately appear twice?

Two writers set the column, and neither can produce a legitimate duplicate.

**`doctor-registrations.service.ts`** (`upsertDoctorRegistration`) upserts on
`doctorId_countryId` and writes `registrationNumber` from admin input, trimmed
to 64 characters. The number is issued by that country's chamber
(`chamberEntity` — IMC, OM, OMC, ČLK, CRM-SP), so it is only meaningful within
one country's register.

**`doctor-market-profiles.service.ts`** writes the same column for a market
profile, and `doctor-profile-change-requests.service.ts` writes it on approval
of a `registration` change request. Same field, same semantics.

That gives two candidate reasons a number could repeat, and both fail:

- **Same doctor, two countries.** A doctor registered in two countries holds
  *two different* numbers, one per chamber. There is no mechanism that copies
  a number from one country row to another, and production has zero such
  cases (see §3). A shared number across countries would be a coincidence
  between two independent national registers, not a fact about the doctor.
- **Two doctors sharing a chamber number.** Not a thing. A medical council
  number identifies one practitioner; that is what it is for, and it is what
  the PDF prints next to `chamberEntity` when a prescription is issued.

There is one shape a constraint must not break: `NULL`. 5 of 75 rows have no
number, and a Postgres unique index treats `NULL`s as distinct, so those rows
are unaffected either way. Empty strings would collide, but `normalizeString`
maps `""` to `NULL` before writing, and production holds none.

## 3. Production data (read-only, 2026-09-07)

```
DoctorCountry                                 75 rows, 70 with a number
same number within the SAME country            1 group, 2 rows
same number ACROSS countries (grouped by
number alone)                                  1 group, 2 rows
  of those groups, same doctor                 0
  of those groups, different doctors           1
```

Rows per country: `ie` 30 (25 numbered), `pt` 18, `es` 14, `cz` 9, `ro` 3,
`br` 1.

Because the country-blind grouping found exactly one group of two rows and the
country-aware grouping found the same, the two rows are the same pair. Its
shape:

```
country=ie  rows=2  distinct_doctors=2  active_rows=2  verified_rows=2  number_length=6
```

**Two different Irish doctors carry the same 6-character IMC number, both rows
active, both flagged `isVerified = true`.** That is not a legitimate duplicate
under either hypothesis in §2 — it is a data error that survived the manual
verification step, and one of the two profiles is publishing (and, through
`doctor-registration-display.ts`, printing on prescriptions) a credential that
is not theirs. Fixing that data is independent of whether a constraint is ever
added; a constraint would only have stopped it being entered.

The local test database holds 0 `DoctorCountry` rows, so it contributes no
evidence either way.

## 4. Recommendation

**Unique on `(countryId, registrationNumber)`** — not on `registrationNumber`
alone.

- It matches what the value actually is: an identifier scoped to one country's
  chamber. Two national registers issuing the same digits is not an error, and
  a global constraint would reject the second doctor for no reason.
- It is the constraint that would have caught the real defect in §3, which is
  a same-country collision.
- `NULL`s stay unconstrained, so the 5 rows with no number are unaffected.

`registrationNumber` alone is stricter but justifies nothing the scoped version
does not, and it would fire on a coincidence rather than a mistake. Leaving it
unconstrained is the status quo that let §3 through.

**Blocked on:** the duplicate in §3 must be corrected first — a unique index
cannot be created while two rows violate it. Sequence, if the constraint is
wanted:

1. Identify the two `ie` rows and decide which doctor owns the number (admin
   task — the registration was marked verified, so someone has the paperwork).
2. Correct or clear the wrong one.
3. Add `@@unique([countryId, registrationNumber])` and a hand-written
   migration (`prisma migrate dev` does not run in this repo — see the
   shadow-database note), applied to the local test database first.

No migration this session; the user decides.
