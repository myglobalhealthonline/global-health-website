import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

/**
 * The appointment → patient relationship, in one place.
 *
 * `Appointment.userId` is the PURCHASER's account. A family/dependent booking
 * has the payer there while the consultation belongs to someone else, and a
 * dependent's own `PatientProfile.userId` is null — so
 * `Appointment.userId → PatientProfile.userId` can hand back a different
 * patient's chart. Nothing in this file may reintroduce that resolution, and
 * nothing outside it should re-derive the relationship by hand.
 *
 * `Appointment.patientProfileId` is the durable answer. It is written from a
 * concrete patient identity at booking time and is authoritative wherever it is
 * present; every fallback below is for legacy rows only, requires corroboration,
 * and fails closed on ambiguity.
 */

/** Minimal client surface so these can run inside an interactive transaction
 *  (`tx`) or standalone against the shared client. */
type PatientLinkClient = {
  patientProfile: {
    findUnique: (args: {
      where: { email: string };
      select: { id: true };
    }) => Promise<{ id: string } | null>;
  };
  familyMember: {
    findUnique: (args: {
      where: { id: string };
      select: { patientProfileId: true };
    }) => Promise<{ patientProfileId: string | null } | null>;
  };
  appointment: {
    findUnique: (args: {
      where: { id: string };
      select: { patientProfileId: true };
    }) => Promise<{ patientProfileId: string | null } | null>;
  };
  orderItem: {
    findMany: (args: {
      where: {
        appointmentId: { in: string[] };
        OR: ({ familyMemberId: { not: null } } | { bookingForOther: true })[];
      };
      select: { appointmentId: true };
    }) => Promise<{ appointmentId: string | null }[]>;
  };
};

/**
 * Which of these appointments were booked for SOMEONE OTHER than the account
 * that paid?
 *
 * The signal lives on the order line, not the appointment: `OrderItem` carries
 * `familyMemberId` and `bookingForOther`, and `Appointment` carries neither. It
 * matters because a "for someone else" line does not always carry a distinct
 * patient address — a dependent with no email on file leaves the appointment
 * holding the PURCHASER's `email` and `userId`. Such a row looks exactly like a
 * self-booking to any email/account comparison, so every path that claims
 * unlinked appointments has to subtract these first or it will attribute a
 * dependent's consultation to the payer's own chart.
 *
 * `OrderItem.appointmentId` is a bare column with no Prisma relation, so this is
 * a separate lookup rather than a join.
 */
export async function appointmentIdsBookedForSomeoneElse(
  client: Pick<PatientLinkClient, "orderItem">,
  appointmentIds: readonly string[],
): Promise<Set<string>> {
  if (appointmentIds.length === 0) return new Set();
  const rows = await client.orderItem.findMany({
    where: {
      appointmentId: { in: [...appointmentIds] },
      OR: [{ familyMemberId: { not: null } }, { bookingForOther: true }],
    },
    select: { appointmentId: true },
  });
  return new Set(rows.map((r) => r.appointmentId).filter((id): id is string => Boolean(id)));
}

export type NewAppointmentPatientInput = {
  /** An already-linked source appointment (follow-up, cross-border request).
   *  Its link is propagated verbatim — the patient of a follow-up is the
   *  patient of the consultation it follows up from, never the payer. */
  sourceAppointmentId?: string | null;
  /** Approved dependent this line was booked for. When set it is the ONLY
   *  source consulted: the surrounding email is frequently the purchaser's. */
  familyMemberId?: string | null;
  /** The ACTUAL patient's own email. Callers that hold a separate purchaser
   *  address must pass null rather than substituting it when the booking is
   *  for someone else — see `complete-order-payment.service.ts`. */
  patientEmail?: string | null;
};

/**
 * Resolve the `PatientProfile.id` to stamp on an appointment being created.
 *
 * Returns null whenever the patient cannot be identified without guessing.
 * A null link is correct and expected (guest bookings, dependents with no
 * profile yet); readers treat it conservatively.
 */
