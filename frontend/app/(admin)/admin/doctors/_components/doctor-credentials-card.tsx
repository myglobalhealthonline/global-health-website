import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  type AdminCountryDto,
  type AdminDoctorCredentialDto,
  createAdminDoctorCredential,
  deleteAdminDoctorCredential,
  updateAdminDoctorCredential,
} from "@/lib/admin/admin-api";
import { AdminCard } from "../../_components/atoms";

/**
 * Confirmed extra professional credentials (FRCP, MICGP, fellowships) with
 * their recognising body + verification URL. Powers the doctor profile
 * "Credentials" line + Physician hasCredential/recognizedBy schema. Only add
 * credentials that are verified — never speculative "board-certified" claims.
 */
export function DoctorCredentialsCard({
  doctorId,
  rows,
  associatedCountries,
}: {
  doctorId: string;
  rows: AdminDoctorCredentialDto[];
  associatedCountries: Array<Pick<AdminCountryDto, "id" | "code" | "name">>;
}) {
  async function addCredential(formData: FormData) {
    "use server";
    await requireAdminAction();
    const label = String(formData.get("label") ?? "").trim();
    const bodyName = String(formData.get("bodyName") ?? "").trim();
    const bodyUrl = String(formData.get("bodyUrl") ?? "").trim() || null;
    const countryCode = String(formData.get("countryCode") ?? "").trim() || null;
    if (!label || !bodyName) {
      redirect(
        `/admin/doctors/${doctorId}?error=${encodeURIComponent("Credential label and body are required")}`,
      );
    }
    const result = await createAdminDoctorCredential(doctorId, {
      label,
      bodyName,
      bodyUrl,
      countryCode,
    });
    if (!result.ok) {
      redirect(`/admin/doctors/${doctorId}?error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath(`/admin/doctors/${doctorId}`);
    redirect(`/admin/doctors/${doctorId}?success=${encodeURIComponent("Credential added")}`);
  }

  async function removeCredential(formData: FormData) {
    "use server";
    await requireAdminAction();
    const credentialId = String(formData.get("credentialId") ?? "");
    if (credentialId) {
      const result = await deleteAdminDoctorCredential(doctorId, credentialId);
      if (!result.ok) {
        redirect(`/admin/doctors/${doctorId}?error=${encodeURIComponent(result.message)}`);
      }
    }
    revalidatePath(`/admin/doctors/${doctorId}`);
    redirect(`/admin/doctors/${doctorId}?success=${encodeURIComponent("Credential removed")}`);
  }

  async function editCredential(formData: FormData) {
    "use server";
    await requireAdminAction();
    const credentialId = String(formData.get("credentialId") ?? "");
    const label = String(formData.get("label") ?? "").trim();
    const bodyName = String(formData.get("bodyName") ?? "").trim();
    const bodyUrl = String(formData.get("bodyUrl") ?? "").trim() || null;
    const countryCode = String(formData.get("countryCode") ?? "").trim() || null;
    if (!credentialId || !label || !bodyName) {
      redirect(
        `/admin/doctors/${doctorId}?error=${encodeURIComponent("Credential label and body are required")}`,
      );
    }
    const result = await updateAdminDoctorCredential(doctorId, credentialId, {
      label,
      bodyName,
      bodyUrl,
      countryCode,
    });
    if (!result.ok) {
      redirect(`/admin/doctors/${doctorId}?error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath(`/admin/doctors/${doctorId}`);
    redirect(`/admin/doctors/${doctorId}?success=${encodeURIComponent("Credential saved")}`);
  }

  return (
    <AdminCard>
      <h3 style={cardTitleStyle}>Credentials</h3>
      <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
        Confirmed professional credentials beyond the council registration (e.g.
        FRCP, MICGP). Each shows on the profile and in the doctor&apos;s schema as
        recognised by its issuing body. Only add verified credentials.
      </p>

      {rows.length > 0 ? (
        <div className="mb-4 grid gap-3">
          {rows.map((row) => (
            <form
              key={row.id}
              action={editCredential}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-background-soft)] p-3"
            >
              <input type="hidden" name="credentialId" value={row.id} />
              <CredentialFields row={row} associatedCountries={associatedCountries} />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="submit"
                  formAction={removeCredential}
                  className="gh-btn inline-flex items-center gap-1.5 text-[var(--color-danger,#b91c1c)]"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Remove
                </button>
                <button type="submit" className="gh-btn gh-btn-primary">
                  Save
                </button>
              </div>
            </form>
          ))}
        </div>
      ) : null}

      <form
        action={addCredential}
        className="rounded-md border border-dashed border-[var(--color-border)] p-3"
      >
        <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          Add credential
        </p>
        <CredentialFields row={null} associatedCountries={associatedCountries} />
        <div className="mt-2 flex justify-end">
          <button type="submit" className="gh-btn gh-btn-primary">
            Add
          </button>
        </div>
      </form>
    </AdminCard>
  );
}

function CredentialFields({
  row,
  associatedCountries,
}: {
  row: AdminDoctorCredentialDto | null;
  associatedCountries: Array<Pick<AdminCountryDto, "id" | "code" | "name">>;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="flex flex-col gap-1">
        <span className="gh-field-label">Credential</span>
        <input
          type="text"
          name="label"
          maxLength={160}
          defaultValue={row?.label ?? ""}
          placeholder="FRCP"
          className="gh-input"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="gh-field-label">Issuing body</span>
        <input
          type="text"
          name="bodyName"
          maxLength={200}
          defaultValue={row?.bodyName ?? ""}
          placeholder="Royal College of Physicians of Ireland"
          className="gh-input"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="gh-field-label">Body URL</span>
        <input
          type="url"
          name="bodyUrl"
          maxLength={500}
          defaultValue={row?.bodyUrl ?? ""}
          placeholder="https://www.rcpi.ie"
          className="gh-input"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="gh-field-label">Country scope</span>
        <select name="countryCode" defaultValue={row?.countryCode ?? ""} className="gh-input">
          <option value="">All countries</option>
          {associatedCountries.map((c) => (
            <option key={c.id} value={c.code}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

const cardTitleStyle = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontSize: 16,
  fontWeight: 800,
  color: "var(--color-text-primary)",
} as const;
