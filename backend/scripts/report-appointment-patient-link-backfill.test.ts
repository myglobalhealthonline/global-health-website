import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";

import { deleteMedicalAccessLogs } from "../src/test-utils/audit-cleanup.js";
import { uniqueCurrencyCode } from "../src/test-utils/unique-currency-code.js";

import {
  collectBackfillReport,
  formatBackfillReport,
  type BackfillReport,
  type BackfillReportDb,
} from "./report-appointment-patient-link-backfill.js";

loadEnv({ path: join(__dirname, "..", ".env") });

/**
 * The backfill preflight classifies rows a human will later act on, so a rule
 * that is merely *usually* right is a wrong-patient link waiting to be written.
 * These cases pin the two rules that were unsafe:
 *
 *   - SELF used to accept account + address agreement alone. A dependent with
 *     no address of their own carries the PURCHASER's on both columns, so that
 *     pair is satisfied by a booking that belongs to somebody else.
 *   - ACCESS_LOG used to count as a safe candidate. Historical log rows were
 *     written while the resolver still reached for the purchaser's account, so
 *     a consistent run of them names the wrong profile just as consistently.
 *
 * Plus the property the whole script rests on: the output is counts and opaque
 * ids, never patient data.
 *
 * Synthetic fixtures on the isolated test database only.
 */
