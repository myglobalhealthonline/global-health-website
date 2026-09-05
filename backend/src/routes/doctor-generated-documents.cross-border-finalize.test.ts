import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it, mock } from "node:test";
import Fastify, { type FastifyInstance, type FastifyPluginAsync } from "fastify";

/**
 * Batch 3b — the COMPLETE route-to-service path for
 * `POST /api/doctor/documents/generated/:id/finalize`.
 *
 * The Batch 3 WF-1 tests entered at `onCrossBorderRxPrescriptionFinalised`,
 * below the point where `finalizeGeneratedDocument` writes
 * `GeneratedDocument.sentToPatient`. That write is what made a terminal-state
 * rejection still latch the prescription (blocking edit and delete) and still
 * answer the doctor with `200 { finalized: true }`.
 *
 * This drives the real Fastify route via `inject`, so the HTTP status is
 * observed rather than inferred. Auth and the medical-access guard are stubbed
 * — they are frozen files and are covered by the PHI/AZ-1 suites — everything
 * from the route handler down is real. Synthetic data only; no DB, no network.
 */

const DOCTOR_ID = "doc-b";
const USER_ID = "user-doc-b";
const DOC_ID = "gdoc-1";
const APPT_ID = "async-appt-1";
const REQUEST_ID = "cbr-1";

type Row = Record<string, unknown>;

const store: {
  generatedDocument: Row | null;
  appointment: Row;
  request: Row | null;
  /** Set to a status the CAS will observe instead of the one first read. */
  cancelBeforeTransaction: string | null;
  /** Force the transaction body to blow up after its writes. */
  explodeInTransaction: boolean;
} = {
  generatedDocument: null,
  appointment: {},
  request: null,
  cancelBeforeTransaction: null,
  explodeInTransaction: false,
};

const effects: {
  emails: unknown[];
  whatsapp: unknown[];
  notifications: unknown[];
  reviewInvites: unknown[];
  storageDeletes: string[];
} = { emails: [], whatsapp: [], notifications: [], reviewInvites: [], storageDeletes: [] };

function resetStore(options: { appointmentStatus: string; crossBorder: boolean }) {
  store.generatedDocument = {
    id: DOC_ID,
    doctorId: DOCTOR_ID,
    appointmentId: APPT_ID,
    documentType: "PRESCRIPTION",
    fileName: "medicine-prescription.pdf",
    storageKey: "generated/gdoc-1.pdf",
    patientEmail: "ana@example.com",
    prescriptionNumber: "RX-0001",
    certificateId: null,
    metadata: {},
    sentToPatient: false,
    createdAt: new Date("2026-01-01T09:00:00.000Z"),
  };
  store.appointment = {
    id: APPT_ID,
    doctorId: DOCTOR_ID,
    status: options.appointmentStatus,
    consultationCompletedAt: null,
    countryCode: "PT",
    fullName: "Ana Silva",
    email: "ana@example.com",
    phone: null,
    whatsappConsent: false,
    finalized: false,
  };
  store.request = options.crossBorder
    ? {
        id: REQUEST_ID,
        asyncAppointmentId: APPT_ID,
        status: "AWAITING_DOCTOR",
        finalisedAt: null,
        decidedAt: null,
        sourceDoctorId: "doc-a",
        sourceAppointmentId: "src-appt-1",
        patientEmail: "ana@example.com",
        patientFullName: "Ana Silva",
        targetCountryCode: "PT",
      }
    : null;
  store.cancelBeforeTransaction = null;
  store.explodeInTransaction = false;
  effects.emails = [];
  effects.whatsapp = [];
  effects.notifications = [];
  effects.reviewInvites = [];
  effects.storageDeletes = [];
}

/** Minimal Prisma `where` evaluator: equality plus the operators used here. */
function matches(row: Row | null, where: Row): boolean {
  if (!row) return false;
  return Object.entries(where).every(([key, want]) => {
    const have = row[key];
    if (want && typeof want === "object" && !(want instanceof Date)) {
      const w = want as Row;
      if ("in" in w) return (w.in as unknown[]).includes(have);
      if ("notIn" in w) return !(w.notIn as unknown[]).includes(have);
      if ("equals" in w) return have === w.equals;
      if ("not" in w) return have !== w.not;
      return true;
    }
    return have === want;
  });
}

function snapshot() {
  return {
    appointmentStatus: store.appointment.status,
    consultationCompletedAt: store.appointment.consultationCompletedAt,
    requestStatus: store.request?.status ?? null,
    requestFinalisedAt: store.request?.finalisedAt ?? null,
    documentSentToPatient: store.generatedDocument?.sentToPatient ?? null,
    documentType: store.generatedDocument?.documentType ?? null,
    prescriptionNumber: store.generatedDocument?.prescriptionNumber ?? null,
    emails: effects.emails.length,
    whatsapp: effects.whatsapp.length,
    notifications: effects.notifications.length,
    reviewInvites: effects.reviewInvites.length,
  };
}

