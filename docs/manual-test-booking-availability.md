# Manual test — Doctor booking & availability

Covers commits `e7054ab` → `7161853` (booking phases 1, 2, 2b, 4 from
`docs/plans/doctor-booking-availability-system.md`).

Phase 3 (service-scoped slot duration + overlap check) and backend
tests are **not** included — see "Known gaps" at the bottom.

## Prep

- [ ] Wait until Railway has redeployed both `frontend` + `backend`
      after the last push on `main`.
- [ ] Backend log should include
      `[ensure-schema] applied/skipped: ServiceDoctor table + indexes`.
      If it's missing, the booking guard will fail silently — flag it.
- [ ] Have three browser sessions ready (or three incognito windows):
  1. **Admin** logged in.
  2. **Patient A** — clean cookie jar, no auth.
  3. **Patient B** — clean cookie jar, no auth. (Used to race a slot.)
- [ ] Pick **Ireland** as the working country. The seed data has the
      most doctors there, so the assignment matrix is rich enough.
- [ ] Note two doctors by slug for later steps:
      `__doctor_A_slug__` and `__doctor_B_slug__` — replace those in the
      cases below with your actual seeded values
      (e.g. `dr-emmanuel-dabup`, `dr-khoiamul-islam`).

---

## Area A — Admin assignment write path (Phase 1)

### A.1 The field appears on the service form
- [ ] Admin → topbar = **Ireland** → sidebar → **General consultations** (or **Specialist consultations**).
- [ ] Click any existing service → **Edit**.
- [ ] Scroll past "Hero image" and "Gallery images" — you should now
      see an **Assigned doctors** fieldset with one checkbox per
      Ireland doctor.
- [ ] Inactive doctors render struck-through.
- [ ] The hint reads
      "Patients booking this service only see ticked doctors. Untick
      all to take the service offline without changing its status."

### A.2 Country lock matches the doctor list
- [ ] Open `/admin/services/new?kind=GENERAL&countryId=<ireland-id>`.
- [ ] The doctor list should only contain doctors whose primary country
      is Ireland **or** who have a `DoctorCountry` link to Ireland.
- [ ] A Romania-only doctor should not appear.

### A.3 Save round-trips correctly
- [ ] On an existing service, tick exactly two doctors → **Save**.
- [ ] Reload the edit page → those same two checkboxes are pre-ticked,
      everyone else unchecked.
- [ ] Untick one, save, reload → only one ticked.
- [ ] Untick **all**, save, reload → no doctors ticked.

### A.4 Backend rejects ineligible doctor IDs
> Manual-payload test — open DevTools → Network → save once → right-click the request → **Replay XHR** with body edited to include a Romania-only doctor's ID in `doctorIds`.

- [ ] PATCH succeeds (200) but the response's `assignedDoctors` array
      does **not** include the smuggled ID.
- [ ] Reloading the form confirms the ineligible doctor is not ticked.

---

## Area B — Service-first patient flow (Phase 2)

### B.1 Consult page shows only assigned doctors
- [ ] Pick a service with exactly two assigned doctors (set up in A.3).
- [ ] Patient A → `/ireland/en/general-consultation`.
- [ ] Click that service card → land on `/ireland/en/consult/<slug>`.
- [ ] You should see at most **2** doctor cards (filtered by
      availability — see B.3).
- [ ] No card for any unassigned doctor, even if they're active in
      Ireland.

### B.2 Empty assignment hides every card
- [ ] Admin: untick all doctors on a service, save.
- [ ] Patient A: refresh `/ireland/en/consult/<slug>`.
- [ ] Page shows the "No open slots in the next 14 days" amber banner.
- [ ] Restore the assignments before continuing.

### B.3 Assigned-but-no-availability filter
- [ ] Pick a doctor with no recurring availability (or every slot
      booked/blocked).
- [ ] Even if they're assigned to the service, their card should not
      render — `availableDoctors` filter strips zero-slot doctors.

### B.4 Country isolation
- [ ] Admin: assign **Doctor A** (Ireland) to an Ireland service.
- [ ] Spain has its own copy of the same service slug. Switch topbar to
      Spain, open that service's edit page → Doctor A is **not** in the
      checkbox list (assuming Doctor A has no Spain DoctorCountry link).
- [ ] Patient A → `/spain/es/consult/<slug>` — Doctor A does not
      appear.

---

## Area C — Doctor-first patient flow (Phase 2b)

### C.1 Profile lists only assigned services
- [ ] Admin: ensure Doctor A is assigned to exactly two services in
      Ireland (one General, one Specialist).
- [ ] Patient A → `/ireland/en/doctors/__doctor_A_slug__`.
- [ ] Below the standard profile template, you should see a
      "Services offered" section with **two** service cards.
- [ ] Each card has the service name, kind eyebrow (General/Specialist),
      summary, price pill, duration pill, and a "Pick a slot →" CTA.

### C.2 Card link routes back through consult
- [ ] Click one of the service cards.
- [ ] URL becomes `/ireland/en/consult/<service-slug>`.
- [ ] Doctor A's card is in the result (Phase 2 filter accepts them).

