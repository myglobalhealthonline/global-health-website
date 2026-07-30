import Link from "next/link";
import { ArrowLeft, CalendarPlus, Lock, PackageX } from "lucide-react";
import { fetchDoctorBookingOptions } from "@/lib/api/doctor-api";
import { AdminEmptyState, PageHeader } from "@/components/portal-atoms";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { DoctorManualBookingForm } from "../_components/doctor-manual-booking-form";

export const dynamic = "force-dynamic";

/**
 * Doctor-side walk-in / phone-in booking.
 *
 * Two independent gates decide what renders here, and the backend enforces
 * both again on POST:
 *   1. `canCreateManualAppointments` — the per-doctor flag an admin grants.
 *   2. at least one actively-assigned service — without one there is nothing
 *      to bill, so there is nothing to book.
 */
export default async function DoctorNewBookingPage() {
  const locale = await getPortalLocale();
  const { doctor: d } = loadLocaleBundle(locale);
  const m = d.manualBooking;

  const result = await fetchDoctorBookingOptions();

  const header = (
    <>
      <Link
        href="/doctor/appointments"
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--portal-muted)] hover:text-[var(--portal-text)]"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> {m.backToQueue}
      </Link>
      <PageHeader
        eyebrow={m.eyebrow}
        title={m.title}
        description={m.description}
        icon={<CalendarPlus aria-hidden />}
      />
    </>
  );

  if (!result.ok) {
    return (
      <>
        {header}
        <div className="gh-card p-6">
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {result.message}
          </p>
        </div>
      </>
    );
  }

  if (!result.data.canCreateManualAppointments) {
    return (
      <>
        {header}
        <AdminEmptyState
          className="gh-doctor-empty-state"
          icon={<Lock className="size-5" aria-hidden />}
          title={m.notPermittedTitle}
          description={m.notPermittedDesc}
          action={
            <Link href="/doctor/appointments" className="gh-btn gh-btn-soft text-sm">
              {m.backToQueue}
            </Link>
          }
        />
      </>
    );
  }

  if (result.data.services.length === 0) {
    return (
      <>
        {header}
        <AdminEmptyState
          className="gh-doctor-empty-state"
          icon={<PackageX className="size-5" aria-hidden />}
          title={m.noServicesTitle}
          description={m.noServicesDesc}
          action={
            <Link href="/doctor/services" className="gh-btn gh-btn-soft text-sm">
              {m.noServicesAction}
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      {header}
      <DoctorManualBookingForm
        services={result.data.services}
        clinics={result.data.clinics}
        copy={m}
      />
    </>
  );
}
