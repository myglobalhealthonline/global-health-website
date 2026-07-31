import Link from "next/link";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  fetchAdminDoctorById,
  fetchAdminDoctorProfileChangeRequests,
  reviewDoctorProfileChangeRequest,
  type AdminDoctorProfileChangeRequest,
  type AdminDoctorProfileChangeValue,
} from "@/lib/admin/admin-api";
import { sanitizeDoctorBioHtml } from "@/lib/content/doctor-bio-format";
import { revalidateDoctorProfileCache } from "@/lib/server/revalidate-doctor-profile";
import { AdminCard, Btn, PageHeader, Pill } from "../../../_components/atoms";
import { FlagBadge } from "../../../_components/flag-badge";
import { SetCrumbTitle } from "@/components/crumb-title";

export const dynamic = "force-dynamic";

const FIELD_LABELS: Record<AdminDoctorProfileChangeRequest["field"], string> = {
  fullName: "Full name",
  qualifications: "Qualifications",
  bio: "Bio",
  registration: "Registration",
  photo: "Profile photo",
};

function statusTone(
  status: AdminDoctorProfileChangeRequest["status"],
): "published" | "inactive" | "brand" | "neutral" {
  if (status === "approved") return "published";
  if (status === "pending") return "brand";
  if (status === "rejected") return "inactive";
  return "neutral";
}

/** Media paths are backend-relative; the admin origin needs the API prefix. */
function resolveMediaSrc(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/api/media/")) {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "";
    return base ? `${base}${path}` : path;
  }
  return path;
}

/**
 * Renders one side of the before/after for any field. Kept value-shape-driven
 * rather than field-driven so a malformed row degrades to "—" instead of
 * throwing mid-review.
 */
