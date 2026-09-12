import Link from "next/link";
import { cookies } from "next/headers";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  fetchAdminPatientProfile,
  fetchAdminUserById,
  patchAdminUser,
  resetAdminUserPassword,
  mergeAdminPatients,
  type AdminUserRole,
} from "@/lib/admin/admin-api";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { AdminCard, Btn, PageHeader, Pill } from "../../_components/atoms";
import { PhiReasonGate } from "../../_components/phi-reason-gate";
import { PatientProfileEditor } from "../_components/patient-profile-editor";
import { FormSection } from "@/components/FormSection";
import { PhoneField } from "@/components/forms/phone-field";
import { SetCrumbTitle } from "@/components/crumb-title";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    error?: string;
    success?: string;
    reasonError?: string;
    /** Set by the email editor when the new address already belongs to another
     *  patient record — renders the "merge these two?" prompt below. Only the
     *  address travels in the URL; both PatientProfile ids are re-resolved
     *  server-side, so a crafted link cannot aim the merge at other patients. */
    mergeEmail?: string;
  }>;
};

/** Shape of the `details` payload the backend attaches to its 409 when the
 *  requested email already belongs to someone else. */
type EmailConflictDetails = {
  code?: string;
  mergeable?: boolean;
};

export default async function AdminUserDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};
  const result = await fetchAdminUserById(id);

  if (!result.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Global"
          title="User"
          actions={
            <Btn href="/admin/users" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
              Back
            </Btn>
          }
        />
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {result.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const { user, stats } = result.data;

  // S-002 break-glass, extended from /admin/patients/[email]: this page also
  // reads a patient's clinical chart (fetchAdminPatientProfile below) when
  // the account's role is PATIENT. Same reason-cookie gate, same 15-min
  // window — one cookie covers both pages. Non-PATIENT accounts never
  // trigger the PHI fetch, so they never see the gate.
  if (user.role === "PATIENT" && process.env.ADMIN_PHI_REQUIRE_REASON === "true") {
    const jar = await cookies();
    if (!jar.get("gh_phi_reason")?.value?.trim()) {
      return (
        <PhiReasonGate
          returnTo={`/admin/users/${id}`}
          showError={messages.reasonError === "1"}
        />
      );
    }
  }

  // Fetch the patient profile in parallel below; only render the editor
  // for role=PATIENT accounts. ADMIN / DOCTOR users don't carry a clinical
  // chart so the editor would be empty.
  const patientProfileResult =
    user.role === "PATIENT"
      ? await fetchAdminPatientProfile(user.email)
      : null;
  const patientProfile =
    patientProfileResult && patientProfileResult.ok
      ? patientProfileResult.data.profile
      : null;
  // Per-country fiscal numbers ride alongside the profile — they are their own
  // table, one row per market the patient is treated in, not a profile column.
  const patientCountryTaxIds =
    patientProfileResult && patientProfileResult.ok
      ? (patientProfileResult.data.countryTaxIds ?? [])
      : [];

  // Gates the email editor. The backend rejects the change for anyone but
  // ADMIN/SUPER_ADMIN on its own; this only keeps a control the operator
  // can't use from rendering at all.
  const viewer = await getServerAuthUser();
  const canEditEmail = viewer?.role === "SUPER_ADMIN" || viewer?.role === "ADMIN";

  // Identity corrections (typo'd name, stale phone, missing DOB). Open to
  // plain ADMIN — no privilege effect. Email is deliberately NOT here; it
  // has its own SUPER_ADMIN-gated form below.
  async function updateIdentityAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const fail = (message: string) =>
      redirect(`/admin/users/${id}?error=${encodeURIComponent(message)}`);

    const fullName = String(formData.get("fullName") ?? "").trim();
    if (fullName.length < 2) {
      fail("Full name must be at least 2 characters");
    }
    const phoneRaw = String(formData.get("phone") ?? "").trim();
    if (phoneRaw !== "" && phoneRaw.length < 6) {
      fail("Phone must be at least 6 characters");
    }
    const dobRaw = String(formData.get("dateOfBirth") ?? "").trim();
    let dateOfBirth: string | null = null;
    if (dobRaw !== "") {
      const parsed = new Date(dobRaw);
      if (Number.isNaN(parsed.getTime())) {
        fail("Date of birth is not a valid date");
      }
      dateOfBirth = parsed.toISOString();
    }

    const res = await patchAdminUser(id, {
      fullName,
      phone: phoneRaw === "" ? null : phoneRaw,
      dateOfBirth,
    });
    if (!res.ok) {
      fail(res.message);
    }
    redirect(`/admin/users/${id}?success=${encodeURIComponent("Account details saved")}`);
  }

  // Email is the login identifier and the password-reset destination.
  // Open to ADMIN/SUPER_ADMIN — the backend enforces the same bar
  // independently and mails a fresh temp password to the new address.
  async function updateEmailAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (!email.includes("@")) {
      redirect(
        `/admin/users/${id}?error=${encodeURIComponent("Enter a valid email address")}`,
      );
    }
    const res = await patchAdminUser(id, { email });
    if (!res.ok) {
      // The address already belongs to another record. That is usually not an
      // operator error — the patient booked a second time under a different
      // (or misspelled) address, so the two records are the same person. When
      // both sides carry a clinical chart, offer the merge instead of leaving
      // the admin at a dead end.
      const details = res.details as EmailConflictDetails | undefined;
      if (details?.code === "EMAIL_TAKEN" && details.mergeable) {
        redirect(
          `/admin/users/${id}?mergeEmail=${encodeURIComponent(email)}&error=${encodeURIComponent(
            res.message,
          )}`,
        );
      }
      redirect(`/admin/users/${id}?error=${encodeURIComponent(res.message)}`);
    }
    redirect(
      `/admin/users/${id}?success=${encodeURIComponent(
        "Email updated. The account is now unverified and has been signed out of all devices.",
      )}`,
    );
  }

  // Fold this account's patient record into the record that already owns the
  // address the admin just tried to move it to. Direction is fixed and stated
  // in the UI: the address the admin typed is the one they consider correct,
  // so the record already holding it survives and this one is folded into it —
  // which is also the only direction that resolves the unique-email collision
  // without inventing a placeholder address for the loser.
  async function mergeAccountsAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const fail = (message: string) =>
      redirect(`/admin/users/${id}?error=${encodeURIComponent(message)}`);

    const targetEmail = String(formData.get("targetEmail") ?? "").trim().toLowerCase();
    if (!targetEmail.includes("@")) {
      fail("Enter a valid email address");
    }
    if (targetEmail === user.email.toLowerCase()) {
      fail("That is already this account's email address");
    }
    const reason = String(formData.get("reason") ?? "").trim();
    if (reason.length < 10) {
      fail("Give a reason of at least 10 characters — it is stored on the merge log");
    }

    // Re-resolve BOTH ids here rather than trusting anything the form carried:
    // a merge is irreversible, so the only ids it may act on are the ones
    // derived from this account and from the address typed into it.
    const [targetResult, sourceResult] = await Promise.all([
      fetchAdminPatientProfile(targetEmail),
      fetchAdminPatientProfile(user.email),
    ]);
    const target = targetResult.ok ? targetResult.data.profile : null;
    const source = sourceResult.ok ? sourceResult.data.profile : null;
    if (!target || !source) {
      fail("Both accounts need a patient record before they can be merged");
    }
    if (target!.id === source!.id) {
      fail("Both addresses already point at the same patient record");
    }

    const res = await mergeAdminPatients({
      primaryPatientId: target!.id,
      duplicatePatientId: source!.id,
      reason,
    });
    if (!res.ok) {
      fail(res.message);
    }
    // The surviving record lives under the other address, so this user page is
    // no longer where the patient is — send the admin to the record that kept
    // the history.
    redirect(
      `/admin/patients/${encodeURIComponent(targetEmail)}?success=${encodeURIComponent(
        `Records merged into ${targetEmail}. The old account has been deactivated.`,
      )}`,
    );
  }

  async function toggleActiveAction() {
    "use server";
    await requireAdminAction();
    const res = await patchAdminUser(id, { isActive: !user.isActive });
    if (!res.ok) {
      redirect(`/admin/users/${id}?error=${encodeURIComponent(res.message)}`);
    }
    redirect(
      `/admin/users/${id}?success=${encodeURIComponent(
        user.isActive ? "User suspended" : "User reactivated",
      )}`,
    );
  }

  async function changeRoleAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const role = String(formData.get("role") ?? "") as AdminUserRole;
    if (role !== "PATIENT" && role !== "ADMIN" && role !== "DOCTOR") {
      redirect(`/admin/users/${id}?error=${encodeURIComponent("Invalid role")}`);
    }
    const res = await patchAdminUser(id, { role });
    if (!res.ok) {
      redirect(`/admin/users/${id}?error=${encodeURIComponent(res.message)}`);
    }
    redirect(`/admin/users/${id}?success=${encodeURIComponent(`Role updated to ${role}`)}`);
  }

  // Link / unlink this user account to a Doctor profile. Only meaningful
  // when role=DOCTOR — the doctor portal queries scope by doctorId.
  async function linkDoctorAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const raw = String(formData.get("doctorId") ?? "").trim();
    const doctorId = raw === "" ? null : raw;
    const res = await patchAdminUser(id, { doctorId });
    if (!res.ok) {
      redirect(`/admin/users/${id}?error=${encodeURIComponent(res.message)}`);
    }
    redirect(
      `/admin/users/${id}?success=${encodeURIComponent(
        doctorId ? "Linked doctor profile" : "Unlinked doctor profile",
      )}`,
    );
  }

  async function resetPasswordAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const password = String(formData.get("password") ?? "").trim();
    if (password.length < 8) {
      redirect(
        `/admin/users/${id}?error=${encodeURIComponent("Password must be at least 8 characters")}`,
      );
    }
    const res = await resetAdminUserPassword(id, password);
    if (!res.ok) {
      redirect(`/admin/users/${id}?error=${encodeURIComponent(res.message)}`);
    }
    redirect(
      `/admin/users/${id}?success=${encodeURIComponent(
        "Password updated. Share it with the user via a secure channel.",
      )}`,
    );
  }

  // Only resolved when the email edit above bounced off an existing record.
  // Both charts must exist for a merge to mean anything, and they must be two
  // different rows.
  const mergeTargetEmail = messages.mergeEmail?.trim().toLowerCase() ?? "";
  const mergeTargetResult =
    mergeTargetEmail && mergeTargetEmail !== user.email.toLowerCase()
      ? await fetchAdminPatientProfile(mergeTargetEmail)
      : null;
  const mergeTarget =
    mergeTargetResult && mergeTargetResult.ok ? mergeTargetResult.data.profile : null;
  const canOfferMerge = Boolean(
    mergeTarget && patientProfile && mergeTarget.id !== patientProfile.id,
  );

  return (
    <>
      <SetCrumbTitle label={user.fullName || user.email} />
      <Link
        href="/admin/users"
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to users
      </Link>
      <PageHeader
        eyebrow="Global"
        title={user.fullName || user.email}
        description={user.email}
        actions={
          <Pill tone={user.isActive ? "active" : "inactive"}>
            {user.isActive ? "Active" : "Suspended"}
          </Pill>
        }
      />

      {messages.error ? (
        <p className="gh-status-warning mb-4 rounded-md border px-4 py-3 text-sm">
          {messages.error}
        </p>
      ) : null}
      {messages.success ? (
        <p className="gh-status-success mb-4 rounded-md border px-4 py-3 text-sm">
          {messages.success}
        </p>
      ) : null}

      {canOfferMerge ? (
        <div className="mb-4">
          <FormSection title="That address already has a patient record — merge them?">
            <div className="gh-form-section__span-2 grid gap-3">
              <p className="text-portal-compact text-[var(--color-text-muted)]">
                This is what usually happens when a patient books again under a
                second (or misspelled) address. Merging keeps{" "}
                <strong>{mergeTargetEmail}</strong> as the single record: every
                appointment, order, document, note and consent from this account
                moves onto it, and this account is deactivated so nobody can log
                in with it again.{" "}
                <strong>The merge cannot be undone.</strong>
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-[var(--color-border)] px-3 py-2">
                  <p className="text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    Folded in and deactivated
                  </p>
                  <p className="mt-1 text-portal-body text-[var(--color-text-primary)]">
                    {user.fullName || "—"}
                  </p>
                  <p className="text-portal-compact text-[var(--color-text-muted)]">
                    {user.email}
                  </p>
                  <p className="text-portal-meta text-[var(--color-text-muted)]">
                    {stats.appointmentCount} booking
                    {stats.appointmentCount === 1 ? "" : "s"}
                    {patientProfile?.globalHealthNumber
                      ? ` · ${patientProfile.globalHealthNumber}`
                      : ""}
                  </p>
                </div>
                <div className="rounded-md border border-[var(--color-border)] px-3 py-2">
                  <p className="text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    Surviving record
                  </p>
                  <p className="mt-1 text-portal-body text-[var(--color-text-primary)]">
                    {mergeTarget?.fullName || "—"}
                  </p>
                  <p className="text-portal-compact text-[var(--color-text-muted)]">
                    {mergeTargetEmail}
                  </p>
                  <p className="text-portal-meta text-[var(--color-text-muted)]">
                    {mergeTarget?.globalHealthNumber ?? "No Global Health Number"}
                  </p>
                </div>
              </div>

              <form action={mergeAccountsAction} className="grid gap-2">
                <input type="hidden" name="targetEmail" value={mergeTargetEmail} />
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">
                    Reason (stored on the merge log, min 10 characters)
                  </span>
                  <textarea
                    name="reason"
                    required
                    minLength={10}
                    maxLength={500}
                    rows={2}
                    defaultValue={`Duplicate patient record — same person booked under ${user.email} and ${mergeTargetEmail}.`}
                    className="gh-input"
                  />
                </label>
                <div className="flex flex-wrap justify-end gap-2">
                  <Btn href={`/admin/users/${id}`} variant="ghost">
                    Cancel
                  </Btn>
                  <button type="submit" className="gh-btn gh-btn-primary">
                    Merge into {mergeTargetEmail}
                  </button>
                </div>
              </form>
            </div>
          </FormSection>
        </div>
      ) : null}

      <div className="gh-admin-user-detail-layout grid gap-4">
        <div className="gh-admin-user-detail-main grid gap-4">
          <FormSection title="Account details">
            <form
              action={updateIdentityAction}
              className="gh-admin-support-field-grid gh-form-section__span-2 grid gap-3 sm:grid-cols-2"
            >
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Full name</span>
                <input
                  type="text"
                  name="fullName"
                  required
                  minLength={2}
                  maxLength={120}
                  defaultValue={user.fullName}
                  className="gh-input"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Phone</span>
                <PhoneField name="phone" defaultValue={user.phone ?? ""} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Date of birth</span>
                <input
                  type="date"
                  name="dateOfBirth"
                  defaultValue={user.dateOfBirth?.slice(0, 10) ?? ""}
                  className="gh-input"
                />
              </label>
              <div className="flex items-end justify-end sm:col-span-2">
                <button type="submit" className="gh-btn gh-btn-primary">
                  Save account details
                </button>
              </div>
            </form>

            {user.role === "PATIENT" ? (
              <p className="gh-form-section__span-2 mt-1 text-portal-meta text-[var(--color-text-muted)]">
                Name / phone / DOB also live on the clinical chart (keyed by
                email, not this account row) — saving here updates that copy
                too, when a chart already exists.
              </p>
            ) : null}

            <dl className="gh-admin-user-facts gh-form-section__span-2 mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Email" value={user.email} />
              <Field label="Role" value={user.role} />
              <Field label="Email verified" value={user.emailVerifiedAt ? new Date(user.emailVerifiedAt).toLocaleString() : "Not verified"} />
              <Field label="Bookings" value={String(stats.appointmentCount)} />
              <Field label="Created" value={new Date(user.createdAt).toLocaleString()} />
              <Field label="Updated" value={new Date(user.updatedAt).toLocaleString()} />
            </dl>
          </FormSection>

          {user.role === "PATIENT" ? (
            <PatientProfileEditor
              userId={user.id}
              email={user.email}
              profile={patientProfile}
              countryTaxIds={patientCountryTaxIds}
            />
          ) : null}
        </div>

        <div className="gh-admin-user-detail-side grid gap-4 self-start">
          <FormSection title="Status">
            <p className="text-portal-compact text-[var(--color-text-muted)]">
              Suspended users can&apos;t log in. Their bookings stay intact.
            </p>
            <form action={toggleActiveAction} className="mt-3">
              <button
                type="submit"
                className={`gh-btn w-full ${user.isActive ? "gh-btn-soft" : "gh-btn-primary"}`}
              >
                {user.isActive ? "Suspend account" : "Reactivate account"}
              </button>
            </form>
          </FormSection>

          {canEditEmail ? (
            <FormSection title="Email address">
              <p className="text-portal-compact text-[var(--color-text-muted)]">
                Login identifier. Changing it clears email verification, signs
                the user out everywhere, and moves their patient chart to the
                new address. The system emails the new address a temporary
                password and a set-password link automatically — double-check
                the spelling before submitting.
              </p>
              <form action={updateEmailAction} className="mt-3 flex flex-col gap-2">
                <input
                  type="email"
                  name="email"
                  required
                  maxLength={200}
                  defaultValue={user.email}
                  autoComplete="off"
                  className="gh-input"
                />
                <button type="submit" className="gh-btn gh-btn-primary w-full">
                  Update email
                </button>
              </form>
            </FormSection>
          ) : null}

          <FormSection title="Role">
            <form action={changeRoleAction} className="flex flex-col gap-2">
              <select name="role" defaultValue={user.role} className="gh-select">
                <option value="PATIENT">PATIENT</option>
                <option value="ADMIN">ADMIN</option>
                <option value="DOCTOR">DOCTOR</option>
              </select>
              <button type="submit" className="gh-btn gh-btn-primary w-full">
                Update role
              </button>
            </form>
          </FormSection>

          {/* Doctor profile link — only meaningful when role=DOCTOR.
              Free-text id input keeps the markup small; admin can copy
              the doctor id from /admin/doctors. A future iteration could
              swap this for a searchable dropdown of unlinked doctors. */}
          <FormSection title="Doctor profile link">
            <p className="text-portal-compact text-[var(--color-text-muted)]">
              {user.role === "DOCTOR"
                ? "Paste the Doctor profile id (from /admin/doctors). One profile per user — re-link will fail if the target is already taken. Leave blank to unlink."
                : "Set role=DOCTOR first, then link the user to a Doctor profile here."}
            </p>
            <form action={linkDoctorAction} className="mt-3 flex flex-col gap-2">
              <input
                type="text"
                name="doctorId"
                defaultValue={user.doctorId ?? ""}
                placeholder="Doctor id (cuid…)"
                className="gh-input font-mono text-xs"
              />
              <button type="submit" className="gh-btn gh-btn-primary w-full">
                {user.doctorId ? "Update link" : "Link doctor profile"}
              </button>
            </form>
          </FormSection>

          <FormSection title="Reset password">
            <p className="text-portal-compact text-[var(--color-text-muted)]">
              Admin override — sets a new password without an email token.
              Share via a secure channel.
            </p>
            <form action={resetPasswordAction} className="mt-3 flex flex-col gap-2">
              <input
                type="password"
                name="password"
                required
                minLength={8}
                maxLength={128}
                placeholder="New password (min 8 chars)"
                autoComplete="new-password"
                className="gh-input"
              />
              <button type="submit" className="gh-btn gh-btn-primary w-full">
                Reset password
              </button>
            </form>
          </FormSection>
        </div>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-portal-body text-[var(--color-text-primary)]">{value}</dd>
    </div>
  );
}
