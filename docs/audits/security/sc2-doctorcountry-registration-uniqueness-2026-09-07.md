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

The local test database holds 0 `DoctorCountry` rows, so it contributes no
evidence either way.

### 3.1 What the duplicate actually is

Identified on 2026-09-07 and **confirmed by the site owner: one person, whose
name is Dr Muhammad Usman Yoosuf.** The second row is a legacy-import
duplicate created under a mis-transcribed first name.

| | Dr Muhammad Usman Yoosuf | Dr Mustafa Usman Yoosuf |
| --- | --- | --- |
| `Doctor.id` | `cmqwle36k0004rgjuepo2djjx` | `cmrmbiq8q001zhww8xmh1bg48` |
| slug | `dr-muhammad-usman-yoosuf` | `dr-mustafa-usman-yoosuf` |
| `Doctor.active` | true | **false** (not published) |
| origin | native, 2026-06-27 | **legacy Mongo import, 2026-07-15** |
| `DoctorCountry.id` (ie) | `cmqwmbb96000cswju7i4glhzv` | `cmrmbiqj90020hww8txpnoeq6` |
| division | General Division | null |
| `verifiedAt` | 2026-07-14 | **null**, with `isVerified = true` |
| portal account | `muhammad.yoosuf@…` | none |

`isVerified = true` with `verifiedAt = null` is the tell that the row never
went through `upsertDoctorRegistration`, which always stamps `verifiedAt` on
the transition to verified — the importer wrote the flag directly. Three
Irish rows in total carry that combination; the other two are worth a
separate look.

**Correcting the first version of this report:** it claimed one profile was
publishing a credential that is not its own and printing it on prescriptions.
Both halves were wrong. The duplicate's `Doctor.active` is `false`, so it is
not on the public roster, and the three `GeneratedDocument` rows it holds
(2 PRESCRIPTION, 1 EXAMS_PRESCRIPTION, all 2026-07-15) have `metadata = null`
and `sentToPatient = false` — they are legacy-imported originals, not
documents this system rendered through `doctor-registration-display.ts`. No
PDF we produced carries a wrong credential. The defect is a duplicate row in
the database, not a compliance exposure.

### 3.2 Why the existing merge script missed it

`backend/scripts/legacy-migration/merge-doctors.ts` already exists to fold
legacy-import doctors into their native profile. It matches on the normalised
name, exact first and then unambiguous token-subset. "Mustafa Usman Yoosuf"
is neither an exact match for nor a token subset of "Muhammad Usman Yoosuf",
so the script correctly declined to guess and kept it as a new profile. That
is the script behaving as designed; the duplicate is the cost of a
conservative matcher, and it needs a human decision — which is exactly what
happened here.

Re-running that script now would **not** fix it either, and would fail if it
tried: its merge path is `prisma.doctor.delete(...)`, and its header notes it
is only safe before appointments, notes and documents are loaded. The
duplicate now holds rows in four tables:

```
Appointment.doctorId              2   onDelete SET NULL
DoctorCountry.doctorId            1   onDelete CASCADE
GeneratedDocument.doctorId        3   onDelete RESTRICT
MedicalNote.createdByDoctorId     1   onDelete RESTRICT
```

The two RESTRICT relations mean a plain delete raises a foreign-key error.
The merge has to repoint all four first.

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
cannot be created while two rows violate it. Since §3.1 settles it as one
person, the correction is a merge, not a number edit:

1. Repoint the duplicate's dependent rows onto
   `cmqwle36k0004rgjuepo2djjx` — 2 `Appointment.doctorId`, 3
   `GeneratedDocument.doctorId`, 1 `MedicalNote.createdByDoctorId`.
2. Move `legacyMongoId` from the duplicate onto the native row **before**
   deleting it, so a future legacy re-import updates the real doctor instead
   of recreating this duplicate. The column is unique, so the duplicate has to
   go first or the stamp has to happen in the same transaction.
3. Delete `Doctor` `cmrmbiq8q001zhww8xmh1bg48`; its `DoctorCountry` row
   `cmrmbiqj90020hww8txpnoeq6` cascades, which is what frees the number.
4. Then add `@@unique([countryId, registrationNumber])` with a hand-written
   migration (`prisma migrate dev` does not run in this repo — see the
   shadow-database note), applied to the local test database first.

Two loose ends the merge does not settle: the public URL
`/…/dr-mustafa-usman-yoosuf` disappears with the row (the profile is already
unpublished, so a redirect is only needed if the slug was ever linked), and
the other two Irish rows with `isVerified = true` / `verifiedAt = null` still
carry import-asserted verification that no admin ever confirmed.

Nothing applied this session; steps 1–4 are all production writes and wait on
the user.
