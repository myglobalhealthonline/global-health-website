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
    const int = (key: string) => {
      const raw = formData.get(key);
      if (raw === null || String(raw).trim() === "") return null;
      const n = Number(raw);
      return Number.isInteger(n) ? n : null;
    };
    // Clinical list fields are one-entry-per-line textareas. The API types
    // them as `string[]` and does NOT accept null, so an emptied box has to
    // send `[]` (clear the list) rather than null.
    //
    // The backend caps each list at 50 entries of 200 chars and answers a
    // generic "Invalid profile" when either is exceeded. Since a failed save
    // redirects (losing everything typed), name the offending line here so
    // the admin can fix it in one pass instead of guessing.
    const listErrors: string[] = [];
    const list = (key: string, label: string) => {
      const raw = formData.get(key);
      if (raw === null) return undefined;
      const entries = String(raw)
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");
      if (entries.length > 50) {
        listErrors.push(`${label}: ${entries.length} entries — the limit is 50`);
      }
      const overlong = entries.findIndex((entry) => entry.length > 200);
      if (overlong !== -1) {
        listErrors.push(`${label}: line ${overlong + 1} is over 200 characters`);
      }
      return entries;
    };

    const body = {
      fullName: text("fullName"),
      phone: text("phone"),
      dateOfBirth: text("dateOfBirth"),
      weightKg: num("weightKg"),
      heightM: num("heightM"),
      bmi: num("bmi"),
      bloodType: text("bloodType"),
      bloodPressureSystolic: int("bloodPressureSystolic"),
      bloodPressureDiastolic: int("bloodPressureDiastolic"),
      allergies: list("allergies", "Allergies"),
      chronicDiseases: list("chronicDiseases", "Chronic diseases"),
      familyHistory: list("familyHistory", "Family history"),
      socialHabits: list("socialHabits", "Social habits"),
      surgeries: list("surgeries", "Surgeries"),
      usualMedication: list("usualMedication", "Usual medication"),
      nationalIdNumber: text("nationalIdNumber"),
      taxIdNumber: text("taxIdNumber"),
      passportNumber: text("passportNumber"),
      utenteNumber: text("utenteNumber"),
      addressLine1: text("addressLine1"),
      addressLine2: text("addressLine2"),
      addressCity: text("addressCity"),
      addressState: text("addressState"),
      addressPostalCode: text("addressPostalCode"),
      addressCountryCode: text("addressCountryCode"),
      preferredPharmacy: text("preferredPharmacy"),
      statusAlert: text("statusAlert"),
      clinicAlert: text("clinicAlert"),
      insuranceProviderName: text("insuranceProviderName"),
      insurancePolicyNumber: text("insurancePolicyNumber"),
    };

    if (listErrors.length > 0) {
      redirect(
        `/admin/users/${userId}?error=${encodeURIComponent(listErrors.join(" · "))}`,
      );
    }

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
      <p className="mb-4 mt-1 text-portal-compact text-[var(--color-text-muted)]">
        Persistent chart keyed by email. Identity + address + clinical
        alerts visible to the assigned doctor on the patient chart.
      </p>

      <form action={saveProfile} className="gh-admin-patient-profile-form grid gap-6">
        {profile?.statusAlert ? (
          <p
            className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-portal-compact font-semibold text-red-800"
            role="status"
          >
            ⚠ Status alert preview: {profile.statusAlert}
          </p>
        ) : null}
        {profile?.clinicAlert ? (
          <p
            className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-portal-compact text-amber-900"
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
            <Field
              label="Número de Utente"
              name="utenteNumber"
              defaultValue={profile?.utenteNumber ?? ""}
              maxLength={64}
              hint="Portuguese SNS healthcare number."
            />
          </div>
        </section>

        <section className="gh-admin-patient-profile-section">
          <h4 style={sectionTitleStyle}>Insurance</h4>
          <div className="gh-admin-support-field-grid grid gap-3 sm:grid-cols-2">
            <Field
              label="Insurance provider"
              name="insuranceProviderName"
              defaultValue={profile?.insuranceProviderName ?? ""}
              maxLength={200}
            />
            <Field
              label="Policy / card number"
              name="insurancePolicyNumber"
              defaultValue={profile?.insurancePolicyNumber ?? ""}
              maxLength={200}
            />
          </div>
          {profile?.insuranceDocumentStatus ? (
            <p className="mt-2 text-portal-meta text-[var(--color-text-muted)]">
              Card verification status: {profile.insuranceDocumentStatus}
            </p>
          ) : null}
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
            {/* Free text rather than the BR UF picker: this editor is
              * market-agnostic, and a patient's address country need not
              * match the country they book in. */}
            <Field
              label="State / province"
              name="addressState"
              defaultValue={profile?.addressState ?? ""}
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
            <p className="mt-2 text-portal-meta text-[var(--color-text-muted)]">
              Plan: {profile.pricingPlanId} · change from the patient UI.
            </p>
          ) : null}
        </section>

        <section className="gh-admin-patient-profile-section">
          <h4 style={sectionTitleStyle}>Clinical alerts</h4>
          <p className="mb-2 text-portal-meta text-[var(--color-text-muted)]">
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
            <Field
              label="Blood pressure — systolic (mmHg)"
              name="bloodPressureSystolic"
              type="number"
              step="1"
              defaultValue={
                profile?.bloodPressureSystolic != null
                  ? String(profile.bloodPressureSystolic)
                  : ""
              }
            />
            <Field
              label="Blood pressure — diastolic (mmHg)"
              name="bloodPressureDiastolic"
              type="number"
              step="1"
              defaultValue={
                profile?.bloodPressureDiastolic != null
                  ? String(profile.bloodPressureDiastolic)
                  : ""
              }
            />
          </div>
        </section>

        <section className="gh-admin-patient-profile-section">
          <h4 style={sectionTitleStyle}>Clinical history</h4>
          <p className="mb-2 text-portal-meta text-[var(--color-text-muted)]">
            One entry per line. These feed the doctor&apos;s patient chart —
            clearing a box deletes every entry in it. Max 50 entries per list,
            200 characters each.
          </p>
          <div className="grid gap-3">
            <ListField
              label="Allergies"
              name="allergies"
              values={profile?.allergies}
              placeholder={"Penicillin\nPeanuts"}
            />
            <ListField
              label="Chronic diseases"
              name="chronicDiseases"
              values={profile?.chronicDiseases}
              placeholder={"Type 2 diabetes\nHypertension"}
            />
            <ListField
              label="Usual medication"
              name="usualMedication"
              values={profile?.usualMedication}
              placeholder={"Metformin 850mg 2x/day"}
            />
            <ListField
              label="Surgeries"
              name="surgeries"
              values={profile?.surgeries}
              placeholder={"Appendectomy (2011)"}
            />
            <ListField
              label="Family history"
              name="familyHistory"
              values={profile?.familyHistory}
              placeholder={"Father — myocardial infarction at 58"}
            />
            <ListField
              label="Social habits"
              name="socialHabits"
              values={profile?.socialHabits}
              placeholder={"Non-smoker\nAlcohol: occasional"}
            />
          </div>
        </section>

        <div className="flex justify-end">
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
        <span className="text-portal-thead text-[var(--color-text-muted)]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

/**
 * Textarea bound to a `string[]` column, one entry per line. Rows grow with
 * the existing content so a long medication list isn't hidden behind a
 * two-line scroller.
 */
function ListField({
  label,
  name,
  values,
  placeholder,
}: {
  label: string;
  name: string;
  values: string[] | undefined;
  placeholder?: string;
}) {
  const text = (values ?? []).join("\n");
  return (
    <label className="flex flex-col gap-1">
      <span className="gh-field-label">{label}</span>
      <textarea
        name={name}
        rows={Math.min(Math.max((values ?? []).length + 1, 3), 10)}
        defaultValue={text}
        placeholder={placeholder}
        className="gh-input"
      />
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
