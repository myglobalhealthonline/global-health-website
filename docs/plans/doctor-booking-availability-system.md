# Plan: Doctor Booking and Availability System

## Contract

Input: patients choose a consultation type, then a doctor, then an available date/time.

Output: a booking flow where consultation types control doctor assignment, doctors control availability, and appointments atomically claim one valid doctor slot.

Goal: implement this flow:

```text
Consultation Type -> Assigned Doctors -> Selected Doctor -> Doctor Availability -> Available Time Slots -> Patient Booking
```

Also support the reverse doctor-profile flow:

```text
Doctor -> Assigned Consultation Types -> Selected Consultation Type -> Doctor Availability -> Available Time Slots -> Patient Booking
```

Acceptance:

- Patients only see doctors assigned to the selected consultation type.
- Patients only see consultation types assigned to the selected doctor on doctor profile pages.
- Patients only see slots generated from the selected doctor's weekly availability.
- Blocked, booked, held, and past slots are hidden.
- Booking creates an appointment linked to patient, doctor, consultation type, date/time, and slot.
- The same doctor cannot be double-booked for the same slot.
- Online prescription and health test products do not use doctor availability or appointment slots.
- Health test checkout collects a delivery address.

## Current System Notes

The current app is a Prisma/Fastify backend with a Next.js frontend. The important existing pieces are:

- `backend/prisma/schema.prisma`
- `backend/src/modules/doctor-availability/doctor-availability.service.ts`
- `backend/src/routes/doctor-availability.route.ts`
- `backend/src/routes/doctor-self-availability.route.ts`
- `backend/src/routes/appointments.route.ts`
- `backend/src/modules/appointments/appointments.service.ts`
- `frontend/app/(site)/[country]/[lang]/consult/[serviceSlug]/page.tsx`
- `frontend/app/(site)/[country]/[lang]/consult/[serviceSlug]/_components/consultation-slot-picker.tsx`
- `frontend/app/(doctor)/doctor/availability/_components/availability-ui.tsx`
- `frontend/app/(admin)/admin/services/[id]/edit/page.tsx`
- `frontend/app/(admin)/admin/doctors/[id]/availability/page.tsx`

The existing schema already has:

- `Doctor`
- `Service`
- `DoctorAvailability`
- `DoctorTimeSlot`
- `Appointment`
- `DoctorSlotStatus` with `OPEN`, `HELD`, `BOOKED`, `BLOCKED`

Main gap:

- `Service` and `Doctor` do not appear to have a direct many-to-many assignment model yet.
- Public availability currently loads by doctor, but not necessarily under a selected consultation assignment.
- Booking needs to validate that the selected slot belongs to a doctor assigned to the selected consultation type.

## Key Principle

Doctors own availability.

Consultation types own doctor assignment.

Consultation types define duration, price, and doctor assignment.

Patients can book consultations either by selecting a consultation type first or by selecting a doctor first.

Both consultation flows must resolve to the same final booking contract: selected consultation type + selected assigned doctor + valid doctor slot.

Availability must not be attached directly to the public product page. Availability belongs to the selected doctor.

Online prescription and health tests are checkout products, not doctor-slot appointment flows.

## Product Taxonomy

The public site should not treat every offer as the same kind of "service".

Use this patient-facing structure:

| Public page/product | Flow type | Doctor required? | Availability required? | Cart/checkout? | Address required? |
|---|---|---:|---:|---:|---:|
| General Consultation | Appointment booking | Yes | Yes | Maybe after slot selection | No, unless country rules require it |
| Specialist Consultation | Appointment booking | Yes | Yes | Maybe after slot selection | No, unless country rules require it |
| Follow-up Consultation | Appointment booking | Yes | Yes | Maybe after slot selection | No, unless country rules require it |
| Online Prescription | Product checkout | No | No | Yes | Yes if fulfillment includes delivery |
| Health Test | Product checkout | No | No | Yes | Yes |

Implementation note:

The database may still use the existing `Service` model internally for catalogue rows. In the patient-facing plan, only consultation rows with `kind = GENERAL` or `kind = SPECIALIST` participate in doctor assignment and availability. `PRESCRIPTION` and `HEALTH_TEST` rows must stay in cart/checkout logic and must not ask the patient to select a doctor or appointment slot.

## Data Model Plan

### 1. Add consultation-to-doctor assignment

Add a join table in `backend/prisma/schema.prisma`.

