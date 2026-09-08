// `.env.test` FIRST, then the hard database-target guard — the same module the
// runner loads via `--import`, imported here as well so a FOCUSED run of this
// one file (`node --test <this file>`) is refused against a non-local database
// before a single fixture row is created or deleted. It never prints the
// contents of any environment file.
import "../test-guard.js";

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { setEmailCaptureHook } from "../lib/email/send-email.js";
import { deleteAuditLogs, deleteMedicalAccessLogs } from "../test-utils/audit-cleanup.js";
import { uniqueCurrencyCode } from "../test-utils/unique-currency-code.js";

/**
 * Group 2 amendment — a released email address must not hand a doctor the NEW
 * holder's chart, and the identity-verification summary is PHI like any other.
 *
 * The topology this pins is the residual one the link work could not reach:
 * a PRE-EXISTING unlinked legacy appointment. Anonymization now stamps
 * `Appointment.patientProfileId` before it tombstones `PatientProfile.email`,
 * so it creates no new ones — but rows written before that ordering existed are
 * still out there, and they are exactly the rows where "who holds this address
 * today" is the wrong question:
 *
 *   1. patient A books with doctor D; the row carries no patient link;
 *   2. A is anonymized, so `PatientProfile.email` is tombstoned and the address
 *      is released;
 *   3. patient B registers with that same address;
 *   4. D opens the historical appointment by address.
 *
 * The doctor-scoped resolver used to answer B, because B currently owns the
 * address — and `GET /api/doctor/patients/:email/identity-verification` then
 * disclosed B's verification state to A's former doctor with no medical-access
 * guard between the two. Two independent defects, fixed independently:
 *
 *   - identity is resolved from EVIDENCE (this doctor's linked appointments,
 *     then their unlinked rows corroborated by account + address + no
 *     booked-for-other order line), never from current ownership of an address;
 *   - the summary route runs `guardMedicalRead` before it reads verification
 *     state, like the image route beside it.
 *
 * ENFORCE mode, so a denial is a real 403. Synthetic fixtures only; the leak
 * assertions are on opaque ids and a synthetic reference marker.
 */