export async function resolvePatientProfileIdForNewAppointment(
  client: PatientLinkClient,
  input: NewAppointmentPatientInput,
): Promise<string | null> {
  // 1. Propagate from the source appointment. Already resolved once, by these
  //    same rules — re-deriving it from the payer would be a regression.
  if (input.sourceAppointmentId) {
    const source = await client.appointment.findUnique({
      where: { id: input.sourceAppointmentId },
      select: { patientProfileId: true },
    });
    if (source?.patientProfileId) return source.patientProfileId;
  }

  // 2. Approved dependent. No email fallback from here: a family line's
  //    surrounding email is often the purchaser's, and pointing a dependent's
  //    consultation at the purchaser's chart is the exact disclosure this
  //    column exists to prevent. A dependent with no profile stays null.
  if (input.familyMemberId) {
    const member = await client.familyMember.findUnique({
      where: { id: input.familyMemberId },
      select: { patientProfileId: true },
    });
    return member?.patientProfileId ?? null;
  }

  // 3. No dependent record and no patient email of their own — nothing
  //    identifies them. Fail closed rather than reach for the payer.
  const email = input.patientEmail?.trim().toLowerCase();
  if (!email) return null;

  // 4. Exact, unique match on the patient's own email. `PatientProfile.email`
  //    is UNIQUE, so this can never be ambiguous, and an anonymized profile
  //    holds a `deleted-<id>@removed.invalid` tombstone that no real booking
  //    email can collide with.
  const profile = await client.patientProfile.findUnique({
    where: { email },
    select: { id: true },
  });
  return profile?.id ?? null;
}

/**
 * Resolve the patient behind an appointment.
 *
 * The stored link wins and needs no corroboration. Everything below it is for
 * legacy rows only and answers one question: is there evidence this
 * consultation was for the account holder THEMSELVES?
 *
 * Email alone is not that evidence, and neither is the account. A dependent
 * with no address of their own leaves the appointment carrying the PURCHASER's
 * `email` AND `userId`, so a row booked for somebody else is byte-identical to
 * a self-booking on both columns. The distinguishing signal lives on the order
 * line — `OrderItem.familyMemberId` / `bookingForOther` — and it is checked
 * FIRST, because the cost of getting this wrong is printing the payer's
 * government-ID numbers and address onto a dependent's prescription.
 *
 * A legacy fallback therefore requires ALL of:
 *   1. no stored link (otherwise the link is simply used);
 *   2. no order line marking the appointment as for a dependent or for
 *      someone else;
 *   3. `Appointment.userId` present — a guest row identifies nobody;
 *   4. a profile owned by that same account (`PatientProfile.userId`);
 *   5. that profile's address equal to the appointment's, normalized.
 *
 * Anything short of all five is null. Null is a correct, expected answer —
 * guest bookings, dependents with no profile — and every caller treats it
 * conservatively rather than substituting a guess.
 */
export async function resolvePatientProfileIdForAppointmentId(
  appointmentId: string,
): Promise<string | null> {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { patientProfileId: true, email: true, userId: true },
  });
  if (!appt) return null;
  if (appt.patientProfileId) return appt.patientProfileId;

  // An unclaimed guest row names no account, so nothing corroborates the
  // address. Email reuse is not identity proof: the address may since have
  // been released by an anonymized patient and taken by someone new.
  if (!appt.userId) return null;

  // Booked for a dependent or explicitly for someone else. The purchaser is
  // not the patient, and no legacy heuristic may say otherwise.
  const bookedForOthers = await appointmentIdsBookedForSomeoneElse(prisma, [appointmentId]);
  if (bookedForOthers.has(appointmentId)) return null;

  // The account's own profile, with the address agreeing. `PatientProfile.userId`
  // is unique, so this is one concrete candidate or none.
  const profile = await prisma.patientProfile.findUnique({
    where: { userId: appt.userId },
    select: { id: true, email: true },
  });
  if (!profile) return null;
  if (profile.email.trim().toLowerCase() !== appt.email.trim().toLowerCase()) return null;
  return profile.id;
}

/**
 * The distinct patients one doctor's UNLINKED appointments at an address can be
 * proven to belong to, together with the exact appointments that prove it.
 *
 * Same five conditions as `resolvePatientProfileIdForAppointmentId`, applied to
 * a whole set at once rather than row by row: an account on the appointment, no
 * order line marking it booked for a dependent or for someone else, and that
 * account's own profile carrying the same normalized address. A tombstoned
 * profile therefore matches nothing — which is the point, since the address it
 * released now belongs to somebody else.
 *
 * The appointment ids come back alongside the profile because a caller that
 * merely learns "patient P is provable here" cannot then pick a row by address
 * without reintroducing the mix-up: at a reused address the doctor's OTHER rows
 * at the same string can belong to somebody else. These are the exact rows that
 * satisfied every condition for that one patient, and the only ones a caller
 * may treat as theirs.
 *
 * Returns one entry per distinct provable patient, so the caller can require
 * exactly one. Row order is never a tie-breaker.
 */
