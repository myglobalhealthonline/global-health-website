import Link from "next/link";
import { cookies } from "next/headers";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { redirect } from "next/navigation";

/** Short-lived httpOnly cookie that carries the manual-booking recovery
 *  details (temp password, invite + payment links) to the detail page,
 *  so these secrets never appear in the URL / server logs / history. */
export const MANUAL_BOOKING_COOKIE = "gh_manual_booking";
import { ArrowLeft } from "lucide-react";
import {
  fetchAdminClinicsByCountryCode,
  fetchAdminCountries,
  fetchAdminDoctors,
  fetchAdminServices,
  postAdminManualBooking,
} from "@/lib/admin/admin-api";
import { AdminCard, Btn, PageHeader } from "../../_components/atoms";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ countryCode?: string; error?: string }>;
};

export default async function AdminCreateManualAppointmentPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const createError = sp.error;
  const countryCode = sp.countryCode?.trim().toLowerCase();

  const countriesResult = await fetchAdminCountries();
  if (!countriesResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Operations"
          title="New manual booking"
          actions={
            <Btn href="/admin/appointments" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
              Cancel
            </Btn>
          }
        />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load countries: {countriesResult.message}
          </p>
        </AdminCard>
      </>
    );
  }
  const countries = countriesResult.data.countries
    .filter((c) => c.isActive)
    .map((c) => ({ id: c.id, code: c.code, name: c.name }));

  if (!countryCode) {
    return (
      <>
        <Link
          href="/admin/appointments"
          className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="size-3.5" /> Back to queue
        </Link>
        <PageHeader
          eyebrow="Operations"
          title="New manual booking"
          description="Walk-in / phone-in booking. Choose a country first — services + doctors + clinics are scoped to that country."
        />
        <AdminCard>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Country</span>
              <select
                name="countryCode"
                className="gh-select min-w-[240px]"
                required
                defaultValue=""
              >
                <option value="">Select…</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.name} ({c.code.toUpperCase()})
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="gh-btn gh-btn-primary">
              Continue
            </button>
          </form>
        </AdminCard>
      </>
    );
  }

  // Load country-scoped picklists.
  const [servicesResult, doctorsResult, clinicsResult] = await Promise.all([
    fetchAdminServices({ countryCode, pageSize: "100" }),
    fetchAdminDoctors({ countryCode, pageSize: "100" }),
    fetchAdminClinicsByCountryCode(countryCode),
  ]);
  if (!servicesResult.ok || !doctorsResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Operations"
          title="New manual booking"
          actions={
            <Btn href="/admin/appointments/new" variant="ghost">
              Change country
            </Btn>
          }
        />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load picklists. Try again, or pick a different country.
          </p>
        </AdminCard>
      </>
    );
  }

  const services = servicesResult.data.items
    .filter((s) => s.isActive)
    .map((s) => ({
      id: s.id,
      name: s.name,
      basePriceCents: s.basePriceCents,
      currencyCode: s.currencyCode,
    }));
  const doctors = doctorsResult.data.items
    .filter((d) => d.active)
    .map((d) => ({
      id: d.id,
      fullName: d.fullName,
      title: d.title,
      serviceIds: d.assignedServices.map((a) => a.serviceId),
    }));
  const clinics =
    clinicsResult.ok && Array.isArray(clinicsResult.data.clinics)
      ? clinicsResult.data.clinics.map((c) => ({
          id: c.id,
          name: c.name,
          city: c.city ?? null,
        }))
      : [];
  const countryName =
    countries.find((c) => c.code === countryCode)?.name ?? countryCode.toUpperCase();

  /**
   * Server action. Posts to the new backend route, then redirects to
   * the appointment detail page with the temp password + set-password
   * URL stashed in the query string so the admin sees the recovery
   * banner (in case the patient says the email never arrived).
   */
  async function createManualAppointmentAction(formData: FormData) {
    "use server";
    await requireAdminAction();

    const readStr = (key: string): string => (formData.get(key)?.toString() ?? "").trim();
    const readOpt = (key: string): string | null => {
      const v = (formData.get(key)?.toString() ?? "").trim();
      return v === "" ? null : v;
    };

    const consultationMode = (readStr("consultationMode") as "ONLINE" | "IN_PERSON") || "ONLINE";

    const result = await postAdminManualBooking({
      patient: {
        email: readStr("email"),
        fullName: readStr("fullName"),
        phone: readOpt("phone"),
        dateOfBirth: readOpt("dateOfBirth"),
        nationalIdNumber: readOpt("nationalIdNumber"),
        taxIdNumber: readOpt("taxIdNumber"),
        passportNumber: readOpt("passportNumber"),
        addressLine1: readOpt("addressLine1"),
        addressCity: readOpt("addressCity"),
        addressCountryCode: readOpt("addressCountryCode"),
      },
      serviceId: readStr("serviceId"),
      doctorId: readOpt("doctorId"),
      // <input type="datetime-local"> yields a naive "YYYY-MM-DDTHH:mm"
      // (no timezone). Send it as-is: the backend interprets it in the
      // country's clinic timezone (DST-aware) and stores UTC. Do NOT
      // append :00Z here — that would wrongly pin the wall-clock to UTC.
      scheduledAt: readOpt("scheduledAt"),
      consultationMode,
      clinicId: consultationMode === "IN_PERSON" ? readOpt("clinicId") : null,
      locationAddress: consultationMode === "IN_PERSON" ? readOpt("locationAddress") : null,
      notes: readOpt("notes"),
      countryCode: readStr("countryCode"),
    });

    if (!result.ok) {
      redirect(
        `/admin/appointments/new?countryCode=${encodeURIComponent(countryCode ?? "")}&error=${encodeURIComponent(result.message)}`,
      );
    }

    const data = result.data;
    // Carry the recovery secrets in a short-lived httpOnly cookie instead of
    // the redirect URL — a temp password in the query string ends up in
    // browser history, the Referer header, and server access logs.
    const jar = await cookies();
    jar.set(
      MANUAL_BOOKING_COOKIE,
      JSON.stringify({
        tempPassword: data.tempPassword ?? "",
        setPasswordUrl: data.setPasswordUrl,
        paymentUrl: data.paymentUrl ?? "",
        emailQueued: data.emailQueued ? "1" : "0",
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/admin/appointments",
        maxAge: 120,
      },
    );
    redirect(`/admin/appointments/${data.appointmentId}?manualBooked=1`);
  }

  return (
    <>
      <Link
        href="/admin/appointments"
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to queue
      </Link>
      <PageHeader
        eyebrow="Operations"
        title="New manual booking"
        description="Fill in the patient's details — we create their portal account, email them a Stripe payment link AND a set-password / temp-password combo."
        actions={
          <Btn href="/admin/appointments/new" variant="ghost">
            Change country
          </Btn>
        }
      />

      {createError ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {createError}
        </p>
      ) : null}

      <form action={createManualAppointmentAction} className="flex flex-col gap-6">
        <input type="hidden" name="countryCode" value={countryCode} />

        <AdminCard>
          <h2 className="text-[15px] font-bold text-[var(--color-text-primary)]">Patient</h2>
          <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
            Existing accounts with this email are reused; otherwise a new patient User is created with a unique
            temporary password.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Full name" name="fullName" required maxLength={120} />
            <Field label="Email" name="email" type="email" required maxLength={254} />
            <Field label="Phone" name="phone" type="tel" maxLength={40} />
            <Field label="Date of birth" name="dateOfBirth" type="date" />
            <Field label="National ID number" name="nationalIdNumber" maxLength={64} />
            <Field label="Tax ID (NIF / PPS / CPF)" name="taxIdNumber" maxLength={64} />
            <Field label="Passport number" name="passportNumber" maxLength={64} />
            <Field label="Address line 1" name="addressLine1" maxLength={200} />
            <Field label="City" name="addressCity" maxLength={100} />
            <Field label="Address country code" name="addressCountryCode" maxLength={8} placeholder="ie / pt / es…" />
          </div>
        </AdminCard>

        <AdminCard>
          <h2 className="text-[15px] font-bold text-[var(--color-text-primary)]">Appointment</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Service *</span>
              <select id="gh-service-select" name="serviceId" className="gh-select" required defaultValue="">
                <option value="" disabled>
                  Select…
                </option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.basePriceCents != null && s.currencyCode
                      ? ` — ${(s.basePriceCents / 100).toFixed(2)} ${s.currencyCode}`
                      : ""}
                  </option>
                ))}
              </select>
              {services.length === 0 ? (
                <span className="text-[12px] text-[var(--color-text-muted)]">
                  No active services for this country.
                </span>
              ) : null}
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Doctor</span>
              <select id="gh-doctor-select" name="doctorId" className="gh-select" defaultValue="">
                <option value="">— Unassigned —</option>
                {doctors.map((d) => (
                  <option
                    key={d.id}
                    value={d.id}
                    data-service-ids={d.serviceIds.join(",")}
                  >
                    {(d.title ? `${d.title} ` : "") + d.fullName}
                  </option>
                ))}
              </select>
              <span className="text-[12px] text-[var(--color-text-muted)]">
                Filtered to doctors assigned to the selected service. Others rejected on save.
              </span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Scheduled at</span>
              <input type="datetime-local" name="scheduledAt" className="gh-input" />
              <span className="text-[12px] text-[var(--color-text-muted)]">
                Entered in {countryName} clinic local time (DST-aware). Stored as UTC.
              </span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Consultation mode *</span>
              <select name="consultationMode" className="gh-select" required defaultValue="ONLINE">
                <option value="ONLINE">Online (telemedicine)</option>
                <option value="IN_PERSON">In-person</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Clinic (in-person)</span>
              <select name="clinicId" className="gh-select" defaultValue="">
                <option value="">— None —</option>
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.city ? `, ${c.city}` : ""}
                  </option>
                ))}
              </select>
              <span className="text-[12px] text-[var(--color-text-muted)]">
                Or use the free-text address below. Provide one or the other for IN_PERSON, not both.
              </span>
            </label>
            <Field
              label="Location address (in-person, free text)"
              name="locationAddress"
              maxLength={500}
            />
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="gh-field-label">Notes</span>
              <textarea name="notes" className="gh-input" rows={3} maxLength={2000} />
            </label>
          </div>
          <p className="mt-2 text-[12px] text-[var(--color-text-muted)]">
            The patient&apos;s email will include a Stripe payment link AND a set-password invite — they can either set
            their own password (recommended) or sign in immediately with a unique temporary password.
          </p>
        </AdminCard>

        {/* Live doctor filter: hide options whose serviceIds don't include
            the selected service. Runs after hydration with no React state. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  var svc=document.getElementById('gh-service-select');
  var doc=document.getElementById('gh-doctor-select');
  if(!svc||!doc)return;
  function filter(){
    var id=svc.value;
    var opts=doc.querySelectorAll('option[data-service-ids]');
    opts.forEach(function(o){
      var ids=o.getAttribute('data-service-ids');
      o.hidden=id!==''&&ids!==''&&(','+ids+',').indexOf(','+id+',')===-1;
    });
    if(doc.options[doc.selectedIndex]&&doc.options[doc.selectedIndex].hidden)doc.value='';
  }
  svc.addEventListener('change',filter);
})();`,
          }}
        />

        <div className="flex flex-wrap gap-3 border-t border-[var(--color-border)] pt-6">
          <button type="submit" className="gh-btn gh-btn-primary">
            Create booking &amp; email patient
          </button>
          <Link
            href="/admin/appointments"
            className="text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  maxLength,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="gh-field-label">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        name={name}
        className="gh-input"
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
      />
    </label>
  );
}
