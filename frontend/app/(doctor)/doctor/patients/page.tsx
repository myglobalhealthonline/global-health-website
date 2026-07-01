import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { fetchDoctorPatients } from "@/lib/api/doctor-api";
import {
  AdminSummaryStrip,
  PageHeader,
  Pill,
} from "@/components/portal-atoms";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function pick(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

export default async function DoctorPatientsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = searchParams ? await searchParams : {};
  const q = pick(sp, "q")?.toLowerCase();
  const result = await fetchDoctorPatients();

  // Filter client-side (deduped patient list is bounded already — the
  // /api/doctor/patients endpoint caps source rows at 500). A
  // server-side search adds plumbing without buying much UX win until
  // a doctor breaches the cap.
  // Search now matches name only — phone was stripped from the DTO per
  // GDPR plan, and email is intentionally hidden from doctor view so
  // searching it would be a back-door reveal of which patient owns
  // which address. Doctor's typical lookup is by name + country anyway.
  const items = !result.ok
    ? []
    : q
      ? result.data.items.filter((p) => p.fullName.toLowerCase().includes(q))
      : result.data.items;
  const totalPatients = result.ok ? result.data.items.length : 0;
  const totalBookings = result.ok
    ? result.data.items.reduce((sum, patient) => sum + patient.appointmentCount, 0)
    : 0;
  const countries = result.ok
    ? new Set(result.data.items.map((patient) => patient.countryCode)).size
    : 0;

  return (
    <>
      <PageHeader
        eyebrow="Patient records"
        title="My patients"
        description="Distinct patients who have booked with you. Contact details stay protected; use appointment workspaces for clinical chat and document review."
      />

      {result.ok ? (
        <AdminSummaryStrip
          className="mb-4"
          items={[
            {
              label: "Patients",
              value: totalPatients,
              hint: q ? `${items.length} matching search` : "Visible in your panel",
              tone: "brand",
            },
            {
              label: "Bookings",
              value: totalBookings,
              hint: "Across patient history",
              tone: "neutral",
            },
            {
              label: "Markets",
              value: countries,
              hint: "Countries represented",
              tone: "success",
            },
          ]}
        />
      ) : null}

      <div className="gh-card gh-doctor-filter-card mb-4 p-4">
        <form className="gh-doctor-filter-actions flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 sm:min-w-[260px]">
            <span className="gh-field-label">Search</span>
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Patient name"
              className="gh-input"
            />
          </label>
          <button type="submit" className="gh-btn gh-btn-primary text-sm">
            Apply
          </button>
          {q ? (
            <Link href="/doctor/patients" className="gh-btn gh-btn-soft text-sm">
              Reset
            </Link>
          ) : null}
        </form>
      </div>

      {!result.ok ? (
        <div className="gh-card p-6">
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {result.message}
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="gh-card gh-doctor-empty-state p-10 text-center text-sm text-[var(--color-text-muted)]">
          {q
            ? "No patients match that search."
            : "No patients yet — your scheduled appointments will surface here."}
        </div>
      ) : (
        <div className="gh-card gh-doctor-table-card p-0 overflow-hidden">
          <div className="hidden md:block gh-doctor-table-wrap overflow-x-auto">
          <table className="w-full text-sm">
            {/* Email + phone columns intentionally removed (GDPR/privacy).
                Doctors contact patients only through the in-app chat thread
                on the appointment workspace. Admin keeps full PII under
                /admin/users. */}
            <thead className="bg-[var(--color-background-soft)] text-left text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Patient</th>
                <th className="px-4 py-3 font-semibold">Country</th>
                <th className="px-4 py-3 font-semibold">First seen</th>
                <th className="px-4 py-3 font-semibold text-right">Bookings</th>
                <th className="px-4 py-3 font-semibold text-right">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {items.map((p) => (
                <tr key={p.email}>
                  <td className="px-4 py-3 font-semibold text-[var(--color-text-primary)]">
                    {p.fullName}
                  </td>
                  <td className="px-4 py-3 text-xs uppercase">{p.countryCode}</td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                    {new Date(p.firstSeen).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {p.appointmentCount}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/doctor/patients/${encodeURIComponent(p.email)}`}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
                    >
                      Open <ChevronRight className="size-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="grid gap-3 p-3 md:hidden">
            {items.map((p) => (
              <article
                key={p.email}
                className="gh-doctor-mobile-card rounded-[10px] border border-[var(--color-border)] bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">
                      {p.fullName}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      First seen {new Date(p.firstSeen).toLocaleDateString()}
                    </p>
                  </div>
                  <Pill tone="brand">{p.countryCode}</Pill>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-[var(--color-text-muted)]">Bookings</dt>
                    <dd className="font-semibold text-[var(--color-text-primary)]">
                      {p.appointmentCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-text-muted)]">Record</dt>
                    <dd className="font-semibold text-[var(--color-text-primary)]">
                      History and documents
                    </dd>
                  </div>
                </dl>
                <Link
                  href={`/doctor/patients/${encodeURIComponent(p.email)}`}
                  className="gh-btn gh-btn-soft mt-4 w-full text-sm"
                >
                  Open patient record <ChevronRight className="size-3.5" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