let app: FastifyInstance;
let documentsService: typeof import("../modules/generated-documents/generated-documents.service.js");

before(async () => {
  // Undo log. A rollback must restore only what THIS transaction wrote — a
  // cancellation committed by another request in the meantime has to survive
  // it, exactly as it would in Postgres.
  let undo: (() => void)[] | null = null;
  function write(row: Row, data: Row) {
    const before = Object.fromEntries(Object.keys(data).map((k) => [k, row[k]]));
    undo?.push(() => Object.assign(row, before));
    Object.assign(row, data);
  }

  const prisma: Record<string, unknown> = {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      undo = [];
      const log = undo;
      try {
        const out = await fn(prisma);
        if (store.explodeInTransaction) throw new Error("simulated transaction failure");
        return out;
      } catch (error) {
        for (const step of log.reverse()) step();
        throw error;
      } finally {
        undo = null;
      }
    },
  };
  Object.assign(prisma, {
    generatedDocument: {
      findFirst: async ({ where }: { where: Row }) =>
        matches(store.generatedDocument, where) ? { ...store.generatedDocument } : null,
      findUnique: async ({ where }: { where: Row }) =>
        matches(store.generatedDocument, where) ? { ...store.generatedDocument } : null,
      update: async ({ data }: { data: Row }) => {
        write(store.generatedDocument as Row, data);
        return { ...store.generatedDocument };
      },
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        if (!matches(store.generatedDocument, where)) return { count: 0 };
        write(store.generatedDocument as Row, data);
        return { count: 1 };
      },
      delete: async () => {
        const gone = store.generatedDocument;
        store.generatedDocument = null;
        return gone;
      },
    },
    crossBorderPrescriptionRequest: {
      findFirst: async ({ where }: { where: Row }) =>
        matches(store.request, where) ? { ...store.request } : null,
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        if (!matches(store.request, where)) return { count: 0 };
        write(store.request as Row, data);
        return { count: 1 };
      },
    },
    appointment: {
      findUnique: async ({ where }: { where: Row }) => {
        const hit = matches(store.appointment, where) ? { ...store.appointment } : null;
        // Simulate a cancellation that lands after the initial lookup but
        // before the compare-and-swap.
        if (hit && store.cancelBeforeTransaction) {
          store.appointment.status = store.cancelBeforeTransaction;
          store.cancelBeforeTransaction = null;
        }
        return hit;
      },
      findFirst: async ({ where }: { where: Row }) =>
        matches(store.appointment, where) ? { ...store.appointment } : null,
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        if (!matches(store.appointment, where)) return { count: 0 };
        write(store.appointment, data);
        return { count: 1 };
      },
      update: async ({ data }: { data: Row }) => {
        write(store.appointment, data);
        return { ...store.appointment };
      },
    },
    user: { findFirst: async () => ({ id: "patient-user-1" }) },
  });

  mock.module("../db/prisma.js", { namedExports: { prisma } });
  mock.module("../utils/doctor-auth.js", {
    namedExports: {
      verifyDoctorAccess: async () => ({
        ok: true,
        userId: USER_ID,
        doctorId: DOCTOR_ID,
        email: "b@example.com",
        fullName: "Doctor B",
        role: "DOCTOR",
      }),
    },
  });
  class MedicalAccessDeniedError extends Error {}
  mock.module("../utils/guard-medical-read.js", {
    namedExports: {
      guardMedicalReadForAppointment: async () => undefined,
      MedicalAccessDeniedError,
      medicalAccessDeniedResponse: (err: Error) => ({ ok: false, message: err.message }),
    },
  });
  mock.module("../modules/audit/audit.service.js", {
    namedExports: { recordAudit: async () => undefined },
  });
  mock.module("../modules/notifications/notify.service.js", {
    namedExports: {
      notifyDoctor: async (...a: unknown[]) => { effects.notifications.push(["doctor", ...a]); },
      notifyUser: async (...a: unknown[]) => { effects.notifications.push(["user", ...a]); },
      notifyAdmins: async (...a: unknown[]) => { effects.notifications.push(["admins", ...a]); },
    },
  });
  mock.module("../modules/cross-border-rx/cross-border-rx-notifications.service.js", {
    namedExports: {
      notifyPatientCrossBorderConsent: async () => {},
      notifyPatientCrossBorderPayment: async () => {},
      notifyPatientCrossBorderAccepted: async (...a: unknown[]) => {
        effects.emails.push(["patient-accepted", ...a]);
        effects.whatsapp.push(["patient-accepted", ...a]);
      },
      notifyRequestingDoctorFinalised: async (...a: unknown[]) => {
        effects.emails.push(["doctor-a-finalised", ...a]);
        effects.whatsapp.push(["doctor-a-finalised", ...a]);
      },
      notifyStaffCrossBorderRequest: async () => {},
      notifySourceDoctorMoreInfoRequested: async () => {},
      notifyTargetDoctorMoreInfoAnswered: async () => {},
    },
  });
  mock.module("../lib/email/send-email.js", {
    namedExports: {
      sendEmail: async (...a: unknown[]) => { effects.emails.push(["raw", ...a]); return { ok: true }; },
    },
  });
  // Tripwire, not live coverage: nothing on this path imports the review-invite
  // service today, so the counter stays at zero. If a future change wires one
  // in, this mock activates and the "no review invitation" assertions catch it.
  mock.module("../modules/review-invites/review-invite.service.js", {
    namedExports: {
      createReviewInviteForAppointment: async (...a: unknown[]) => { effects.reviewInvites.push(a); },
    },
  });
  mock.module("../services/object-storage.js", {
    namedExports: {
      putObject: async () => ({ ok: true }),
      deleteObject: async (key: string) => { effects.storageDeletes.push(key); },
      getObject: async () => null,
      readObjectBodyToBuffer: async () => null,
      isMediaStorageConfigured: () => true,
    },
  });

  // `mock.module` hands back a namespace object whose `default` is the plugin.
  const routeModule = (await import("./doctor-generated-documents.route.js")) as unknown as {
    default: FastifyPluginAsync;
  };
  documentsService = await import(
    "../modules/generated-documents/generated-documents.service.js"
  );
  app = Fastify();
  await app.register(routeModule.default);
  await app.ready();
});