export async function provableLegacyAppointmentsForDoctor(
  email: string,
  doctorId: string,
): Promise<Map<string, string[]>> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return new Map();
  const rows = await prisma.appointment.findMany({
    where: {
      doctorId,
      patientProfileId: null,
      email: { equals: normalizedEmail, mode: "insensitive" },
      // A guest row identifies nobody, and `userId` is the only account this
      // can corroborate against.
      userId: { not: null },
    },
    select: { id: true, userId: true },
    // No `take`. The rows that will be subtracted are only identifiable after
    // the order-line lookup below, so a cap here would cap correctness the way
    // it did in `doctorHasTreatmentRelationship` — a genuine self-booking
    // sitting behind a run of dependent rows would never be seen.
  });
  if (rows.length === 0) return new Map();

  const bookedForOthers = await appointmentIdsBookedForSomeoneElse(
    prisma,
    rows.map((r) => r.id),
  );
  const appointmentsByAccount = new Map<string, string[]>();
  for (const row of rows) {
    if (bookedForOthers.has(row.id) || !row.userId) continue;
    const existing = appointmentsByAccount.get(row.userId);
    if (existing) existing.push(row.id);
    else appointmentsByAccount.set(row.userId, [row.id]);
  }
  if (appointmentsByAccount.size === 0) return new Map();

  // `PatientProfile.userId` is unique, so this is at most one profile per
  // account. The address still has to agree: an account whose profile holds a
  // different address was not the patient of a row carrying this one.
  const profiles = await prisma.patientProfile.findMany({
    where: { userId: { in: [...appointmentsByAccount.keys()] } },
    select: { id: true, userId: true, email: true },
  });
  const proven = new Map<string, string[]>();
  for (const profile of profiles) {
    if (!profile.userId) continue;
    if (profile.email.trim().toLowerCase() !== normalizedEmail) continue;
    proven.set(profile.id, appointmentsByAccount.get(profile.userId) ?? []);
  }
  return proven;
}

/**
 * A patient AND the appointment that proves the relationship, resolved together.
 *
 * Resolving these two independently is its own defect. The profile used to be
 * derived from every appointment sharing an address while the appointment id
 * handed to `guardMedicalRead` was picked separately as "newest row at this
 * address" — so at a reused address the audit row could name patient A's chart
 * and patient B's consultation. An appointment id is evidence of a treatment
 * relationship; it is only evidence about the patient it actually belongs to.
 *
 * `appointmentId` is therefore always an appointment that resolves to
 * `patientProfileId` by the rules in this file: a durable link whose
 * `Appointment.patientProfileId` equals it, or the exact legacy row that
 * satisfied all five corroboration conditions. It is null in one case only —
 * the admin shape, where the sole candidate is the live profile holding the
 * address and no appointment was involved at all.
 */
export type PatientContext = {
  patientProfileId: string;
  appointmentId: string | null;
};

/**
 * Resolve the patient behind a `:email` route parameter.
 *
 * The doctor and admin patient surfaces are keyed by the address the portal
 * holds, which comes from `Appointment.email` — a value anonymization
 * deliberately RETAINS while it tombstones `PatientProfile.email`. So a direct
 * profile lookup is right until the patient is anonymized and wrong the moment
 * they are, which is how a retained record became unreachable to its own
 * treating doctor.
 *
 * An address is not an identity. Anonymization RELEASES it, so the same string
 * can name an old retained patient and a new registrant at once. The linked
 * appointments are the stronger evidence — they say who was actually treated —
 * so they are consulted BEFORE the live profile, never after. Reading the
 * direct profile first would let a new registrant silently shadow the older
 * patient the address still points at, which is the wrong chart returned with
 * no sign anything was ambiguous.
 *
 * Two shapes, because the two callers ask different questions:
 *
 * - `doctorId` set (doctor portal): only this doctor's own appointments are
 *   candidates, pooled from BOTH sources — their linked rows and their unlinked
 *   rows put through the same corroboration every other legacy path uses
 *   (`provableLegacyAppointmentsForDoctor`). Exactly one distinct patient
 *   across the pool resolves; zero or several is null. Pooling matters: a
 *   durable link used to short-circuit, so a doctor holding one linked
 *   appointment for patient A and a separately provable legacy self-booking for
 *   patient B at the same historical address resolved silently to A, with B's
 *   equally good evidence never consulted. Two provable patients behind one
 *   string is ambiguous however each was proven. The live profile that merely
 *   holds the address today is never a candidate here: owning an address is not
 *   evidence of having been treated, since anonymization releases it and the
 *   current holder can be a stranger who registered after the consultation.
 *
 * - No `doctorId` (admin): the live profile and every distinct linked profile
 *   are pooled as candidates. Exactly one distinct candidate resolves; zero or
 *   several fail closed. Pooling is the point — an address held by a new
 *   registrant AND still linked to an older patient is genuinely ambiguous,
 *   and answering with either one would be a guess.
 *
 * `doctorId` narrows the candidate set; it is NOT the authorization check,
 * which every caller still performs separately.
 */
