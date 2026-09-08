import "../test-guard.js";

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { deleteAuditLogs, deleteMedicalAccessLogs } from "../test-utils/audit-cleanup.js";
import { uniqueCurrencyCode } from "../test-utils/unique-currency-code.js";

describe("doctor patient documents route — durable patient identity", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let envModule: typeof import("../config/env.js")["env"];
  let originalEnforce = false;

  const uniq = `docid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const patientEmail = `patient-${uniq}@example.invalid`;
  const ambiguousEmail = `ambiguous-${uniq}@example.invalid`;
  const unresolvedEmail = `unresolved-${uniq}@example.invalid`;
  const currencyCode = uniqueCurrencyCode();
  const ids = {
    users: [] as string[],
    doctors: [] as string[],
    profiles: [] as string[],
    appointments: [] as string[],
    appointmentDocuments: [] as string[],
    generatedDocuments: [] as string[],
    medicalDocuments: [] as string[],
  };

  let countryId = "";
  let countryCode = "";
  let currencyId = "";
  let adminCookie: Record<string, string> = {};
  let unrelatedDoctorCookie: Record<string, string> = {};

  let linkedAppointmentId = "";
  let legacyAppointmentId = "";
  let linkedUploadId = "";
  let linkedGeneratedId = "";
  let legacyUploadId = "";
  let legacyGeneratedId = "";
  let patientUploadId = "";
  let guestUploadId = "";
  let guestGeneratedId = "";
  let guestStorageKey = "";
  let guestMetadataMarker = "";

  const get = (email: string, cookies: Record<string, string>) =>
    app.inject({
      method: "GET",
      url: `/api/doctor/patients/${encodeURIComponent(email)}/documents`,
      cookies,
    });

  before(async () => {
    prisma = (await import("../db/prisma.js")).prisma;
    envModule = (await import("../config/env.js")).env;
    const { signAuthToken } = await import("../utils/auth-session.js");
    const { buildApp } = await import("../app.js");

    app = await buildApp();
    app.log.level = "silent";
    await prisma.$queryRawUnsafe("SELECT 1");
    originalEnforce = envModule.MEDICAL_ACCESS_ENFORCE;
    envModule.MEDICAL_ACCESS_ENFORCE = true;

    const currency = await prisma.currency.create({
      data: { code: currencyCode, symbol: "T", decimals: 2 },
    });
    currencyId = currency.id;
    countryCode = `d${uniq}`.slice(0, 8).toLowerCase();
    const country = await prisma.country.create({
      data: {
        code: countryCode,
        name: `Document identity ${uniq}`,
        slug: `document-identity-${uniq}`,
        legacyHomePath: `/doc-home-${uniq}`,
        teamPath: `/doc-team-${uniq}`,
        generalConsultationPath: `/doc-general-${uniq}`,
        specialistConsultationPath: `/doc-specialist-${uniq}`,
        currencyId,
      },
    });
    countryId = country.id;

    async function makeActor(role: "ADMIN" | "DOCTOR", label: string) {
      const doctor = role === "DOCTOR"
        ? await prisma.doctor.create({
            data: {
              countryId,
              slug: `${label}-${uniq}`,
              fullName: `Synthetic ${label}`,
              title: "GP",
            },
          })
        : null;
      if (doctor) ids.doctors.push(doctor.id);
      const user = await prisma.user.create({
        data: {
          email: `${label}-${uniq}@example.invalid`,
          passwordHash: "synthetic",
          fullName: `Synthetic ${label}`,
          role,
          doctorId: doctor?.id,
          twoFactorVerifiedAt: new Date(),
        },
      });
      ids.users.push(user.id);
      if (doctor) await prisma.doctorConfidentialityAgreement.create({
        data: {
          doctorId: doctor.id,
          agreementVersion: "1.0.0",
          accepted: true,
          acceptedAt: new Date(),
        },
      });
      return {
        doctorId: doctor?.id ?? null,
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

    async function makePatient(email: string, label: string) {
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: "synthetic",
          fullName: `Synthetic ${label}`,
          role: "PATIENT",
        },
      });
      ids.users.push(user.id);
      const profile = await prisma.patientProfile.create({
        data: {
          email,
          userId: user.id,
          fullName: `Synthetic ${label}`,
          countryFolderCode: "PT",
        },
      });
      ids.profiles.push(profile.id);
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
      doctorId: string;
      email: string;
      userId?: string | null;
      patientProfileId?: string | null;
    }) {
      const appointment = await prisma.appointment.create({
        data: {
          countryCode,
          consultationType: "GENERAL",
          fullName: "Synthetic document fixture",
          email: data.email,
          consentAccepted: true,
          userId: data.userId ?? null,
          patientProfileId: data.patientProfileId ?? null,
          doctorId: data.doctorId,
          status: "COMPLETED",
        },
      });
      ids.appointments.push(appointment.id);
      return appointment.id;
    }

    async function makeAppointmentDocuments(appointmentId: string, doctorId: string, label: string) {
      const upload = await prisma.appointmentDocument.create({
        data: {
          appointmentId,
          doctorId,
          label,
          storageKey: `synthetic/${label}-${uniq}.pdf`,
          mimetype: "application/pdf",
          byteSize: 1,
        },
      });
      ids.appointmentDocuments.push(upload.id);
      const generated = await prisma.generatedDocument.create({
        data: {
          appointmentId,
          doctorId,
          patientEmail,
          documentType: "OTHER",
          fileName: `${label}-${uniq}.pdf`,
          storageKey: `synthetic/generated-${label}-${uniq}.pdf`,
          metadata: { marker: label },
        },
      });
      ids.generatedDocuments.push(generated.id);
      return { upload, generated };
    }

    const admin = await makeActor("ADMIN", "archive-admin");
    adminCookie = admin.cookie;
    const unrelatedDoctor = await makeActor("DOCTOR", "unrelated-doctor");
    unrelatedDoctorCookie = unrelatedDoctor.cookie;
    assert.ok(unrelatedDoctor.doctorId);
    const patient = await makePatient(patientEmail, "current-patient");

    linkedAppointmentId = await makeAppointment({
      doctorId: unrelatedDoctor.doctorId,
      email: patientEmail,
      userId: patient.userId,
      patientProfileId: patient.profileId,
    });
    const linked = await makeAppointmentDocuments(linkedAppointmentId, unrelatedDoctor.doctorId, "linked");
    linkedUploadId = linked.upload.id;
    linkedGeneratedId = linked.generated.id;

    legacyAppointmentId = await makeAppointment({
      doctorId: unrelatedDoctor.doctorId,
      email: patientEmail,
      userId: patient.userId,
      patientProfileId: null,
    });
    const legacy = await makeAppointmentDocuments(legacyAppointmentId, unrelatedDoctor.doctorId, "legacy");
    legacyUploadId = legacy.upload.id;
    legacyGeneratedId = legacy.generated.id;

    const patientUpload = await prisma.medicalDocument.create({
      data: {
        patientProfileId: patient.profileId,
        uploadedByRole: "PATIENT",
        documentType: "REPORT",
        title: `Synthetic patient upload ${uniq}`,
        fileKey: `synthetic/patient-${uniq}.pdf`,
        fileName: `patient-${uniq}.pdf`,
        mimetype: "application/pdf",
        byteSize: 1,
      },
    });
    patientUploadId = patientUpload.id;
    ids.medicalDocuments.push(patientUpload.id);

    const guestAppointmentId = await makeAppointment({
      doctorId: unrelatedDoctor.doctorId,
      email: patientEmail,
      userId: null,
      patientProfileId: null,
    });
    guestMetadataMarker = `guest-marker-${uniq}`;
    const guest = await makeAppointmentDocuments(guestAppointmentId, unrelatedDoctor.doctorId, guestMetadataMarker);
    guestUploadId = guest.upload.id;
    guestGeneratedId = guest.generated.id;
    guestStorageKey = guest.upload.storageKey;

    const ambiguousHolder = await makePatient(ambiguousEmail, "ambiguous-holder");
    assert.ok(ambiguousHolder.profileId);
    const linkedOther = await makePatient(
      `linked-other-${uniq}@example.invalid`,
      "ambiguous-linked-patient",
    );
    await makeAppointment({
      doctorId: unrelatedDoctor.doctorId,
      email: ambiguousEmail,
      userId: linkedOther.userId,
      patientProfileId: linkedOther.profileId,
    });
  });

  after(async () => {
    envModule.MEDICAL_ACCESS_ENFORCE = originalEnforce;
    for (const profileId of ids.profiles) {
      await deleteMedicalAccessLogs(prisma, { patientProfileId: profileId });
      await deleteAuditLogs(prisma, { entityId: profileId });
    }
    await deleteAuditLogs(prisma, { actorUserId: { in: ids.users } });
    await prisma.medicalDocument.deleteMany({ where: { id: { in: ids.medicalDocuments } } });
    await prisma.appointmentDocument.deleteMany({ where: { id: { in: ids.appointmentDocuments } } });
    await prisma.generatedDocument.deleteMany({ where: { id: { in: ids.generatedDocuments } } });
    await prisma.appointment.deleteMany({ where: { id: { in: ids.appointments } } });
    await prisma.patientConsent.deleteMany({ where: { patientProfileId: { in: ids.profiles } } });
    await prisma.patientProfile.deleteMany({ where: { id: { in: ids.profiles } } });
    await prisma.loginOtp.deleteMany({ where: { userId: { in: ids.users } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    await prisma.doctorConfidentialityAgreement.deleteMany({ where: { doctorId: { in: ids.doctors } } });
    await prisma.doctor.deleteMany({ where: { id: { in: ids.doctors } } });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
    await app.close();
  });

  it("returns linked uploads, profile uploads, and exact account-backed legacy documents only", async () => {
    const response = await get(patientEmail, adminCookie);
    assert.equal(response.statusCode, 200, "the identified archive remains accessible");
    const data = response.json().data as {
      uploads: Array<{ id: string; appointmentId: string }>;
      generated: Array<{ id: string; appointmentId: string }>;
      patientUploads: Array<{ id: string }>;
    };

    assert.equal(data.uploads.some((document) => document.id === linkedUploadId), true);
    assert.equal(data.uploads.some((document) => document.id === legacyUploadId), true);
    assert.equal(data.generated.some((document) => document.id === linkedGeneratedId), true);
    assert.equal(data.generated.some((document) => document.id === legacyGeneratedId), true);
    assert.equal(data.patientUploads.length, 1);
    assert.equal(data.patientUploads.some((document) => document.id === patientUploadId), true);
    assert.equal(data.uploads.some((document) => document.appointmentId === linkedAppointmentId), true);
    assert.equal(data.uploads.some((document) => document.appointmentId === legacyAppointmentId), true);

    const serialized = JSON.stringify(data);
    for (const forbidden of [guestUploadId, guestGeneratedId, guestStorageKey, guestMetadataMarker]) {
      assert.equal(serialized.includes(forbidden), false, "an accountless guest document leaked");
    }
    assert.equal(data.uploads.length, 2);
    assert.equal(data.generated.length, 2);
  });

  it("keeps an unrelated doctor outside the admin-only archive", async () => {
    const response = await get(patientEmail, unrelatedDoctorCookie);
    assert.equal(response.statusCode, 403);
    assert.deepEqual(response.json(), { ok: false, message: "Admin access required" });
  });

  it("fails closed with the existing envelope for unresolved and ambiguous identity", async () => {
    for (const email of [unresolvedEmail, ambiguousEmail]) {
      const response = await get(email, adminCookie);
      assert.equal(response.statusCode, 404);
      assert.deepEqual(response.json(), { ok: false, message: "Patient not found" });
    }
  });
});
