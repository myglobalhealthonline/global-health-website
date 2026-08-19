import type { Prisma } from "@prisma/client";

/**
 * Every table that stores a patient's email as its own copy rather than
 * reaching User/PatientProfile through a foreign key. Moving `User.email`
 * and `PatientProfile.email` without moving these strands the rest of the
 * record at the old address:
 *
 *   - `Appointment.email`   — what `/api/admin/patients/by-email` searches, so
 *                             a stale row keeps suggesting the dead address to
 *                             the next admin booking for this patient.
 *   - `Order.email`         — the recipient every pre-payment / post-payment
 *                             automation mails (`pre-payment-flow.service.ts`
 *                             reads `order.email`, not the user row), so a
 *                             stale row sends payment links into a dead inbox.
 *   - `MedicalNote.patientEmail`
 *   - `GeneratedDocument.patientEmail`
 *                           — both are the join keys `consultation-history`
 *                             uses to assemble the chart. Stale rows make the
 *                             patient's notes and documents disappear from
 *                             their own history.
 *   - `CrossBorderPrescriptionRequest.patientEmail`
 *                           — matched against `Appointment.email`, so it has
 *                             to move in the same step or the pairing breaks.
 *   - `MembershipEnrollment.email`
 *                           — how manual booking and the claim flow decide
 *                             whether this patient has a membership price.
 *   - `CartItem.patientEmail` / `OrderItem.patientEmail`
 *   - `PatientUploadLink.email`
 *   - `BrazilConsentSubmission.email`
 *                           — per-row snapshots; nothing joins on them today
 *                             but leaving them behind makes admin views
 *                             disagree about who the row belongs to.
 *
 * Deliberately NOT moved:
 *   - `NewsletterSubscriber.email` — a separate opt-in identity with its own
 *     unsubscribe token. Silently moving it subscribes an address that never
 *     consented.
 *   - `MembershipClaimToken.email` / `MembershipInviteLog.email` — one-shot
 *     invite artefacts addressed to the old inbox; rewriting them would
 *     re-target a token that was already sent elsewhere.
 *   - `CorporateEmployee` / `CorporateBeneficiary` / `FamilyMember` — separate
 *     people who merely share an inbox, not this patient's own records.
 *
 * Note this is the opposite call from `patient-merge.service.ts`, which leaves
 * `MedicalNote.patientEmail` alone on purpose. There the two addresses belong
 * to two charts being combined and the note's address is genuine history; here
 * a single patient's one address was wrong and every copy of it is wrong too.
 */
export type PatientEmailMoveCounts = Record<string, number>;

/**
 * Re-point every stored copy of `oldEmail` to `newEmail`, inside the caller's
 * transaction so the move either lands everywhere or nowhere.
 *
 * Matching is case-insensitive: `Appointment.email` and friends are written
 * from form input and are not normalised the way `User.email` is, so an exact
 * match would silently skip `Sara@Gmail.com` rows.
 *
 * No-ops (returns all-zero counts) when the two addresses are equal ignoring
 * case, so callers don't have to guard.
 */
export async function movePatientEmailReferences(
  tx: Prisma.TransactionClient,
  oldEmail: string,
  newEmail: string,
): Promise<PatientEmailMoveCounts> {
  const from = oldEmail.trim();
  const to = newEmail.trim().toLowerCase();
  if (!from || !to || from.toLowerCase() === to) {
    return {};
  }

  const match = { equals: from, mode: "insensitive" as const };
  const counts: PatientEmailMoveCounts = {};
  const record = async (key: string, run: () => Promise<{ count: number }>) => {
    const { count } = await run();
    if (count > 0) counts[key] = count;
  };

  await record("appointment", () =>
    tx.appointment.updateMany({ where: { email: match }, data: { email: to } }),
  );
  await record("order", () =>
    tx.order.updateMany({ where: { email: match }, data: { email: to } }),
  );
  await record("orderItem", () =>
    tx.orderItem.updateMany({ where: { patientEmail: match }, data: { patientEmail: to } }),
  );
  await record("cartItem", () =>
    tx.cartItem.updateMany({ where: { patientEmail: match }, data: { patientEmail: to } }),
  );
  await record("medicalNote", () =>
    tx.medicalNote.updateMany({ where: { patientEmail: match }, data: { patientEmail: to } }),
  );
  await record("generatedDocument", () =>
    tx.generatedDocument.updateMany({ where: { patientEmail: match }, data: { patientEmail: to } }),
  );
  await record("crossBorderPrescriptionRequest", () =>
    tx.crossBorderPrescriptionRequest.updateMany({
      where: { patientEmail: match },
      data: { patientEmail: to },
    }),
  );
  await record("membershipEnrollment", () =>
    tx.membershipEnrollment.updateMany({ where: { email: match }, data: { email: to } }),
  );
  await record("patientUploadLink", () =>
    tx.patientUploadLink.updateMany({ where: { email: match }, data: { email: to } }),
  );
  await record("brazilConsentSubmission", () =>
    tx.brazilConsentSubmission.updateMany({ where: { email: match }, data: { email: to } }),
  );

  return counts;
}
