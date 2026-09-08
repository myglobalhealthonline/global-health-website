import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { deleteAuditLogs, deleteMedicalAccessLogs } from "../test-utils/audit-cleanup.js";

type FindUnique = (args: Record<string, unknown>) => Promise<unknown>;

type Barrier = {
  kind: "create" | "anonymize";
  key: string;
  seen: number;
  reached: Promise<void>;
  signal: () => void;
  gate: Promise<void>;
  release: () => void;
};

function barrier(kind: Barrier["kind"], key: string): Barrier {
  let signal!: () => void;
  let release!: () => void;
  return {
    kind,
    key,
    seen: 0,
    reached: new Promise<void>((resolve) => {
      signal = resolve;
    }),
    signal,
    gate: new Promise<void>((resolve) => {
      release = resolve;
    }),
    release,
  };
}

async function waitForBarrier(value: Barrier): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      value.reached,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("race barrier was not reached")), 10_000);
        timer.unref();
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

describe("patient-profile writes refuse identity races", () => {
  let app: FastifyInstance | null = null;
  let prisma: Awaited<typeof import("../db/prisma.js")>["prisma"];
  let writePatientProfile: typeof import("../modules/patient-profile/patient-profile.service.js")["writePatientProfile"];
  let PatientProfileNotFoundError: typeof import("../modules/patient-profile/patient-profile.service.js")["PatientProfileNotFoundError"];
  let bootError: unknown;
  let activeBarrier: Barrier | null = null;
  let originalFindUnique: FindUnique;
  let originalUpdate: (args: Record<string, unknown>) => Promise<unknown>;
  let prismaReady = false;
  let delegatePatched = false;

  const run = `pwr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const adminEmail = `admin-${run}@example.invalid`;
  const createRaceEmail = `create-race-${run}@example.invalid`;
  const cleanCreateEmail = `clean-create-${run}@example.invalid`;
  const anonymizeEmail = `anonymize-${run}@example.invalid`;
  const normalEmail = `normal-${run}@example.invalid`;
  const trackedEmails = [createRaceEmail, cleanCreateEmail, anonymizeEmail, normalEmail];
  const appointmentIds: string[] = [];
  let adminId = "";
  let adminCookie: Record<string, string> = {};
  let anonymizeProfileId = "";
  let normalProfileId = "";

  before(async () => {
    let candidate: FastifyInstance | null = null;
    try {
      prisma = (await import("../db/prisma.js")).prisma;
      prismaReady = true;
      const { signAuthToken } = await import("../utils/auth-session.js");
      const service = await import("../modules/patient-profile/patient-profile.service.js");
      writePatientProfile = service.writePatientProfile;
      PatientProfileNotFoundError = service.PatientProfileNotFoundError;
      const { buildApp } = await import("../app.js");
      candidate = await buildApp();
      await prisma.$queryRawUnsafe("SELECT 1");
      app = candidate;

      const admin = await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash: "synthetic",
          fullName: "Synthetic Admin",
          role: "ADMIN",
          twoFactorVerifiedAt: new Date(),
        },
      });
      adminId = admin.id;
      adminCookie = {
        gh_auth: signAuthToken({
          sub: admin.id,
          role: "ADMIN",
          email: admin.email,
          tokenVersion: 0,
        }),
      };

      const anonymizeProfile = await prisma.patientProfile.create({
        data: {
          email: anonymizeEmail,
          fullName: "Synthetic Before",
          phone: "+00000000001",
          preferredPharmacy: "Synthetic Before Pharmacy",
          allergies: ["synthetic-before"],
        },
      });
      anonymizeProfileId = anonymizeProfile.id;
      const normalProfile = await prisma.patientProfile.create({
        data: { email: normalEmail, fullName: "Synthetic Normal Before" },
      });
      normalProfileId = normalProfile.id;

      const unlinked = await prisma.appointment.create({
        data: {
          countryCode: "pt",
          consultationType: "GENERAL",
          fullName: "Synthetic Appointment",
          email: createRaceEmail,
          consentAccepted: true,
          status: "REQUEST_RECEIVED",
        },
      });
      appointmentIds.push(unlinked.id);
      const anonymizeUnlinked = await prisma.appointment.create({
        data: {
          countryCode: "pt",
          consultationType: "GENERAL",
          fullName: "Synthetic Appointment",
          email: anonymizeEmail,
          consentAccepted: true,
          status: "REQUEST_RECEIVED",
        },
      });
      appointmentIds.push(anonymizeUnlinked.id);

      const delegate = prisma.patientProfile as unknown as {
        findUnique: FindUnique;
        update: (args: Record<string, unknown>) => Promise<unknown>;
      };
      originalFindUnique = delegate.findUnique.bind(prisma.patientProfile);
      originalUpdate = delegate.update.bind(prisma.patientProfile);
      delegate.findUnique = async (args) => {
        const result = await originalFindUnique(args);
        const current = activeBarrier;
        const where = (args.where ?? {}) as Record<string, unknown>;
        const select = (args.select ?? {}) as Record<string, unknown>;
        const isCreateCheck =
          current?.kind === "create" && where.email === current.key && result === null;
        const isServiceRead =
          current?.kind === "anonymize" &&
          where.id === current.key &&
          select.statusAlert === true;
        if (current && (isCreateCheck || isServiceRead)) {
          current.seen += 1;
          const shouldHold = current.kind === "create" ? current.seen === 2 : true;
          if (shouldHold) {
            current.signal();
            await current.gate;
          }
        }
        return result;
      };
      delegatePatched = true;
    } catch (error) {
      bootError = error;
      await candidate?.close();
      app = null;
      throw error;
    }
  });

  after(async () => {
    activeBarrier?.release();
    if (!prismaReady) return;
    if (delegatePatched) {
      const delegate = prisma.patientProfile as unknown as { findUnique: FindUnique };
      delegate.findUnique = originalFindUnique;
    }
    await app?.close();

    const profiles = await prisma.patientProfile.findMany({
      where: { OR: trackedEmails.map((email) => ({ email })) },
      select: { id: true },
    });
    const profileIds = [
      ...new Set(
        [anonymizeProfileId, normalProfileId, ...profiles.map((p) => p.id)].filter(Boolean),
      ),
    ];
    await prisma.patientContactChangeLog.deleteMany({
      where: { patientProfileId: { in: profileIds } },
    });
    await prisma.patientAlertLog.deleteMany({
      where: { patientProfileId: { in: profileIds } },
    });
    await prisma.securityAlert.deleteMany({ where: { patientId: { in: profileIds } } });
    if (profileIds.length || adminId) {
      await deleteMedicalAccessLogs(prisma, {
        OR: [
          ...(profileIds.length ? [{ patientProfileId: { in: profileIds } }] : []),
          ...(adminId ? [{ accessedByUserId: adminId }] : []),
        ],
      });
      await deleteAuditLogs(prisma, {
        OR: [
          ...(profileIds.length ? [{ entityId: { in: profileIds } }] : []),
          ...(adminId ? [{ actorUserId: adminId }] : []),
        ],
      });
    }
    await prisma.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
    await prisma.patientProfile.deleteMany({ where: { id: { in: profileIds } } });
    await prisma.user.deleteMany({ where: { email: adminEmail } });
  });

  const boot = (t: { skip: (message?: string) => void }) => {
    if (app) return true;
    t.skip(`database-backed setup failed: ${bootError instanceof Error ? bootError.message : "unknown"}`);
    return false;
  };

  const patch = (email: string, payload: Record<string, unknown>) =>
    app!.inject({
      method: "PATCH",
      url: `/api/admin/patients/${encodeURIComponent(email)}/profile`,
      cookies: adminCookie,
      payload,
    });

  it("returns 409 when another profile wins admin create-on-edit", async (t) => {
    if (!boot(t)) return;
    const adminValue = "Synthetic Losing Payload";
    activeBarrier = barrier("create", createRaceEmail);
    const request = patch(createRaceEmail, { fullName: adminValue });
    await waitForBarrier(activeBarrier);

    const winner = await prisma.patientProfile.create({
      data: {
        email: createRaceEmail,
        fullName: "Synthetic Concurrent Winner",
        phone: "+00000000002",
        preferredPharmacy: "Synthetic Winner Pharmacy",
      },
    });
    const winnerBefore = await originalFindUnique({
      where: { id: winner.id },
      select: {
        email: true,
        fullName: true,
        phone: true,
        preferredPharmacy: true,
        updatedAt: true,
      },
    });
    activeBarrier.release();
    const response = await request;
    activeBarrier = null;

    assert.equal(response.statusCode, 409);
    assert.equal(response.body.includes(createRaceEmail), false);
    assert.equal(response.body.includes(adminValue), false);
    assert.deepEqual(
      await prisma.patientProfile.findUnique({
        where: { id: winner.id },
        select: {
          email: true,
          fullName: true,
          phone: true,
          preferredPharmacy: true,
          updatedAt: true,
        },
      }),
      winnerBefore,
    );
    assert.equal(await prisma.patientProfile.count({ where: { email: createRaceEmail } }), 1);
    assert.equal(
      await prisma.appointment.count({
        where: { id: { in: appointmentIds }, email: createRaceEmail, patientProfileId: { not: null } },
      }),
      0,
    );
    assert.equal(
      await prisma.auditLog.count({
        where: { actorUserId: adminId, entityId: winner.id, action: "PATIENT_PROFILE_UPDATED" },
      }),
      0,
    );
  });

  it("still creates a profile when the address remains unheld", async (t) => {
    if (!boot(t)) return;
    const response = await patch(cleanCreateEmail, { fullName: "Synthetic Clean Create" });
    assert.equal(response.statusCode, 200);
    assert.equal(await prisma.patientProfile.count({ where: { email: cleanCreateEmail } }), 1);
  });

  it("returns 409 when anonymization wins an id-keyed update", async (t) => {
    if (!boot(t)) return;
    const restoredValue = "Synthetic Restored Value";
    activeBarrier = barrier("anonymize", anonymizeProfileId);
    const request = patch(anonymizeEmail, {
      fullName: restoredValue,
      phone: "+00000000003",
      preferredPharmacy: restoredValue,
      allergies: [restoredValue],
    });
    await waitForBarrier(activeBarrier);

    const tombstoneEmail = `deleted-${anonymizeProfileId}@removed.invalid`;
    const anonymizedAt = new Date();
    await originalUpdate({
      where: { id: anonymizeProfileId },
      data: {
        email: tombstoneEmail,
        anonymizedAt,
        fullName: null,
        phone: null,
        preferredPharmacy: null,
        allergies: [],
      },
    });
    activeBarrier.release();
    const response = await request;
    activeBarrier = null;

    assert.equal(response.statusCode, 409);
    assert.equal(response.body.includes(anonymizeEmail), false);
    assert.equal(response.body.includes(restoredValue), false);
    const retained = await prisma.patientProfile.findUnique({
      where: { id: anonymizeProfileId },
      select: {
        email: true,
        anonymizedAt: true,
        fullName: true,
        phone: true,
        preferredPharmacy: true,
        allergies: true,
      },
    });
    assert.deepEqual(retained, {
      email: tombstoneEmail,
      anonymizedAt,
      fullName: null,
      phone: null,
      preferredPharmacy: null,
      allergies: [],
    });
    assert.equal(
      await prisma.appointment.count({
        where: { id: { in: appointmentIds }, email: anonymizeEmail, patientProfileId: { not: null } },
      }),
      0,
    );
    assert.equal(
      await prisma.auditLog.count({
        where: {
          actorUserId: adminId,
          entityId: anonymizeProfileId,
          action: { in: ["PATIENT_PROFILE_UPDATED", "PATIENT_ALERT_UPDATED"] },
        },
      }),
      0,
    );
    assert.equal(await prisma.patientAlertLog.count({ where: { patientProfileId: anonymizeProfileId } }), 0);
  });

  it("keeps missing and ordinary id writes distinct", async (t) => {
    if (!boot(t)) return;
    await assert.rejects(
      writePatientProfile(
        { kind: "id", patientProfileId: `missing-${run}` },
        { preferredPharmacy: "Synthetic Missing" },
      ),
      PatientProfileNotFoundError,
    );

    const result = await writePatientProfile(
      { kind: "id", patientProfileId: normalProfileId },
      { preferredPharmacy: "Synthetic Normal After" },
    );
    assert.ok(result.profile);
    assert.equal(result.profile.id, normalProfileId);
    assert.equal(result.profile.preferredPharmacy, "Synthetic Normal After");
  });
});
