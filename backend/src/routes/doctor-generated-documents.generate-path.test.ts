import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it, mock } from "node:test";
import Fastify, { type FastifyInstance, type FastifyPluginAsync } from "fastify";

/**
 * The generate path of `POST /api/doctor/appointments/:id/documents/generate`,
 * driven through the real Fastify route. Covers FE-3 (concurrent duplicate
 * requests) and WF-6 (Brazil, which has no Word template, must fail closed
 * rather than fall back to another market stationery).
 *
 * FE-3 — two concurrent identical requests.
 *
 * `withGenerateLock` serialises per `appointmentId:documentType`, so the two
 * requests never interleave — but serialising is not deduplicating. This
 * measures what a double-click actually costs on the server: renders, storage
 * writes, durable rows, patient-upload tokens, and whether the document id the
 * first caller was handed still exists once the second caller is done.
 *
 * Synthetic data only — no DB, no network, no real patient information. The
 * renderer, object storage and the upload-link service are counters.
 */

const DOCTOR_ID = "doc-fe3";
const OTHER_DOCTOR_ID = "doc-other";
const USER_ID = "user-doc-fe3";
const APPT_ID = "appt-fe3";

type Row = Record<string, unknown>;

const store: { documents: Row[]; uploadLinks: Row[] } = { documents: [], uploadLinks: [] };
const counters = { render: 0, put: 0, deleteObject: 0, tokens: 0 };
/** Country on the synthetic appointment; `br` exercises the no-DOCX market. */
let apptCountry = "pt";
/** Simulates the HTML renderer failing, so the DOCX fallback decides the outcome. */
let htmlRenderFails = false;

/**
 * Holds arriving requests at the very first `await` of the route handler until
 * `need` of them have arrived, then releases them together. Without it
 * `app.inject` runs the first request to completion before the second is even
 * routed, and the "concurrent" test would silently be a sequential one.
 */
let arrivalBarrier: { need: number; seen: number; gate: Promise<void>; open: () => void } | null =
  null;

function armBarrier(need: number) {
  let open!: () => void;
  const gate = new Promise<void>((resolve) => {
    open = resolve;
  });
  arrivalBarrier = { need, seen: 0, gate, open };
}

async function waitAtBarrier() {
  const barrier = arrivalBarrier;
  if (!barrier) return;
  barrier.seen += 1;
  if (barrier.seen >= barrier.need) barrier.open();
  await barrier.gate;
}

function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, want]) => {
    const have = row[key];
    if (want && typeof want === "object" && !(want instanceof Date)) {
      const w = want as Row;
      if ("in" in w) return (w.in as unknown[]).includes(have);
      if ("not" in w) return have !== w.not;
      if ("equals" in w) return have === w.equals;
      return true;
    }
    return have === want;
  });
}

let app: FastifyInstance;
let authDoctorId = DOCTOR_ID;