describe("appointment to patient backfill preflight rules", () => {
  let prisma: PrismaClient;
  let bootError: unknown = null;

  const uniq = `backfill-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const currencyCode = uniqueCurrencyCode();
  let currencyId = "";
  let countryId = "";
  let countryCode = "";
  let orderId = "";

  const profileIds: string[] = [];
  const userIds: string[] = [];

  // The disguised dependent: payer's own address AND account on the row.
  let disguisedApptId = "";
  const payerEmail = `bfpayer-${uniq}@test.local`;
  // A row whose only evidence is a single historical access log.
  let accessLogApptId = "";
  const loggedEmail = `bflogged-${uniq}@test.local`;
  let loggedProfileId = "";
  // A row two trusted rules disagree about.
  let conflictingApptId = "";
  const conflictEmail = `bfconflict-${uniq}@test.local`;
  const otherEmail = `bfother-${uniq}@test.local`;
  // A row ONE rule disagrees with itself about: two order lines on the same
  // appointment naming two different dependents.
  let twoDependentsApptId = "";
  const twoDependentsEmail = `bftwodeps-${uniq}@test.local`;
  const dependentOneEmail = `bfdep1-${uniq}@test.local`;
  const dependentTwoEmail = `bfdep2-${uniq}@test.local`;
  const familyMemberIds: string[] = [];

  async function makeAppointment(data: {
    email: string;
    userId?: string | null;
    patientProfileId?: string | null;
    followUpFromAppointmentId?: string | null;
  }): Promise<string> {
    const appt = await prisma.appointment.create({
      data: {
        countryCode,
        consultationType: "GENERAL",
        fullName: "Backfill Fixture",
        email: data.email,
        consentAccepted: true,
        userId: data.userId ?? null,
        patientProfileId: data.patientProfileId ?? null,
        followUpFromAppointmentId: data.followUpFromAppointmentId ?? null,
        status: "COMPLETED",
      },
    });
    return appt.id;
  }

  /**
   * The report over this suite's own rows only, so the counts are deterministic
   * no matter what else the shared test database holds. Only the appointment
   * scan is narrowed; every rule underneath runs against the real tables.
   */
  async function reportForOurRows(): Promise<BackfillReport> {
    // No cast: `BackfillReportDb` names only the two methods the report calls,
    // so this literal satisfies it structurally and a new call site over there
    // breaks the build here rather than at runtime.
    const scoped: BackfillReportDb["appointment"] = {
      count: ((args?: { where?: Record<string, unknown> }) =>
        prisma.appointment.count({
          where: { ...(args?.where ?? {}), countryCode },
        })) as PrismaClient["appointment"]["count"],
      findMany: ((args: { where?: Record<string, unknown> }) =>
        prisma.appointment.findMany({
          ...args,
          where: { ...(args.where ?? {}), countryCode },
        })) as PrismaClient["appointment"]["findMany"],
      // FOLLOW_UP resolves a source appointment by id, which must NOT be
      // narrowed to this suite's country — it is a direct pass-through.
      findUnique: prisma.appointment.findUnique.bind(prisma.appointment),
    };
    return collectBackfillReport({
      appointment: scoped,
      orderItem: prisma.orderItem,
      patientProfile: prisma.patientProfile,
      medicalAccessLog: prisma.medicalAccessLog,
    });
  }

  before(async () => {
    try {
      prisma = (await import("../src/db/prisma.js")).prisma;
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (error) {
      bootError = error;
      return;
    }

    const currency = await prisma.currency.create({
      data: { code: currencyCode, symbol: "EUR", decimals: 2 },
    });
    currencyId = currency.id;
    // `uniq` shares a long prefix run-to-run, so truncating it collides with a
    // leftover row from an aborted run. Take the random tail instead.
    countryCode = `bf${uniq.slice(-6)}`.toLowerCase();
    const country = await prisma.country.create({
      data: {
        code: countryCode,
        name: `Backfill ${uniq}`,
        slug: `backfill-${uniq}`.toLowerCase(),
        legacyHomePath: `/bf-${uniq}`,
        teamPath: `/bft-${uniq}`,
        generalConsultationPath: `/bfg-${uniq}`,
        specialistConsultationPath: `/bfs-${uniq}`,
        currencyId,
      },
    });
    countryId = country.id;

    // -- The disguised dependent -------------------------------------------
    const payerUser = await prisma.user.create({
      data: {
        email: payerEmail,
        passwordHash: "x",
        fullName: "Backfill Payer",
        role: "PATIENT",
      },
    });
    userIds.push(payerUser.id);
    const payerProfile = await prisma.patientProfile.create({
      data: {
        email: payerEmail,
        userId: payerUser.id,
        fullName: "Backfill Payer",
        countryFolderCode: "PT",
      },
    });
    profileIds.push(payerProfile.id);
    disguisedApptId = await makeAppointment({ email: payerEmail, userId: payerUser.id });
    const order = await prisma.order.create({
      data: {
        orderNumber: `BF-${uniq}`.slice(0, 40),
        email: payerEmail,
        fullName: "Backfill Payer",
        countryCode,
        currencyCode,
        userId: payerUser.id,
        subtotalCents: 0,
        totalCents: 0,
      },
    });
    orderId = order.id;
    await prisma.orderItem.create({
      data: {
        orderId,
        kind: "GENERAL_CONSULTATION",
        name: "Dependent consultation",
        unitPriceCents: 0,
        quantity: 1,
        lineTotalCents: 0,
        appointmentId: disguisedApptId,
        bookingForOther: true,
      },
    });

    // -- Access-log-only evidence ------------------------------------------
    const loggedProfile = await prisma.patientProfile.create({
      data: { email: loggedEmail, fullName: "Logged Patient", countryFolderCode: "PT" },
    });
    loggedProfileId = loggedProfile.id;
    profileIds.push(loggedProfileId);
    // No account, so SELF cannot fire; no order line and no follow-up either.
    // The single access log is this row's ONLY evidence.
    accessLogApptId = await makeAppointment({ email: loggedEmail });
    await prisma.medicalAccessLog.create({
      data: {
        patientProfileId: loggedProfileId,
        relatedAppointmentId: accessLogApptId,
        accessedByUserId: null,
        accessedByRole: "DOCTOR",
        accessedByName: "Historical Actor",
        accessedResourceType: "MEDICAL_DOC",
        accessAction: "VIEWED",
        accessReason: "synthetic historical row",
      },
    });

    // -- Two trusted rules, two different answers --------------------------
    const conflictUser = await prisma.user.create({
      data: {
        email: conflictEmail,
        passwordHash: "x",
        fullName: "Conflict Patient",
        role: "PATIENT",
      },
    });
    userIds.push(conflictUser.id);
    const conflictSelf = await prisma.patientProfile.create({
      data: {
        email: conflictEmail,
        userId: conflictUser.id,
        fullName: "Conflict Patient",
        countryFolderCode: "PT",
      },
    });
    profileIds.push(conflictSelf.id);
    const otherProfile = await prisma.patientProfile.create({
      data: { email: otherEmail, fullName: "Other Patient", countryFolderCode: "PT" },
    });
    profileIds.push(otherProfile.id);
    // FOLLOW_UP points at `otherProfile`; SELF points at `conflictSelf`.
    const source = await makeAppointment({
      email: otherEmail,
      patientProfileId: otherProfile.id,
    });
    conflictingApptId = await makeAppointment({
      email: conflictEmail,
      userId: conflictUser.id,
      followUpFromAppointmentId: source,
    });

    // -- One appointment, two order lines, two different dependents ---------
    // `OrderItem.appointmentId` is a bare column with no unique constraint, so
    // a single appointment can carry several lines. Taking the first one makes
    // the answer depend on row order, which is a coin toss between two real
    // patients — the report has to see BOTH and call it a conflict.
    const dependentOne = await prisma.patientProfile.create({
      data: { email: dependentOneEmail, fullName: "Dependent One", countryFolderCode: "PT" },
    });
    profileIds.push(dependentOne.id);
    const dependentTwo = await prisma.patientProfile.create({
      data: { email: dependentTwoEmail, fullName: "Dependent Two", countryFolderCode: "PT" },
    });
    profileIds.push(dependentTwo.id);
    twoDependentsApptId = await makeAppointment({ email: twoDependentsEmail });
    for (const profile of [dependentOne, dependentTwo]) {
      const member = await prisma.familyMember.create({
        data: {
          primaryUserId: payerUser.id,
          patientProfileId: profile.id,
          fullName: `Member ${profile.id}`,
        },
      });
      familyMemberIds.push(member.id);
      await prisma.orderItem.create({
        data: {
          orderId,
          kind: "GENERAL_CONSULTATION",
          name: "Dependent consultation",
          unitPriceCents: 0,
          quantity: 1,
          lineTotalCents: 0,
          appointmentId: twoDependentsApptId,
          familyMemberId: member.id,
        },
      });
    }
  });

  after(async () => {
    if (bootError || !countryId) return;
    // MedicalAccessLog is append-only at the database level; the shared helper
    // is the reviewed override every suite uses to clean up after itself.
    for (const id of profileIds) {
      await deleteMedicalAccessLogs(prisma, { patientProfileId: id });
    }
    await prisma.orderItem.deleteMany({ where: { orderId } });
    await prisma.order.deleteMany({ where: { id: orderId } });
    await prisma.appointment.deleteMany({ where: { countryCode } });
    await prisma.familyMember.deleteMany({ where: { id: { in: familyMemberIds } } });
    await prisma.patientProfile.deleteMany({ where: { id: { in: profileIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
  });

  it("does not count a disguised dependent as SELF", async (t) => {
    if (bootError) return t.skip(`no database: ${String(bootError)}`);
    const report = await reportForOurRows();
    assert.equal(
      report.byBucket.SELF,
      0,
      "account + address agreement is satisfied by a booking made for someone else",
    );
    assert.ok(
      report.unresolvedIds.includes(disguisedApptId),
      "the disguised dependent stays unresolved, which is the safe outcome",
    );
  });

  it("never treats a lone historical access log as safe to backfill", async (t) => {
    if (bootError) return t.skip(`no database: ${String(bootError)}`);
    const report = await reportForOurRows();
    assert.ok(
      report.unresolvedIds.includes(accessLogApptId),
      "one consistent log row is not corroboration - it may just be the old bug firing consistently",
    );
    assert.equal(
      report.historicalAccessLogOnly,
      1,
      "it is still surfaced, as evidence requiring human review",
    );
    // And the safe-candidate count never absorbed it.
    const safeTotal =
      report.byBucket.DEPENDENT + report.byBucket.SELF + report.byBucket.FOLLOW_UP;
    assert.equal(safeTotal, report.backfillable);
  });

  it("keeps conflicting rules conflicting", async (t) => {
    if (bootError) return t.skip(`no database: ${String(bootError)}`);
    const report = await reportForOurRows();
    assert.ok(
      report.conflictingIds.includes(conflictingApptId),
      "SELF and FOLLOW_UP disagreeing is a conflict, never a resolved candidate",
    );
  });

  it("treats two different dependents on one appointment as a conflict", async (t) => {
    if (bootError) return t.skip(`no database: ${String(bootError)}`);
    const report = await reportForOurRows();
    assert.ok(
      report.conflictingIds.includes(twoDependentsApptId),
      "two order lines naming two different dependents cannot resolve to one patient",
    );
    assert.equal(
      report.byBucket.DEPENDENT,
      0,
      "picking whichever line came back first is a coin toss between two real patients",
    );
    assert.equal(report.backfillable, 0, "and nothing here is safe to backfill");
  });

  it("counts exactly the two conflicting rows this suite created", async (t) => {
    if (bootError) return t.skip(`no database: ${String(bootError)}`);
    const report = await reportForOurRows();
    assert.equal(report.conflicting, 2);
  });

  it("prints counts and opaque ids only", async (t) => {
    if (bootError) return t.skip(`no database: ${String(bootError)}`);
    const rendered = formatBackfillReport(await reportForOurRows(), true);
    for (const leak of [
      payerEmail,
      loggedEmail,
      conflictEmail,
      otherEmail,
      twoDependentsEmail,
      dependentOneEmail,
      dependentTwoEmail,
      "Backfill Payer",
      "Logged Patient",
      "Conflict Patient",
      "Dependent One",
      "Dependent Two",
      loggedProfileId,
      "@test.local",
    ]) {
      assert.equal(rendered.includes(leak), false, `output must not contain ${leak}`);
    }
    // Opaque appointment ids ARE expected - that is the whole point of --ids.
    assert.ok(rendered.includes(disguisedApptId));
    assert.match(rendered, /safely backfillable\s+\d+/);
    assert.match(rendered, /HISTORICAL_ACCESS_LOG\s+\d+/);
  });
});
