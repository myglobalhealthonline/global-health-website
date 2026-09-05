# SUPER_ADMIN and the doctor portal — deferred read-only design decision

Recorded 2026-09-05 during the appointment terminal-state batch (WF-1/WF-2).
**Nothing was implemented.** This file exists so the inconsistency is not lost.

## The inconsistency

`backend/src/utils/doctor-auth.ts:64` gates every doctor-portal surface:

```ts
if (payload.role !== "DOCTOR" && payload.role !== "ADMIN") {
  return { ok: false, status: 403, message: "Doctor access required" };
}
```

`ADMIN` is admitted (subject to a linked `User.doctorId`); `SUPER_ADMIN` is
refused outright. So the *more* privileged role has *less* access than the one
below it. `verifyDoctorAccess` is called from 110 sites across 32 route files
in `backend/src/routes/`, so the gate covers the whole doctor portal.

The sibling gate `verifyClinicalReadAccess` (same file, ~line 120) has the same
`DOCTOR | ADMIN` shape, so the gap is consistent across both.

## Why it was not fixed here

Widening `verifyDoctorAccess` would admit `SUPER_ADMIN` to all 32 route files
at once — including every write path (finalisation, status changes, document
generation, prescriptions, bank details). That is a far larger authorization
change than the batch it surfaced in, and it grants writes to solve a read
problem.

## Preferred shape when it is taken up

Restrict the correction to the specific read-only support endpoint that needs
it, rather than to the shared gate:

- Do **not** add `SUPER_ADMIN` to `verifyDoctorAccess`.
- Identify the concrete support workflow that is blocked, and admit
  `SUPER_ADMIN` only on that endpoint — read-only, no write verbs.
- If more than one endpoint needs it, prefer a narrow read gate
  (`verifyClinicalReadAccess`-shaped) over widening the write gate.
- Whatever lands must be covered in `backend/src/routes/authz-matrix.test.ts`,
  which is the integration authorization matrix.

## Open question for the decision

Which support workflow actually requires it? Until that is named, the safest
state is the current one: `SUPER_ADMIN` has no doctor-portal access at all.
