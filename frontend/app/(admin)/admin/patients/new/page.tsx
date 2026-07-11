import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { postAdminPatient } from "@/lib/admin/admin-api";
import { AdminCard, Btn, PageHeader } from "../../_components/atoms";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ error?: string; created?: string; invite?: string }>;
};

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

export default async function AdminCreatePatientPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const createError = sp.error;
  const createdEmail = sp.created;
  const inviteUrl = sp.invite;

  async function createPatientAction(formData: FormData) {
    "use server";
    await requireAdminAction();

    const email = str(formData, "email");
    const fullName = str(formData, "fullName");
    if (!email || !fullName) {
      redirect(
        `/admin/patients/new?error=${encodeURIComponent("Email and full name are required")}`,
      );
    }

    const dob = str(formData, "dateOfBirth");
    const body = {
      email: email!,
      fullName: fullName!,
      phone: str(formData, "phone"),
      // <input type="date"> gives YYYY-MM-DD; backend expects an ISO datetime.
      dateOfBirth: dob ? new Date(`${dob}T00:00:00.000Z`).toISOString() : null,
      nationalIdNumber: str(formData, "nationalIdNumber"),
      taxIdNumber: str(formData, "taxIdNumber"),
      passportNumber: str(formData, "passportNumber"),
      addressLine1: str(formData, "addressLine1"),
      addressLine2: str(formData, "addressLine2"),
      addressCity: str(formData, "addressCity"),
      addressPostalCode: str(formData, "addressPostalCode"),
      addressCountryCode: str(formData, "addressCountryCode"),
    };

    const result = await postAdminPatient(body);
    if (!result.ok) {
      redirect(`/admin/patients/new?error=${encodeURIComponent(result.message)}`);
    }

    redirect(
      `/admin/patients/new?created=${encodeURIComponent(email!)}&invite=${encodeURIComponent(
        result.data.inviteUrl,
      )}`,
    );
  }

  return (
    <>
      <Link
        href="/admin/patients"
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to patients
      </Link>
      <PageHeader
        eyebrow="Global"
        title="New patient"
        description="Creates a patient account and profile. An invite link is generated so the patient can set their own password."
        actions={
          <Btn href="/admin/patients" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
            Cancel
          </Btn>
        }
      />

      {createdEmail ? (
        <AdminCard className="mb-4">
          <p className="text-[15px] font-bold text-[var(--color-text-primary)]">
            Patient created
          </p>
          <p className="mt-1 text-portal-compact text-[var(--color-text-muted)]">
            Account for <span className="font-semibold">{createdEmail}</span> is ready. Share the
            invite link below so they can set their password (valid 7 days).
          </p>
          {inviteUrl ? (
            <div className="mt-3 flex flex-col gap-1">
              <span className="gh-field-label">Invite link</span>
              <input readOnly value={inviteUrl} className="gh-input w-full font-mono text-portal-meta" />
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <Btn href={`/admin/patients/${encodeURIComponent(createdEmail)}`} variant="primary">
              View patient
            </Btn>
            <Btn href="/admin/patients/new" variant="ghost">
              Create another
            </Btn>
          </div>
        </AdminCard>
      ) : null}

      {createError ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {createError}
        </p>
      ) : null}

      {!createdEmail ? (
        <AdminCard>
          <form action={createPatientAction} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Email *</span>
                <input name="email" type="email" required className="gh-input" placeholder="patient@email.com" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Full name *</span>
                <input name="fullName" required className="gh-input" placeholder="Jane Doe" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Phone</span>
                <input name="phone" className="gh-input" placeholder="+353 871234567" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Date of birth</span>
                <input name="dateOfBirth" type="date" className="gh-input" />
              </label>
            </div>

            <div>
              <p className="mb-3 text-portal-compact font-semibold text-[var(--color-text-muted)]">
                Identity &amp; address (optional)
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">National ID</span>
                  <input name="nationalIdNumber" className="gh-input" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Fiscal / tax number</span>
                  <input name="taxIdNumber" className="gh-input" placeholder="NIF / PPS / CPF" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Passport number</span>
                  <input name="passportNumber" className="gh-input" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Country code</span>
                  <input name="addressCountryCode" className="gh-input" placeholder="pt / ie / br" maxLength={8} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Address line 1</span>
                  <input name="addressLine1" className="gh-input" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Address line 2</span>
                  <input name="addressLine2" className="gh-input" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">City</span>
                  <input name="addressCity" className="gh-input" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">Postal code</span>
                  <input name="addressPostalCode" className="gh-input" />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-6">
              <button type="submit" className="gh-btn gh-btn-primary flex items-center gap-1.5">
                <UserRound className="size-3.5" aria-hidden />
                Create patient
              </button>
              <Link
                href="/admin/patients"
                className="text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                Cancel
              </Link>
            </div>
          </form>
        </AdminCard>
      ) : null}
    </>
  );
}