If the existing internal catalogue remains named `Service`, this table can be named `ServiceDoctor`, but it must only link consultation catalogue rows. Do not assign doctors to `PRESCRIPTION`, `HEALTH_TEST`, or `HOME_DELIVERY` product rows.

```prisma
model ServiceDoctor {
  id        String   @id @default(cuid())
  serviceId String
  doctorId  String
  isActive  Boolean  @default(true)
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  service   Service  @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  doctor    Doctor   @relation(fields: [doctorId], references: [id], onDelete: Cascade)

  @@unique([serviceId, doctorId])
  @@index([doctorId, isActive])
  @@index([serviceId, isActive, sortOrder])
}
```

Add inverse fields:

```prisma
model Service {
  assignedDoctors ServiceDoctor[]
}

model Doctor {
  assignedServices ServiceDoctor[]
}
```

Create a Prisma migration.

### 2. Keep doctor availability as recurring weekly rules

Retain `DoctorAvailability` as the recurring weekly schedule source:

- `doctorId`
- `weekday`
- `startMinute`
- `endMinute`
- `slotDurationMinutes`
- `effectiveFrom`
- `effectiveUntil`
- `isActive`

Important adjustment:

- Slot duration should come from the selected consultation type when generating public patient slots.
- Existing `slotDurationMinutes` on `DoctorAvailability` can remain for backward compatibility or as a doctor default, but patient booking for a consultation should use the consultation duration.

Recommended rule:

```text
effective slot duration = Service.durationMinutes ?? DoctorAvailability.slotDurationMinutes ?? 30
```

### 3. Keep blocked time on concrete slots for v1

The system already supports `DoctorTimeSlot.status = BLOCKED`.

For v1, keep the blocking behavior as:

- Generate concrete future slots from recurring availability.
- Doctor/admin toggles specific generated slots from `OPEN` to `BLOCKED`.
- Patient public availability only returns `OPEN` slots.

For v2, consider adding a true blocked-range table:

```prisma
model DoctorBlockedTime {
  id          String   @id @default(cuid())
  doctorId    String
  date        DateTime
  startMinute Int
  endMinute   Int
  reason      String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  doctor      Doctor   @relation(fields: [doctorId], references: [id], onDelete: Cascade)

  @@index([doctorId, date])
}
```

Do this only if the UI needs arbitrary "block 1:00 PM to 3:00 PM" ranges without first generating/selecting individual slots.

### 4. Keep product checkout separate from appointment booking

Online prescription and health test purchases should use the cart/order flow, not the doctor appointment flow.

Required checkout data for shippable/deliverable products:

- `fullName`
- `email`
- `phone`
- `deliveryAddressLine1`
- `deliveryAddressLine2`
- `city`
- `region`
- `postalCode`
- `countryCode`
- optional delivery notes

Rules:

- Health test checkout must require delivery address.
- Online prescription checkout should require delivery address when the prescription or related item is fulfilled by delivery.
- Product checkout does not require `doctorId`, `timeSlotId`, or doctor availability.
- Product orders should create `Order` / `CartItem` records, not appointment slots.
- If the existing payment flow creates an `Appointment` for online prescription, phase it out or isolate it as a non-scheduled request with no doctor slot.

## Backend Plan

### Phase 1: Consultation-doctor assignment APIs

Add backend support to assign doctors to consultation types.

Endpoints:

```text
GET    /api/admin/services/:id/doctors
PUT    /api/admin/services/:id/doctors
GET    /api/services/:countryCode/:serviceSlug/doctors
GET    /api/doctors/:countryCode/:doctorSlug/services
```

Admin `PUT` payload:

```json
{
  "doctorIds": ["doctor_1", "doctor_2", "doctor_3"]
}
```

Rules:

- Admin can assign multiple doctors to one consultation type.
- One doctor can be assigned to multiple consultation types.
- Assigned doctor and consultation type must belong to the same country or the doctor must be listed in that country through `DoctorCountry`.
- Only appointment-booking catalogue rows can have assigned doctors.
- Inactive doctors or consultation types should not appear in public results.
- Online prescription and health test catalogue rows must be excluded from doctor assignment endpoints.

Files likely involved:

- `backend/prisma/schema.prisma`
- `backend/src/routes/admin-services.route.ts`
- `backend/src/modules/services/services.service.ts`
- `backend/src/validations/admin-services.schema.ts`
- `backend/src/routes/services.route.ts`

### Phase 2: Public consultation-scoped doctors

Update the public consultation page flow so consultation type selection determines doctor list.

Current issue to fix:

- `frontend/app/(site)/[country]/[lang]/consult/[serviceSlug]/page.tsx` appears to fetch all country doctors, then filters by slots.

New behavior:

- Resolve selected consultation type by `countryCode + slug`.
- Load only doctors assigned to that consultation type.
- Show doctor cards for those doctors.
- Do not show doctors outside the selected consultation type.

Public response shape:

```json
{
  "service": {
    "id": "service_id",
    "slug": "general-consultation",
    "name": "General Consultation",
    "durationMinutes": 30,
    "basePriceCents": 5000,
    "currencyCode": "EUR"
  },
  "doctors": [
    {
      "id": "doctor_id",
      "slug": "dr-ahmed",
      "fullName": "Dr. Ahmed",
      "title": "General Practitioner",
      "languages": ["en", "ar"],
      "profileImagePath": "/..."
    }
  ]
}
```

### Phase 3: Public doctor-scoped consultation types

Update the public doctor profile flow so doctor selection can determine the consultation type list.

New behavior:

- Resolve selected doctor by `countryCode + doctorSlug`.
- Load only active consultation types assigned to that doctor.
- Show consultation choices on the doctor profile/page.
- Do not allow booking a consultation type that is not assigned to that doctor.

Public response shape:

```json
{
  "doctor": {
    "id": "doctor_id",
    "slug": "dr-ahmed",
    "fullName": "Dr. Ahmed",
    "title": "General Practitioner"
  },
  "services": [
    {
      "id": "service_id",
      "slug": "general-consultation",
      "name": "General Consultation",
      "durationMinutes": 30,
      "basePriceCents": 5000,
      "currencyCode": "EUR"
    }
  ]
}
```

This endpoint uses the same assignment table as the consultation-first flow.

### Phase 4: Consultation-scoped slot generation

Add a public endpoint that loads slots for one doctor under one consultation type.

Endpoint:

```text
GET /api/services/:countryCode/:serviceSlug/doctors/:doctorSlug/availability?days=14
```

This endpoint should be used by both patient entry paths:

- Consultation-first page after the patient chooses a doctor.
- Doctor-first page after the patient chooses a consultation type.

Validation rules:

- Consultation type exists and is active.
- Doctor exists and is active.
- Doctor is assigned to the selected consultation type.
- Date range is capped, for example 1 to 60 days.
- Slots are generated using the selected consultation type duration.
- Only `OPEN` slots are returned.
- Slots before `now + booking buffer` are hidden.

Response:

```json
{
  "slots": [
    {
      "id": "slot_id",
      "startAt": "2026-05-25T09:00:00.000Z",
      "endAt": "2026-05-25T09:30:00.000Z"
    }
  ]
}
```

Implementation options:

1. Extend `ensureSlotsForRange` to accept an override duration.
2. Add a new `ensureServiceSlotsForRange(doctorId, serviceId, fromUtc, toUtc)` helper.

Important detail:

The current `DoctorTimeSlot` unique key is `@@unique([doctorId, startAt])`. This means the same doctor cannot have two different consultation durations starting at the same time. That matches the double-booking rule, but it also means mixed consultation durations must be handled carefully.

Recommended v1 rule:

- Generate slots for the requested consultation duration.
- Do not create a slot if any existing `OPEN`, `HELD`, `BOOKED`, or `BLOCKED` slot overlaps that interval.
- Do not rely only on exact same `startAt`.

For correctness with mixed durations, add an overlap check when listing and booking:

```text
existing.startAt < requestedEndAt AND existing.endAt > requestedStartAt
```

### Phase 5: Consultation booking validation and double-booking prevention

Update consultation booking creation so `serviceSlug` or consultation slug, `doctorId` or `doctorSlug`, and `timeSlotId` are treated as a connected set.

Rules before appointment create:

- Consultation type is active in selected country.
- Doctor is active and assigned to consultation type.
- Slot exists.
- Slot belongs to selected doctor.
- Slot status is `OPEN`.
- Slot is not in the past.
- Slot duration matches selected consultation type duration.
- No overlapping appointment exists for the same doctor unless status is cancelled.

Appointment should store:

- `userId` if logged in
- `doctorId`
- `serviceId`
- `timeSlotId`
- `scheduledAt = slot.startAt`
- `consultationType`
- patient fields
- payment fields where applicable

Atomic booking:

- Claim the slot inside the same Prisma transaction as appointment creation.
- Use `UPDATE ... WHERE id = ? AND status = 'OPEN'`.
- Treat zero updated rows as `409 Conflict`.

