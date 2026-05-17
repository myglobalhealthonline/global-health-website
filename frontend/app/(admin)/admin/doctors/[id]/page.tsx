import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft, Mail, RefreshCw } from "lucide-react";
import {
  deleteAdminDoctor,
  doctorPublicProfilePath,
  fetchAdminDoctorById,
  postAdminDoctorInvite,
  purgeAdminDoctor,
} from "@/lib/admin/admin-api";
import { FlagBadge } from "../../_components/flag-badge";
import { AdminCard, Btn, PageHeader, Pill } from "../../_components/atoms";
import { ConfirmDeleteButton } from "../../_components/confirm-delete-button";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function AdminDoctorDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};
  const result = await fetchAdminDoctorById(id);

  async function deactivateDoctorAction() {
    "use server";
    const updateResult = await deleteAdminDoctor(id);
    if (!updateResult.ok) {
      redirect(`/admin/doctors/${id}?error=${encodeURIComponent(updateResult.message)}`);
    }
    revalidatePath("/admin/doctors");
    revalidatePath(`/admin/doctors/${id}`);
    redirect(`/admin/doctors/${id}?success=${encodeURIComponent("Doctor profile deactivated")}`);
  }

  async function deleteDoctorAction() {
    "use server";
    const deleteResult = await purgeAdminDoctor(id);
    if (!deleteResult.ok) {
      redirect(`/admin/doctors/${id}?error=${encodeURIComponent(deleteResult.message)}`);
    }
    revalidatePath("/admin/doctors");
    redirect("/admin/doctors");
  }

  async function inviteDoctorAction(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim();
    const fullName = String(formData.get("fullName") ?? "").trim();
    if (!email) {
      redirect(`/admin/doctors/${id}?error=${encodeURIComponent("Email is required")}`);
    }
    const result = await postAdminDoctorInvite(id, {
      email,
      ...(fullName ? { fullName } : {}),
    });
    if (!result.ok) {
      redirect(
        `/admin/doctors/${id}?error=${encodeURIComponent(result.message)}`,
      );
    }
    revalidatePath(`/admin/doctors/${id}`);
    revalidatePath("/admin/doctors");
    const msg = result.data.resend
      ? result.data.emailed
        ? "Invite resent to the doctor"
        : "Invite refreshed — email delivery failed, share link manually"
      : result.data.emailed
        ? "Doctor invited — they'll receive an email shortly"
        : "Invite created — email delivery failed, share link manually";
    redirect(`/admin/doctors/${id}?success=${encodeURIComponent(msg)}`);
  }

  if (!result.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Global"
          title="Doctor profile"
          actions={
            <Btn href="/admin/doctors" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
              Back
            </Btn>
          }
        />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load doctor: {result.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const d = result.data.doctor;
  const publicPath = doctorPublicProfilePath(d.country, d.slug);
  const profileImage = d.assets[0]?.path ?? null;
  const isActive = d.active;

  return (
    <>
      <Link
        href="/admin/doctors"
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to doctors
      </Link>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <FlagBadge code={d.country.code} size={14} />
            {d.country.name}
          </span>
        }
        title={d.fullName}
        description={d.title}
        actions={
          <>
            <Pill tone={isActive ? "published" : "inactive"}>
              {isActive ? "Active" : "Inactive"}
            </Pill>
            <Btn href={`/admin/doctors/${id}/availability`} variant="ghost">
              Availability
            </Btn>
            <Btn href={`/admin/doctors/${id}/edit`} variant="primary">
              Edit
            </Btn>
          </>
        }
      />

      {messages.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {messages.error}
        </p>
      ) : null}
      {messages.success ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {messages.success}
        </p>
      ) : null}

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}
      >
        <div className="grid gap-4">
          <AdminCard>
            <h3 style={cardTitleStyle}>Identifiers</h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
              Public marketing profile — not a login account.
            </p>
            <dl className="grid gap-4 sm:grid-cols-2">
              <FieldRow label="Slug" value={d.slug} mono />
              <FieldRow label="Country" value={`${d.country.name} (${d.country.code.toUpperCase()})`} />
              <FieldRow label="Public path" value={publicPath} mono full />
              <FieldRow label="IMC registration" value={d.imcRegistration ?? "—"} />
              <FieldRow
                label="Medical registration"
                value={
                  d.medicalRegistrationUrl ? (
                    <a
                      href={d.medicalRegistrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-brand-primary)] underline-offset-2 hover:underline"
                    >
                      {d.medicalRegistrationUrl}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <FieldRow label="WhatsApp" value={d.whatsappNumber ?? "—"} />
              <FieldRow
                label="Languages"
                value={d.languages.length > 0 ? d.languages.join(", ") : "—"}
                full
              />
              <FieldRow
                label="Categories"
                value={
                  d.specialties.length > 0
                    ? d.specialties.map((s) => s.specialty.name).join(", ")
                    : "—"
                }
                full
              />
              <FieldRow
                label="Profile image"
                value={profileImage ?? "—"}
                mono
                full
              />
            </dl>
          </AdminCard>

          <AdminCard>
            <h3 style={cardTitleStyle}>Qualifications</h3>
            {d.qualifications.length > 0 ? (
              <ul className="mt-3 grid gap-2 text-[14px] leading-relaxed text-[var(--color-text-body)]">
                {d.qualifications.map((q, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 rounded-md bg-[var(--color-background-soft)] px-3 py-2"
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 999,
                        background: "var(--color-brand-primary)",
                        marginTop: 8,
                        flexShrink: 0,
                      }}
                    />
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[13px] text-[var(--color-text-muted)]">
                No qualifications provided.
              </p>
            )}
          </AdminCard>

          <AdminCard>
            <h3 style={cardTitleStyle}>Bio</h3>
            {d.bio ? (
              <div
                className="prose prose-sm mt-3 max-w-none text-[var(--color-text-body)]"
                dangerouslySetInnerHTML={{ __html: d.bio }}
              />
            ) : (
              <p className="mt-3 text-[13px] text-[var(--color-text-muted)]">
                No bio provided.
              </p>
            )}
          </AdminCard>
        </div>

        <div className="grid gap-4 self-start">
          <AdminCard>
            <h3 style={cardTitleStyle}>Account access</h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
              Invite the doctor by email — they&apos;ll set a password and
              land straight in the portal.
            </p>
            {d.loginUser ? (
              <div className="grid gap-3">
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-background-soft)] p-3 text-[13px]">
                  <p className="font-semibold text-[var(--color-text-primary)]">
                    {d.loginUser.email}
                  </p>
                  <p className="text-[11.5px] text-[var(--color-text-muted)]">
                    {d.loginUser.emailVerifiedAt
                      ? `Verified ${new Date(d.loginUser.emailVerifiedAt).toLocaleString()}`
                      : `Invited ${new Date(d.loginUser.createdAt).toLocaleString()} · awaiting password set`}
                  </p>
                  <p className="mt-1 text-[11.5px] text-[var(--color-text-muted)]">
                    {d.loginUser.isActive ? "Account active" : "Account suspended"}
                  </p>
                </div>
                <form action={inviteDoctorAction} className="grid gap-2">
                  <input type="hidden" name="email" value={d.loginUser.email} />
                  <input type="hidden" name="fullName" value={d.loginUser.fullName} />
                  <button
                    type="submit"
                    className="gh-btn gh-btn-soft inline-flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="size-3.5" /> Resend invite
                  </button>
                </form>
                <Link
                  href={`/admin/users/${d.loginUser.id}`}
                  className="text-[12px] font-semibold text-[var(--color-brand-primary)] hover:underline"
                >
                  Manage account at /admin/users →
                </Link>
              </div>
            ) : (
              <form action={inviteDoctorAction} className="grid gap-2.5">
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Email address</span>
                  <input
                    type="email"
                    name="email"
                    required
                    maxLength={200}
                    placeholder="doctor@example.com"
                    className="gh-input"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Greeting name (optional)</span>
                  <input
                    type="text"
                    name="fullName"
                    maxLength={200}
                    defaultValue={d.fullName}
                    className="gh-input"
                  />
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    Falls back to the doctor profile name above if left blank.
                  </span>
                </label>
                <button
                  type="submit"
                  className="gh-btn gh-btn-primary inline-flex items-center justify-center gap-1.5"
                >
                  <Mail className="size-3.5" /> Send invitation
                </button>
              </form>
            )}
          </AdminCard>

          <AdminCard>
            <h3 style={cardTitleStyle}>Visibility</h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
              Deactivating hides this profile from the public doctors listing API.
            </p>
            {isActive ? (
              <form action={deactivateDoctorAction}>
                <button type="submit" className="gh-btn gh-btn-danger w-full">
                  Deactivate profile
                </button>
              </form>
            ) : (
              <p className="text-[13px] text-[var(--color-text-muted)]">
                This profile is inactive. Re-enable from Edit.
              </p>
            )}
          </AdminCard>

          <AdminCard>
            <h3
              style={{
                ...cardTitleStyle,
                color: "var(--color-status-error-text)",
              }}
            >
              Danger zone
            </h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
              Permanent delete removes this profile and any linked assets.
            </p>
            <form action={deleteDoctorAction}>
              <ConfirmDeleteButton
                message="Permanently delete this doctor profile and any linked assets? This cannot be undone."
                className="gh-btn gh-btn-danger w-full"
                ariaLabel="Delete doctor permanently"
              >
                Delete permanently
              </ConfirmDeleteButton>
            </form>
          </AdminCard>
        </div>
      </div>
    </>
  );
}

const cardTitleStyle = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontSize: 16,
  fontWeight: 800,
  color: "var(--color-text-primary)",
} as const;

function FieldRow({
  label,
  value,
  mono = false,
  full = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd
        className="mt-1 text-[14px] text-[var(--color-text-primary)]"
        style={mono ? { fontFamily: "ui-monospace, monospace", fontSize: 12.5 } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}