describe("doctor identity verification — a reused email never resolves to the new holder", () => {
  let app: FastifyInstance | null = null;
  let bootError: unknown = null;
  let prisma: PrismaClient;
  let signAuthToken: typeof import("../utils/auth-session.js")["signAuthToken"];
  let envModule: typeof import("../config/env.js")["env"];
  let originalEnforce = false;
  let resolveByEmail: typeof import("../modules/patient-profile/appointment-patient-link.js")["resolvePatientProfileIdByPatientEmail"];
  let writeProfile: typeof import("../modules/patient-profile/patient-profile.service.js")["writePatientProfile"];
  let emailConflictError: typeof import("../modules/patient-profile/patient-profile.service.js")["PatientProfileEmailConflictError"];
  let profileNotFoundError: typeof import("../modules/patient-profile/patient-profile.service.js")["PatientProfileNotFoundError"];
  let notifyVerification: typeof import("../modules/identity-verification/notify-identity-verification.service.js")["notifyPatientVerificationRequested"];

  const uniq = `reuseiv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const currencyCode = uniqueCurrencyCode();

  let currencyId = "";
  let countryId = "";
  let countryCode = "";

  /** Doctor D — treated A years ago, has never met B. */
  let doctorId = "";
  let doctorUserId = "";
  let doctorCookie: Record<string, string> = {};
  /** A second doctor with a linked patient but NO confidentiality agreement,
   *  so the guard denies them on a patient they demonstrably treat. */
  let unsignedDoctorId = "";
  let unsignedDoctorCookie: Record<string, string> = {};

  const reusedEmail = `reused-${uniq}@test.local`;

  // A — the old holder. Tombstoned in place, leaving the legacy row unlinked:
  // this models a row written BEFORE anonymization learned to stamp the link,
  // which is the only population still exposed.
  let oldUserId = "";
  let oldProfileId = "";
  let legacyApptId = "";

  // B — the new registrant on the released address.
  let newProfileId = "";
  const newHolderMarker = `SYNTH-NEWHOLDER-${uniq}`.slice(0, 40);

  // C — an ordinary linked patient of D, the legitimate-access control.
  let linkedUserId = "";
  let linkedProfileId = "";
  let linkedApptId = "";
  const linkedEmail = `linked-${uniq}@test.local`;
  const linkedMarker = `SYNTH-LINKED-${uniq}`.slice(0, 40);

  // E — a legacy self-booking of D's that IS provable: account, address and no
  // booked-for-other order line. It must keep working after the fix.
  let legacySelfUserId = "";
  let legacySelfProfileId = "";
  let legacySelfApptId = "";
  const legacySelfEmail = `legacyself-${uniq}@test.local`;

  // F — a legacy row that is a dependent booking wearing the purchaser's own
  // address and account. It must stay closed.
  let payerUserId = "";
  let payerProfileId = "";
  let payerApptId = "";
  let payerOrderId = "";
  let payerFamilyMemberId = "";
  const payerEmail = `payer-${uniq}@test.local`;

  // G — a retained (anonymized) patient whose appointment IS durably linked, so
  // the doctor of record still reaches the chart, and whose released address has
  // since been taken by somebody else. This is the topology every "tombstoned"
  // case below needs: identity resolves, but to a record that must not be
  // written to, must not be duplicated, and must not be contacted.
  let retainedUserId = "";
  let retainedProfileId = "";
  let retainedApptId = "";
  const retainedEmail = `retained-${uniq}@test.local`;
  const retainedPhone = `+35190000${String(Date.now()).slice(-4)}`;
  const retainedDocMarker = `SYNTH-RETAINEDDOC-${uniq}`.slice(0, 40);
  const retainedApptDocKey = `synth/retained-appt-${uniq}`.slice(0, 60);
  const retainedGenDocName = `SYNTH-RETAINEDGEN-${uniq}.pdf`.slice(0, 60);

  // G2 — the same shape as G, except the released address is still vacant.
  // That is the branch where "no chart at this address" and "a linked patient
  // whose chart is tombstoned" were the same answer, so the write went ahead
  // and opened a SECOND chart for a record that legally must not be duplicated.
  let retainedSoloUserId = "";
  let retainedSoloProfileId = "";
  const retainedSoloEmail = `retainedsolo-${uniq}@test.local`;

  // N — the new registrant on the address G released. Separate phone, separate
  // documents, separate everything.
  let retainedHolderProfileId = "";
  const retainedHolderPhone = `+35191111${String(Date.now()).slice(-4)}`;
  const retainedHolderDocMarker = `SYNTH-HOLDERDOC-${uniq}`.slice(0, 40);

  // H — a booking made for someone else, at an address NOBODY holds. Unresolved
  // identity with no live holder used to be the "go ahead and create" branch.
  let orphanDepApptId = "";
  let orphanDepOrderId = "";
  let orphanDepFamilyMemberId = "";
  const orphanDepEmail = `orphandep-${uniq}@test.local`;

  // I — one address, two provable patients: a durable link for one and a
  // separately provable legacy self-booking for the other. Ambiguous, and a
  // durable candidate must not silently hide the legacy one.
  let ambiguousLinkedProfileId = "";
  let ambiguousLinkedUserId = "";
  let ambiguousLegacyProfileId = "";
  let ambiguousLegacyUserId = "";
  const ambiguousEmail = `ambig-${uniq}@test.local`;
  const ambiguousLinkedEmail = `ambig-linked-${uniq}@test.local`;

  // K — a guest checkout: a headless chart at the address, and an appointment
  // carrying neither an account nor a durable link. Nothing corroborates it,
  // and nothing needs to: the address has exactly one claimant.
  let guestProfileId = "";
  const guestEmail = `guest-${uniq}@test.local`;
  const guestApptDocKey = `synth/guest-appt-${uniq}`.slice(0, 60);

  // J — a genuinely new patient: this doctor's own self-booking, no chart yet.
  let firstChartUserId = "";
  const firstChartEmail = `firstchart-${uniq}@test.local`;

  // R/S — the ownership-moved pair, exercised directly against the write
  // service because an HTTP round-trip cannot stage the interleaving.
  let reassignProfileId = "";
  let reassignHolderProfileId = "";
  const reassignEmail = `reassign-${uniq}@test.local`;
  const reassignMovedEmail = `reassign-moved-${uniq}@test.local`;

  // Documents for the legitimate archive read.
  const linkedDocMarker = `SYNTH-LINKEDDOC-${uniq}`.slice(0, 40);
  const linkedApptDocKey = `synth/linked-appt-${uniq}`.slice(0, 60);
  const linkedGenDocName = `SYNTH-LINKEDGEN-${uniq}.pdf`.slice(0, 60);

  /** An ADMIN who also carries a Doctor profile — the only actor the document
   *  archive admits, and the actor policy this work must not broaden. The
   *  archive is scoped to THEIR doctor profile, so the fixture appointments it
   *  is meant to find hang off `adminDoctorId`. */
  let adminDoctorId = "";
  let adminCookie: Record<string, string> = {};
  let linkedAdminApptId = "";
  let retainedAdminApptId = "";

  const profileIds: string[] = [];
  const userIds: string[] = [];

  const enc = (email: string) => encodeURIComponent(email);
  const get = (url: string, cookies: Record<string, string>) =>
    app!.inject({ method: "GET", url, cookies });

  async function makeDoctor(
    slug: string,
    opts: { confidentiality: boolean; role?: "DOCTOR" | "ADMIN" },
  ): Promise<{ doctorId: string; userId: string; cookie: Record<string, string> }> {
    const role = opts.role ?? "DOCTOR";
    // `User.doctorId` is unique, so an ADMIN who needs to reach the document
    // archive carries a Doctor profile of their OWN — the archive is scoped to
    // it, which is the actor policy this work must leave alone.
    const doctor = await prisma.doctor.create({
      data: { countryId, slug: `${slug}-${uniq}`, fullName: `Dr ${slug}`, title: "GP" },
    });
    const user = await prisma.user.create({
      data: {
        email: `${slug}-${uniq}@test.local`,
        passwordHash: "x",
        fullName: `Dr ${slug}`,
        role,
        doctorId: doctor.id,
        twoFactorVerifiedAt: new Date(),
      },
    });
    userIds.push(user.id);
    if (opts.confidentiality) {
      await prisma.doctorConfidentialityAgreement.create({
        data: {
          doctorId: doctor.id,
          agreementVersion: "1.0.0",
          accepted: true,
          acceptedAt: new Date(),
        },
      });
    }
    return {
      doctorId: doctor.id,
      userId: user.id,
      cookie: {
        gh_auth: signAuthToken({
          sub: user.id,
          role,
          email: user.email,
          tokenVersion: 0,
        }),
      },
    };
  }

  async function makePatient(
    email: string,
  ): Promise<{ profileId: string; userId: string }> {
    const user = await prisma.user.create({
      data: { email, passwordHash: "x", fullName: `Patient ${email}`, role: "PATIENT" },
    });
    userIds.push(user.id);
    const profile = await prisma.patientProfile.create({
      data: { email, userId: user.id, fullName: `Patient ${email}`, countryFolderCode: "PT" },
    });
    profileIds.push(profile.id);
    // Every one of these patients consents to direct access. That is
    // deliberate: it removes consent as the thing keeping the wrong chart shut,
    // so what the reused-email cases prove is that IDENTITY was resolved
    // correctly, not that authorization happened to fail for another reason.
    await prisma.patientConsent.create({
      data: {
        patientProfileId: profile.id,
        consentType: "MEDICAL_ACCESS_DIRECT",
        consentValue: true,
      },
    });
    return { profileId: profile.id, userId: user.id };
  }

  async function makeAppointment(data: {
    email: string;
    userId?: string | null;
    patientProfileId?: string | null;
    doctorId?: string | null;
    /** The two columns the verification notifier reads off an appointment.
     *  Set them where a test needs to prove they were NOT borrowed from a
     *  different patient's booking. */
    phone?: string | null;
    whatsappConsent?: boolean;
  }): Promise<string> {
    const appt = await prisma.appointment.create({
      data: {
        countryCode,
        consultationType: "GENERAL",
        fullName: "Reuse Fixture",
        email: data.email,
        consentAccepted: true,
        userId: data.userId ?? null,
        patientProfileId: data.patientProfileId ?? null,
        doctorId: data.doctorId === undefined ? doctorId : data.doctorId,
        status: "COMPLETED",
        phone: data.phone ?? null,
        ...(data.whatsappConsent === undefined
          ? {}
          : { whatsappConsent: data.whatsappConsent }),
      },
    });
    return appt.id;
  }

  /** A reviewed VERIFIED cycle, so the summary carries a marker that can only
   *  have come from this profile. */
  async function verifyIdentity(patientProfileId: string, referenceId: string) {
    await prisma.identityVerificationEvent.create({
      data: {
        patientProfileId,
        referenceId,
        status: "VERIFIED",
        method: "MANUAL_REVIEW",
        reviewedAt: new Date(),
      },
    });
    await prisma.patientProfile.update({
      where: { id: patientProfileId },
      data: { idVerificationStatus: "VERIFIED", idVerificationReviewedAt: new Date() },
    });
  }

  before(async () => {
    let candidate: FastifyInstance | null = null;
    try {
      prisma = (await import("../db/prisma.js")).prisma;
      signAuthToken = (await import("../utils/auth-session.js")).signAuthToken;
      envModule = (await import("../config/env.js")).env;
      resolveByEmail = (
        await import("../modules/patient-profile/appointment-patient-link.js")
      ).resolvePatientProfileIdByPatientEmail;
      const profileService = await import(
        "../modules/patient-profile/patient-profile.service.js"
      );
      writeProfile = profileService.writePatientProfile;
      emailConflictError = profileService.PatientProfileEmailConflictError;
      profileNotFoundError = profileService.PatientProfileNotFoundError;
      notifyVerification = (
        await import("../modules/identity-verification/notify-identity-verification.service.js")
      ).notifyPatientVerificationRequested;
      const { buildApp } = await import("../app.js");
      candidate = await buildApp();
      await prisma.$queryRawUnsafe("SELECT 1");
      app = candidate;
    } catch (error) {
      bootError = error;
      await candidate?.close();
      return;
    }

    originalEnforce = envModule.MEDICAL_ACCESS_ENFORCE;
    envModule.MEDICAL_ACCESS_ENFORCE = true;

    const currency = await prisma.currency.create({
      data: { code: currencyCode, symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;
    countryCode = `r${uniq}`.slice(0, 8).toLowerCase();
    const country = await prisma.country.create({
      data: {
        code: countryCode,
        name: `Reuse ${uniq}`,
        slug: `reuse-${uniq}`.toLowerCase(),
        legacyHomePath: `/lg-${uniq}`,
        teamPath: `/tm-${uniq}`,
        generalConsultationPath: `/gn-${uniq}`,
        specialistConsultationPath: `/sp-${uniq}`,
        currencyId,
      },
    });
    countryId = country.id;

    const treating = await makeDoctor("reusedoc", { confidentiality: true });
    doctorId = treating.doctorId;
    doctorUserId = treating.userId;
    doctorCookie = treating.cookie;

    const unsigned = await makeDoctor("unsigneddoc", { confidentiality: false });
    unsignedDoctorId = unsigned.doctorId;
    unsignedDoctorCookie = unsigned.cookie;

    // ── A: the old holder, then the tombstone ──────────────────────────────
    ({ profileId: oldProfileId, userId: oldUserId } = await makePatient(reusedEmail));
    legacyApptId = await makeAppointment({
      email: reusedEmail,
      userId: oldUserId,
      patientProfileId: null, // pre-existing legacy row: never linked
    });
    // The tombstone anonymization writes, applied directly so the appointment
    // stays unlinked — `anonymizePatient` would stamp the link and close the
    // hole under test. Both the profile and the login row release the address;
    // `User.email` is unique too, so B could not register otherwise.
    await prisma.patientProfile.update({
      where: { id: oldProfileId },
      data: {
        email: `deleted-${oldProfileId}@removed.invalid`,
        anonymizedAt: new Date(),
      },
    });
    await prisma.user.update({
      where: { id: oldUserId },
      data: { email: `deleted-${oldUserId}@removed.invalid` },
    });

    // ── B: the new registrant taking the released address ──────────────────
    ({ profileId: newProfileId } = await makePatient(reusedEmail));
    await verifyIdentity(newProfileId, newHolderMarker);
    // B also carries a global-network consent. That is the whole point: the
    // medical-access guard's GLOBAL_NETWORK branch (medical-access-guard.ts
    // §4e) allows ANY doctor without consulting the treatment relationship, so
    // once a stranger has been misidentified as the patient, authorization
    // says yes. Identity has to be right before the guard is asked.
    await prisma.patientConsent.create({
      data: {
        patientProfileId: newProfileId,
        consentType: "MEDICAL_ACCESS_GLOBAL_NETWORK",
        consentValue: true,
      },
    });

    // ── C: an ordinary linked patient of D ─────────────────────────────────
    ({ profileId: linkedProfileId, userId: linkedUserId } = await makePatient(linkedEmail));
    linkedApptId = await makeAppointment({
      email: linkedEmail,
      userId: linkedUserId,
      patientProfileId: linkedProfileId,
    });
    await verifyIdentity(linkedProfileId, linkedMarker);

    // ── E: a provable legacy self-booking (unlinked, but corroborated) ─────
    ({ profileId: legacySelfProfileId, userId: legacySelfUserId } =
      await makePatient(legacySelfEmail));
    legacySelfApptId = await makeAppointment({
      email: legacySelfEmail,
      userId: legacySelfUserId,
      patientProfileId: null,
    });

    // ── F: a dependent booking wearing the purchaser's address and account ─
    ({ profileId: payerProfileId, userId: payerUserId } = await makePatient(payerEmail));
    const familyMember = await prisma.familyMember.create({
      data: { primaryUserId: payerUserId, fullName: "Dependent Without Profile" },
    });
    payerFamilyMemberId = familyMember.id;
    payerApptId = await makeAppointment({
      email: payerEmail,
      userId: payerUserId,
      patientProfileId: null,
    });
    const order = await prisma.order.create({
      data: {
        orderNumber: `RIV-${uniq}`.slice(0, 40),
        email: payerEmail,
        fullName: "Reuse Payer",
        countryCode,
        currencyCode,
        userId: payerUserId,
        subtotalCents: 0,
        totalCents: 0,
      },
    });
    payerOrderId = order.id;
    await prisma.orderItem.create({
      data: {
        orderId: payerOrderId,
        kind: "GENERAL_CONSULTATION",
        name: "Dependent consultation",
        unitPriceCents: 0,
        quantity: 1,
        lineTotalCents: 0,
        appointmentId: payerApptId,
        familyMemberId: payerFamilyMemberId,
        bookingForOther: true,
      },
    });

    // ── An ADMIN with a Doctor profile of their own, for the archive ───────
    const adminActor = await makeDoctor("reuseadmin", {
      confidentiality: true,
      role: "ADMIN",
    });
    adminDoctorId = adminActor.doctorId;
    adminCookie = adminActor.cookie;

    // ── G: retained + anonymized, but DURABLY linked to doctor D ───────────
    ({ profileId: retainedProfileId, userId: retainedUserId } =
      await makePatient(retainedEmail));
    await prisma.patientProfile.update({
      where: { id: retainedProfileId },
      data: { phone: retainedPhone },
    });
    retainedApptId = await makeAppointment({
      email: retainedEmail,
      userId: retainedUserId,
      patientProfileId: retainedProfileId,
      whatsappConsent: true,
      phone: retainedPhone,
    });
    // The tombstone anonymization writes. Applied directly, so the appointment
    // keeps both its link and the address it was booked with — which is exactly
    // the state a real anonymization leaves behind now that it links first.
    await prisma.patientProfile.update({
      where: { id: retainedProfileId },
      data: {
        email: `deleted-${retainedProfileId}@removed.invalid`,
        anonymizedAt: new Date(),
      },
    });
    await prisma.user.update({
      where: { id: retainedUserId },
      data: { email: `deleted-${retainedUserId}@removed.invalid` },
    });
    await prisma.medicalDocument.create({
      data: {
        patientProfileId: retainedProfileId,
        uploadedByRole: "PATIENT",
        documentType: "REPORT",
        title: retainedDocMarker,
        fileKey: `synth/${retainedDocMarker}`,
        fileName: `${retainedDocMarker}.pdf`,
        mimetype: "application/pdf",
        byteSize: 1,
      },
    });
    // The archive reads the ADMIN's own doctor scope, so the appointment
    // documents hang off an appointment of theirs for the same patient.
    retainedAdminApptId = await makeAppointment({
      email: retainedEmail,
      userId: retainedUserId,
      patientProfileId: retainedProfileId,
      doctorId: adminDoctorId,
    });
    await prisma.appointmentDocument.create({
      data: {
        appointmentId: retainedAdminApptId,
        doctorId: adminDoctorId,
        label: retainedDocMarker,
        storageKey: retainedApptDocKey,
        mimetype: "application/pdf",
        byteSize: 1,
      },
    });
    await prisma.generatedDocument.create({
      data: {
        appointmentId: retainedAdminApptId,
        doctorId: adminDoctorId,
        patientEmail: retainedEmail,
        documentType: "OTHER",
        fileName: retainedGenDocName,
        storageKey: `synth/${retainedGenDocName}`,
      },
    });

    // ── G2: retained + linked, released address left vacant ────────────────
    ({ profileId: retainedSoloProfileId, userId: retainedSoloUserId } =
      await makePatient(retainedSoloEmail));
    await makeAppointment({
      email: retainedSoloEmail,
      userId: retainedSoloUserId,
      patientProfileId: retainedSoloProfileId,
    });
    await prisma.patientProfile.update({
      where: { id: retainedSoloProfileId },
      data: {
        email: `deleted-${retainedSoloProfileId}@removed.invalid`,
        anonymizedAt: new Date(),
      },
    });
    await prisma.user.update({
      where: { id: retainedSoloUserId },
      data: { email: `deleted-${retainedSoloUserId}@removed.invalid` },
    });

    // ── N: the new registrant on G's released address ──────────────────────
    ({ profileId: retainedHolderProfileId } = await makePatient(retainedEmail));
    await prisma.patientProfile.update({
      where: { id: retainedHolderProfileId },
      data: { phone: retainedHolderPhone },
    });
    await prisma.medicalDocument.create({
      data: {
        patientProfileId: retainedHolderProfileId,
        uploadedByRole: "PATIENT",
        documentType: "REPORT",
        title: retainedHolderDocMarker,
        fileKey: `synth/${retainedHolderDocMarker}`,
        fileName: `${retainedHolderDocMarker}.pdf`,
        mimetype: "application/pdf",
        byteSize: 1,
      },
    });

    // ── Documents for C, the legitimate archive read ───────────────────────
    await prisma.medicalDocument.create({
      data: {
        patientProfileId: linkedProfileId,
        uploadedByRole: "PATIENT",
        documentType: "REPORT",
        title: linkedDocMarker,
        fileKey: `synth/${linkedDocMarker}`,
        fileName: `${linkedDocMarker}.pdf`,
        mimetype: "application/pdf",
        byteSize: 1,
      },
    });
    linkedAdminApptId = await makeAppointment({
      email: linkedEmail,
      userId: linkedUserId,
      patientProfileId: linkedProfileId,
      doctorId: adminDoctorId,
    });
    await prisma.appointmentDocument.create({
      data: {
        appointmentId: linkedAdminApptId,
        doctorId: adminDoctorId,
        label: linkedDocMarker,
        storageKey: linkedApptDocKey,
        mimetype: "application/pdf",
        byteSize: 1,
      },
    });
    await prisma.generatedDocument.create({
      data: {
        appointmentId: linkedAdminApptId,
        doctorId: adminDoctorId,
        patientEmail: linkedEmail,
        documentType: "OTHER",
        fileName: linkedGenDocName,
        storageKey: `synth/${linkedGenDocName}`,
      },
    });

    // ── H: a booking for someone else at an address nobody holds ───────────
    orphanDepApptId = await makeAppointment({
      email: orphanDepEmail,
      userId: payerUserId,
      patientProfileId: null,
    });
    const orphanMember = await prisma.familyMember.create({
      data: { primaryUserId: payerUserId, fullName: "Orphan Dependent" },
    });
    orphanDepFamilyMemberId = orphanMember.id;
    const orphanOrder = await prisma.order.create({
      data: {
        orderNumber: `RIVO-${uniq}`.slice(0, 40),
        email: payerEmail,
        fullName: "Reuse Payer",
        countryCode,
        currencyCode,
        userId: payerUserId,
        subtotalCents: 0,
        totalCents: 0,
      },
    });
    orphanDepOrderId = orphanOrder.id;
    await prisma.orderItem.create({
      data: {
        orderId: orphanDepOrderId,
        kind: "GENERAL_CONSULTATION",
        name: "Dependent consultation",
        unitPriceCents: 0,
        quantity: 1,
        lineTotalCents: 0,
        appointmentId: orphanDepApptId,
        familyMemberId: orphanDepFamilyMemberId,
        bookingForOther: true,
      },
    });

    // ── I: one address, two independently provable patients ────────────────
    ({ profileId: ambiguousLinkedProfileId, userId: ambiguousLinkedUserId } =
      await makePatient(ambiguousLinkedEmail));
    await makeAppointment({
      email: ambiguousEmail,
      userId: ambiguousLinkedUserId,
      patientProfileId: ambiguousLinkedProfileId,
    });
    ({ profileId: ambiguousLegacyProfileId, userId: ambiguousLegacyUserId } =
      await makePatient(ambiguousEmail));
    await makeAppointment({
      email: ambiguousEmail,
      userId: ambiguousLegacyUserId,
      patientProfileId: null,
    });

    // ── J: a genuinely new patient of doctor D, no chart yet ───────────────
    const firstChartUser = await prisma.user.create({
      data: {
        email: firstChartEmail,
        passwordHash: "x",
        fullName: "First Chart Patient",
        role: "PATIENT",
      },
    });
    firstChartUserId = firstChartUser.id;
    userIds.push(firstChartUserId);
    await makeAppointment({
      email: firstChartEmail,
      userId: firstChartUserId,
      patientProfileId: null,
    });

    // ── K: a guest checkout, no account anywhere ───────────────────────────
    const guestProfile = await prisma.patientProfile.create({
      data: { email: guestEmail, fullName: "Guest Patient", countryFolderCode: "PT" },
    });
    guestProfileId = guestProfile.id;
    profileIds.push(guestProfileId);
    await prisma.patientConsent.create({
      data: {
        patientProfileId: guestProfileId,
        consentType: "MEDICAL_ACCESS_DIRECT",
        consentValue: true,
      },
    });
    const guestApptId = await makeAppointment({
      email: guestEmail,
      userId: null,
      patientProfileId: null,
      doctorId: adminDoctorId,
    });
    await prisma.appointmentDocument.create({
      data: {
        appointmentId: guestApptId,
        doctorId: adminDoctorId,
        label: "Guest upload",
        storageKey: guestApptDocKey,
        mimetype: "application/pdf",
        byteSize: 1,
      },
    });

    // ── R/S: the address moved on after the patient was resolved ───────────
    const reassigned = await makePatient(reassignEmail);
    reassignProfileId = reassigned.profileId;
    // The address moves off this patient — profile AND login row, exactly as a
    // real change of address does — and somebody else takes it.
    await prisma.patientProfile.update({
      where: { id: reassignProfileId },
      data: { email: reassignMovedEmail },
    });
    await prisma.user.update({
      where: { id: reassigned.userId },
      data: { email: reassignMovedEmail },
    });
    ({ profileId: reassignHolderProfileId } = await makePatient(reassignEmail));
  });

  after(async () => {
    if (!app) return;
    envModule.MEDICAL_ACCESS_ENFORCE = originalEnforce;
    for (const id of profileIds) {
      await deleteMedicalAccessLogs(prisma, { patientProfileId: id });
      await deleteAuditLogs(prisma, { entityId: id });
    }
    await deleteAuditLogs(prisma, { actorUserId: { in: userIds } });
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: [payerOrderId, orphanDepOrderId] } },
    });
    await prisma.order.deleteMany({
      where: { id: { in: [payerOrderId, orphanDepOrderId] } },
    });
    // Document rows reference the appointments, so they go first.
    await prisma.medicalDocument.deleteMany({
      where: { patientProfileId: { in: profileIds } },
    });
    await prisma.appointmentDocument.deleteMany({
      where: { doctorId: { in: [doctorId, unsignedDoctorId, adminDoctorId] } },
    });
    await prisma.generatedDocument.deleteMany({
      where: { doctorId: { in: [doctorId, unsignedDoctorId, adminDoctorId] } },
    });
    await prisma.appointment.deleteMany({ where: { countryCode } });
    await prisma.familyMember.deleteMany({
      where: { id: { in: [payerFamilyMemberId, orphanDepFamilyMemberId] } },
    });
    await prisma.identityVerificationEvent.deleteMany({
      where: { patientProfileId: { in: profileIds } },
    });
    await prisma.patientAlertLog.deleteMany({ where: { patientProfileId: { in: profileIds } } });
    await prisma.patientConsent.deleteMany({ where: { patientProfileId: { in: profileIds } } });
    await prisma.patientProfile.deleteMany({ where: { id: { in: profileIds } } });
    await prisma.loginOtp.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.doctorConfidentialityAgreement.deleteMany({
      where: { doctorId: { in: [doctorId, unsignedDoctorId, adminDoctorId] } },
    });
    await prisma.doctor.deleteMany({
      where: { id: { in: [doctorId, unsignedDoctorId, adminDoctorId] } },
    });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
    await app.close();
  });

  // ══ 1. The resolver itself ═══════════════════════════════════════════════
  describe("doctor-scoped resolution", () => {
    it("never returns the new holder of a released address", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const resolved = await resolveByEmail(reusedEmail, { doctorId });
      assert.notEqual(
        resolved,
        newProfileId,
        "current ownership of an address is not evidence of who this doctor treated",
      );
      assert.equal(
        resolved,
        null,
        "the only evidence is an unlinked row for a tombstoned profile — fail closed",
      );
      const legacy = await prisma.appointment.findUnique({
        where: { id: legacyApptId },
        select: { patientProfileId: true },
      });
      assert.equal(
        legacy!.patientProfileId,
        null,
        "and the historical row is still the unlinked one this case is about",
      );
    });

    it("still answers with the one patient this doctor has linked", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      assert.equal(await resolveByEmail(linkedEmail, { doctorId }), linkedProfileId);
    });

    it("still answers for a provable legacy self-booking", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      assert.equal(
        await resolveByEmail(legacySelfEmail, { doctorId }),
        legacySelfProfileId,
        "account + address agree and no order line says otherwise",
      );
      assert.ok(legacySelfApptId, "the corroborating row exists");
    });

    it("refuses a dependent booking that wears the purchaser's own address", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const resolved = await resolveByEmail(payerEmail, { doctorId });
      assert.notEqual(resolved, payerProfileId, "the payer is not the patient");
      assert.equal(
        resolved,
        null,
        "the order line marks it booked for someone else — nothing else identifies them",
      );
      assert.ok(payerApptId);
    });

    it("does not leak the address across doctors", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      assert.equal(
        await resolveByEmail(legacySelfEmail, { doctorId: unsignedDoctorId }),
        null,
        "another doctor's legacy row is not this doctor's evidence",
      );
    });
  });

  // ══ 2. The identity-verification summary route ═══════════════════════════
  describe("GET /api/doctor/patients/:email/identity-verification", () => {
    it("discloses nothing about the new holder to the old patient's doctor", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const res = await get(
        `/api/doctor/patients/${enc(reusedEmail)}/identity-verification`,
        doctorCookie,
      );
      assert.ok(
        res.statusCode === 403 || res.statusCode === 404,
        `must not disclose (got ${res.statusCode}: ${res.body})`,
      );
      assert.equal(res.body.includes(newProfileId), false, "no new-holder profile id");
      assert.equal(res.body.includes(newHolderMarker), false, "no new-holder reference id");
      assert.equal(res.body.includes(oldProfileId), false);
      assert.equal(res.body.includes(reusedEmail), false, "no address echoed back");
    });

    it("still serves the treating doctor their own linked patient", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const res = await get(
        `/api/doctor/patients/${enc(linkedEmail)}/identity-verification`,
        doctorCookie,
      );
      assert.equal(res.statusCode, 200, res.body);
      const iv = res.json().data.identityVerification;
      assert.equal(iv.status, "VERIFIED");
      assert.equal(iv.verifiedForPrescription, true);
      assert.equal(iv.latestEvent.referenceId, linkedMarker);
    });

    it("records the read through the medical-access audit path", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const logged = await prisma.medicalAccessLog.findFirst({
        where: {
          patientProfileId: linkedProfileId,
          accessedByUserId: doctorUserId,
          accessedResourceType: "ID_DOC",
          relatedAppointmentId: linkedApptId,
        },
        select: { consentLevelUsed: true, abnormalReason: true },
      });
      assert.ok(logged, "the summary read is logged like every other PHI read");
      // There is no `accessGranted` column; an allowed decision records the
      // consent level it used and leaves `abnormalReason` null.
      assert.equal(logged!.abnormalReason, null);
      assert.ok(logged!.consentLevelUsed, "the allowed decision recorded its basis");
    });

    it("is guarded: a treating doctor without a confidentiality agreement is refused", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      // This doctor has no appointment with the patient at all, so the route's
      // own ownership check already stops them. The point of the case is the
      // one below it: the guard must have run and recorded a denial.
      const shared = await makeAppointment({
        email: linkedEmail,
        userId: linkedUserId,
        patientProfileId: linkedProfileId,
        doctorId: unsignedDoctorId,
      });
      assert.ok(shared);

      const res = await get(
        `/api/doctor/patients/${enc(linkedEmail)}/identity-verification`,
        unsignedDoctorCookie,
      );
      assert.equal(res.statusCode, 403, res.body);
      assert.equal(
        res.body.includes(linkedMarker),
        false,
        "no verification state survives a guard rejection",
      );
      assert.equal(res.body.includes("verifiedForPrescription"), false);

      const denied = await prisma.medicalAccessLog.findFirst({
        where: {
          patientProfileId: linkedProfileId,
          relatedAppointmentId: shared,
          abnormalReason: { not: null },
        },
        select: { abnormalReason: true },
      });
      // A denial has no boolean column of its own — it is recorded as the deny
      // reason in `abnormalReason`, which is what proves the guard ran.
      assert.ok(denied, "the guard evaluated and logged the denial");
    });
  });

  // ══ 3. The other address-keyed chart endpoints in the same file ══════════
  //
  // These three address their patient by EMAIL all the way down — the update
  // and the alert removal are writes keyed on the address, not on an id — so a
  // released address pointed them at the new holder's chart. The guard behind
  // them is not a substitute: its consent-driven allow branches never consult
  // the treatment relationship, so an ordinary broad consent on the new holder
  // authorizes a doctor who has never met them.
  describe("the address-keyed chart endpoints", () => {
    const patch = (
      email: string,
      body: Record<string, string | null>,
      cookies: Record<string, string>,
    ) =>
      app!.inject({
        method: "PATCH",
        url: `/api/doctor/patients/${enc(email)}/profile`,
        cookies,
        payload: body,
      });

    it("refuses to write onto the new holder's chart", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const before = await prisma.patientProfile.findUnique({
        where: { id: newProfileId },
        select: { clinicAlert: true, allergies: true },
      });
      const res = await patch(reusedEmail, { clinicAlert: "written by the wrong doctor" }, doctorCookie);
      assert.equal(res.statusCode, 404, res.body);
      const after = await prisma.patientProfile.findUnique({
        where: { id: newProfileId },
        select: { clinicAlert: true, allergies: true },
      });
      assert.deepEqual(after, before, "the new holder's chart is untouched");
    });

    it("refuses to read the new holder's alert history", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const res = await get(`/api/doctor/patients/${enc(reusedEmail)}/alert-log`, doctorCookie);
      assert.equal(res.statusCode, 404, res.body);
      assert.equal(res.body.includes(newProfileId), false);
    });

    it("refuses to remove an alert from the new holder's chart", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const res = await app!.inject({
        method: "POST",
        url: `/api/doctor/patients/${enc(reusedEmail)}/alerts/clinic/remove`,
        cookies: doctorCookie,
        payload: { note: "synthetic removal attempt" },
      });
      assert.equal(res.statusCode, 404, res.body);
    });

    it("still lets the treating doctor edit and read their own patient's chart", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const written = await patch(
        linkedEmail,
        { clinicAlert: "synthetic clinic note" },
        doctorCookie,
      );
      assert.equal(written.statusCode, 200, written.body);
      assert.equal(written.json().data.profile.clinicAlert, "synthetic clinic note");

      const log = await get(`/api/doctor/patients/${enc(linkedEmail)}/alert-log`, doctorCookie);
      assert.equal(log.statusCode, 200, log.body);
      assert.ok(Array.isArray(log.json().data.entries));
    });
  });

  // ══ 4. Writes never re-derive their target from the address ══════════════
  //
  // `{ ok: true, profile: null }` used to mean five different things at once:
  // a genuinely new patient, a linked patient whose profile email had been
  // TOMBSTONED, an unresolved dependent, an ambiguous address, and an address
  // whose holder had simply moved on. PATCH then skipped the guard and called
  // an upsert KEYED ON THE EMAIL, which for the middle three created a brand
  // new chart at the address — a duplicate of a record that legally must not be
  // duplicated, or a chart assembled out of the purchaser's details.
  describe("PATCH never creates or moves a chart it did not resolve", () => {
    const patchProfile = (
      email: string,
      body: Record<string, string | null>,
      cookies: Record<string, string>,
    ) =>
      app!.inject({
        method: "PATCH",
        url: `/api/doctor/patients/${enc(email)}/profile`,
        cookies,
        payload: body,
      });

    const chartsAt = (email: string) =>
      prisma.patientProfile.findMany({ where: { email }, select: { id: true } });

    it("does not duplicate a linked patient whose profile email was tombstoned", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      // The doctor DOES resolve this patient — the durable link survives the
      // tombstone, which is the retained-record access this batch preserves.
      // Nobody has taken the released address, so "no chart here" and "the
      // chart is tombstoned" used to be indistinguishable, and the write went
      // ahead and opened a second one.
      assert.equal(
        await resolveByEmail(retainedSoloEmail, { doctorId }),
        retainedSoloProfileId,
        "the durable link still reaches the retained record",
      );
      assert.equal(
        (await chartsAt(retainedSoloEmail)).length,
        0,
        "the address it released is vacant",
      );
      const before = await prisma.patientProfile.findUnique({
        where: { id: retainedSoloProfileId },
        select: { clinicAlert: true, preferredPharmacy: true, updatedAt: true },
      });

      const res = await patchProfile(
        retainedSoloEmail,
        { clinicAlert: "written onto a retained record" },
        doctorCookie,
      );
      // Editing an erased record would undo the erasure; creating a second one
      // at the address it released is the duplicate. Neither, and say which.
      assert.equal(res.statusCode, 409, res.body);

      assert.deepEqual(
        await prisma.patientProfile.findUnique({
          where: { id: retainedSoloProfileId },
          select: { clinicAlert: true, preferredPharmacy: true, updatedAt: true },
        }),
        before,
        "the retained record is untouched",
      );
      assert.equal(
        (await chartsAt(retainedSoloEmail)).length,
        0,
        "and no second chart appeared at the released address",
      );
    });

    it("does not write onto whoever took the released address instead", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const holderBefore = await prisma.patientProfile.findUnique({
        where: { id: retainedHolderProfileId },
        select: { clinicAlert: true, preferredPharmacy: true, updatedAt: true },
      });
      const res = await patchProfile(
        retainedEmail,
        { clinicAlert: "written onto the wrong chart" },
        doctorCookie,
      );
      assert.equal(res.statusCode, 409, res.body);
      assert.deepEqual(
        await prisma.patientProfile.findUnique({
          where: { id: retainedHolderProfileId },
          select: { clinicAlert: true, preferredPharmacy: true, updatedAt: true },
        }),
        holderBefore,
        "the new holder's chart is untouched",
      );
      const charts = await chartsAt(retainedEmail);
      assert.equal(charts.length, 1, "and no third chart was created");
      assert.equal(charts[0]!.id, retainedHolderProfileId);
    });

    it("creates nothing for a booking-for-other whose address nobody holds", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      assert.equal(
        await resolveByEmail(orphanDepEmail, { doctorId }),
        null,
        "an order line marks it booked for someone else",
      );
      assert.equal((await chartsAt(orphanDepEmail)).length, 0, "nobody is there to begin with");

      const res = await patchProfile(
        orphanDepEmail,
        { clinicAlert: "chart conjured from the purchaser" },
        doctorCookie,
      );
      assert.equal(res.statusCode, 404, res.body);
      assert.equal(
        (await chartsAt(orphanDepEmail)).length,
        0,
        "an unidentified dependent gets no chart at the address the payer used",
      );
      const payer = await prisma.patientProfile.findUnique({
        where: { id: payerProfileId },
        select: { clinicAlert: true },
      });
      assert.equal(payer!.clinicAlert, null, "and the purchaser's own chart is untouched");
      assert.ok(orphanDepApptId);
    });

    it("changes no chart when the address resolves ambiguously", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const snapshot = async () =>
        prisma.patientProfile.findMany({
          where: { id: { in: [ambiguousLinkedProfileId, ambiguousLegacyProfileId] } },
          select: { id: true, clinicAlert: true, statusAlert: true, updatedAt: true },
          orderBy: { id: "asc" },
        });
      const before = await snapshot();

      const res = await patchProfile(
        ambiguousEmail,
        { clinicAlert: "written into an ambiguity" },
        doctorCookie,
      );
      assert.equal(res.statusCode, 404, res.body);
      assert.deepEqual(await snapshot(), before, "neither candidate was written to");
      assert.equal(
        (await chartsAt(ambiguousEmail)).length,
        1,
        "and no third chart was created at the address",
      );
    });

    it("still lets the treating doctor edit a patient they legitimately resolve", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const res = await patchProfile(
        linkedEmail,
        { preferredPharmacy: "Synthetic Pharmacy" },
        doctorCookie,
      );
      assert.equal(res.statusCode, 200, res.body);
      assert.equal(res.json().data.profile.preferredPharmacy, "Synthetic Pharmacy");
      // Read back off the column — `preferredPharmacy` is not one of the
      // encrypted-at-rest fields, so this compares plaintext to plaintext.
      const row = await prisma.patientProfile.findUnique({
        where: { id: linkedProfileId },
        select: { preferredPharmacy: true },
      });
      assert.equal(
        row!.preferredPharmacy,
        "Synthetic Pharmacy",
        "and it landed on the resolved id",
      );
    });

    it("creates the first chart for a proven self-booking, and only then", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      assert.equal((await chartsAt(firstChartEmail)).length, 0);
      const res = await patchProfile(
        firstChartEmail,
        { preferredPharmacy: "First Chart Pharmacy" },
        doctorCookie,
      );
      assert.equal(res.statusCode, 200, res.body);
      const created = await chartsAt(firstChartEmail);
      assert.equal(created.length, 1, "exactly one chart, created not upserted");
      profileIds.push(created[0]!.id);
      const row = await prisma.patientProfile.findUnique({
        where: { id: created[0]!.id },
        select: { preferredPharmacy: true, userId: true },
      });
      assert.equal(row!.preferredPharmacy, "First Chart Pharmacy");
      assert.equal(
        row!.userId,
        firstChartUserId,
        "the account the eligibility proof established, carried onto the chart",
      );

      // Creating a chart the doctor can then never open again is the same
      // lock-out by another name: with no durable link and no account on the
      // row, the very next lookup at this address resolves to nobody.
      assert.equal(
        await resolveByEmail(firstChartEmail, { doctorId }),
        created[0]!.id,
        "the new chart resolves on the next request",
      );
      // The chart is now IDENTIFIED; whether the doctor may read it is the
      // guard's separate question, and a brand-new chart carries no consent
      // yet — so give it one, the way the patient would, and check the whole
      // path rather than stopping at the identity layer.
      await prisma.patientConsent.create({
        data: {
          patientProfileId: created[0]!.id,
          consentType: "MEDICAL_ACCESS_DIRECT",
          consentValue: true,
        },
      });
      const reopened = await get(
        `/api/doctor/patients/${enc(firstChartEmail)}/profile`,
        doctorCookie,
      );
      assert.equal(reopened.statusCode, 200, reopened.body);
      const again = await patchProfile(
        firstChartEmail,
        { preferredPharmacy: "Second Visit Pharmacy" },
        doctorCookie,
      );
      assert.equal(again.statusCode, 200, again.body);
      assert.equal(
        (await chartsAt(firstChartEmail)).length,
        1,
        "and the second edit updated it rather than creating another",
      );
    });
  });

  // ══ 5. The write service itself, where the interleaving lives ════════════
  //
  // An HTTP round-trip cannot stage "the address changed hands between the
  // identity resolution and the persistence" — the two happen microseconds
  // apart inside one handler. The window is real all the same, and the property
  // that closes it belongs to the write service: an id-keyed write addresses
  // one immutable row, and a create refuses rather than degrading into an
  // update of whoever appeared.
  describe("writePatientProfile — identity is the id, not the address", () => {
    it("writes to the resolved patient after the address moved to somebody else", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const holderBefore = await prisma.patientProfile.findUnique({
        where: { id: reassignHolderProfileId },
        select: { clinicAlert: true, preferredPharmacy: true, updatedAt: true },
      });

      const { profile } = await writeProfile(
        { kind: "id", patientProfileId: reassignProfileId },
        { preferredPharmacy: "Reassigned Pharmacy" },
        { actor: { userId: null, role: "DOCTOR" } },
      );
      assert.ok(profile);
      assert.equal(profile.id, reassignProfileId, "the id it was given, nothing else");
      assert.equal(profile.email, reassignMovedEmail);

      assert.deepEqual(
        await prisma.patientProfile.findUnique({
          where: { id: reassignHolderProfileId },
          select: { clinicAlert: true, preferredPharmacy: true, updatedAt: true },
        }),
        holderBefore,
        "the new holder of the old address is untouched",
      );
    });

    it("fails a first-chart create against a concurrently claimed address instead of updating it", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const holderBefore = await prisma.patientProfile.findUnique({
        where: { id: reassignHolderProfileId },
        select: { clinicAlert: true, preferredPharmacy: true, updatedAt: true },
      });

      await assert.rejects(
        () =>
          writeProfile(
            { kind: "create", email: reassignEmail },
            { preferredPharmacy: "Race Pharmacy" },
            { actor: { userId: null, role: "DOCTOR" } },
          ),
        emailConflictError,
        "a create must not silently become an update of the row that appeared",
      );

      assert.deepEqual(
        await prisma.patientProfile.findUnique({
          where: { id: reassignHolderProfileId },
          select: { clinicAlert: true, preferredPharmacy: true, updatedAt: true },
        }),
        holderBefore,
        "and the row that was already there is unchanged",
      );
    });

    it("refuses an id-keyed write to a chart that is gone", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      await assert.rejects(
        () =>
          writeProfile(
            { kind: "id", patientProfileId: `missing-${uniq}` },
            { preferredPharmacy: "Missing Pharmacy" },
            { actor: { userId: null, role: "DOCTOR" } },
          ),
        profileNotFoundError,
        "no address to fall back to, and no chart to invent",
      );
    });
  });

  // ══ 6. Ambiguity across the two kinds of evidence ════════════════════════
  describe("doctor-scoped resolution pools linked and legacy evidence", () => {
    it("fails closed when a durable link and a provable legacy row name different patients", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      // Each candidate is individually provable, by a different route: one has
      // the durable link, the other satisfies every legacy condition. A durable
      // candidate short-circuiting used to hide the second one entirely.
      assert.equal(
        await resolveByEmail(ambiguousEmail, { doctorId }),
        null,
        "two provable patients behind one address is ambiguous, however each was proven",
      );
      assert.notEqual(ambiguousLinkedProfileId, ambiguousLegacyProfileId);

      const res = await get(
        `/api/doctor/patients/${enc(ambiguousEmail)}/identity-verification`,
        doctorCookie,
      );
      assert.equal(res.statusCode, 404, res.body);
      assert.equal(res.body.includes(ambiguousLinkedProfileId), false);
      assert.equal(res.body.includes(ambiguousLegacyProfileId), false);
    });
  });

  // ══ 7. The document archive ══════════════════════════════════════════════
  //
  // The route resolved a profile, guarded ONLY when that resolution succeeded,
  // and then selected appointment documents by raw `doctorId + email` either
  // way. So an unresolved address still returned generated PDFs and storage
  // keys with no medical-access decision recorded, and a reused address could
  // pair one patient's uploads with another's appointment history.
  describe("GET /api/doctor/patients/:email/documents", () => {
    const markers = () => [
      retainedDocMarker,
      retainedApptDocKey,
      retainedGenDocName,
      retainedHolderDocMarker,
    ];

    it("returns nothing at an address whose identity is ambiguous", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      // Admin shape: the retained patient's durable link AND the live holder of
      // the released address are both candidates, so the address names two
      // people and resolves to neither.
      const res = await get(`/api/doctor/patients/${enc(retainedEmail)}/documents`, adminCookie);
      assert.equal(res.statusCode, 404, res.body);
      for (const marker of markers()) {
        assert.equal(res.body.includes(marker), false, `leaked ${marker}`);
      }
      assert.equal(res.body.includes(retainedProfileId), false);
      assert.equal(res.body.includes(retainedHolderProfileId), false);
    });

    it("serves one patient's archive, and only that patient's", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const res = await get(`/api/doctor/patients/${enc(linkedEmail)}/documents`, adminCookie);
      assert.equal(res.statusCode, 200, res.body);
      const data = res.json().data;
      assert.equal(
        data.patientUploads.some((u: { title: string }) => u.title === linkedDocMarker),
        true,
        "the patient's own uploads",
      );
      assert.equal(
        data.uploads.some((u: { storageKey: string }) => u.storageKey === linkedApptDocKey),
        true,
        "the appointment documents",
      );
      assert.equal(
        data.generated.some((g: { fileName: string }) => g.fileName === linkedGenDocName),
        true,
        "and the generated documents",
      );
      for (const marker of markers()) {
        assert.equal(res.body.includes(marker), false, `mixed in ${marker}`);
      }
    });

    it("does not assign an accountless guest booking to the profile at its email", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      // A guest checkout leaves both durable identity fields null. The live
      // profile at the address does not prove that the old guest row belongs to
      // it, even when no second claimant is currently visible.
      const res = await get(`/api/doctor/patients/${enc(guestEmail)}/documents`, adminCookie);
      assert.equal(res.statusCode, 200, res.body);
      const data = res.json().data;
      assert.equal(
        data.uploads.some((u: { storageKey: string }) => u.storageKey === guestApptDocKey),
        false,
        "an accountless guest row is not identity evidence",
      );
      for (const marker of markers()) {
        assert.equal(res.body.includes(marker), false, `mixed in ${marker}`);
      }
    });

    it("keeps the archive admin-only", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const res = await get(`/api/doctor/patients/${enc(linkedEmail)}/documents`, doctorCookie);
      assert.equal(res.statusCode, 403, res.body);
      assert.equal(res.body.includes(linkedDocMarker), false);
    });
  });

  // ══ 8. The verification request must reach the patient it was written to ══
  //
  // The route resolved retained patient A and then handed the notifier the URL
  // ADDRESS. The notifier re-derived everything from it — the profile by
  // `findFirst` on the address, and the appointment carrying the phone, the
  // WhatsApp consent, the country and the language by the same address — so
  // once A had released the address and B had taken it, the request was written
  // to A and the message was addressed to B.
  describe("identity-verification request notification", () => {
    it("contacts nobody when the resolved patient is a retained record", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const captured: { to: string; subject: string; text?: string }[] = [];
      setEmailCaptureHook((input) => {
        captured.push({ to: input.to, subject: input.subject, text: input.text });
      });
      try {
        const res = await app!.inject({
          method: "POST",
          url: `/api/doctor/patients/${enc(retainedEmail)}/identity-verification/request`,
          cookies: doctorCookie,
          payload: {},
        });
        // The doctor's own patient here IS the retained record, so the request
        // is refused at the write rather than recorded — and the message that
        // used to follow it never gets composed.
        assert.equal(res.statusCode, 409, res.body);

        const holder = await prisma.patientProfile.findUnique({
          where: { id: retainedHolderProfileId },
          select: { idVerifyRequestedAt: true, idVerificationStatus: true },
        });
        assert.equal(
          holder!.idVerifyRequestedAt,
          null,
          "nothing was stamped onto the new holder of the address",
        );
        const retained = await prisma.patientProfile.findUnique({
          where: { id: retainedProfileId },
          select: { idVerifyRequestedAt: true },
        });
        assert.equal(
          retained!.idVerifyRequestedAt,
          null,
          "and nothing onto the erased record either",
        );

        // Nothing was addressed to anyone. Before the fix this composed an
        // email to the address the NEW holder now owns.
        assert.deepEqual(captured, [], "no email was composed, let alone sent");
        assert.equal(
          res.body.includes(retainedHolderPhone),
          false,
          "the new holder's phone is nowhere in the response",
        );
        assert.equal(res.body.includes(retainedEmail), false, "no address echoed back");
      } finally {
        setEmailCaptureHook(null);
      }
    });

    it("refuses to stamp a verification decision onto an erased record", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      // The durable link reaches a retained record on purpose, so these two
      // endpoints — the only ones that MUTATE verification state — have to
      // refuse it explicitly, exactly as the profile PATCH does. Reading the
      // same chart stays allowed.
      const before = await prisma.patientProfile.findUnique({
        where: { id: retainedSoloProfileId },
        select: { idVerificationStatus: true, idVerifyRequestedAt: true, idVerifyRequestedBy: true },
      });
      const requested = await app!.inject({
        method: "POST",
        url: `/api/doctor/patients/${enc(retainedSoloEmail)}/identity-verification/request`,
        cookies: doctorCookie,
        payload: {},
      });
      assert.equal(requested.statusCode, 409, requested.body);

      const reviewed = await app!.inject({
        method: "POST",
        url: `/api/doctor/patients/${enc(retainedSoloEmail)}/identity-verification/review`,
        cookies: doctorCookie,
        payload: { eventId: `synthetic-${uniq}`, status: "VERIFIED" },
      });
      assert.equal(reviewed.statusCode, 409, reviewed.body);

      assert.deepEqual(
        await prisma.patientProfile.findUnique({
          where: { id: retainedSoloProfileId },
          select: {
            idVerificationStatus: true,
            idVerifyRequestedAt: true,
            idVerifyRequestedBy: true,
          },
        }),
        before,
        "the erased record's verification state is untouched",
      );

      // The read side of the same chart still works — that is the retained
      // access this batch exists to preserve.
      const summary = await get(
        `/api/doctor/patients/${enc(retainedSoloEmail)}/identity-verification`,
        doctorCookie,
      );
      assert.equal(summary.statusCode, 200, summary.body);
    });

    it("suppresses delivery for an anonymized patient rather than reaching the address holder", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const captured: string[] = [];
      setEmailCaptureHook((input) => captured.push(input.to));
      try {
        const result = await notifyVerification({
          patientProfileId: retainedProfileId,
          appointmentId: retainedApptId,
          doctorName: "Dr Reuse",
        });
        assert.equal(result.missingContact, true, "a truthful unavailable result");
        assert.deepEqual(result.sent, []);
        assert.deepEqual(result.failed, []);
        assert.deepEqual(captured, [], "and no recipient was ever composed");
      } finally {
        setEmailCaptureHook(null);
      }
    });

    it("still reaches an ordinary patient, at their own profile address", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const captured: string[] = [];
      setEmailCaptureHook((input) => captured.push(input.to));
      try {
        const result = await notifyVerification({
          patientProfileId: linkedProfileId,
          appointmentId: linkedApptId,
          doctorName: "Dr Reuse",
        });
        assert.equal(result.missingContact, false);
        assert.deepEqual(captured, [linkedEmail], "the resolved patient's own address");
      } finally {
        setEmailCaptureHook(null);
      }
    });

    it("ignores an appointment that does not belong to the patient", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const captured: string[] = [];
      setEmailCaptureHook((input) => captured.push(input.to));
      try {
        // The retained patient's appointment, handed in alongside a different
        // patient's id. It carries a phone and a WhatsApp consent that are not
        // theirs, and must contribute neither.
        const result = await notifyVerification({
          patientProfileId: linkedProfileId,
          appointmentId: retainedApptId,
          doctorName: "Dr Reuse",
        });
        assert.deepEqual(captured, [linkedEmail], "still only the patient's own address");
        assert.equal(
          result.sent.includes("whatsapp"),
          false,
          "and no WhatsApp on somebody else's consent",
        );
      } finally {
        setEmailCaptureHook(null);
      }
    });
  });
});
