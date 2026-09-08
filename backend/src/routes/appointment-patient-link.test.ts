import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { deleteAuditLogs, deleteMedicalAccessLogs } from "../test-utils/audit-cleanup.js";
import { uniqueCurrencyCode } from "../test-utils/unique-currency-code.js";
import {
  AppointmentPatientLinkConflictError,
  linkAppointmentsToPatientProfile,
  resolvePatientProfileIdForNewAppointment,
} from "../modules/patient-profile/appointment-patient-link.js";

describe("new appointment source authority", () => {
  const linkedProfileId = "11111111-1111-4111-8111-111111111111";
  const currentEmailHolderId = "22222222-2222-4222-8222-222222222222";

  function client(source: { patientProfileId: string | null } | null) {
    return {
      appointment: { findUnique: async () => source },
      familyMember: { findUnique: async () => ({ patientProfileId: linkedProfileId }) },
      patientProfile: { findUnique: async () => ({ id: currentEmailHolderId }) },
      orderItem: { findMany: async () => [] },
    };
  }

  it("inherits a supplied source's durable patient link", async () => {
    assert.equal(
      await resolvePatientProfileIdForNewAppointment(client({ patientProfileId: linkedProfileId }), {
        sourceAppointmentId: "33333333-3333-4333-8333-333333333333",
        patientEmail: "current-holder@example.invalid",
      }),
      linkedProfileId,
    );
  });

  it("returns null when the supplied source is unlinked", async () => {
    assert.equal(
      await resolvePatientProfileIdForNewAppointment(client({ patientProfileId: null }), {
        sourceAppointmentId: "44444444-4444-4444-8444-444444444444",
        patientEmail: "reused@example.invalid",
      }),
      null,
      "must not fall through to the current email holder",
    );
  });

  it("returns null when the supplied source is missing", async () => {
    assert.equal(
      await resolvePatientProfileIdForNewAppointment(client(null), {
        sourceAppointmentId: "55555555-5555-4555-8555-555555555555",
        patientEmail: "missing-source@example.invalid",
      }),
      null,
      "must not fall through to the current email holder",
    );
  });

  it("preserves family-member and own-email resolution without a source", async () => {
    const fakeClient = client(null);
    assert.equal(
      await resolvePatientProfileIdForNewAppointment(fakeClient, {
        familyMemberId: "66666666-6666-4666-8666-666666666666",
        patientEmail: "dependent@example.invalid",
      }),
      linkedProfileId,
    );
    assert.equal(
      await resolvePatientProfileIdForNewAppointment(fakeClient, {
        patientEmail: "self@example.invalid",
      }),
      currentEmailHolderId,
    );
  });
});

describe("appointment link rejects late dependent evidence", () => {
  for (const mode of ["exact", "account"] as const) {
    it(`rolls back a ${mode} claim when an order line appears before commit`, async () => {
      let orderLineReads = 0;
      const fakeClient = {
        appointment: {
          findMany: async () => [{ id: "late-dependent-appointment" }],
          updateMany: async () => ({ count: 1 }),
        },
        orderItem: {
          findMany: async () => {
            orderLineReads += 1;
            return orderLineReads === 1
              ? []
              : [{ appointmentId: "late-dependent-appointment" }];
          },
        },
      } as unknown as Parameters<typeof linkAppointmentsToPatientProfile>[0];

      await assert.rejects(
        linkAppointmentsToPatientProfile(
          fakeClient,
          mode === "exact"
            ? {
                patientProfileId: "profile",
                appointmentIds: ["late-dependent-appointment"],
                email: "late-dependent@example.invalid",
                userId: null,
                doctorId: "doctor",
              }
            : {
                patientProfileId: "profile",
                email: "late-dependent@example.invalid",
                userId: "account",
              },
        ),
        AppointmentPatientLinkConflictError,
      );
      assert.equal(orderLineReads, 2);
    });
  }
});

/**
 * Group 2 completion gate — the appointment → patient link, from the outside.
 *
 * `Appointment.userId` is the PURCHASER's account. A family booking has the
 * payer there and the dependent as the actual patient, and the dependent's own
 * `PatientProfile.userId` is null — so resolving a patient through `userId`
 * hands back the wrong chart in one direction and finds nothing in the other.
 * `Appointment.patientProfileId` is the durable answer, and these tests exist
 * to make a regression to `userId` fail loudly.
 *
 * What each case pins:
 *   A. ordinary self-booking — treating doctor / ADMIN / SUPER_ADMIN allowed,
 *      unrelated doctor denied.
 *   C. family/dependent booking — the appointment resolves to the DEPENDENT,
 *      grants the doctor nothing on the purchaser, and survives the dependent
 *      being anonymized without touching the purchaser.
 *   D. guest booking — null link before a profile exists; a verified claim
 *      links only the correct rows.
 *   E. email reuse after anonymization — the old consultation stays with the
 *      old patient, and an ambiguous address fails closed.
 *   F. patient merge — links move inside the merge transaction, a forced
 *      failure rolls the whole merge back, and country scope still holds.
 *
 * (Case B, the anonymized patient, lives in
 * anonymization-access-preservation.test.ts, which owns that fixture.)
 *
 * ENFORCE mode, so a denial is a real 403 rather than a shadow-mode log.
 * Synthetic fixtures only; every assertion uses opaque ids.
 */