function ValuePreview({
  value,
  label,
}: {
  value: AdminDoctorProfileChangeValue | null;
  label: string;
}) {
  let body: React.ReactNode = <span className="text-[var(--color-text-muted)]">—</span>;

  if (value && "value" in value && typeof value.value === "string") {
    body = <span className="text-[15px] font-semibold">{value.value || "—"}</span>;
  } else if (value && "value" in value && Array.isArray(value.value)) {
    body =
      value.value.length === 0 ? (
        <span className="text-[var(--color-text-muted)]">—</span>
      ) : (
        <ul className="m-0 list-disc pl-4 text-sm">
          {value.value.map((entry, i) => (
            <li key={`${entry}-${i}`}>{entry}</li>
          ))}
        </ul>
      );
  } else if (value && "translations" in value) {
    body = (
      <div className="grid gap-2">
        {value.translations.map((t) => (
          <div key={t.locale}>
            <p className="m-0 text-portal-meta font-bold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
              {t.locale}
            </p>
            {t.bio ? (
              <div
                className="gh-article-body text-sm"
                // Sanitized on submit and again here — the admin precedent on
                // the doctor detail page does the same for the live bio.
                dangerouslySetInnerHTML={{ __html: sanitizeDoctorBioHtml(t.bio) }}
              />
            ) : (
              <span className="text-sm text-[var(--color-text-muted)]">—</span>
            )}
          </div>
        ))}
      </div>
    );
  } else if (value && "registrationNumber" in value) {
    body = (
      <dl className="m-0 grid gap-1 text-sm">
        <div className="flex gap-2">
          <dt className="text-[var(--color-text-muted)]">Body:</dt>
          <dd className="m-0 font-medium">{value.chamberEntity ?? "—"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-[var(--color-text-muted)]">Number:</dt>
          <dd className="m-0 font-mono font-medium">{value.registrationNumber ?? "—"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-[var(--color-text-muted)]">Division:</dt>
          <dd className="m-0 font-medium">{value.division ?? "—"}</dd>
        </div>
      </dl>
    );
  } else if (value && "removed" in value) {
    body = value.removed ? (
      <span className="text-sm font-semibold text-[var(--color-text-muted)]">
        No photo
      </span>
    ) : (
      <div
        className="h-28 w-28 overflow-hidden rounded-full"
        style={{ border: "1px solid var(--color-border-subtle)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolveMediaSrc(value.path)}
          alt={label}
          style={{
            height: "100%",
            width: "100%",
            objectFit: "cover",
            objectPosition: `${value.focalX}% ${value.focalY}%`,
            transform: `scale(${value.zoom})`,
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <p className="m-0 mb-1 text-portal-meta font-bold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
        {label}
      </p>
      {body}
    </div>
  );
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function AdminDoctorProfileRequestsPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};

  const [doctorResult, requestsResult] = await Promise.all([
    fetchAdminDoctorById(id),
    fetchAdminDoctorProfileChangeRequests(id),
  ]);

  async function reviewAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const requestId = String(formData.get("requestId") ?? "");
    const status = String(formData.get("status") ?? "");
    if (!requestId || (status !== "approved" && status !== "rejected")) {
      redirect(
        `/admin/doctors/${id}/profile-requests?error=${encodeURIComponent("Invalid review")}`,
      );
    }
    const res = await reviewDoctorProfileChangeRequest(id, requestId, {
      status: status as "approved" | "rejected",
      reviewNote: String(formData.get("reviewNote") ?? "").trim() || null,
      markVerified: formData.get("markVerified") === "on",
    });
    if (!res.ok) {
      redirect(
        `/admin/doctors/${id}/profile-requests?error=${encodeURIComponent(res.message)}`,
      );
    }
    revalidatePath(`/admin/doctors/${id}/profile-requests`);
    revalidatePath(`/admin/doctors/${id}`);
    // An approved change lands on the public doctor profile in every market
    // the doctor is listed in, so bust each rather than waiting out the TTL.
    // (A rejection changes nothing public, but the cache block is cheap to
    // honour either way and keeps this branch-free.)
    if (res.data.cache) revalidateDoctorProfileCache(res.data.cache);
    redirect(
      `/admin/doctors/${id}/profile-requests?success=${encodeURIComponent(
        status === "approved" ? "Change approved and applied" : "Change rejected",
      )}`,
    );
  }

  if (!doctorResult.ok) {
    return (
      <>
        <PageHeader title="Profile change requests" />
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {doctorResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const doctor = doctorResult.data.doctor;
  const requests = requestsResult.ok ? requestsResult.data.items : [];
  const pending = requests.filter((r) => r.status === "pending");
  const decided = requests.filter((r) => r.status !== "pending");

  function renderRequest(row: AdminDoctorProfileChangeRequest, reviewable: boolean) {
    return (
      <li
        key={row.id}
        className="gh-admin-doctor-service-row rounded-[var(--radius-card-sm)] border border-[var(--color-border-subtle)] p-4"
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="m-0 text-[15px] font-semibold text-[var(--color-text-primary)]">
            {FIELD_LABELS[row.field] ?? row.field}
          </p>
          <Pill tone={statusTone(row.status)}>{row.status}</Pill>
          {row.isGlobal ? (
            <Pill tone="neutral">All markets</Pill>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <FlagBadge code={row.countryCode} size={14} />
              <span className="text-portal-compact text-[var(--color-text-muted)]">
                {row.countryName}
              </span>
            </span>
          )}
          <span className="text-portal-meta text-[var(--color-text-muted)]">
            {new Date(row.createdAt).toLocaleString()}
          </span>
        </div>

        {row.doctorNote ? (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            <span className="font-semibold">Doctor&rsquo;s note:</span> {row.doctorNote}
          </p>
        ) : null}

        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <ValuePreview value={row.previousValue} label="Current" />
          <ValuePreview value={row.proposedValue} label="Requested" />
        </div>

        {row.reviewNote ? (
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
            <span className="font-semibold">Review note:</span> {row.reviewNote}
          </p>
        ) : null}

        {reviewable ? (
          <form action={reviewAction} className="mt-4 grid gap-3">
            <input type="hidden" name="requestId" value={row.id} />
            <label className="flex flex-col gap-1 text-portal-meta font-semibold text-[var(--color-text-muted)]">
              Review note (optional — shown to the doctor)
              <input
                type="text"
                name="reviewNote"
                maxLength={1000}
                className="gh-input"
                placeholder="e.g. Please attach the certificate for this qualification"
              />
            </label>
            {row.field === "registration" ? (
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
                <input type="checkbox" name="markVerified" />
                Mark this registration verified — only if you have sighted the
                documentation. Left unticked, PDFs print &ldquo;(unverified)&rdquo;.
              </label>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Btn type="submit" name="status" value="approved" variant="primary" size="sm">
                Approve
              </Btn>
              <Btn type="submit" name="status" value="rejected" variant="ghost" size="sm">
                Reject
              </Btn>
            </div>
          </form>
        ) : null}
      </li>
    );
  }

  return (
    <>
      <SetCrumbTitle label={doctor.fullName} />
      <Link
        href={`/admin/doctors/${id}`}
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to doctor
      </Link>

      <PageHeader
        eyebrow={doctor.country.name}
        title={`Profile requests — ${doctor.fullName}`}
        description="Doctors can edit their name, qualifications, bio, registration, and photo, but the change only reaches patients once you approve it here."
        actions={
          <Btn href={`/admin/doctors/${id}/services`} variant="ghost">
            Services
          </Btn>
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

      <div className="grid gap-4">
        <AdminCard>
          <h3 className="m-0 text-base font-bold text-[var(--color-text-primary)]">
            Awaiting review ({pending.length})
          </h3>
          {!requestsResult.ok ? (
            <p className="gh-status-warning mt-3 rounded-md border px-4 py-3 text-sm">
              {requestsResult.message}
            </p>
          ) : pending.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">
              Nothing waiting on you.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {pending.map((row) => renderRequest(row, true))}
            </ul>
          )}
        </AdminCard>

        {decided.length > 0 ? (
          <AdminCard>
            <h3 className="m-0 text-base font-bold text-[var(--color-text-primary)]">
              History ({decided.length})
            </h3>
            <ul className="mt-4 grid gap-3">
              {decided.map((row) => renderRequest(row, false))}
            </ul>
          </AdminCard>
        ) : null}
      </div>
    </>
  );
}