before(async () => {
  let seq = 0;
  const prisma: Record<string, unknown> = {
    appointment: {
      findFirst: async ({ where }: { where: Row }) =>
        where.id === APPT_ID && where.doctorId === DOCTOR_ID
          ? {
              id: APPT_ID,
              fullName: "Test Patient",
              email: "patient@example.test",
              countryCode: apptCountry,
              consultationType: "GENERAL",
              scheduledAt: new Date("2026-01-01T09:00:00.000Z"),
              dateOfBirth: null,
              pharmacy: null,
            }
          : null,
    },
    country: { findFirst: async () => null },
    generatedDocument: {
      count: async ({ where }: { where: Row }) =>
        store.documents.filter((r) => matches(r, where)).length,
      findMany: async ({ where }: { where: Row }) =>
        store.documents.filter((r) => matches(r, where)).map((r) => ({ ...r })),
      findFirst: async ({ where }: { where: Row }) => {
        const hit = store.documents.find((r) => matches(r, where));
        return hit ? { ...hit } : null;
      },
      create: async ({ data }: { data: Row }) => {
        seq += 1;
        const row: Row = {
          id: (data.id as string) ?? `gdoc-${seq}`,
          sentToPatient: false,
          certificateId: null,
          prescriptionNumber: null,
          uploadTokenHash: null,
          createdAt: new Date(),
          ...data,
        };
        store.documents.push(row);
        return { ...row };
      },
      update: async ({ where, data }: { where: Row; data: Row }) => {
        const row = store.documents.find((r) => r.id === where.id)!;
        Object.assign(row, data);
        return { ...row };
      },
      delete: async ({ where }: { where: Row }) => {
        const i = store.documents.findIndex((r) => r.id === where.id);
        const [gone] = store.documents.splice(i, 1);
        return gone;
      },
    },
  };

  mock.module("../db/prisma.js", { namedExports: { prisma } });
  mock.module("../utils/doctor-auth.js", {
    namedExports: {
      verifyDoctorAccess: async () => {
        await waitAtBarrier();
        return {
          ok: true,
          userId: USER_ID,
          doctorId: authDoctorId,
          email: "d@example.test",
          fullName: "Doctor FE3",
          role: "DOCTOR",
        };
      },
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
    namedExports: {
      recordAudit: async () => undefined,
      recordCriticalAudit: async () => undefined,
    },
  });
  mock.module("../services/object-storage.js", {
    namedExports: {
      putObject: async () => {
        counters.put += 1;
      },
      deleteObject: async () => {
        counters.deleteObject += 1;
      },
      getObject: async () => null,
      readObjectBodyToBuffer: async () => null,
      isMediaStorageConfigured: () => true,
    },
  });
  mock.module("../modules/generated-documents/appointment-document-source.js", {
    namedExports: {
      resolveAppointmentDocumentSource: async (appointmentId: string, doctorId: string) =>
        appointmentId === APPT_ID && doctorId === DOCTOR_ID
          ? {
              doctor: { name: "Dr Test", registrationLine: "OM 0000", registrationMissing: false },
              patient: { patientIdLine: "", address: "—", birthDate: "—" },
            }
          : null,
      getAppointmentDocumentContext: async () => null,
    },
  });
  mock.module("../modules/generated-documents/html-document-renderer.js", {
    namedExports: {
      renderDocumentPdf: async () => {
        counters.render += 1;
        if (htmlRenderFails) throw new Error("simulated HTML render failure");
        return Buffer.from("%PDF-synthetic");
      },
    },
  });
  mock.module("../modules/generated-documents/docx-document-renderer.js", {
    namedExports: {
      // Mirrors the real renderer: no template prefix for the country means no
      // PDF, and it is `resolveDocxTemplatePath` — not this test — that leaves
      // `br` out. Ireland stands in for a market that does have one.
      renderDocxTemplatePdf: async (countryCode: string) =>
        countryCode?.toLowerCase() === "ie" ? Buffer.from("%PDF-docx") : null,
    },
  });
  mock.module("../modules/patient-upload/patient-upload-link.service.js", {
    namedExports: {
      createPatientUploadToken: async (claims: { documentId?: string }) => {
        counters.tokens += 1;
        store.uploadLinks.push({ documentId: claims.documentId ?? null, revokedAt: null });
        return { token: `tok-${counters.tokens}`, expiresAt: new Date(Date.now() + 3_600_000) };
      },
      buildPatientUploadUrl: (token: string) => `https://example.test/u/${token}`,
      hashToken: (token: string) => `hash:${token}`,
    },
  });
  mock.module("../modules/identity-verification/identity-verification.service.js", {
    namedExports: { resolveVerificationForPrescription: async () => null },
  });
  mock.module("../modules/countries/country-timezone.service.js", {
    namedExports: { resolveCountryTimeZone: async () => "Europe/Lisbon" },
  });
  mock.module("../modules/generated-documents/qr-code.js", {
    namedExports: {
      qrPngBuffer: async () => Buffer.from("png"),
      qrDataUrl: async () => "data:image/png;base64,AA",
    },
  });

  const routeModule = (await import("./doctor-generated-documents.route.js")) as unknown as {
    default: FastifyPluginAsync;
  };
  app = Fastify();
  await app.register(routeModule.default);
  await app.ready();
});

after(async () => {
  await app?.close();
});

beforeEach(() => {
  store.documents = [];
  store.uploadLinks = [];
  counters.render = 0;
  counters.put = 0;
  counters.deleteObject = 0;
  counters.tokens = 0;
  arrivalBarrier = null;
  authDoctorId = DOCTOR_ID;
  apptCountry = "pt";
  htmlRenderFails = false;
});

function generate(type: string, fields: Record<string, string> = {}) {
  return app.inject({
    method: "POST",
    url: `/api/doctor/appointments/${APPT_ID}/documents/generate`,
    payload: { type, fields },
  });
}

/** Both requests are inside the handler before either is allowed to proceed. */
function generateTwice(type: string, fields: Record<string, string> = {}) {
  armBarrier(2);
  return Promise.all([generate(type, fields), generate(type, fields)]);
}

describe("FE-3 — concurrent identical generate requests", () => {
  it("ATTENDANCE_CERTIFICATE: one durable row, one render, one storage write", async () => {
    const [a, b] = await generateTwice("ATTENDANCE_CERTIFICATE");

    assert.equal(a.statusCode, 201);
    assert.equal(b.statusCode, 201);
    const idA = a.json().data.document.id;
    const idB = b.json().data.document.id;
    assert.equal(idA, idB, "both callers get the same document id");
    assert.equal(store.documents.length, 1, "one durable row");
    assert.equal(store.documents[0].id, idA, "the id both callers were handed still exists");
    assert.equal(counters.render, 1, "one render");
    assert.equal(counters.put, 1, "one storage write");
  });

  it("EXAMS_PRESCRIPTION: one upload token, no link left bound to a deleted document", async () => {
    const [a, b] = await generateTwice("EXAMS_PRESCRIPTION", { exams: "Synthetic panel" });

    assert.equal(a.statusCode, 201);
    assert.equal(b.statusCode, 201);
    assert.equal(store.documents.length, 1, "one durable row");
    assert.equal(counters.tokens, 1, "one patient-upload token minted");
    const liveDocIds = new Set(store.documents.map((r) => r.id));
    const orphans = store.uploadLinks.filter((l) => !liveDocIds.has(l.documentId as string));
    assert.equal(orphans.length, 0, "no upload link bound to a deleted document");
  });

  it("OTHER: a double-click does not leave two custom drafts", async () => {
    await generateTwice("OTHER", { customLabel: "Referral" });
    assert.equal(store.documents.length, 1, "one durable row");
    assert.equal(counters.render, 1, "one render");
  });

  it("a later deliberate generate is NOT deduplicated", async () => {
    const first = await generate("ATTENDANCE_CERTIFICATE");
    assert.equal(first.statusCode, 201);
    assert.equal(counters.render, 1);

    const second = await generate("ATTENDANCE_CERTIFICATE");
    assert.equal(second.statusCode, 201);
    assert.equal(counters.render, 2, "the second deliberate action renders again");
    assert.notEqual(
      second.json().data.document.id,
      first.json().data.document.id,
      "a deliberate re-generate produces a new document",
    );
    assert.equal(store.documents.length, 1, "latest unsent draft replaces the previous one");
  });

  it("different document types stay independent under concurrency", async () => {
    armBarrier(2);
    const [a, b] = await Promise.all([
      generate("ATTENDANCE_CERTIFICATE"),
      generate("CUSTOM_CERTIFICATE", { certificateName: "Fitness" }),
    ]);

    assert.equal(a.statusCode, 201);
    assert.equal(b.statusCode, 201);
    assert.equal(store.documents.length, 2, "two types, two documents");
    assert.equal(counters.render, 2);
  });

  it("the appointment doctor can still generate; another doctor gets 404", async () => {
    const owner = await generate("ATTENDANCE_CERTIFICATE");
    assert.equal(owner.statusCode, 201, "legitimate doctor access unchanged");

    authDoctorId = OTHER_DOCTOR_ID;
    const intruder = await generate("ATTENDANCE_CERTIFICATE");
    assert.equal(intruder.statusCode, 404);
    assert.equal(store.documents.length, 1, "the owning doctor's row is untouched");
  });
});

describe("WF-6 — Brazil has no Word template, so a render failure must fail closed", () => {
  it("returns an error and persists nothing when the HTML render fails", async () => {
    apptCountry = "br";
    htmlRenderFails = true;

    const res = await generate("ATTENDANCE_CERTIFICATE");

    assert.equal(res.statusCode, 500, "a controlled failure, not a silent success");
    assert.equal(store.documents.length, 0, "no document row");
    assert.equal(counters.put, 0, "no object written to storage, so nothing to orphan");
    assert.equal(counters.tokens, 0, "no patient-upload token minted");
  });

  it("does not fall back to another market Word template", async () => {
    // Ireland is the control: its DOCX fallback DOES produce a PDF on the same
    // failure. Brazil must not borrow it — language and stationery are separate
    // questions, and mapping br onto PT is what put Brazilian documents on the
    // Portuguese clinic letterhead.
    apptCountry = "ie";
    htmlRenderFails = true;
    const ie = await generate("ATTENDANCE_CERTIFICATE");
    assert.equal(ie.statusCode, 201, "a market with its own template still falls back");

    store.documents = [];
    counters.put = 0;
    apptCountry = "br";
    htmlRenderFails = true;
    const br = await generate("ATTENDANCE_CERTIFICATE");
    assert.equal(br.statusCode, 500);
    assert.equal(store.documents.length, 0);
  });

  it("Brazil still generates normally when the HTML renderer works", async () => {
    apptCountry = "br";
    const res = await generate("ATTENDANCE_CERTIFICATE");
    assert.equal(res.statusCode, 201, "the localized HTML pipeline is the Brazilian path");
    assert.equal(store.documents.length, 1);
  });
});
