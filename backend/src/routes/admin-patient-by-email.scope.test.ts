import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { deleteAuditLogs, deleteMedicalAccessLogs } from "../test-utils/audit-cleanup.js";

/**
 * Group 2 follow-up, third handler: `GET /api/admin/patients/by-email`.
 *
 * The manual-booking / coupon typeahead. It substring-matches the typed address
 * and returns every distinct patient behind it — and, for each one, the
 * PatientProfile identity surface DECRYPTED: national ID, tax ID, passport,
 * utente number, the full postal address and the insurance policy number. It
 * does this with no `guardMedicalRead` call and no country-folder clamp, so:
 *
 *  - a LOCAL_ADMIN scoped to one country reads government identity documents
 *    for patients in every other country, and
 *  - none of it lands in `MedicalAccessLog`, so the reads leave no trail at all.
 *
 * The sibling `GET /api/admin/patients/search` in the same file already builds
 * a `folderClamp` from `User.allowedCountryFolders` and applies it to the
 * `where` — this handler has no equivalent.
 *
 * The fix these cases are written against does NOT add a per-row guard: this is
 * a typeahead, so guarding 50 suggestions per keystroke would bury the audit log
 * in rows nobody chose to read. Every consumer of the identity fields
 * (`manual-booking-form.tsx`, `book-slot-dialog.tsx`) only reads them inside its
 * `selectPatient()` handler — after ONE row is clicked — and the coupon picker
 * (`use-patient-lookup.ts`) never types them at all. So the suggestions drop to
 * the picker fields (email / name / DOB / phone, clamped to the admin's
 * folders), and the identity prefill is served by the already-guarded,
 * already-scoped `GET /api/admin/patients/:email/profile` on selection: one
 * logged access for the one patient the admin actually opened.
 *
 * The last two cases pin that replacement path, so "drop the fields" is a
 * relocation rather than a silent feature removal.
 *
 * `MEDICAL_ACCESS_ENFORCE` is forced ON here and restored in `after` —
 * `.env.test` runs COMPLIANCE_MODE=relaxed, whose default is shadow mode where
 * a deny decision is logged but never blocks. PHI encryption IS on under
 * `.env.test`, so the identity fixtures are written through `encryptPhi`: a
 * plaintext value in the response body therefore proves a decrypt happened.
 */
