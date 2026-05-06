import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
        <Link href="/admin/doctors" className="mt-6 inline-block gh-link text-[var(--color-brand-primary)]">
          Back to doctor profiles
        </Link>
      </section>
    );
  }

  const d = result.data.doctor;
  const publicPath = doctorPublicProfilePath(d.country.teamPath, d.slug);
  const profileImage = d.assets[0]?.path ?? null;

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">{d.fullName}</h1>
        <div className="flex flex-wrap gap-4">
          <Link href={`/admin/doctors/${id}/edit`} className="gh-btn gh-btn-primary">
            Edit
          </Link>
          <Link href="/admin/doctors" className="gh-link text-[var(--color-text-muted)]">
            Back to list
          </Link>
        </div>
      </div>

      <p className="mt-4 text-sm text-[var(--color-text-muted)]">
        Public marketing profile only — not a login account. Doctor portal is a separate product.
      </p>

      {messages.error ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          {messages.error}
        </p>
      ) : null}
      {messages.success ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-success">
          {messages.success}
        </p>
      ) : null}

      <p className="mt-4 text-sm text-[var(--color-text-muted)]">
        Status:{" "}
        <span className={d.active ? "text-[var(--color-status-success-text)]" : "text-[var(--color-status-warning-text)]"}>{d.active ? "Active" : "Inactive"}</span>
        {" — inactive profiles are omitted from the public doctors API."}
      </p>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Slug</dt>
          <dd className="mt-1 font-mono text-sm text-[var(--color-text-primary)]">{d.slug}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Country</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">
            {d.country.name} ({d.country.code})
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Title</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{d.title}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Public path (derived)</dt>
          <dd className="mt-1 font-mono text-sm text-[var(--color-text-primary)]">{publicPath}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Specialties</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">
            {d.specialties.length > 0 ? d.specialties.map((s) => s.specialty.name).join(", ") : "—"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Bio</dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">{d.bio ?? "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Profile image</dt>
          <dd className="mt-1 font-mono text-xs text-[var(--color-text-primary)]">{profileImage ?? "—"}</dd>
        </div>
      </dl>

      {d.active ? (
        <form action={deactivateDoctorAction} className="mt-10 border-t border-[var(--color-border)] pt-8">
          <p className="text-sm text-[var(--color-text-muted)]">
            Deactivate hides this profile from the public doctors listing API (soft-disable).
          </p>
          <button type="submit" className="mt-4 gh-btn gh-btn-danger">
            Deactivate profile
          </button>
        </form>
      ) : (
        <p className="mt-10 border-t border-[var(--color-border)] pt-8 text-sm text-[var(--color-text-muted)]">
          This profile is inactive. Re-enable from edit.
        </p>
      )}
    </section>
  );
}
