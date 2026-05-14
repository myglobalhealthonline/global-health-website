import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  deleteAdminDoctor,
  doctorPublicProfilePath,
  fetchAdminDoctorById,
  purgeAdminDoctor,
} from "@/lib/admin/admin-api";
import { FlagBadge } from "../../_components/flag-badge";
import { AdminCard, Btn, PageHeader, Pill } from "../../_components/atoms";

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
  const publicPath = doctorPublicProfilePath(d.country.teamPath, d.slug);
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
              <button type="submit" className="gh-btn gh-btn-danger w-full">
                Delete permanently
              </button>
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