describe("appointment → patient link", () => {
  let app: FastifyInstance | null = null;
  let bootError: unknown = null;
  let prisma: PrismaClient;
  let signAuthToken: typeof import("../utils/auth-session.js")["signAuthToken"];
  let envModule: typeof import("../config/env.js")["env"];
  let originalEnforce = false;
  let anonymizePatient: typeof import("../modules/data-policy/country-data-policy.service.js")["anonymizePatient"];
  let mergePatients: typeof import("../modules/patient-merge/patient-merge.service.js")["mergePatients"];
  let claimGuestAppointmentsForUser: typeof import("../modules/auth/auth.service.js")["claimGuestAppointmentsForUser"];
  let resolveByEmail: typeof import("../modules/patient-profile/appointment-patient-link.js")["resolvePatientProfileIdByPatientEmail"];
  let resolveByAppointment: typeof import("../modules/patient-profile/appointment-patient-link.js")["resolvePatientProfileIdForAppointmentId"];

  const uniq = `apptlink-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const currencyCode = uniqueCurrencyCode();

  let currencyId = "";
  let countryId = "";
  let countryCode = "";

  let doctorId = "";
  let otherDoctorId = "";
  let adminUserId = "";

  // A — ordinary patient
  let soloUserId = "";
  let soloProfileId = "";
  let soloApptId = "";
  const soloEmail = `solo-${uniq}@test.local`;

  // C — family booking: purchaser A pays, dependent B is the patient
  let payerUserId = "";
  let payerProfileId = "";
  let dependentProfileId = "";
  let familyMemberId = "";
  let familyApptId = "";
  const payerEmail = `payer-${uniq}@test.local`;
  const dependentEmail = `dependent-${uniq}@test.local`;

  // D — guest booking
  let guestApptId = "";
  let guestUserId = "";
  let unrelatedGuestApptId = "";
  const guestEmail = `guest-${uniq}@test.local`;

  // E — email reuse
  let reuseOldProfileId = "";
  let reuseOldUserId = "";
  let reuseOldApptId = "";
  let reuseNewProfileId = "";
  let reuseNewUserId = "";
  const reusedEmail = `reused-${uniq}@test.local`;

  // F — merge
  let mergePrimaryId = "";
  let mergeDuplicateId = "";
  let mergeApptId = "";
  let mergeForeignId = "";
  let mergeForeignApptId = "";
  const mergePrimaryEmail = `mergeprimary-${uniq}@test.local`;
  const mergeDuplicateEmail = `mergedup-${uniq}@test.local`;
  const mergeForeignEmail = `mergeforeign-${uniq}@test.local`;

  // G — unlinked dependent whose appointment carries the PURCHASER's own
  //     address and account. The shape that defeats every email/account
  //     comparison; only the order line knows it is not a self-booking.
  let orphanPayerUserId = "";
  let orphanPayerProfileId = "";
  let orphanFamilyMemberId = "";
  let orphanApptId = "";
  let orphanOrderId = "";
  const orphanPayerEmail = `orphanpayer-${uniq}@test.local`;
  const orphanPayerNationalId = "SYNTH-NID-000111222";
  const orphanPayerAddressLine = "12 Synthetic Payer Street";
  const orphanPayerVerificationRef = `SYNTH-VERIF-${uniq}`.slice(0, 40);

  // H — legacy access beyond the old 50-row cap
  let capDoctorId = "";
  let capProfileId = "";
  let capUserId = "";
  const capEmail = `cap-${uniq}@test.local`;

  let doctorCookie: Record<string, string> = {};
  let otherDoctorCookie: Record<string, string> = {};
  let adminCookie: Record<string, string> = {};
  let superAdminCookie: Record<string, string> = {};

  const enc = (email: string) => encodeURIComponent(email);
  const get = (url: string, cookies: Record<string, string>) =>
    app!.inject({ method: "GET", url, cookies });

  /** Every profile id this suite created, for cleanup + cross-checks. */
  const profileIds: string[] = [];
  const userIds: string[] = [];
  const orderIds: string[] = [];

  async function makePatient(
    email: string,
    opts: { withUser?: boolean; countryFolderCode?: string } = {},
  ): Promise<{ profileId: string; userId: string | null }> {
    const withUser = opts.withUser ?? true;
    let userId: string | null = null;
    if (withUser) {
      const user = await prisma.user.create({
        data: { email, passwordHash: "x", fullName: `Patient ${email}`, role: "PATIENT" },
      });
      userId = user.id;
      userIds.push(user.id);
    }
    const profile = await prisma.patientProfile.create({
      data: {
        email,
        userId,
        fullName: `Patient ${email}`,
        countryFolderCode: opts.countryFolderCode ?? "PT",
      },
    });
    profileIds.push(profile.id);
    // The medical-access guard requires a direct consent for the
    // doctor-of-record path; without it every doctor read is denied for a
    // reason that has nothing to do with the link under test.
    await prisma.patientConsent.create({
      data: {
        patientProfileId: profile.id,
        consentType: "MEDICAL_ACCESS_DIRECT",
        consentValue: true,
      },
    });
    return { profileId: profile.id, userId };
  }

  async function makeAppointment(data: {
    email: string;
    userId?: string | null;
    patientProfileId?: string | null;
    doctorId?: string | null;
  }): Promise<string> {
    const appt = await prisma.appointment.create({
      data: {
        countryCode,
        consultationType: "GENERAL",
        fullName: "Link Test Patient",
        email: data.email,
        consentAccepted: true,
        userId: data.userId ?? null,
        patientProfileId: data.patientProfileId ?? null,
        doctorId: data.doctorId === undefined ? doctorId : data.doctorId,
        status: "COMPLETED",
      },
    });
    return appt.id;
  }

  before(async () => {
    let candidate: FastifyInstance | null = null;
    try {
      prisma = (await import("../db/prisma.js")).prisma;
      signAuthToken = (await import("../utils/auth-session.js")).signAuthToken;
      envModule = (await import("../config/env.js")).env;
      anonymizePatient = (
        await import("../modules/data-policy/country-data-policy.service.js")
      ).anonymizePatient;
      mergePatients = (await import("../modules/patient-merge/patient-merge.service.js"))
        .mergePatients;
      claimGuestAppointmentsForUser = (await import("../modules/auth/auth.service.js"))
        .claimGuestAppointmentsForUser;
      const linkModule = await import(
        "../modules/patient-profile/appointment-patient-link.js"
      );
      resolveByEmail = linkModule.resolvePatientProfileIdByPatientEmail;
      resolveByAppointment = linkModule.resolvePatientProfileIdForAppointmentId;
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
    countryCode = `l${uniq}`.slice(0, 8).toLowerCase();
    const country = await prisma.country.create({
      data: {
        code: countryCode,
        name: `Link ${uniq}`,
        slug: `link-${uniq}`.toLowerCase(),
        legacyHomePath: `/lg-${uniq}`,
        teamPath: `/tm-${uniq}`,
        generalConsultationPath: `/gn-${uniq}`,
        specialistConsultationPath: `/sp-${uniq}`,
        currencyId,
      },
    });
    countryId = country.id;

    for (const which of ["treating", "unrelated"] as const) {
      const doctor = await prisma.doctor.create({
        data: {
          countryId,
          slug: `${which}-${uniq}`,
          fullName: `Dr ${which}`,
          title: "General Practitioner",
        },
      });
      const user = await prisma.user.create({
        data: {
          email: `${which}-${uniq}@test.local`,
          passwordHash: "x",
          fullName: `Dr ${which}`,
          role: "DOCTOR",
          doctorId: doctor.id,
          twoFactorVerifiedAt: new Date(),
        },
      });
      userIds.push(user.id);
      await prisma.doctorConfidentialityAgreement.create({
        data: {
          doctorId: doctor.id,
          agreementVersion: "1.0.0",
          accepted: true,
          acceptedAt: new Date(),
        },
      });
      const cookie = {
        gh_auth: signAuthToken({
          sub: user.id,
          role: "DOCTOR",
          email: user.email,
          tokenVersion: 0,
        }),
      };
      if (which === "treating") {
        doctorId = doctor.id;
        doctorCookie = cookie;
      } else {
        otherDoctorId = doctor.id;
        otherDoctorCookie = cookie;
      }
    }

    const adminUser = await prisma.user.create({
      data: {
        email: `admin-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Link Admin",
        role: "ADMIN",
        twoFactorVerifiedAt: new Date(),
      },
    });
    adminUserId = adminUser.id;
    userIds.push(adminUser.id);
    adminCookie = {
      gh_auth: signAuthToken({ sub: adminUser.id, role: "ADMIN", email: adminUser.email }),
    };

    const superAdminUser = await prisma.user.create({
      data: {
        email: `superadmin-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Link Super Admin",
        role: "SUPER_ADMIN",
        twoFactorVerifiedAt: new Date(),
      },
    });
    userIds.push(superAdminUser.id);
    superAdminCookie = {
      gh_auth: signAuthToken({
        sub: superAdminUser.id,
        role: "SUPER_ADMIN",
        email: superAdminUser.email,
      }),
    };

    // ── A: ordinary self-booking ───────────────────────────────────────────
    ({ profileId: soloProfileId, userId: soloUserId } = (await makePatient(soloEmail)) as {
      profileId: string;
      userId: string;
    });
    soloApptId = await makeAppointment({
      email: soloEmail,
      userId: soloUserId,
      patientProfileId: soloProfileId,
    });

    // ── C: family booking. Purchaser A pays; dependent B is the patient and
    //      has NO user account of their own, exactly like production. ───────
    ({ profileId: payerProfileId, userId: payerUserId } = (await makePatient(payerEmail)) as {
      profileId: string;
      userId: string;
    });
    ({ profileId: dependentProfileId } = await makePatient(dependentEmail, {
      withUser: false,
    }));
    const familyMember = await prisma.familyMember.create({
      data: {
        primaryUserId: payerUserId,
        patientProfileId: dependentProfileId,
        fullName: "Dependent B",
        email: dependentEmail,
      },
    });
    familyMemberId = familyMember.id;
    // The appointment as the payment webhook mints it: payer on `userId`,
    // dependent on `patientProfileId`, dependent's address on `email`.
    familyApptId = await makeAppointment({
      email: dependentEmail,
      userId: payerUserId,
      patientProfileId: dependentProfileId,
    });

    // ── D: guest booking, no profile yet ───────────────────────────────────
    guestApptId = await makeAppointment({ email: guestEmail });
    // A row for a DIFFERENT address that must not be swept up by the claim.
    unrelatedGuestApptId = await makeAppointment({ email: `other-${uniq}@test.local` });

    // ── E: email reuse. Old patient holds the address first. ───────────────
    ({ profileId: reuseOldProfileId, userId: reuseOldUserId } = (await makePatient(
      reusedEmail,
    )) as { profileId: string; userId: string });
    reuseOldApptId = await makeAppointment({
      email: reusedEmail,
      userId: reuseOldUserId,
      // Deliberately UNLINKED: anonymization has to stamp it.
      patientProfileId: null,
    });

    // ── F: merge fixtures ──────────────────────────────────────────────────
    ({ profileId: mergePrimaryId } = await makePatient(mergePrimaryEmail));
    ({ profileId: mergeDuplicateId } = await makePatient(mergeDuplicateEmail));
    mergeApptId = await makeAppointment({
      email: mergeDuplicateEmail,
      patientProfileId: mergeDuplicateId,
    });
    ({ profileId: mergeForeignId } = await makePatient(mergeForeignEmail, {
      countryFolderCode: "IE",
    }));
    mergeForeignApptId = await makeAppointment({
      email: mergeForeignEmail,
      patientProfileId: mergeForeignId,
    });

    // ── G: the disguised dependent. Purchaser pays and their OWN address and
    //      account sit on the appointment, because the dependent has no email
    //      and no profile. Nothing but the order line distinguishes it from a
    //      self-booking, and the purchaser's chart carries real identity
    //      fields, so a wrong-patient resolution is a disclosure, not a
    //      cosmetic bug. ────────────────────────────────────────────────────
    const { encryptPhi } = await import("../lib/crypto/phi-crypto.js");
    const orphanPayerUser = await prisma.user.create({
      data: {
        email: orphanPayerEmail,
        passwordHash: "x",
        fullName: "Orphan Payer",
        role: "PATIENT",
      },
    });
    orphanPayerUserId = orphanPayerUser.id;
    userIds.push(orphanPayerUser.id);
    const orphanPayerProfile = await prisma.patientProfile.create({
      data: {
        email: orphanPayerEmail,
        userId: orphanPayerUserId,
        fullName: "Orphan Payer",
        countryFolderCode: "PT",
        nationalIdNumber: encryptPhi(orphanPayerNationalId),
        addressLine1: orphanPayerAddressLine,
        addressCity: "Synthetic City",
        addressPostalCode: "0000-000",
        dateOfBirth: new Date("1980-01-01T00:00:00.000Z"),
      },
    });
    orphanPayerProfileId = orphanPayerProfile.id;
    profileIds.push(orphanPayerProfileId);
    await prisma.patientConsent.create({
      data: {
        patientProfileId: orphanPayerProfileId,
        consentType: "MEDICAL_ACCESS_DIRECT",
        consentValue: true,
      },
    });
    // A reviewed, VERIFIED identity cycle on the PURCHASER — the thing a
    // prescription is allowed to cite. It must never reach a document issued
    // from the dependent's consultation.
    await prisma.identityVerificationEvent.create({
      data: {
        patientProfileId: orphanPayerProfileId,
        referenceId: orphanPayerVerificationRef,
        status: "VERIFIED",
        method: "MANUAL_REVIEW",
        reviewedAt: new Date(),
      },
    });
    const orphanFamilyMember = await prisma.familyMember.create({
      data: {
        primaryUserId: orphanPayerUserId,
        fullName: "Dependent Without Profile",
      },
    });
    orphanFamilyMemberId = orphanFamilyMember.id;
    orphanApptId = await makeAppointment({
      email: orphanPayerEmail,
      userId: orphanPayerUserId,
      patientProfileId: null,
    });
    const orphanOrder = await prisma.order.create({
      data: {
        orderNumber: `TESTG-${uniq}`.slice(0, 40),
        email: orphanPayerEmail,
        fullName: "Orphan Payer",
        countryCode,
        currencyCode,
        userId: orphanPayerUserId,
        subtotalCents: 0,
        totalCents: 0,
      },
    });
    orphanOrderId = orphanOrder.id;
    orderIds.push(orphanOrderId);
    await prisma.orderItem.create({
      data: {
        orderId: orphanOrderId,
        kind: "GENERAL_CONSULTATION",
        name: "Dependent consultation",
        unitPriceCents: 0,
        quantity: 1,
        lineTotalCents: 0,
        appointmentId: orphanApptId,
        familyMemberId: orphanFamilyMemberId,
        bookingForOther: true,
      },
    });

    // ── H: a legacy self-booking sitting BEHIND more than 50 dependent rows
    //      for the same doctor. A capped legacy scan reads only the excluded
    //      rows and denies a doctor who genuinely treated this patient. ─────
    const capDoctor = await prisma.doctor.create({
      data: {
        countryId,
        slug: `cap-${uniq}`,
        fullName: "Dr Cap",
        title: "General Practitioner",
      },
    });
    capDoctorId = capDoctor.id;
    ({ profileId: capProfileId, userId: capUserId } = (await makePatient(capEmail)) as {
      profileId: string;
      userId: string;
    });
    const capOrder = await prisma.order.create({
      data: {
        orderNumber: `TESTH-${uniq}`.slice(0, 40),
        email: capEmail,
        fullName: "Cap Patient",
        countryCode,
        currencyCode,
        userId: capUserId,
        subtotalCents: 0,
        totalCents: 0,
      },
    });
    orderIds.push(capOrder.id);
    // 60 unlinked dependent bookings, all carrying the account holder's own
    // address and account — every one of them excluded by the order line.
    for (let i = 0; i < 60; i += 1) {
      const noise = await makeAppointment({
        email: capEmail,
        userId: capUserId,
        patientProfileId: null,
        doctorId: capDoctorId,
      });
      await prisma.orderItem.create({
        data: {
          orderId: capOrder.id,
          kind: "GENERAL_CONSULTATION",
          name: `Dependent line ${i}`,
          unitPriceCents: 0,
          quantity: 1,
          lineTotalCents: 0,
          appointmentId: noise,
          bookingForOther: true,
        },
      });
    }
    // ...then the one genuine self-booking, with no order line at all.
    await makeAppointment({
      email: capEmail,
      userId: capUserId,
      patientProfileId: null,
      doctorId: capDoctorId,
    });
  });

  after(async () => {
    if (!app) return;
    envModule.MEDICAL_ACCESS_ENFORCE = originalEnforce;
    for (const id of profileIds) {
      await deleteMedicalAccessLogs(prisma, { patientProfileId: id });
      await deleteAuditLogs(prisma, { entityId: id });
    }
    await deleteAuditLogs(prisma, { actorUserId: { in: userIds } });
    await prisma.patientMergeLog.deleteMany({
      where: { primaryPatientId: { in: profileIds } },
    });
    await prisma.patientMergeLog.deleteMany({
      where: { duplicatePatientId: { in: profileIds } },
    });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.appointment.deleteMany({ where: { countryCode } });
    await prisma.familyMember.deleteMany({
      where: { id: { in: [familyMemberId, orphanFamilyMemberId] } },
    });
    await prisma.identityVerificationEvent.deleteMany({
      where: { patientProfileId: { in: profileIds } },
    });
    await prisma.patientConsent.deleteMany({
      where: { patientProfileId: { in: profileIds } },
    });
    await prisma.patientProfile.deleteMany({ where: { id: { in: profileIds } } });
    await prisma.loginOtp.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.doctorConfidentialityAgreement.deleteMany({
      where: { doctorId: { in: [doctorId, otherDoctorId, capDoctorId] } },
    });
    await prisma.doctor.deleteMany({
      where: { id: { in: [doctorId, otherDoctorId, capDoctorId] } },
    });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
    await app.close();
  });

  // ══ A — ordinary patient ═════════════════════════════════════════════════
  describe("A — ordinary self-booking", () => {
    it("resolves the appointment to that patient's own profile", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      assert.equal(await resolveByAppointment(soloApptId), soloProfileId);
    });

    it("lets the treating doctor open the record and keeps an unrelated doctor out", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const mine = await get(`/api/doctor/patients/${enc(soloEmail)}/profile`, doctorCookie);
      assert.equal(mine.statusCode, 200, mine.body);
      assert.equal(mine.json().data.profile.id, soloProfileId);

      const theirs = await get(
        `/api/doctor/patients/${enc(soloEmail)}/profile`,
        otherDoctorCookie,
      );
      assert.ok(
        theirs.statusCode === 403 || theirs.statusCode === 404,
        `unrelated doctor must be denied (got ${theirs.statusCode})`,
      );
    });

    it("lets ADMIN and SUPER_ADMIN open the record", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      for (const cookie of [adminCookie, superAdminCookie]) {
        const res = await get(`/api/admin/patients/${enc(soloEmail)}/profile`, cookie);
        assert.equal(res.statusCode, 200, res.body);
        assert.equal(res.json().data.profile.id, soloProfileId);
      }
    });
  });

  // ══ C — family / dependent booking ═══════════════════════════════════════
  describe("C — family booking resolves to the dependent, never the purchaser", () => {
    it("resolves the appointment to the DEPENDENT's profile", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const resolved = await resolveByAppointment(familyApptId);
      assert.equal(resolved, dependentProfileId, "the patient is the dependent");
      assert.notEqual(resolved, payerProfileId, "NOT the purchaser");

      // The purchaser is still the purchaser for account/order ownership.
      const appt = await prisma.appointment.findUnique({ where: { id: familyApptId } });
      assert.equal(appt!.userId, payerUserId, "order ownership unchanged");
    });

    it("gives the treating doctor the dependent's chart through that appointment", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const res = await get(`/api/doctor/patients/${enc(dependentEmail)}/profile`, doctorCookie);
      assert.equal(res.statusCode, 200, res.body);
      assert.equal(res.json().data.profile.id, dependentProfileId);
    });

    it("grants that doctor nothing on the PURCHASER's own chart", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      // The dependent's consultation is the doctor's only relationship with
      // this household. Resolving it through `Appointment.userId` would make
      // the payer's chart reachable — the exact cross-patient disclosure.
      const res = await get(`/api/doctor/patients/${enc(payerEmail)}/profile`, doctorCookie);
      assert.ok(
        res.statusCode === 403 || res.statusCode === 404,
        `purchaser's chart must not be reachable (got ${res.statusCode})`,
      );
      assert.equal(res.body.includes(payerProfileId), false, "no purchaser profile in the body");
    });

    it("never returns the purchaser's profile when the dependent was requested", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      for (const [url, cookie] of [
        [`/api/doctor/patients/${enc(dependentEmail)}/profile`, doctorCookie],
        [`/api/admin/patients/${enc(dependentEmail)}/profile`, adminCookie],
      ] as const) {
        const res = await get(url, cookie);
        assert.equal(res.statusCode, 200, res.body);
        assert.equal(res.json().data.profile.id, dependentProfileId);
        assert.equal(res.body.includes(payerProfileId), false);
      }
    });

    it("never claims a dependent's consultation for the purchaser, even when it carries the purchaser's own address", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      // The shape that defeats an email+account comparison: a dependent with no
      // email on file leaves the appointment holding the PURCHASER's address
      // AND account, with no link (their profile does not exist yet). Only the
      // order line knows it was booked for someone else.
      const orphanDependent = await prisma.familyMember.create({
        data: { primaryUserId: payerUserId, fullName: "Dependent With No Profile" },
      });
      const disguisedApptId = await makeAppointment({
        email: payerEmail,
        userId: payerUserId,
        patientProfileId: null,
      });
      const order = await prisma.order.create({
        data: {
          orderNumber: `TEST-${uniq}`.slice(0, 40),
          email: payerEmail,
          fullName: "Payer",
          countryCode,
          currencyCode,
          userId: payerUserId,
          subtotalCents: 0,
          totalCents: 0,
        },
      });
      orderIds.push(order.id);
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          kind: "GENERAL_CONSULTATION",
          name: "Dependent consultation",
          unitPriceCents: 0,
          quantity: 1,
          lineTotalCents: 0,
          appointmentId: disguisedApptId,
          familyMemberId: orphanDependent.id,
          bookingForOther: true,
        },
      });

      // Every path that claims unlinked appointments must leave this one alone.
      await claimGuestAppointmentsForUser(payerUserId, payerEmail);
      const { upsertPatientProfileByEmail } = await import(
        "../modules/patient-profile/patient-profile.service.js"
      );
      await upsertPatientProfileByEmail({ email: payerEmail });

      const appt = await prisma.appointment.findUnique({ where: { id: disguisedApptId } });
      assert.equal(
        appt!.patientProfileId,
        null,
        "a dependent's consultation is never attributed to the payer",
      );

      // And the doctor who took it gets nothing on the payer's chart.
      const res = await get(`/api/doctor/patients/${enc(payerEmail)}/profile`, doctorCookie);
      assert.ok(
        res.statusCode === 403 || res.statusCode === 404,
        `payer's chart must stay closed (got ${res.statusCode})`,
      );

      await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
      await prisma.familyMember.deleteMany({ where: { id: orphanDependent.id } });
    });

    it("keeps the doctor's access after the dependent is anonymized, and leaves the purchaser alone", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const payerBefore = await prisma.patientProfile.findUnique({
        where: { id: payerProfileId },
      });

      await anonymizePatient({ patientProfileId: dependentProfileId, adminId: adminUserId });

      const res = await get(`/api/doctor/patients/${enc(dependentEmail)}/profile`, doctorCookie);
      assert.equal(res.statusCode, 200, "retained record still reaches its doctor of record");
      assert.equal(res.json().data.profile.id, dependentProfileId);

      const appt = await prisma.appointment.findUnique({ where: { id: familyApptId } });
      assert.equal(appt!.patientProfileId, dependentProfileId, "link unchanged");

      const payerAfter = await prisma.patientProfile.findUnique({
        where: { id: payerProfileId },
      });
      assert.equal(payerAfter!.email, payerBefore!.email, "purchaser email untouched");
      assert.equal(payerAfter!.fullName, payerBefore!.fullName, "purchaser identity untouched");
      assert.equal(payerAfter!.anonymizedAt, null, "purchaser not anonymized");
    });
  });

  // ══ D — guest booking ════════════════════════════════════════════════════
  describe("D — guest booking is not claimed from email ownership", () => {
    it("exists with a null link before any profile does", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const appt = await prisma.appointment.findUnique({ where: { id: guestApptId } });
      assert.equal(appt!.patientProfileId, null, "nothing to link to yet");
      assert.equal(await resolveByAppointment(guestApptId), null, "resolver fails closed");
    });

    it("leaves historical guest rows unclaimed when an account takes the address", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const created = (await makePatient(guestEmail)) as { profileId: string; userId: string };
      guestUserId = created.userId;

      await claimGuestAppointmentsForUser(guestUserId, guestEmail);
      const { upsertPatientProfileByEmail } = await import(
        "../modules/patient-profile/patient-profile.service.js"
      );
      await upsertPatientProfileByEmail({ email: guestEmail });

      const claimed = await prisma.appointment.findUnique({ where: { id: guestApptId } });
      assert.equal(claimed!.userId, null);
      assert.equal(claimed!.patientProfileId, null);

      const untouched = await prisma.appointment.findUnique({
        where: { id: unrelatedGuestApptId },
      });
      assert.equal(untouched!.patientProfileId, null, "a different address is never claimed");
      assert.equal(untouched!.userId, null);
    });
  });

  // ══ E — email reuse ══════════════════════════════════════════════════════
  describe("E — a reused email never moves an old patient's consultation", () => {
    it("stamps the old patient's appointment before the email is released", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      await anonymizePatient({ patientProfileId: reuseOldProfileId, adminId: adminUserId });

      const appt = await prisma.appointment.findUnique({ where: { id: reuseOldApptId } });
      assert.equal(
        appt!.patientProfileId,
        reuseOldProfileId,
        "linked inside the anonymization transaction, before the tombstone",
      );
      const profile = await prisma.patientProfile.findUnique({
        where: { id: reuseOldProfileId },
      });
      assert.notEqual(profile!.email, reusedEmail, "address released");
    });

    it("leaves that appointment with the OLD patient after a new one takes the address", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const created = (await makePatient(reusedEmail)) as {
        profileId: string;
        userId: string;
      };
      reuseNewProfileId = created.profileId;
      reuseNewUserId = created.userId;
      assert.notEqual(reuseNewProfileId, reuseOldProfileId);

      // Everything a fresh registration runs: the guest claim, then a doctor
      // and an admin actually opening the chart by that address. The responses
      // are the point — discarding them proved only that the calls did not
      // throw, not who they came back with.
      await claimGuestAppointmentsForUser(reuseNewUserId, reusedEmail);

      // The doctor of record is the OLD patient's doctor and has exactly one
      // linked patient under this address, so the read resolves to P1 — the
      // retained record stays reachable — and never to the new registrant.
      const doctorRead = await get(
        `/api/doctor/patients/${enc(reusedEmail)}/profile`,
        doctorCookie,
      );
      assert.equal(doctorRead.statusCode, 200, doctorRead.body);
      assert.equal(
        doctorRead.json().data.profile.id,
        reuseOldProfileId,
        "the treating doctor still reaches the patient they actually treated",
      );
      assert.equal(
        doctorRead.body.includes(reuseNewProfileId),
        false,
        "and never the new registrant who merely reused the address",
      );

      // The admin lookup is unscoped, so BOTH the new live profile and the old
      // linked one are possible. Two candidates is ambiguity, and ambiguity
      // fails closed — returning the new registrant would silently hand an
      // admin the wrong chart for an address that used to belong to someone
      // else.
      const adminRead = await get(
        `/api/admin/patients/${enc(reusedEmail)}/profile`,
        adminCookie,
      );
      assert.ok(
        adminRead.statusCode === 404 || adminRead.statusCode === 403,
        `ambiguous address must fail closed (got ${adminRead.statusCode})`,
      );
      assert.equal(
        adminRead.body.includes(reuseNewProfileId),
        false,
        "no profile is returned when the address maps to two patients",
      );
      assert.equal(adminRead.body.includes(reuseOldProfileId), false);

      const appt = await prisma.appointment.findUnique({ where: { id: reuseOldApptId } });
      assert.equal(
        appt!.patientProfileId,
        reuseOldProfileId,
        "the old consultation still belongs to the old patient",
      );
      assert.notEqual(appt!.patientProfileId, reuseNewProfileId);
      assert.equal(await resolveByAppointment(reuseOldApptId), reuseOldProfileId);
    });

    it("fails closed when an address maps to two different patients", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      // A second linked appointment under the same address, pointing at the
      // NEW patient. The live profile lookup still wins, so force the fallback
      // by asking about an address no profile holds any more.
      const orphanEmail = `orphan-${uniq}@test.local`;
      const one = await makeAppointment({
        email: orphanEmail,
        patientProfileId: reuseOldProfileId,
      });
      const two = await makeAppointment({
        email: orphanEmail,
        patientProfileId: reuseNewProfileId,
      });
      assert.ok(one && two);

      assert.equal(
        await resolveByEmail(orphanEmail),
        null,
        "two candidate patients means no answer, never the first or newest",
      );
      assert.equal(
        await resolveByEmail(orphanEmail, { doctorId }),
        null,
        "still ambiguous inside one doctor's own appointments",
      );
    });

    it("stays ambiguous when one candidate has more appointments than the other", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      // The lopsided shape a `take` would hide: capping the rows before they
      // are reduced to distinct patients could return only the majority
      // patient and resolve, so the minority patient's presence — the whole
      // reason to fail closed — would never be seen.
      const lopsidedEmail = `lopsided-${uniq}@test.local`;
      await makeAppointment({ email: lopsidedEmail, patientProfileId: reuseOldProfileId });
      await makeAppointment({ email: lopsidedEmail, patientProfileId: reuseOldProfileId });
      await makeAppointment({ email: lopsidedEmail, patientProfileId: reuseOldProfileId });
      await makeAppointment({ email: lopsidedEmail, patientProfileId: reuseNewProfileId });

      assert.equal(await resolveByEmail(lopsidedEmail), null, "majority never wins");
    });
  });

  // ══ G — unlinked dependent carrying the purchaser's own address ═══
  describe("G — an unlinked dependent never resolves to the purchaser", () => {
    it("resolves the appointment to nobody, never to the payer", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const resolved = await resolveByAppointment(orphanApptId);
      assert.notEqual(
        resolved,
        orphanPayerProfileId,
        "the payer is not the patient of a booking made for someone else",
      );
      assert.equal(resolved, null, "no durable link and no corroboration — fail closed");
    });

    it("builds a document source without loading the payer's chart", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const { resolveAppointmentDocumentSource } = await import(
        "../modules/generated-documents/appointment-document-source.js"
      );
      const source = await resolveAppointmentDocumentSource(orphanApptId, doctorId);
      assert.ok(source, "the appointment itself still renders");
      const serialized = JSON.stringify(source);
      for (const secret of [
        orphanPayerNationalId,
        orphanPayerAddressLine,
        "Synthetic City",
        "0000-000",
        orphanPayerProfileId,
      ]) {
        assert.equal(
          serialized.includes(secret),
          false,
          `document must not carry the purchaser's ${secret}`,
        );
      }
      assert.equal(source.patient.patientIdLine, null, "no government id from another chart");
      assert.equal(
        source.patient.birthDate,
        "—",
        "no date of birth borrowed from the purchaser",
      );
    });

    it("cites no identity verification, rather than the purchaser's", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const { resolveVerificationForPrescription } = await import(
        "../modules/identity-verification/identity-verification.service.js"
      );
      const verification = await resolveVerificationForPrescription({
        appointmentId: orphanApptId,
      });
      assert.equal(
        verification,
        null,
        "a prescription prints nothing rather than the payer's verified identity",
      );
    });

    it("files no lab requisition against the purchaser", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      // The requisition path attaches to whatever the resolver returns, so a
      // null resolution is what keeps the payer's chart out of the lab queue.
      assert.equal(await resolveByAppointment(orphanApptId), null);
      const filed = await prisma.labRequisition.count({
        where: { patientProfileId: orphanPayerProfileId },
      });
      assert.equal(filed, 0, "nothing was ever attached to the payer");
    });

    it("gives the treating doctor no access to the purchaser through it", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      const res = await get(
        `/api/doctor/patients/${enc(orphanPayerEmail)}/profile`,
        doctorCookie,
      );
      assert.ok(
        res.statusCode === 403 || res.statusCode === 404,
        `payer's chart must stay closed (got ${res.statusCode})`,
      );
      assert.equal(res.body.includes(orphanPayerNationalId), false);
      assert.equal(res.body.includes(orphanPayerProfileId), false);
    });
  });

  // ══ H — legacy access past the old row cap ══════════════════
  describe("H — a valid legacy appointment behind many excluded ones", () => {
    it("still admits the treating doctor", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      // 60 booked-for-other rows come first; the one genuine self-booking is
      // row 61. A capped scan reads only the excluded rows and denies a
      // doctor who actually treated this patient.
      const { assertMedicalAccess } = await import("../lib/medical-access-guard.js");
      const capDoctorUser = await prisma.user.create({
        data: {
          email: `capdoc-${uniq}@test.local`,
          passwordHash: "x",
          fullName: "Dr Cap",
          role: "DOCTOR",
          doctorId: capDoctorId,
          twoFactorVerifiedAt: new Date(),
        },
      });
      userIds.push(capDoctorUser.id);
      await prisma.doctorConfidentialityAgreement.create({
        data: {
          doctorId: capDoctorId,
          agreementVersion: "1.0.0",
          accepted: true,
          acceptedAt: new Date(),
        },
      });
      await assertMedicalAccess({
        actor: {
          userId: capDoctorUser.id,
          role: "DOCTOR",
          name: "Dr Cap",
          doctorId: capDoctorId,
          countryCode: null,
          adminScope: null,
          allowedCountryFolders: [],
          twoFactorVerifiedAt: new Date(),
          confidentialityAgreementAccepted: true,
        },
        resource: {
          patientProfileId: capProfileId,
          globalHealthNumber: null,
          patientCountryFolder: "PT",
          resourceType: "MEDICAL_DOC",
          accessAction: "VIEWED",
          resourceId: null,
          relatedAppointmentId: null,
        },
        reason: "synthetic legacy-depth check",
        ipAddress: null,
        userAgent: null,
      });
    });
  });

  // ══ F — patient merge ════════════════════════════════════════════════════
  describe("F — patient merge moves the link transactionally", () => {
    it("rolls the whole merge back when a step fails", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      // A merge into a profile that does not exist fails inside the
      // transaction, after the point where the link move would run.
      await assert.rejects(
        mergePatients({
          primaryPatientId: `missing-${uniq}`,
          duplicatePatientId: mergeDuplicateId,
          adminId: adminUserId,
          reason: "forced failure — synthetic",
        }),
      );
      const appt = await prisma.appointment.findUnique({ where: { id: mergeApptId } });
      assert.equal(
        appt!.patientProfileId,
        mergeDuplicateId,
        "link untouched by the rolled-back merge",
      );
    });

    it("repoints duplicate → primary on success", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      await mergePatients({
        primaryPatientId: mergePrimaryId,
        duplicatePatientId: mergeDuplicateId,
        adminId: adminUserId,
        reason: "synthetic duplicate cleanup",
      });
      const appt = await prisma.appointment.findUnique({ where: { id: mergeApptId } });
      assert.equal(appt!.patientProfileId, mergePrimaryId);
      assert.equal(await resolveByAppointment(mergeApptId), mergePrimaryId);
    });

    it("refuses a LOCAL_ADMIN merge that reaches into another country", async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      await assert.rejects(
        mergePatients({
          primaryPatientId: mergePrimaryId, // PT
          duplicatePatientId: mergeForeignId, // IE
          adminId: adminUserId,
          reason: "out-of-scope attempt — synthetic",
          allowedCountryFolders: ["pt"],
        }),
        (err: Error) => err.name === "PatientMergeOutOfScopeError",
      );
      const appt = await prisma.appointment.findUnique({ where: { id: mergeForeignApptId } });
      assert.equal(appt!.patientProfileId, mergeForeignId, "foreign link untouched");
    });
  });
});
