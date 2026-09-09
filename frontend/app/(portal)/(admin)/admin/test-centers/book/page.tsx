import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import { fetchAdminCountries } from "@/lib/admin/admin-api";
import {
  fetchAdminTestCenterLocations,
  fetchAdminTestCenters,
  type AdminTestCenterLocationDto,
} from "@/lib/admin/admin-api/test-centers";
import { COUNTRY_PREF_COOKIE } from "../../_components/country-picker-constants";
import { AdminCard, PageHeader, Pill } from "../../_components/atoms";

export const dynamic = "force-dynamic";

/**
 * "Book a test for a patient" — the entry point from the Test centers page.
 *
 * Booking always happens on a branch's calendar, because a booking needs a real
 * open slot to claim; there is nothing sensible to book against without one.
 * What was missing was the way IN: an admin had to already know that clicking a
 * green square on a location's calendar is what books. This page is that route
 * — every bookable branch in the market, one click from its calendar.
 */
export default async function AdminBookTestPage() {
  const result = await fetchAdminCountries();
  const countries = result.ok ? result.data.countries : [];
  const jar = await cookies();
  const preferred = jar.get(COUNTRY_PREF_COOKIE)?.value;
  const active = countries.find((co) => co.slug === preferred) ?? countries[0] ?? null;

  if (!active) {
    return (
      <>
        <PageHeader eyebrow="Country" title="Book a test" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Select a country in the top bar to book a test.
          </p>
        </AdminCard>
      </>
    );
  }

  const centresResult = await fetchAdminTestCenters(active.id);
  const centres = centresResult.ok ? (centresResult.data?.testCenters ?? []) : [];

  // One read per centre. The centre list for a single market is short (a
  // handful of providers), so this stays cheap and keeps the page a plain
  // server render with no client fetching.
  const withLocations = await Promise.all(
    centres.map(async (centre) => {
      const locationsResult = await fetchAdminTestCenterLocations(centre.id);
      const locations: AdminTestCenterLocationDto[] = locationsResult.ok
        ? (locationsResult.data?.locations ?? [])
        : [];
      return { centre, locations };
    }),
  );

  // A paused centre or branch generates no slots, so it cannot be booked —
  // listing it here would send the admin to an empty calendar.
  const bookable = withLocations
    .filter(({ centre }) => centre.isActive)
    .map(({ centre, locations }) => ({
      centre,
      locations: locations.filter((l) => l.isActive),
    }))
    .filter(({ locations }) => locations.length > 0);

  return (
    <>
      <Link
        href="/admin/test-centers"
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to test centres
      </Link>
      <PageHeader
        eyebrow={active.name}
        title="Book a test for a patient"
        description="Pick the branch the patient will attend, then click a green time on its calendar. The dialog asks for the patient, which test, and an optional discount — the patient gets a payment link, then a confirmation carrying that branch's address."
      />

      {bookable.length === 0 ? (
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            No bookable branches in {active.name} yet. A branch is bookable once
            its centre is active, the branch itself is active, and it has opening
            hours. Add one under{" "}
            <Link href="/admin/test-centers" className="underline">
              Test centres
            </Link>
            .
          </p>
        </AdminCard>
      ) : (
        <div className="grid gap-4">
          {bookable.map(({ centre, locations }) => (
            <AdminCard key={centre.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2
                  className="m-0 text-[var(--color-text-primary)]"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 16,
                    fontWeight: 800,
                  }}
                >
                  {centre.name}
                </h2>
                <Link
                  href={`/admin/test-centers?center=${centre.id}`}
                  className="gh-btn gh-btn-ghost text-[12px]"
                >
                  Manage exams &amp; prices
                </Link>
              </div>

              <ul className="mt-3 grid list-none gap-2 p-0">
                {locations.map((loc) => (
                  <li key={loc.id}>
                    <Link
                      href={`/admin/test-centers/${centre.id}/locations/${loc.id}/availability`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] px-4 py-3 hover:border-[var(--color-brand-primary)]"
                    >
                      <span>
                        <span className="block font-semibold text-[var(--color-text-primary)]">
                          {loc.name}
                        </span>
                        <span className="flex items-start gap-1.5 text-portal-meta text-[var(--color-text-muted)]">
                          <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                          {[loc.addressLine, loc.city].filter(Boolean).join(", ") ||
                            "No address set"}
                        </span>
                      </span>
                      <span className="gh-btn gh-btn-soft pointer-events-none text-[12px]">
                        <CalendarDays className="size-3.5" aria-hidden /> Open calendar
                        &amp; book
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </AdminCard>
          ))}
        </div>
      )}

      {/* Paused centres and branches are hidden above rather than shown as dead
          rows — say so, so their absence reads as deliberate. */}
      {withLocations.length > bookable.length ? (
        <p className="mt-3 text-portal-meta text-[var(--color-text-muted)]">
          <Pill tone="inactive">Hidden</Pill> Paused centres and paused branches
          are not listed — they generate no bookable times.
        </p>
      ) : null}
    </>
  );
}