### C.3 No assignments → no section
- [ ] Admin: remove Doctor B from every service.
- [ ] Patient A → `/ireland/en/doctors/__doctor_B_slug__`.
- [ ] "Services offered" section is **absent**. The page still renders
      Doctor B's profile + the legacy "Book consultation" CTA from the
      template.

### C.4 Service inactivation hides cards
- [ ] Admin: mark a service the doctor is assigned to as **inactive**.
- [ ] Patient A: refresh the doctor's profile.
- [ ] That service no longer appears in "Services offered". Reactivate
      after.

---

## Area D — Booking guard (Phase 4)

### D.1 Happy path
- [ ] Patient A: from `/ireland/en/consult/<svc>` pick an assigned
      doctor, pick a slot, complete the form, submit.
- [ ] Response 200, you redirect to the post-booking page.
- [ ] DB check (or admin Appointments view): appointment has
      `doctorId` matching the slot's doctor, `timeSlotId` set,
      `scheduledAt` = slot.startAt.
- [ ] The slot is now `BOOKED`. Patient B refreshing the consult page
      no longer sees that time.

### D.2 Doctor not assigned → 400
> Open DevTools → Network → submit a booking normally → right-click → **Edit & Resend** (or Replay XHR with body tweaked).

- [ ] Original payload booked fine.
- [ ] Edit `serviceSlug` to a service the slot's doctor is **not**
      assigned to.
- [ ] Pick a fresh `timeSlotId` for the same doctor first (the original
      is BOOKED now).
- [ ] Submit. Expected:
      `400 Bad Request` with body
      `{ ok: false, message: "This doctor is no longer offering that service. Please pick a different doctor or service." }`.
- [ ] Confirm in DB: that fresh slot's status is still **OPEN** (the
      transaction rolled back). No half-formed appointment.

### D.3 Race condition → 409
- [ ] Patient A + Patient B both open the same doctor's slot picker on
      `/ireland/en/consult/<svc>`.
- [ ] Both pick the same time, both fill the form.
- [ ] Both press Submit roughly simultaneously.
- [ ] One gets 200 + a confirmation. The other gets `409` with
      `{ message: "This slot is no longer available. Please pick another." }`.
- [ ] DB: exactly one appointment, exactly one BOOKED slot.

### D.4 Wrong slot id → claim fails
> Same DevTools replay trick.

- [ ] Edit body to use a `timeSlotId` that belongs to a different
      doctor than what the form would have chosen.
- [ ] Submit.
- [ ] Either 409 (slot already booked / blocked) or 400 (doctor not
      assigned) — both are correct rejections, neither leaves an
      orphan appointment.

### D.5 Past slot → 409
- [ ] In the DB, manually flip a slot's `startAt` to yesterday (or wait
      for a slot to pass naturally).
- [ ] Submit a booking pointing at it.
- [ ] The slot claim itself should error (status no longer OPEN, or
      filtered out). At minimum the public listing should already have
      hidden it.

---

## Area E — Smoke checks (existing behavior shouldn't regress)

### E.1 Doctor availability page still works
- [ ] Doctor logs in → `/doctor/availability`.
- [ ] Add a new weekly window → save → reload → it persists.
- [ ] Toggle a generated slot to BLOCKED → patient flow no longer
      offers that slot.

### E.2 Admin appointments list
- [ ] Bookings from D.1 appear in `/admin/appointments` with the
      correct doctor + scheduled time.

### E.3 Cancelled appointment releases slot
- [ ] Admin cancels the D.1 appointment.
- [ ] DB: the slot returns to OPEN (unless it was BLOCKED — that case
      stays BLOCKED).
- [ ] Patient flow shows that time again.

### E.4 Country-scoped sidebar features
- [ ] In `/admin/country-features`, hide General consultations for
      Ireland.
- [ ] Public `/ireland/en/general-consultation` → 404.
- [ ] Re-enable.

---

## Known gaps (don't test these — they will fail by design)

These belong to **Phase 3** (not yet implemented):

1. **Mixed-duration overlap.** Same doctor assigned to a 30-min
   General and a 60-min Specialist. Both currently slice from the
   doctor's `DoctorAvailability.slotDurationMinutes` (not the service's
   duration), so 09:00 could be a 30-min general slot and overlap with
   what should be a 60-min specialist slot starting 09:00. Booking
   wouldn't catch this because the slot-claim is per-row, not interval-
   based.
2. **Service-scoped duration.** Slots use the recurring window's
   duration, not `Service.durationMinutes`. So if admin changes the
   service duration after slots are generated, existing future slots
   keep the old duration.
3. **Public availability endpoint signature.** The plan calls for
   `GET /api/services/:countryCode/:serviceSlug/doctors/:doctorSlug/availability?days=14`.
   What ships today is the older
   `getDoctorAvailability(code, doctorSlug, days)` call — no
   service-scoped variant yet.
4. **Timezone boundary rendering.** Slots are stored UTC, rendered in
   the browser local TZ. Country-timezone-aware rendering is out of
   scope.

If you encounter one of those, **don't file a finding** — it's
expected. Anything else is fair game.

---

## Finding format

```
[A.X | B.X | C.X | D.X | E.X]  Headline
Steps:
  1. …
  2. …
Expected: …
Actual:   …
Screenshot / network response / DB query result if relevant.
```

Drop the list back into chat — me triage + fix.