after(async () => {
  await app?.close();
});

beforeEach(() => resetStore({ appointmentStatus: "CANCELLED", crossBorder: true }));

const finalize = () =>
  app.inject({ method: "POST", url: `/api/doctor/documents/generated/${DOC_ID}/finalize` });

/** Let post-commit `void`-ed notification tails settle. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

describe("cross-border prescription finalize — terminal appointment (Batch 3b)", () => {
  it("returns 409 and leaves every listed field untouched", async () => {
    const before = snapshot();
    const response = await finalize();
    await flush();
    const after = snapshot();

    assert.equal(response.statusCode, 409, "terminal appointment is a conflict");
    const body = response.json();
    assert.equal(body.ok, false);
    assert.notEqual(body?.data?.finalized, true, "must not report finalized: true");

    assert.equal(after.appointmentStatus, "CANCELLED");
    assert.equal(after.consultationCompletedAt, null);
    assert.equal(after.requestStatus, "AWAITING_DOCTOR");
    assert.equal(after.requestFinalisedAt, null);
    assert.equal(before.documentSentToPatient, false);
    assert.equal(after.documentSentToPatient, false, "sentToPatient must not latch");
    assert.equal(after.documentType, "PRESCRIPTION");
    assert.equal(after.prescriptionNumber, "RX-0001");
    assert.equal(after.emails, 0);
    assert.equal(after.whatsapp, 0);
    assert.equal(after.notifications, 0);
    assert.equal(after.reviewInvites, 0);
  });

  it("leaves the document on the existing editable / deletable path", async () => {
    await finalize();
    await flush();
    assert.equal(
      snapshot().documentSentToPatient,
      false,
      "the rejection must not latch sentToPatient",
    );
    // `deleteGeneratedDocument` refuses once `sentToPatient` is set, so a
    // successful delete proves the rejection did not latch the document.
    const deleted = await documentsService.deleteGeneratedDocument(DOCTOR_ID, DOC_ID);
    assert.equal(deleted.ok, true, "a rejected finalize must not block deletion");
    assert.deepEqual(effects.storageDeletes, ["generated/gdoc-1.pdf"]);
  });

  it("treats an already-COMPLETED appointment as a conflict too", async () => {
    resetStore({ appointmentStatus: "COMPLETED", crossBorder: true });
    const response = await finalize();
    await flush();
    assert.equal(response.statusCode, 409);
    assert.equal(snapshot().documentSentToPatient, false);
    assert.equal(snapshot().requestFinalisedAt, null);
  });
});

describe("cross-border prescription finalize — valid live appointment (Batch 3b)", () => {
  it("finalizes document, request and appointment into one consistent state", async () => {
    resetStore({ appointmentStatus: "REQUEST_RECEIVED", crossBorder: true });
    const response = await finalize();
    await flush();
    const after = snapshot();

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().data.finalized, true);
    assert.equal(after.documentSentToPatient, true);
    assert.equal(after.requestStatus, "ACCEPTED");
    assert.ok(after.requestFinalisedAt instanceof Date);
    assert.equal(after.appointmentStatus, "COMPLETED");
    assert.ok(after.consultationCompletedAt instanceof Date);
    assert.ok(after.notifications > 0, "notifications fire after the commit");
    assert.ok(after.emails > 0);
  });

  it("repeating a finalized request keeps the existing 409 idempotency", async () => {
    resetStore({ appointmentStatus: "REQUEST_RECEIVED", crossBorder: true });
    assert.equal((await finalize()).statusCode, 200);
    await flush();
    const between = snapshot();

    const second = await finalize();
    await flush();
    const after = snapshot();

    assert.equal(second.statusCode, 409, "already finalized");
    assert.equal(after.requestFinalisedAt, between.requestFinalisedAt, "no re-claim");
    assert.equal(after.notifications, between.notifications, "no duplicate notification");
    assert.equal(after.emails, between.emails, "no duplicate email");
  });
});

describe("cross-border prescription finalize — rollback (Batch 3b)", () => {
  it("rolls every write back when a cancellation wins between lookup and CAS", async () => {
    resetStore({ appointmentStatus: "REQUEST_RECEIVED", crossBorder: true });
    store.cancelBeforeTransaction = "CANCELLED";

    const response = await finalize();
    await flush();
    const after = snapshot();

    assert.equal(response.statusCode, 409);
    assert.match(
      response.json().message,
      /CANCELLED/,
      "the conflict must name the status the appointment actually holds now, not the stale one",
    );
    assert.equal(after.documentSentToPatient, false, "document write rolled back");
    assert.equal(after.requestStatus, "AWAITING_DOCTOR", "request claim rolled back");
    assert.equal(after.requestFinalisedAt, null);
    assert.equal(after.appointmentStatus, "CANCELLED");
    assert.equal(after.consultationCompletedAt, null);
    assert.equal(after.emails, 0);
    assert.equal(after.whatsapp, 0);
    assert.equal(after.notifications, 0);
    assert.equal(after.reviewInvites, 0);
  });

  it("rolls every write back on a genuine transaction failure, without reporting success", async () => {
    resetStore({ appointmentStatus: "REQUEST_RECEIVED", crossBorder: true });
    store.explodeInTransaction = true;

    const response = await finalize();
    await flush();
    const after = snapshot();

    assert.equal(response.statusCode, 500, "a DB failure surfaces, it is not reported as success");
    assert.equal(after.documentSentToPatient, false);
    assert.equal(after.requestStatus, "AWAITING_DOCTOR");
    assert.equal(after.requestFinalisedAt, null);
    assert.equal(after.appointmentStatus, "REQUEST_RECEIVED");
    assert.equal(after.consultationCompletedAt, null);
    assert.equal(after.notifications, 0);
  });
});

describe("generic (non-cross-border) prescription finalize — unchanged (Batch 3b)", () => {
  it("finalizes on a live appointment exactly as before", async () => {
    resetStore({ appointmentStatus: "REQUEST_RECEIVED", crossBorder: false });
    const response = await finalize();
    await flush();
    const after = snapshot();

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().data.finalized, true);
    assert.equal(after.documentSentToPatient, true);
    // No cross-border state to touch, and no appointment completion.
    assert.equal(after.appointmentStatus, "REQUEST_RECEIVED");
    assert.equal(after.consultationCompletedAt, null);
    assert.equal(after.notifications, 0);
    assert.equal(after.emails, 0);
  });

  it("still finalizes on a CANCELLED appointment — no new transition restriction", async () => {
    resetStore({ appointmentStatus: "CANCELLED", crossBorder: false });
    const response = await finalize();
    await flush();

    assert.equal(response.statusCode, 200, "generic prescriptions keep their current behavior");
    assert.equal(snapshot().documentSentToPatient, true);
    assert.equal(snapshot().appointmentStatus, "CANCELLED");
  });

  it("keeps refusing a non-PRESCRIPTION document type", async () => {
    resetStore({ appointmentStatus: "REQUEST_RECEIVED", crossBorder: false });
    (store.generatedDocument as Row).documentType = "ABSENCE_CERTIFICATE";
    const response = await finalize();
    assert.equal(response.statusCode, 400);
    assert.equal(snapshot().documentSentToPatient, false);
  });

  it("keeps returning 404 for a document that is not this doctor's", async () => {
    resetStore({ appointmentStatus: "REQUEST_RECEIVED", crossBorder: false });
    (store.generatedDocument as Row).doctorId = "someone-else";
    const response = await finalize();
    assert.equal(response.statusCode, 404);
  });
});
