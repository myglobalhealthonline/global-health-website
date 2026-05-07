import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Image from "next/image";
import {
  Pencil,
  ArrowLeft,
  Globe,
  Stethoscope,
  Phone,
  Languages,
  Hash,
  FileText,
  MapPin,
  Shield,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Award,
  Link as LinkIcon,
} from "lucide-react";
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
  const publicUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}${publicPath}`;

  return (
    <section className="gh-card p-6 sm:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="gh-h2 text-[var(--color-text-primary)]">{d.fullName}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{d.title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/admin/doctors/${id}/edit`}
            className="gh-btn gh-btn-primary inline-flex items-center gap-2"
          >
            <Pencil className="size-4" />
            Edit
          </Link>
          <Link
            href="/admin/doctors"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-brand-primary)] transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to list
          </Link>
        </div>
      </div>

      {/* Status badge */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            d.active
              ? "bg-[var(--color-status-success-bg)] text-[var(--color-status-success-text)] border border-[var(--color-status-success-border)]"
              : "bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)] border border-[var(--color-status-warning-border)]"
          }`}
        >
          {d.active ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
          {d.active ? "Active" : "Inactive"}
        </span>
        <span className="text-xs text-[var(--color-text-muted)]">
          Public marketing profile — not a login account
        </span>
      </div>

      {/* Alerts */}
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

      {/* Profile card */}
      <div className="mt-6 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-5">
        <div className="flex flex-col gap-6 sm:flex-row">
          {/* Avatar */}
          <div className="shrink-0">
            {profileImage ? (
              <div className="relative h-28 w-28 overflow-hidden rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-white">
                <Image
                  src={profileImage}
                  alt={d.fullName}
                  fill
                  className="object-cover"
                  sizes="112px"
                />
              </div>
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-white">
                <Stethoscope className="size-10 text-[var(--color-text-muted)]" />
              </div>
            )}
          </div>

          {/* Info grid */}
          <div className="flex-1">
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Hash className="mt-0.5 size-4 shrink-0 text-[var(--color-text-muted)]" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Slug</p>
                  <p className="mt-0.5 font-mono text-sm text-[var(--color-text-primary)]">{d.slug}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--color-text-muted)]" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Country</p>
                  <p className="mt-0.5 text-sm text-[var(--color-text-primary)]">{d.country.name} ({d.country.code})</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Globe className="mt-0.5 size-4 shrink-0 text-[var(--color-text-muted)]" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Public path</p>
                  <Link
                    href={publicPath}
                    target="_blank"
                    className="mt-0.5 inline-flex items-center gap-1 font-mono text-sm text-[var(--color-brand-primary)] hover:underline"
                  >
                    {publicPath}
                    <ExternalLink className="size-3" />
                  </Link>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 size-4 shrink-0 text-[var(--color-text-muted)]" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">IMC registration</p>
                  <p className="mt-0.5 text-sm text-[var(--color-text-primary)]">{d.imcRegistration ?? "—"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <LinkIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-text-muted)]" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Medical registration URL</p>
                  {d.medicalRegistrationUrl ? (
                    <a
                      href={d.medicalRegistrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 text-sm text-[var(--color-brand-primary)] hover:underline"
                    >
                      {d.medicalRegistrationUrl}
                      <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <p className="mt-0.5 text-sm text-[var(--color-text-primary)]">—</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-[var(--color-text-muted)]" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">WhatsApp</p>
                  <p className="mt-0.5 text-sm text-[var(--color-text-primary)]">{d.whatsappNumber ?? "—"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Languages className="mt-0.5 size-4 shrink-0 text-[var(--color-text-muted)]" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Languages</p>
                  <p className="mt-0.5 text-sm text-[var(--color-text-primary)]">
                    {d.languages.length > 0 ? d.languages.join(", ") : "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:col-span-2">
                <Stethoscope className="mt-0.5 size-4 shrink-0 text-[var(--color-text-muted)]" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Specialties</p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {d.specialties.length > 0 ? (
                      d.specialties.map((s) => (
                        <span
                          key={s.specialty.id}
                          className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-[var(--color-text-primary)] border border-[var(--color-border)]"
                        >
                          {s.specialty.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-[var(--color-text-muted)]">—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Qualifications section */}
      <div className="mt-6">
        <div className="flex items-center gap-2">
          <Award className="size-4 text-[var(--color-text-muted)]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Qualifications</h2>
        </div>
        <div className="mt-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-white p-5">
          {d.qualifications.length > 0 ? (
            <ul className="list-disc pl-5 space-y-1">
              {d.qualifications.map((q, i) => (
                <li key={i} className="text-sm text-[var(--color-text-body)]">{q}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm italic text-[var(--color-text-muted)]">No qualifications provided.</p>
          )}
        </div>
      </div>

      {/* Bio section */}
      <div className="mt-6">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-[var(--color-text-muted)]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Bio</h2>
        </div>
        <div className="mt-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-white p-5">
          {d.bio ? (
            <div
              className="prose prose-sm max-w-none text-[var(--color-text-body)]"
              dangerouslySetInnerHTML={{ __html: d.bio }}
            />
          ) : (
            <p className="text-sm italic text-[var(--color-text-muted)]">No bio provided.</p>
          )}
        </div>
      </div>

      {/* Deactivate */}
      {d.active ? (
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
        <div className="mt-8 border-t border-[var(--color-border)] pt-6">
          <p className="text-sm text-[var(--color-text-muted)]">
            This profile is inactive. Re-enable from edit.
          </p>
        </div>
      )}
    </section>
  );
}
