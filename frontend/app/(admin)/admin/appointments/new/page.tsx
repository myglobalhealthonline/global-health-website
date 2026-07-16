import Link from "next/link";
import { cookies } from "next/headers";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { redirect } from "next/navigation";
import { MANUAL_BOOKING_COOKIE } from "@/lib/admin/manual-booking-cookie";
import { ArrowLeft, Globe2 } from "lucide-react";
import {
  fetchAdminClinicsByCountryCode,
  fetchAdminCountries,
  fetchAdminDoctors,
  fetchAdminServices,
  postAdminManualBooking,
} from "@/lib/admin/admin-api";
import { AdminCard, Btn, PageHeader } from "../../_components/atoms";
import { ManualBookingForm } from "../_components/manual-booking-form";
import { dialCodeForCountry } from "@/lib/phone/dial-codes";
import {
  hasErrors,
  validateManualBooking,
} from "@/lib/admin/manual-booking-validation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    countryCode?: string;
    error?: string;
    doctorId?: string;
    slotId?: string;
  }>;
};

export default async function AdminCreateManualAppointmentPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const createError = sp.error;
  const countryCode = sp.countryCode?.trim().toLowerCase();
  // Optional prefill from the admin calendar's "Book" action on an open slot.
  const initialDoctorId = sp.doctorId?.trim() || undefined;
  const initialSlotId = sp.slotId?.trim() || undefined;

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
          className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="size-3.5" /> Back to queue
        </Link>
        <PageHeader
          eyebrow="Operations"
          title="New manual booking"
          description="Walk-in / phone-in booking. Choose a country first — services + doctors + clinics are scoped to that country."
        />
        <AdminCard className="gh-admin-appointment-country-card">
          <div className="gh-admin-country-choice">
            <div className="gh-admin-country-choice__intro">
              <span className="gh-icon-tile gh-icon-tile-lg">
                <Globe2 className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="m-0 text-[17px] font-bold text-[var(--color-text-primary)]">
                  Start with country scope
                </h2>
                <p className="m-0 mt-1 text-portal-compact leading-relaxed text-[var(--color-text-muted)]">
                  Services, doctors, clinics, phone defaults, and payment currency are loaded from the selected market.
                </p>
              </div>
            </div>
            <form method="get" className="gh-admin-appointment-country-form">
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="gh-field-label">Country</span>
                <select
                  name="countryCode"
                  className="gh-select min-w-0"
                  required
                  defaultValue=""
                >
                  <option value="">Select...</option>
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
          </div>
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
      slug: s.slug,
      name: s.name,
      basePriceCents: s.basePriceCents,
      currencyCode: s.currencyCode,
      insuranceOptions: s.insuranceOptions ?? [],
    }));
  const doctors = doctorsResult.data.items
    .filter((d) => d.active)
    .map((d) => ({
      id: d.id,
      slug: d.slug,
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
    const serviceId = readStr("serviceId");
    const doctorId = readStr("doctorId");
    const timeSlotId = readStr("timeSlotId");
    const phone = readStr("phone");
    const clinicId = consultationMode === "IN_PERSON" ? readOpt("clinicId") : null;
    const locationAddress =
      consultationMode === "IN_PERSON" ? readOpt("locationAddress") : null;

    // Hard guard — re-validate server-side even though the client already
    // gated. A disabled/bypassed client must NOT be able to create a patient
    // account, a payment link, or fire any email/WhatsApp. Bail BEFORE the
    // backend call when anything required is missing or malformed.
    const validation = validateManualBooking({
      fullName: readStr("fullName"),
      email: readStr("email"),
      phone,
      serviceId,
      doctorId,
      timeSlotId,
      consultationMode,
      clinicId: clinicId ?? "",
      locationAddress: locationAddress ?? "",
    });
    if (hasErrors(validation)) {
      const message = Object.values(validation)[0] ?? "Please complete all required fields.";
      redirect(
        `/admin/appointments/new?countryCode=${encodeURIComponent(countryCode ?? "")}&error=${encodeURIComponent(message)}`,
      );
    }

    const result = await postAdminManualBooking({
      patient: {
        email: readStr("email"),
        fullName: readStr("fullName"),
        phone,
        dateOfBirth: readOpt("dateOfBirth"),
        nationalIdNumber: readOpt("nationalIdNumber"),
        taxIdNumber: readOpt("taxIdNumber"),
        passportNumber: readOpt("passportNumber"),
        addressLine1: readOpt("addressLine1"),
        addressCity: readOpt("addressCity"),
        addressCountryCode: readOpt("addressCountryCode"),
      },
      serviceId,
      doctorId,
      // The appointment time is the picked slot's instant — the backend
      // claims this OPEN slot and derives scheduledAt from it.
      timeSlotId,
      consultationMode,
      clinicId,
      locationAddress,
      notes: readOpt("notes"),
      countryCode: readStr("countryCode"),
      // Insurance: the backend re-derives the price and enforces that the
      // doctor is in the insurer's network — never trusted from the form.
      insuranceCompanyId: readOpt("insuranceCompanyId"),
      insurancePolicyNumber: readOpt("insurancePolicyNumber"),
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
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to queue
      </Link>
      <PageHeader
        eyebrow="Operations"
        title="New manual booking"
        description="Fill in the patient's details — we create their portal account, send the branded reservation email (payment + portal access), and show recovery links for the admin."
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

      <ManualBookingForm
        initialDoctorId={initialDoctorId}
        initialSlotId={initialSlotId}
        countryCode={countryCode}
        countryName={countryName}
        services={services}
        doctors={doctors}
        clinics={clinics}
        defaultDialCode={dialCodeForCountry(countryCode)}
        action={createManualAppointmentAction}
      />
    </>
  );
}
