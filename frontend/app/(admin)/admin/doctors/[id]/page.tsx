import Link from "next/link";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft, Mail, RefreshCw } from "lucide-react";
import { Star } from "lucide-react";
import {
  deleteAdminDoctor,
  doctorPublicProfilePath,
  fetchAdminDoctorById,
  fetchAdminDoctorFeatured,
  fetchAdminDoctorMarkets,
  fetchAdminDoctorRegistrations,
  fetchAdminDoctorCredentials,
  fetchAdminDoctorBank,
  postAdminDoctorInvite,
  purgeAdminDoctor,
  setAdminDoctorFeatured,
} from "@/lib/admin/admin-api";
import { SITE_CACHE_TAGS } from "@/lib/api/site-content-api";
import { sanitizeDoctorBioHtml } from "@/lib/content/doctor-bio-format";
import { FlagBadge } from "../../_components/flag-badge";
import { AdminCard, Btn, PageHeader, Pill } from "../../_components/atoms";
import { ConfirmDeleteButton } from "../../_components/confirm-delete-button";
import { DoctorRegistrationsCard } from "../_components/registrations-card";
import { DoctorCredentialsCard } from "../_components/doctor-credentials-card";
import { DoctorMarketsCard } from "../_components/doctor-markets-card";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string; revealBank?: string }>;
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
    await requireAdminAction();
    const updateResult = await deleteAdminDoctor(id);
    if (!updateResult.ok) {
      redirect(`/admin/doctors/${id}?error=${encodeURIComponent(updateResult.message)}`);
    }
    revalidatePath("/admin/doctors");
    revalidatePath(`/admin/doctors/${id}`);
    // Public country-doctors lists need to drop the deactivated row.
    // We don't know the country code here without re-reading the
    // doctor — bust the global tag which covers all country lists.
    revalidateTag(SITE_CACHE_TAGS.globalDoctors(), "max");
    redirect(`/admin/doctors/${id}?success=${encodeURIComponent("Doctor profile deactivated")}`);
  }

  async function deleteDoctorAction() {
    "use server";
    await requireAdminAction();
    const deleteResult = await purgeAdminDoctor(id);
    if (!deleteResult.ok) {
      redirect(`/admin/doctors/${id}?error=${encodeURIComponent(deleteResult.message)}`);
    }
    revalidatePath("/admin/doctors");
    revalidateTag(SITE_CACHE_TAGS.globalDoctors(), "max");
    redirect("/admin/doctors");
  }

  async function toggleFeaturedAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const next = formData.get("next") === "true";
    const countryCode = formData.get("countryCode")?.toString() || undefined;
    const res = await setAdminDoctorFeatured(id, next, countryCode);
    if (!res.ok) {
      redirect(`/admin/doctors/${id}?error=${encodeURIComponent(res.message)}`);
    }
    revalidateTag(SITE_CACHE_TAGS.globalDoctors(), "max");
    const code = res.data?.countryCode?.toUpperCase() ?? countryCode?.toUpperCase() ?? "";
    redirect(
      `/admin/doctors/${id}?success=${encodeURIComponent(
        next
          ? `Clinical Director set for ${code}`
          : `Clinical Director removed for ${code}`,
      )}`,
    );
  }

  async function inviteDoctorAction(formData: FormData) {
    "use server";
    await requireAdminAction();
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

  // Featured state per country (stored in Setting table, not on the doctor row).
  const featuredResult = await fetchAdminDoctorFeatured(id);
  const featuredCountries = featuredResult.ok ? featuredResult.data.featuredCountries : [];

  // Fetched in parallel with the doctor row above would be cleaner, but
  // the page already does serial reads — keep the simple sequencing.
  const registrationsResult = await fetchAdminDoctorRegistrations(id);
  const registrations = registrationsResult.ok
    ? registrationsResult.data.registrations
    : [];
  const credentialsResult = await fetchAdminDoctorCredentials(id);
  const credentials = credentialsResult.ok ? credentialsResult.data.credentials : [];
  // Payout bank details. `?revealBank=1` fetches + audits the full IBAN for
  // finance; default view is masked.
  const revealBank = messages.revealBank === "1";
  const bankResult = await fetchAdminDoctorBank(id, revealBank);
  const bank = bankResult.ok ? bankResult.data.bank : null;
  const marketsResult = await fetchAdminDoctorMarkets(id);
  const markets = marketsResult.ok ? marketsResult.data.markets : [];
  // Primary country + any additional country listings — admin can issue
  // a registration for any of these.
  const associatedCountries = [
    { id: d.country.id, code: d.country.code, name: d.country.name },
    ...d.additionalCountries
      .filter((link) => link.active && link.country.id !== d.country.id)
      .map((link) => ({
        id: link.country.id,
        code: link.country.code,
        name: link.country.name,
      })),
  ];

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
            {featuredCountries.length > 0 ? (
              <Pill tone="brand">
                Clinical Director{featuredCountries.length > 1 ? ` (${featuredCountries.map((c) => c.toUpperCase()).join(", ")})` : ` (${featuredCountries[0]!.toUpperCase()})`}
              </Pill>
            ) : null}
            {/* Per-country Clinical Director toggles — one per country the doctor is listed in. */}
            {associatedCountries.map((country) => {
              const isFeaturedHere = featuredCountries.map((c) => c.toLowerCase()).includes(country.code.toLowerCase());
              return (
                <form key={country.code} action={toggleFeaturedAction}>
                  <input type="hidden" name="next" value={isFeaturedHere ? "false" : "true"} />
                  <input type="hidden" name="countryCode" value={country.code} />
                  <Btn
                    type="submit"
                    variant={isFeaturedHere ? "secondary" : "ghost"}
                    iconLeft={<Star className="size-3.5" aria-hidden />}
                  >
                    {isFeaturedHere ? `Remove Director (${country.code.toUpperCase()})` : `Set Director (${country.code.toUpperCase()})`}
                  </Btn>
                </form>
              );
            })}
            <Btn href={`/admin/doctors/${id}/availability`} variant="ghost">
              Availability
            </Btn>
            <Btn href={`/admin/doctors/${id}/services`} variant="ghost">
              Services
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
        className="grid gap-4 grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
      >
        <div className="grid gap-4">
          <AdminCard>
            <h3 className={cardTitleClass}>Identifiers</h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
              Public marketing profile — not a login account.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow label="Slug" value={d.slug} mono />
              <FieldRow label="Country" value={`${d.country.name} (${d.country.code.toUpperCase()})`} />
              <FieldRow label="Public path" value={publicPath} mono full />
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
              <FieldRow
                label="WhatsApp"
                value={
                  d.whatsappNumber ? (
                    <span className="flex items-center gap-2">
                      <span>{d.whatsappNumber}</span>
                      <span className="inline-block rounded border border-[var(--color-border)] bg-[var(--color-background-soft)] px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                        Internal
                      </span>
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
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
            </div>
          </AdminCard>

          <AdminCard>
            <h3 className={cardTitleClass}>Qualifications</h3>
            {d.qualifications.length > 0 ? (
              <ul className="mt-3 grid gap-2 text-[14px] leading-relaxed text-[var(--color-text-body)]">
                {d.qualifications.map((q, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 rounded-md bg-[var(--color-background-soft)] px-3 py-2"
                  >
                    <span
                      aria-hidden
                      className="block w-1 h-1 shrink-0 rounded-full bg-[var(--color-brand-primary)] mt-2"
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
            <h3 className={cardTitleClass}>Bio</h3>
            {d.bio ? (
              <div
                className="prose prose-sm mt-3 max-w-none text-[var(--color-text-body)]"
                dangerouslySetInnerHTML={{ __html: sanitizeDoctorBioHtml(d.bio) }}
              />
            ) : (
              <p className="mt-3 text-[13px] text-[var(--color-text-muted)]">
                No bio provided.
              </p>
            )}
          </AdminCard>

          <DoctorMarketsCard doctorId={d.id} doctorSlug={d.slug} markets={markets} />

          <DoctorRegistrationsCard
            doctorId={d.id}
            rows={registrations}
            associatedCountries={associatedCountries}
          />

          <DoctorCredentialsCard
            doctorId={d.id}
            rows={credentials}
            associatedCountries={associatedCountries}
          />

          <AdminCard>
            <h3 className={cardTitleClass}>Payout bank details</h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
              Entered by the doctor in their portal. The IBAN is stored
              encrypted; revealing the full number is logged.
            </p>
            {bank && (bank.ibanSet || bank.accountHolder || bank.bic) ? (
              <dl className="grid gap-3">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    Account holder
                  </dt>
                  <dd className="mt-1 text-[14px] text-[var(--color-text-primary)]">
                    {bank.accountHolder ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    IBAN
                  </dt>
                  <dd className="mt-1 font-mono text-[14px] text-[var(--color-text-primary)]">
                    {revealBank && bank.iban
                      ? bank.iban
                      : bank.ibanMasked ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    BIC / SWIFT
                  </dt>
                  <dd className="mt-1 font-mono text-[14px] text-[var(--color-text-primary)]">
                    {bank.bic ?? "—"}
                  </dd>
                </div>
                {bank.ibanSet && !revealBank ? (
                  <a
                    href={`/admin/doctors/${d.id}?revealBank=1`}
                    className="gh-btn gh-btn-soft mt-1 w-fit"
                  >
                    Reveal full IBAN (logged)
                  </a>
                ) : null}
              </dl>
            ) : (
              <p className="text-[13px] text-[var(--color-text-muted)]">
                The doctor has not added payout bank details yet.
              </p>
            )}
          </AdminCard>
        </div>

        <div className="grid gap-4 self-start">
          <AdminCard>
            <h3 className={cardTitleClass}>Account access</h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
              Invite the doctor by email — they&apos;ll set a password and
              land straight in the portal.
            </p>
            {d.loginUser ? (
              <div className="grid gap-3">
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-background-soft)] p-3 text-[13px]">
                  <p className="flex items-center gap-2 font-semibold text-[var(--color-text-primary)]">
                    <span>{d.loginUser.email}</span>
                    <span className="inline-block rounded border border-[var(--color-border)] bg-[var(--color-background)] px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                      Internal
                    </span>
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
            <h3 className={cardTitleClass}>Visibility</h3>
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
            <h3 className="m-0 [font-family:var(--font-display)] text-base font-extrabold text-[var(--color-status-error-text)]">
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

const cardTitleClass =
  "m-0 [font-family:var(--font-display)] text-base font-extrabold text-[var(--color-text-primary)]";

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
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        {label}
      </div>
      <div
        className={`mt-1 text-[var(--color-text-primary)] ${mono ? "font-mono text-[12.5px]" : "text-[14px]"}`}
      >
        {value}
      </div>
    </div>
  );
}