Extra DB protection:

- Keep `Appointment.timeSlotId @unique`.
- Keep `DoctorTimeSlot @@unique([doctorId, startAt])`.
- Add application-level overlap checks for mixed durations.

### Phase 6: Slot release behavior

Keep existing release behavior, but verify these cases:

- Appointment cancelled before payment: slot returns to `OPEN`.
- Stripe checkout expires for a consultation item: `HELD` returns to `OPEN`.
- Payment succeeds: slot moves to `BOOKED`.
- Doctor/admin blocks a slot: `BLOCKED` never gets opened automatically by cancellation logic.
- Admin reschedules appointment: old slot is released and new slot is claimed.

### Phase 7: Product checkout validation

Keep online prescription and health test checkout out of slot booking.

Rules:

- Online prescription add-to-cart requires product id/slug and quantity only, plus normal checkout identity fields.
- Health test add-to-cart requires product id/slug and quantity only before checkout.
- Checkout for health tests must require delivery address before payment.
- Checkout for online prescription must require delivery address when the selected product is delivered.
- Product checkout should not validate doctor assignment, doctor availability, or slot status.
- Product checkout should not hide or change doctor time slots.

## Frontend Plan

### Admin consultation edit

Update general/specialist consultation create/edit UI so admin can assign doctors.

Files likely involved:

- `frontend/app/(admin)/admin/services/_components/service-fields.tsx`
- `frontend/app/(admin)/admin/services/[id]/edit/page.tsx`
- `frontend/lib/admin/service-form-parse.ts`

UI behavior:

- Show assigned doctors multi-select or checkbox list.
- Filter doctor list by selected consultation country.
- Persist selected doctors through admin consultation API.
- Show count and status of assigned doctors.
- Hide doctor assignment controls for online prescription, health test, and delivery products.

### Doctor availability

Keep the doctor availability UI focused on doctor-owned schedule:

- Doctor selects weekly days.
- Doctor sets start/end time per selected day.
- Doctor saves recurring availability rules.
- Doctor can toggle concrete generated future slots as blocked/open.

Files likely involved:

- `frontend/app/(doctor)/doctor/availability/_components/availability-ui.tsx`
- `frontend/lib/api/doctor-availability-types.ts`
- `frontend/lib/api/doctor-availability-client.ts`

Optional UI improvement:

- Add a range blocking form for a specific date/time range if `DoctorBlockedTime` is added later.

### Patient consultation booking flow

Update the public consultation route to follow:

```text
Select Consultation Type -> Select Doctor -> Select Date -> Select Time Slot -> Confirm Booking
```

Files likely involved:

- `frontend/app/(site)/[country]/[lang]/general-consultation/page.tsx`
- `frontend/app/(site)/[country]/[lang]/specialist-consultation/page.tsx`
- `frontend/app/(site)/[country]/[lang]/consult/[serviceSlug]/page.tsx`
- `frontend/app/(site)/[country]/[lang]/consult/[serviceSlug]/_components/consultation-slot-picker.tsx`
- `frontend/lib/content/get-doctor-availability.ts`
- `frontend/lib/api/booking-api.ts`

Patient UI rules:

- General consultation and specialist consultation pages are separate public entry points.
- Consultation card links to `/[country]/[lang]/consult/[consultationSlug]`.
- Consult page loads assigned doctors only.
- Doctor card has "Select doctor".
- After doctor selection, load that doctor's slots for the selected consultation type.
- Group slots by date.
- Do not submit booking without `serviceId/serviceSlug`, `doctorId`, and `timeSlotId`.
- If booking returns `409`, refresh slots and ask patient to choose another time.

### Doctor page booking flow

Update the public doctor profile route to support doctor-first booking:

```text
Doctor -> Assigned Services -> Selected Service -> Select Date -> Select Time Slot -> Confirm Booking
```

Files likely involved:

- `frontend/app/(site)/[country]/[lang]/doctors/[doctorSlug]/page.tsx`
- `frontend/lib/content/get-public-doctors.ts`
- `frontend/lib/content/doctor-profile-data.ts`
- `frontend/lib/content/get-doctor-availability.ts`
- `frontend/lib/api/booking-api.ts`

Doctor profile UI rules:

- Doctor page shows only consultation types assigned to that doctor.
- Patient selects one consultation type before seeing slots.
- Slot picker calls the same consultation-scoped availability endpoint used by the consultation-first flow.
- Slot duration, price, and consultation metadata come from the selected consultation type.
- Booking submit includes both selected `serviceSlug/serviceId` and selected `doctorId`.
- If the doctor has no assigned active consultation types, show no booking slot picker and route patient back to consultation discovery.

