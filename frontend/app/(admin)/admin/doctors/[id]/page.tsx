import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { deleteAdminDoctor, doctorPublicProfilePath, fetchAdminDoctorById } from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function AdminDoctorDetailPage({ params, searchParams }: PageProps) {
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

  if (!result.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Doctor profile</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load doctor: {result.message}
        </p>
        <Link href="/admin/doctors" className="mt-6 inline-block gh-link text-sm text-[var(--color-text-muted)]">
          Back to list
        </Link>
      </section>
    );
  }

  const d = result.data.doctor;
  const publicPath = doctorPublicProfilePath(d.country.teamPath, d.slug);
  const profileImage = d.assets[0]?.path ?? null;
  const isActive = d.active;

  return (
    <section className="gh-card p-6 sm:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="gh-h2 text-[var(--color-text-primary)]">{d.fullName}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{d.title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/admin/doctors/${id}/edit`} className="gh-btn gh-btn-primary">Edit</Link>
          <Link href="/admin/doctors" className="gh-link text-sm text-[var(--color-text-muted)]">Back to list</Link>
        </div>
      </div>

      {/* Alerts */}
      {messages.error ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">{messages.error}</p>
      ) : null}
      {messages.success ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-success">{messages.success}</p>
      ) : null}

      {/* Status */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
          isActive
            ? "bg-[var(--color-status-success-bg)] text-[var(--color-status-success-text)] border-[var(--color-status-success-border)]"
            : "bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)] border-[var(--color-status-warning-border)]"
        }`}>
          {isActive ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
          {isActive ? "Active" : "Inactive"}
        </span>
        <span className="text-xs text-[var(--color-text-muted)]">Public marketing profile — not a login account</span>
      </div>

      {/* Info grid */}
      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Slug</dt>
          <dd className="mt-1 font-mono text-sm text-[var(--color-text-primary)]">{d.slug}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Country</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{d.country.name} ({d.country.code})</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Public path</dt>
          <dd className="mt-1 font-mono text-sm text-[var(--color-text-primary)]">{publicPath}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">IMC registration</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{d.imcRegistration ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Medical registration URL</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">
            {d.medicalRegistrationUrl ? (
              <a href={d.medicalRegistrationUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-brand-primary)] hover:underline">
                {d.medicalRegistrationUrl}
              </a>
            ) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">WhatsApp</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{d.whatsappNumber ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Languages</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{d.languages.length > 0 ? d.languages.join(", ") : "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Specialties</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">
            {d.specialties.length > 0 ? d.specialties.map((s) => s.specialty.name).join(", ") : "—"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Profile image</dt>
          <dd className="mt-1 font-mono text-xs text-[var(--color-text-primary)]">{profileImage ?? "—"}</dd>
        </div>
      </dl>

      {/* Qualifications */}
      <div className="mt-6 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Qualifications</h2>
        {d.qualifications.length > 0 ? (
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--color-text-muted)]">
            {d.qualifications.map((q, i) => <li key={i}>{q}</li>)}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">No qualifications provided.</p>
        )}
      </div>

      {/* Bio */}
      <div className="mt-4 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Bio</h2>
        {d.bio ? (
          <div className="prose prose-sm mt-2 max-w-none text-[var(--color-text-body)]" dangerouslySetInnerHTML={{ __html: d.bio }} />
        ) : (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">No bio provided.</p>
        )}
      </div>

      {/* Deactivate */}
      {isActive ? (
        <form action={deactivateDoctorAction} className="mt-8 border-t border-[var(--color-border)] pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--color-text-muted)]">
              Deactivating hides this profile from the public doctors listing API.
            </p>
            <button type="submit" className="gh-btn gh-btn-danger shrink-0">
              Deactivate profile
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-8 border-t border-[var(--color-border)] pt-6 text-sm text-[var(--color-text-muted)]">
          This profile is inactive. Re-enable from edit.
        </p>
      )}
    </section>
  );
}
