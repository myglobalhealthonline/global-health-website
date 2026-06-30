import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { redirect } from "next/navigation";
import {
  type AdminPatientProfileDto,
  patchAdminPatientProfile,
} from "@/lib/admin/admin-api";
import { AdminCard } from "../../_components/atoms";
import { PhoneField } from "@/components/forms/phone-field";

/**
 * Admin-side editor for the PatientProfile row. Rendered on the user
 * detail page when the user's role is PATIENT. The form is bound to
 * `PATCH /api/admin/patients/:email/profile`, which lets admin fill in
 * any field including clinical alerts (doctor-only on the chart UI).
 *
 * Tabs concept from the plan is collapsed into themed sections on a
 * single form — fewer round-trips, simpler to render, same coverage.
 */
export function PatientProfileEditor({
  userId,
  email,
  profile,
}: {
  userId: string;
  email: string;
  profile: AdminPatientProfileDto | null;
}) {
  async function saveProfile(formData: FormData) {
    "use server";
    await requireAdminAction();
    const text = (key: string) => {
      const raw = formData.get(key);
      if (raw === null) return undefined;
      const v = String(raw).trim();
      return v === "" ? null : v;
    };
    const num = (key: string) => {
      const raw = formData.get(key);
      if (raw === null || raw === "") return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    };

    const body = {
      fullName: text("fullName"),
      phone: text("phone"),
      dateOfBirth: text("dateOfBirth"),
      weightKg: num("weightKg"),
      heightM: num("heightM"),
      bmi: num("bmi"),
      bloodType: text("bloodType"),
      nationalIdNumber: text("nationalIdNumber"),
      taxIdNumber: text("taxIdNumber"),
      passportNumber: text("passportNumber"),
      addressLine1: text("addressLine1"),
      addressLine2: text("addressLine2"),
      addressCity: text("addressCity"),
      addressPostalCode: text("addressPostalCode"),
      addressCountryCode: text("addressCountryCode"),
      preferredPharmacy: text("preferredPharmacy"),
      statusAlert: text("statusAlert"),
      clinicAlert: text("clinicAlert"),
    };

    const result = await patchAdminPatientProfile(email, body);
    if (!result.ok) {
      redirect(
        `/admin/users/${userId}?error=${encodeURIComponent(result.message)}`,
      );
    }
    revalidatePath(`/admin/users/${userId}`);
    redirect(
      `/admin/users/${userId}?success=${encodeURIComponent(
        "Patient profile saved",
      )}`,
    );
  }

  return (
    <AdminCard className="gh-admin-patient-profile-editor">
      <h3 style={cardTitleStyle}>Patient profile</h3>
      <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
        Persistent chart keyed by email. Identity + address + clinical
        alerts visible to the assigned doctor on the patient chart.
      </p>

      <form action={saveProfile} className="gh-admin-patient-profile-form grid gap-6">
        {profile?.statusAlert ? (
          <p
            className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-800"
            role="status"
          >
            ⚠ Status alert preview: {profile.statusAlert}
          </p>
        ) : null}
        {profile?.clinicAlert ? (
          <p
            className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-900"
            role="status"
          >
            ⓘ Clinic alert preview: {profile.clinicAlert}
          </p>
        ) : null}

        <section className="gh-admin-patient-profile-section">
          <h4 style={sectionTitleStyle}>Identity</h4>
          <div className="gh-admin-support-field-grid grid gap-3 sm:grid-cols-2">
            <Field
              label="Full name"
              name="fullName"
              defaultValue={profile?.fullName ?? ""}
              maxLength={200}
            />
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Phone</span>
              <PhoneField name="phone" defaultValue={profile?.phone ?? ""} />
            </label>
            <Field
              label="Date of birth (ISO)"
              name="dateOfBirth"
              type="datetime-local"
              defaultValue={profile?.dateOfBirth?.slice(0, 16) ?? ""}
            />
            <Field
              label="Blood type"
              name="bloodType"
              defaultValue={profile?.bloodType ?? ""}
              maxLength={8}
            />
            <Field
              label="National ID number"
              name="nationalIdNumber"
              defaultValue={profile?.nationalIdNumber ?? ""}
              maxLength={64}
              hint="ID card / NIC / DNI / CC — label adapts to country in the patient UI."
            />
            <Field
              label="Tax ID (NIF / PPS / CPF)"
              name="taxIdNumber"
              defaultValue={profile?.taxIdNumber ?? ""}
              maxLength={64}
            />
            <Field
              label="Passport number"
              name="passportNumber"
              defaultValue={profile?.passportNumber ?? ""}
              maxLength={64}
            />
          </div>
        </section>

        <section className="gh-admin-patient-profile-section">
          <h4 style={sectionTitleStyle}>Address</h4>
          <div className="gh-admin-support-field-grid grid gap-3 sm:grid-cols-2">
            <Field
              label="Line 1"
              name="addressLine1"
              defaultValue={profile?.addressLine1 ?? ""}
              maxLength={200}
              fullSpan
            />
            <Field
              label="Line 2"
              name="addressLine2"
              defaultValue={profile?.addressLine2 ?? ""}
              maxLength={200}
              fullSpan
            />
            <Field
              label="City"
              name="addressCity"
              defaultValue={profile?.addressCity ?? ""}
              maxLength={120}
            />
            <Field
              label="Postal code"
              name="addressPostalCode"
              defaultValue={profile?.addressPostalCode ?? ""}
              maxLength={32}
            />
            <Field
              label="Country code (ISO)"
              name="addressCountryCode"
              defaultValue={profile?.addressCountryCode ?? ""}
              maxLength={8}
            />
          </div>
        </section>

        <section className="gh-admin-patient-profile-section">
          <h4 style={sectionTitleStyle}>Plan &amp; pharmacy</h4>
          <div className="gh-admin-support-field-grid grid gap-3 sm:grid-cols-2">
            <Field
              label="Preferred pharmacy"
              name="preferredPharmacy"
              defaultValue={profile?.preferredPharmacy ?? ""}
              maxLength={200}
              fullSpan
            />
          </div>
          {profile?.pricingPlanId ? (
            <p className="mt-2 text-[12px] text-[var(--color-text-muted)]">
              Plan: {profile.pricingPlanId} · change from the patient UI.
            </p>
          ) : null}
        </section>

        <section className="gh-admin-patient-profile-section">
          <h4 style={sectionTitleStyle}>Clinical alerts</h4>
          <p className="mb-2 text-[12px] text-[var(--color-text-muted)]">
            Visible to the doctor only (red / yellow banners on the chart).
            Patient never sees these.
          </p>
          <div className="grid gap-3">
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Status alert (red)</span>
              <textarea
                name="statusAlert"
                maxLength={500}
                rows={2}
                defaultValue={profile?.statusAlert ?? ""}
                className="gh-input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Clinic alert (yellow)</span>
              <textarea
                name="clinicAlert"
                maxLength={500}
                rows={2}
                defaultValue={profile?.clinicAlert ?? ""}
                className="gh-input"
              />
            </label>
          </div>
        </section>

        <section className="gh-admin-patient-profile-section">
          <h4 style={sectionTitleStyle}>Vitals</h4>
          <div className="gh-admin-support-field-grid gh-admin-support-field-grid--three grid gap-3 sm:grid-cols-3">
            <Field
              label="Weight (kg)"
              name="weightKg"
              type="number"
              step="0.1"
              defaultValue={
                profile?.weightKg != null ? String(profile.weightKg) : ""
              }
            />
            <Field
              label="Height (m)"
              name="heightM"
              type="number"
              step="0.01"
              defaultValue={
                profile?.heightM != null ? String(profile.heightM) : ""
              }
            />
            <Field
              label="BMI"
              name="bmi"
              type="number"
              step="0.1"
              defaultValue={profile?.bmi != null ? String(profile.bmi) : ""}
            />
          </div>
        </section>

        <div>
          <button type="submit" className="gh-btn gh-btn-primary">
            Save patient profile
          </button>
        </div>
      </form>
    </AdminCard>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  maxLength,
  step,
  hint,
  fullSpan = false,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  maxLength?: number;
  step?: string;
  hint?: string;
  fullSpan?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1${fullSpan ? " sm:col-span-2" : ""}`}>
      <span className="gh-field-label">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        maxLength={maxLength}
        step={step}
        className="gh-input"
      />
      {hint ? (
        <span className="text-[11px] text-[var(--color-text-muted)]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

const cardTitleStyle = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontSize: 16,
  fontWeight: 800,
  color: "var(--color-text-primary)",
} as const;

const sectionTitleStyle = {
  margin: "0 0 12px",
  fontFamily: "var(--font-display)",
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.04em",
  textTransform: "uppercase" as const,
  color: "var(--color-text-muted)",
};
