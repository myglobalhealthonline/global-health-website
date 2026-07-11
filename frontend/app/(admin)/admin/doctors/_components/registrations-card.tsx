import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import {
  type AdminCountryDto,
  type AdminDoctorRegistrationDto,
  patchAdminDoctorRegistration,
} from "@/lib/admin/admin-api";
import { AdminCard } from "../../_components/atoms";

/**
 * Per-country doctor medical registrations panel. One row per country
 * the doctor is associated with (primary + additional). Admin fills in
 * chamber + registration number + verified flag; the row is upserted on
 * the existing DoctorCountry link table.
 *
 * Server actions live in the parent page so they can call
 * `revalidatePath(/admin/doctors/[id])` after the save.
 */
export function DoctorRegistrationsCard({
  doctorId,
  rows,
  associatedCountries,
}: {
  doctorId: string;
  rows: AdminDoctorRegistrationDto[];
  associatedCountries: Array<Pick<AdminCountryDto, "id" | "code" | "name">>;
}) {
  // Merge: build one card per country the doctor has any link to, even
  // if no DoctorCountry row exists yet (so admin can start from blank).
  const byCountry = new Map(rows.map((r) => [r.countryId, r]));
  const seen = new Set<string>();
  const ordered = associatedCountries.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  async function saveRegistration(formData: FormData) {
    "use server";
    await requireAdminAction();
    const countryId = String(formData.get("countryId") ?? "");
    const chamberEntity = String(formData.get("chamberEntity") ?? "").trim() || null;
    const registrationNumber =
      String(formData.get("registrationNumber") ?? "").trim() || null;
    const division = String(formData.get("division") ?? "").trim() || null;
    const isVerified = formData.get("isVerified") === "on";
    if (!countryId) {
      redirect(
        `/admin/doctors/${doctorId}?error=${encodeURIComponent(
          "Country is required for a registration",
        )}`,
      );
    }
    const result = await patchAdminDoctorRegistration(doctorId, countryId, {
      chamberEntity,
      registrationNumber,
      division,
      isVerified,
    });
    if (!result.ok) {
      redirect(
        `/admin/doctors/${doctorId}?error=${encodeURIComponent(result.message)}`,
      );
    }
    revalidatePath(`/admin/doctors/${doctorId}`);
    redirect(
      `/admin/doctors/${doctorId}?success=${encodeURIComponent(
        "Registration saved",
      )}`,
    );
  }

  return (
    <AdminCard className="gh-admin-doctor-registrations-card">
      <h3 style={cardTitleStyle}>Medical registrations</h3>
      <p className="mb-4 mt-1 text-portal-compact text-[var(--color-text-muted)]">
        Per-country credentials printed on prescription PDFs. One row per
        country the doctor practices in (chamber abbreviation + license
        number). Verified credentials render without a warning badge.
      </p>

      {ordered.length === 0 ? (
        <p className="text-portal-compact text-[var(--color-text-muted)]">
          No country links yet. Add the doctor to a country roster on the
          edit page to enable registrations.
        </p>
      ) : (
        <div className="gh-admin-doctor-registration-list grid gap-3">
          {ordered.map((country) => {
            const row = byCountry.get(country.id) ?? null;
            return (
              <form
                key={country.id}
                action={saveRegistration}
                className="gh-admin-doctor-registration-row rounded-md border border-[var(--color-border)] bg-[var(--color-background-soft)] p-3"
              >
                <input type="hidden" name="countryId" value={country.id} />
                <div className="gh-admin-doctor-registration-header mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                      {country.code}
                    </span>
                    <span className="text-portal-body font-semibold text-[var(--color-text-primary)]">
                      {country.name}
                    </span>
                  </div>
                  {row?.isVerified ? (
                    <span className="inline-flex items-center gap-1 text-portal-meta font-semibold text-emerald-700">
                      <CheckCircle2 className="size-3.5" aria-hidden />
                      Verified
                      {row.verifiedAt ? (
                        <span className="text-portal-thead font-normal text-[var(--color-text-muted)]">
                          ·{" "}
                          {new Date(row.verifiedAt).toLocaleDateString()}
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-portal-thead text-[var(--color-text-muted)]">
                      Not verified
                    </span>
                  )}
                </div>
                <div className="gh-admin-doctor-registration-fields grid gap-2 sm:grid-cols-[100px_1fr_1fr_auto] sm:items-end">
                  <label className="flex flex-col gap-1">
                    <span className="gh-field-label">Chamber</span>
                    <input
                      type="text"
                      name="chamberEntity"
                      maxLength={64}
                      defaultValue={row?.chamberEntity ?? ""}
                      placeholder={chamberPlaceholderFor(country.code)}
                      className="gh-input"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="gh-field-label">Registration number</span>
                    <input
                      type="text"
                      name="registrationNumber"
                      maxLength={64}
                      defaultValue={row?.registrationNumber ?? ""}
                      className="gh-input"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="gh-field-label">Division</span>
                    <input
                      type="text"
                      name="division"
                      maxLength={120}
                      defaultValue={row?.division ?? ""}
                      placeholder={country.code.toUpperCase() === "IE" ? "General Division" : ""}
                      className="gh-input"
                    />
                  </label>
                  <label className="inline-flex items-center gap-2 pb-2 text-portal-compact">
                    <input
                      type="checkbox"
                      name="isVerified"
                      defaultChecked={Boolean(row?.isVerified)}
                    />
                    Verified
                  </label>
                </div>
                <div className="gh-admin-doctor-form-actions mt-2 flex justify-end">
                  <button type="submit" className="gh-btn gh-btn-primary">
                    Save
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      )}
    </AdminCard>
  );
}

/** Sensible placeholders so the admin knows what each council names itself. */
function chamberPlaceholderFor(code: string): string {
  const upper = code.toUpperCase();
  return (
    {
      IE: "IMC",
      PT: "OM",
      ES: "OMC",
      CZ: "ČLK",
      RO: "CMR",
      BR: "CRM",
    }[upper] ?? ""
  );
}

const cardTitleStyle = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontSize: 16,
  fontWeight: 800,
  color: "var(--color-text-primary)",
} as const;
