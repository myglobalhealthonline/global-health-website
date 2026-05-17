import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  fetchAdminUserById,
  patchAdminUser,
  resetAdminUserPassword,
  type AdminUserRole,
} from "@/lib/admin/admin-api";
import { AdminCard, Btn, PageHeader, Pill } from "../../_components/atoms";

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

  async function toggleActiveAction() {
    "use server";
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
    const role = String(formData.get("role") ?? "") as AdminUserRole;
    if (role !== "PATIENT" && role !== "ADMIN") {
      redirect(`/admin/users/${id}?error=${encodeURIComponent("Invalid role")}`);
    }
    const res = await patchAdminUser(id, { role });
    if (!res.ok) {
      redirect(`/admin/users/${id}?error=${encodeURIComponent(res.message)}`);
    }
    redirect(`/admin/users/${id}?success=${encodeURIComponent(`Role updated to ${role}`)}`);
  }

  async function resetPasswordAction(formData: FormData) {
    "use server";
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
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
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

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}
      >
        <div className="grid gap-4">
          <AdminCard>
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
            >
              Profile
            </h3>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Email" value={user.email} />
              <Field label="Full name" value={user.fullName} />
              <Field label="Phone" value={user.phone ?? "—"} />
              <Field label="Role" value={user.role} />
              <Field label="Email verified" value={user.emailVerifiedAt ? new Date(user.emailVerifiedAt).toLocaleString() : "Not verified"} />
              <Field label="Bookings" value={String(stats.appointmentCount)} />
              <Field label="Created" value={new Date(user.createdAt).toLocaleString()} />
              <Field label="Updated" value={new Date(user.updatedAt).toLocaleString()} />
            </dl>
          </AdminCard>
        </div>

        <div className="grid gap-4 self-start">
          <AdminCard>
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
            >
              Status
            </h3>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
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
          </AdminCard>

          <AdminCard>
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
            >
              Role
            </h3>
            <form action={changeRoleAction} className="mt-3 flex flex-col gap-2">
              <select name="role" defaultValue={user.role} className="gh-select">
                <option value="PATIENT">PATIENT</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              <button type="submit" className="gh-btn gh-btn-primary w-full">
                Update role
              </button>
            </form>
          </AdminCard>

          <AdminCard>
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
            >
              Reset password
            </h3>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
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
          </AdminCard>
        </div>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-[14px] text-[var(--color-text-primary)]">{value}</dd>
    </div>
  );
}