### Product checkout flow

Online prescription and health tests should use add-to-cart and checkout pages, not doctor scheduling.

Files likely involved:

- `frontend/app/(site)/[country]/[lang]/online-prescription/page.tsx`
- health test listing/detail routes
- `frontend/lib/api/booking-api.ts`
- cart and checkout UI/API modules

Online prescription UI rules:

- Patient selects the online prescription product.
- Patient adds it to cart.
- Patient checks out and pays.
- Do not ask for doctor selection, appointment date, time slot, or availability.
- Collect delivery address when fulfillment requires shipping/delivery.

Health test UI rules:

- Patient selects health test.
- Patient adds it to cart.
- Patient checks out and pays.
- Checkout must collect delivery address so the kit/order can be sent.
- Do not ask for doctor selection, appointment date, time slot, or availability.

## API Contract Summary

### Admin assignment

```text
GET /api/admin/services/:id/doctors
PUT /api/admin/services/:id/doctors
```

### Public assigned doctors for consultation

```text
GET /api/services/:countryCode/:serviceSlug/doctors
```

### Public assigned consultation types for doctor

```text
GET /api/doctors/:countryCode/:doctorSlug/services
```

### Public consultation-scoped availability

```text
GET /api/services/:countryCode/:serviceSlug/doctors/:doctorSlug/availability?days=14
```

### Consultation appointment booking

```text
POST /api/appointments
```

Required consultation booking fields:

```json
{
  "country": "ie",
  "serviceSlug": "general-consultation",
  "doctorId": "doctor_id",
  "timeSlotId": "slot_id",
  "fullName": "Patient Name",
  "email": "patient@example.com",
  "phone": "+353...",
  "consentAccepted": true
}
```

### Product cart and checkout

Product purchase fields should not include doctor or slot fields.

Add-to-cart payload:

```json
{
  "kind": "HEALTH_TEST",
  "productSlug": "cholesterol-test",
  "quantity": 1
}
```

Checkout payload for shippable products:

```json
{
  "fullName": "Patient Name",
  "email": "patient@example.com",
  "phone": "+353...",
  "deliveryAddress": {
    "line1": "123 Main Street",
    "line2": "Apt 4",
    "city": "Dublin",
    "region": "Dublin",
    "postalCode": "D01 ABC1",
    "countryCode": "IE"
  }
}
```

## Edge Cases

1. Same doctor assigned to multiple services with different durations.

   The same start time cannot be double-booked. Use overlap checks, not only exact `startAt` matching.

2. Patient starts checkout while doctor blocks a slot.

   Booking must fail with `409` if the slot is no longer `OPEN`.

3. Doctor removes weekly availability after appointments already exist.

   Delete only future `OPEN` generated slots. Keep `BOOKED`, `HELD`, and `BLOCKED` slots intact unless explicitly released.

4. Service duration changes after slots were generated.

   Public availability should regenerate or filter future `OPEN` slots to the current consultation duration. Existing booked appointments keep their original stored `scheduledAt`, `timeSlotId`, and payment snapshot.

5. Patient tries to book an unassigned doctor by manually editing request payload.

   Backend must reject the booking with `400` or `403`.

6. Patient opens doctor page and selects a service the doctor is no longer assigned to.

   Backend must reject availability and booking requests, and frontend should refresh assigned consultation types.

7. Doctor has no assigned active services.

   Doctor profile should not show bookable slots. It can show the doctor's profile and a link back to consultation discovery.

8. Online prescription accidentally enters appointment flow.

   Backend should reject `doctorId` / `timeSlotId` requirements for prescription checkout and keep it in cart/order flow.

9. Health test checkout without address.

   Backend should reject checkout before payment because delivery address is required.

10. Mixed cart with health test and online prescription.

   Checkout should collect one delivery address that can fulfill all shippable items, while still avoiding doctor slot logic.

11. Timezone boundaries around midnight.

   Generate and display slots using the country booking timezone, while storing `startAt` and `endAt` in UTC.

## Test Plan

### Backend unit/integration tests

Add tests for:

