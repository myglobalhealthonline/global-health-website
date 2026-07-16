import Link from "next/link";
import {
  requireAdminAction,
  requireSuperAdminAction,
} from "@/lib/admin/require-admin-action";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  fetchAdminPatientProfile,
  fetchAdminUserById,
  patchAdminUser,
  resetAdminUserPassword,
  type AdminUserRole,
} from "@/lib/admin/admin-api";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { AdminCard, Btn, PageHeader, Pill } from "../../_components/atoms";
import { PatientProfileEditor } from "../_components/patient-profile-editor";
import { FormSection } from "@/components/FormSection";
import { PhoneField } from "@/components/forms/phone-field";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; success?: string }>;
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

  // Gates the email editor. The backend rejects a non-SUPER_ADMIN email
  // change on its own; this only keeps a control the operator can't use
  // from rendering at all.
  const viewer = await getServerAuthUser();
  const canEditEmail = viewer?.role === "SUPER_ADMIN";

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

  // Email is the login identifier and the password-reset destination, so
  // rewriting it is an account-takeover primitive. SUPER_ADMIN only — the
  // backend enforces the same bar independently.
  async function updateEmailAction(formData: FormData) {
    "use server";
    await requireSuperAdminAction();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (!email.includes("@")) {
      redirect(
        `/admin/users/${id}?error=${encodeURIComponent("Enter a valid email address")}`,
      );
    }
    const res = await patchAdminUser(id, { email });
    if (!res.ok) {
      redirect(`/admin/users/${id}?error=${encodeURIComponent(res.message)}`);
    }
    redirect(
      `/admin/users/${id}?success=${encodeURIComponent(
        "Email updated. The account is now unverified and has been signed out of all devices.",
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

  return (
    <>
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
                Name / phone / DOB on the clinical chart are stored separately
                and edited under “Patient profile” below — saving here does not
                change them.
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
                new address. Tell the user before you change it.
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