describe("admin patient typeahead — country scope + PHI disclosure", () => {
  let app: FastifyInstance | null = null;
  let prisma: Awaited<typeof import("../db/prisma.js")>["prisma"];
  let signAuthToken: (typeof import("../utils/auth-session.js"))["signAuthToken"];
  let env: (typeof import("../config/env.js"))["env"];
  let originalEnforce: boolean | undefined;
  let bootError: unknown = null;

  const uniq = `bye-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  // Random, not a truncated timestamp: two runs in one afternoon would
  // otherwise share folder codes and each other's LOCAL_ADMIN scope.
  const folderA = `za${Math.random().toString(36).slice(2, 6)}`.toLowerCase();
  const folderB = `zb${Math.random().toString(36).slice(2, 6)}`.toLowerCase();

  let localAdminAId = "";
  let fullAdminId = "";
  let localAdminACookie: Record<string, string> = {};
  let fullAdminCookie: Record<string, string> = {};

  // Patient A — folder A, inside localAdminA's scope.
  let patientAId = "";
  const patientAEmail = `pa-${uniq}@test.local`;
  const A_NATIONAL_ID = `A-nid-${uniq}`;

  // Patient B — folder B, OUTSIDE localAdminA's scope. Every identity value is
  // unique text so a leak is unambiguous in the raw response body.
  let patientBId = "";
  const patientBEmail = `pb-${uniq}@test.local`;
  const B_NATIONAL_ID = `B-nid-${uniq}`;
  const B_TAX_ID = `B-tax-${uniq}`;
  const B_PASSPORT = `B-passport-${uniq}`;
  const B_UTENTE = `B-utente-${uniq}`;
  const B_POLICY = `B-policy-${uniq}`;
  const B_ADDRESS_LINE = `B-address-${uniq}`;
  const B_INSURER = `B-insurer-${uniq}`;

  const createdProfileIds: string[] = [];
  const createdAppointmentIds: string[] = [];

  before(async () => {
    try {
      const { buildApp } = await import("../app.js");
      prisma = (await import("../db/prisma.js")).prisma;
      signAuthToken = (await import("../utils/auth-session.js")).signAuthToken;
      env = (await import("../config/env.js")).env;
      app = await buildApp();
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
      return;
    }
    const { encryptPhi } = await import("../lib/crypto/phi-crypto.js");
    originalEnforce = env.MEDICAL_ACCESS_ENFORCE;
    env.MEDICAL_ACCESS_ENFORCE = true;

    const mkAdmin = async (
      label: string,
      role: "LOCAL_ADMIN" | "ADMIN",
      folders: string[],
    ) =>
      prisma.user.create({
        data: {
          email: `${label}-${uniq}@test.local`,
          passwordHash: "x",
          fullName: `${label} ${uniq}`,
          role,
          allowedCountryFolders: folders,
        },
      });

    const localAdminA = await mkAdmin("local-admin-a", "LOCAL_ADMIN", [folderA]);
    const fullAdmin = await mkAdmin("full-admin", "ADMIN", []);
    localAdminAId = localAdminA.id;
    fullAdminId = fullAdmin.id;
    localAdminACookie = {
      gh_auth: signAuthToken({ sub: localAdminAId, role: "LOCAL_ADMIN", email: localAdminA.email }),
    };
    fullAdminCookie = {
      gh_auth: signAuthToken({ sub: fullAdminId, role: "ADMIN", email: fullAdmin.email }),
    };

    const mkPatient = async (data: {
      email: string;
      folder: string;
      nationalIdNumber: string;
      taxIdNumber?: string;
      passportNumber?: string;
      utenteNumber?: string;
      insurancePolicyNumber?: string;
      insuranceProviderName?: string;
      addressLine1?: string;
    }) => {
      const row = await prisma.patientProfile.create({
        data: {
          email: data.email,
          fullName: `Patient ${data.email}`,
          countryFolderCode: data.folder,
          // Written the way the app writes them, so a plaintext hit in a
          // response body can only have come from a decrypt.
          nationalIdNumber: encryptPhi(data.nationalIdNumber),
          taxIdNumber: encryptPhi(data.taxIdNumber ?? null),
          passportNumber: encryptPhi(data.passportNumber ?? null),
          utenteNumber: encryptPhi(data.utenteNumber ?? null),
          insurancePolicyNumber: encryptPhi(data.insurancePolicyNumber ?? null),
          insuranceProviderName: data.insuranceProviderName ?? null,
          addressLine1: data.addressLine1 ?? null,
        },
      });
      createdProfileIds.push(row.id);
      return row.id;
    };

    patientAId = await mkPatient({
      email: patientAEmail,
      folder: folderA,
      nationalIdNumber: A_NATIONAL_ID,
    });
    patientBId = await mkPatient({
      email: patientBEmail,
      folder: folderB,
      nationalIdNumber: B_NATIONAL_ID,
      taxIdNumber: B_TAX_ID,
      passportNumber: B_PASSPORT,
      utenteNumber: B_UTENTE,
      insurancePolicyNumber: B_POLICY,
      insuranceProviderName: B_INSURER,
      addressLine1: B_ADDRESS_LINE,
    });

    const mkAppointment = async (email: string, patientProfileId: string, country: string) => {
      const row = await prisma.appointment.create({
        data: {
          countryCode: country,
          consultationType: "GENERAL",
          // The same name the profile carries, so the appointment leg and the
          // profile leg de-duplicate into ONE suggestion rather than two.
          fullName: `Patient ${email}`,
          email,
          consentAccepted: true,
          patientProfileId,
          status: "COMPLETED",
        },
      });
      createdAppointmentIds.push(row.id);
      return row.id;
    };
    // Each patient is reachable through the appointment leg of the typeahead
    // too, in their own country — so a clamp has to cover both queries.
    await mkAppointment(patientAEmail, patientAId, folderA);
    await mkAppointment(patientBEmail, patientBId, folderB);
  });

  after(async () => {
    if (app) await app.close();
    if (bootError) return;
    if (env && originalEnforce !== undefined) {
      env.MEDICAL_ACCESS_ENFORCE = originalEnforce;
    }
    await prisma.securityAlert.deleteMany({
      where: { patientId: { in: createdProfileIds } },
    });
    await deleteMedicalAccessLogs(prisma, {
      patientProfileId: { in: createdProfileIds },
    });
    // AuditLog has an append-only DELETE trigger; cleanup goes through the
    // shared override helper, scoped to this suite's own synthetic rows.
    await deleteAuditLogs(prisma, {
      OR: [
        { actorUserId: { in: [localAdminAId, fullAdminId] } },
        { entityId: { in: createdProfileIds } },
      ],
    });
    await prisma.appointment.deleteMany({ where: { id: { in: createdAppointmentIds } } });
    await prisma.patientProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await prisma.user.deleteMany({ where: { id: { in: [localAdminAId, fullAdminId] } } });
  });

  const boot = (t: { skip: (m?: string) => void }) => {
    // `bootError` as well as `app`: `buildApp()` can succeed and the DB probe
    // still fail, which leaves every fixture id empty and turns one skip into
    // seven misleading failures.
    if (!app || bootError) {
      t.skip(
        `buildApp() failed: ${bootError instanceof Error ? bootError.message : String(bootError)}`,
      );
      return false;
    }
    return true;
  };

  type Suggestion = { email: string; fullName: string };

  /** The typeahead, queried with a fragment that matches BOTH fixtures. */
  const typeahead = async (cookies: Record<string, string>) =>
    app!.inject({
      method: "GET",
      url: `/api/admin/patients/by-email?email=${encodeURIComponent(uniq)}`,
      cookies,
    });

  const B_IDENTITY_VALUES = [
    B_NATIONAL_ID,
    B_TAX_ID,
    B_PASSPORT,
    B_UTENTE,
    B_POLICY,
    B_ADDRESS_LINE,
    B_INSURER,
  ];

  // ── The gap: no country-folder clamp ───────────────────────────────────────

  it("does not offer a patient outside the LOCAL_ADMIN's country folders", async (t) => {
    if (!boot(t)) return;
    const res = await typeahead(localAdminACookie);
    assert.equal(res.statusCode, 200, res.body);
    const { data } = res.json() as { data: { patients: Suggestion[] } };
    assert.ok(
      data.patients.some((p) => p.email === patientAEmail),
      "fixture: the in-scope patient must be matched by this query fragment",
    );
    assert.ok(
      !data.patients.some((p) => p.email === patientBEmail),
      "a country-scoped admin must not see a patient from a folder they do not administer",
    );
  });

  // ── The gap: decrypted identity documents in a multi-row suggestion list ───

  it("returns no decrypted identity numbers to an out-of-scope LOCAL_ADMIN", async (t) => {
    if (!boot(t)) return;
    const res = await typeahead(localAdminACookie);
    assert.equal(res.statusCode, 200, res.body);
    for (const value of B_IDENTITY_VALUES) {
      assert.ok(
        !res.body.includes(value),
        `the typeahead leaked an out-of-scope patient's identity data: ${value}`,
      );
    }
  });

  it("returns no decrypted identity numbers to a full ADMIN either", async (t) => {
    if (!boot(t)) return;
    // A plain ADMIN legitimately reaches every folder, so scope is not what is
    // wrong here — the disclosure is. A picker hands back government ID
    // documents for up to 50 patients per keystroke with nothing recording it;
    // the identity prefill belongs on the guarded per-patient read below.
    const res = await typeahead(fullAdminCookie);
    assert.equal(res.statusCode, 200, res.body);
    for (const value of [...B_IDENTITY_VALUES, A_NATIONAL_ID]) {
      assert.ok(
        !res.body.includes(value),
        `the typeahead disclosed identity data with no MedicalAccessLog row: ${value}`,
      );
    }
  });

  it("still returns the picker fields the booking forms actually select on", async (t) => {
    if (!boot(t)) return;
    const res = await typeahead(fullAdminCookie);
    const { data } = res.json() as {
      data: { patients: (Suggestion & { dateOfBirth: unknown; phone: unknown })[] };
    };
    const a = data.patients.find((p) => p.email === patientAEmail);
    assert.ok(a, "the in-scope patient must remain selectable");
    assert.equal(a.fullName, `Patient ${patientAEmail}`);
    assert.ok("dateOfBirth" in a && "phone" in a, "the picker fields must survive the fix");
  });

  it("writes no MedicalAccessLog row, because it discloses nothing that needs one", async (t) => {
    if (!boot(t)) return;
    // Holds both before and after the fix, but for opposite reasons. Today it
    // holds because the handler decrypts identity documents and records
    // nothing. After the fix it holds because there is no longer anything in
    // the response worth recording — which is the only version of this that is
    // acceptable, and is why the two cases above have to pass alongside it.
    const logs = await prisma.medicalAccessLog.findMany({
      where: { patientProfileId: { in: [patientAId, patientBId] } },
    });
    assert.deepEqual(logs, [], "a typeahead must not need an audit trail");
  });

  // ── The replacement path for the prefill ───────────────────────────────────

  it("serves the identity prefill through the guarded per-patient read, and logs it", async (t) => {
    if (!boot(t)) return;
    const res = await app!.inject({
      method: "GET",
      url: `/api/admin/patients/${encodeURIComponent(patientAEmail)}/profile`,
      cookies: localAdminACookie,
    });
    assert.equal(res.statusCode, 200, res.body);
    const { data } = res.json() as { data: { profile: { nationalIdNumber: string | null } } };
    assert.equal(
      data.profile.nationalIdNumber,
      A_NATIONAL_ID,
      "selecting a patient must still prefill their identity fields",
    );
    const logs = await prisma.medicalAccessLog.findMany({
      where: { patientProfileId: patientAId, accessedByUserId: localAdminAId },
    });
    assert.equal(logs.length, 1, "exactly one logged access for the one patient actually opened");
    assert.equal(logs[0].accessedResourceType, "SENSITIVE_PROFILE");
    assert.equal(logs[0].isAbnormal, false);
  });

  it("refuses the same prefill for a patient outside the LOCAL_ADMIN's folders", async (t) => {
    if (!boot(t)) return;
    const res = await app!.inject({
      method: "GET",
      url: `/api/admin/patients/${encodeURIComponent(patientBEmail)}/profile`,
      cookies: localAdminACookie,
    });
    assert.equal(res.statusCode, 403, "the guarded read is what enforces country scope");
    for (const value of B_IDENTITY_VALUES) {
      assert.ok(!res.body.includes(value), `a denied read must carry no identity data: ${value}`);
    }
  });
});