- Admin assigns multiple doctors to a service.
- Doctor assigned to multiple services.
- Public service doctors endpoint excludes unassigned doctors.
- Public doctor consultation endpoint excludes unassigned consultation types.
- Consultation-scoped availability rejects unassigned doctor.
- Doctor-profile booking rejects unassigned consultation type.
- Slot generation uses consultation duration.
- Blocked slot is hidden.
- Booked slot is hidden.
- Past slot is hidden.
- Booking rejects a slot for the wrong doctor.
- Booking rejects a doctor not assigned to the service.
- Two simultaneous booking attempts result in one success and one `409`.
- Cancelled appointment releases slot where appropriate.
- Online prescription checkout does not require doctor or slot.
- Health test checkout requires delivery address.
- Product checkout does not mutate doctor slot status.

Likely test files:

- `backend/src/modules/services/admin-services.schema.test.ts`
- `backend/src/routes/account-appointments.route.test.ts`
- Add a new route/service test for consultation-doctor assignment and availability.

### Frontend manual tests

1. Admin creates `General Consultation` with duration `30`.
2. Admin assigns `Dr. Ahmed`, `Dr. Sarah`, and `Dr. Ali`.
3. Doctor logs in and creates weekly availability:
   - Monday 09:00 to 18:00
   - Tuesday 09:00 to 18:00
   - Wednesday 09:00 to 18:00
   - Friday 09:00 to 17:00
4. Doctor blocks Monday 13:00 to 15:00 by blocking generated slots.
5. Patient opens the consultation page.
6. Patient sees only assigned doctors.
7. Patient selects `Dr. Ahmed`.
8. Patient sees Monday slots except 13:00 to 15:00.
9. Patient books 09:00 to 09:30.
10. Another browser refreshes availability and no longer sees 09:00 to 09:30.

Doctor-first manual test:

1. Patient opens `Dr. Ahmed` profile.
2. Patient sees only consultation types assigned to `Dr. Ahmed`.
3. Patient selects `General Consultation`.
4. Patient sees slots generated from Dr. Ahmed's availability using the `General Consultation` duration.
5. Patient switches to `Follow-up Consultation`.
6. Slot list refreshes using the follow-up duration.
7. Patient books a slot.
8. Consultation-first flow for the same doctor no longer shows the booked slot.

Product checkout manual test:

1. Patient opens online prescription page.
2. Patient adds product to cart.
3. Patient checks out without selecting doctor or slot.
4. Patient opens health test page.
5. Patient adds health test to cart.
6. Checkout blocks payment until delivery address is entered.
7. Payment/order creation does not create or reserve doctor time slots.

### Commands

Run after implementation:

```powershell
cd backend
npm test
npm run typecheck
```

```powershell
cd frontend
npm run typecheck
npm run build
```

Use the actual package scripts if names differ in `backend/package.json` or `frontend/package.json`.

## Implementation Sequence

1. Add Prisma consultation-doctor assignment model and migration.
2. Add backend validators and service methods for assignment.
3. Add admin consultation-doctor assignment endpoints.
4. Add public endpoint for assigned doctors by service.
5. Add public endpoint for assigned consultation types by doctor.
6. Add consultation-scoped doctor availability endpoint.
7. Harden appointment booking validation.
8. Update admin service edit UI to assign doctors.
9. Update patient consult page to load service-assigned doctors only.
10. Update doctor profile page to load doctor-assigned consultation types.
11. Update slot picker to request availability by service and doctor.
12. Split online prescription and health tests into cart/checkout-only UI.
13. Add delivery address validation for health test and shippable prescription checkout.
14. Add backend tests for assignment, availability, booking races, and product checkout address rules.
15. Run frontend typecheck/build and manually verify both consultation flows plus product checkout.

## Definition of Done

- Service edit screen can assign multiple doctors.
- Doctor assignment is only available for consultation types, not prescription or health test products.
- Doctor availability remains doctor-owned and recurring weekly.
- Doctor can block generated concrete slots.
- Public consultation page only shows assigned doctors.
- Public doctor profile page only shows assigned consultation types.
- Public slot list is generated from selected doctor's availability and selected consultation duration.
- Consultation-first and doctor-first booking use the same availability endpoint and booking validation.
- Booking stores `doctorId`, `serviceId`, `timeSlotId`, and `scheduledAt`.
- Booked/blocked/held/past slots never appear in public availability.
- Double-booking is prevented by transaction and slot status claim.
- Online prescription uses cart/checkout and does not ask for doctor or slot selection.
- Health test uses cart/checkout and requires delivery address.
- Product checkout does not reserve, book, or block doctor slots.
- Tests cover the main assignment, visibility, and booking race paths.