export async function resolvePatientContextByPatientEmail(
  email: string,
  opts: { doctorId?: string | null } = {},
): Promise<PatientContext | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const linkedRows = await prisma.appointment.findMany({
    where: {
      email: { equals: normalized, mode: "insensitive" },
      patientProfileId: { not: null },
      ...(opts.doctorId ? { doctorId: opts.doctorId } : {}),
    },
    select: { id: true, patientProfileId: true },
    // No `take`, and the reduction to one row per patient happens below rather
    // than through `distinct`. A cap applied BEFORE the reduction would hide
    // the ambiguity in exactly the case that matters: an address with two of
    // patient A's appointments and one of patient B's could come back as a
    // single patient and resolve. The result is bounded by the appointments one
    // doctor (or, for admin, the whole system) holds at one address.
  });

  // First row per distinct patient. The pairing is what makes it usable: the
  // appointment kept is one that carries this very `patientProfileId`, so it
  // proves the relationship for THAT patient and no other.
  const candidates = new Map<string, string | null>();
  for (const row of linkedRows) {
    if (!row.patientProfileId) continue;
    if (!candidates.has(row.patientProfileId)) candidates.set(row.patientProfileId, row.id);
  }

  if (opts.doctorId) {
    const legacy = await provableLegacyAppointmentsForDoctor(normalized, opts.doctorId);
    for (const [profileId, appointmentIds] of legacy) {
      if (!candidates.has(profileId)) candidates.set(profileId, appointmentIds[0] ?? null);
    }
  } else {
    const direct = await prisma.patientProfile.findUnique({
      where: { email: normalized },
      select: { id: true },
    });
    if (direct && !candidates.has(direct.id)) candidates.set(direct.id, null);
  }

  if (candidates.size !== 1) return null; // 0 = unknown, 2+ = ambiguous
  const [[patientProfileId, appointmentId]] = [...candidates];
  return { patientProfileId, appointmentId };
}

/**
 * The patient alone, for callers that have no use for the proving appointment.
 * Same rules, same failure modes — see `resolvePatientContextByPatientEmail`.
 */
export async function resolvePatientProfileIdByPatientEmail(
  email: string,
  opts: { doctorId?: string | null } = {},
): Promise<string | null> {
  const context = await resolvePatientContextByPatientEmail(email, opts);
  return context?.patientProfileId ?? null;
}

/**
 * Link the appointments that provably belong to `patientProfileId`.
 *
 * THE only place that claims unlinked appointments for a profile. Every caller
 * — anonymization, the guest-account claim, the profile upsert — routes through
 * here so the corroboration rules live in one place; a second hand-rolled copy
 * is how one of them silently ends up weaker than the others.
 *
 * Three conditions, all required:
 *   1. the appointment's own address matches the profile's;
 *   2. the purchaser account agrees (both the profile's user, or both absent);
 *   3. no order line marks the appointment as booked for someone else.
 *
 * (3) is not redundant with (1) and (2): a dependent with no email on file
 * leaves the appointment carrying the PURCHASER's address and account, so the
 * first two conditions pass on a consultation that belongs to somebody else.
 * Attributing it to the payer would put the dependent's treating doctor on the
 * payer's chart — the exact cross-patient disclosure this column exists to
 * prevent.
 *
 * Rows that already carry a link are never rewritten, which is what keeps a
 * released email from moving an older patient's consultation onto whoever
 * registers with that address next.
 *
 * Accepts a transaction client so anonymization can link before it tombstones
 * the email it matches on, and the plain client for the claim paths.
 *
 * @returns how many appointments were linked.
 */
export async function linkAppointmentsToPatientProfile(
  client: Prisma.TransactionClient,
  params: { patientProfileId: string; email: string; userId: string | null },
): Promise<number> {
  const email = params.email.trim().toLowerCase();
  if (!email) return 0;
  const candidates = await client.appointment.findMany({
    where: {
      patientProfileId: null,
      email: { equals: email, mode: "insensitive" },
      // `userId: null` is Prisma's IS NULL, so this covers both the claimed
      // account and the never-claimed guest row without a second query.
      userId: params.userId,
    },
    select: { id: true },
  });
  if (candidates.length === 0) return 0;

  const bookedForOthers = await appointmentIdsBookedForSomeoneElse(
    client,
    candidates.map((a) => a.id),
  );
  const claimable = candidates
    .map((a) => a.id)
    .filter((id) => !bookedForOthers.has(id));
  if (claimable.length === 0) return 0;

  const result = await client.appointment.updateMany({
    where: { id: { in: claimable }, patientProfileId: null },
    data: { patientProfileId: params.patientProfileId },
  });
  return result.count;
}
