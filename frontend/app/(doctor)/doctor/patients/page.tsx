import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { fetchDoctorPatients } from "@/lib/api/doctor-api";

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
  const items = !result.ok
    ? []
    : q
      ? result.data.items.filter(
          (p) =>
            p.email.toLowerCase().includes(q) ||
            p.fullName.toLowerCase().includes(q) ||
            (p.phone ?? "").toLowerCase().includes(q),
        )
      : result.data.items;

  return (
    <>
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Doctor
        </p>
        <h2 className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
          My patients
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Distinct patients who&apos;ve booked a consultation with you. Deduped by
          email — guest bookings + signed-in patients all surface here.
        </p>
      </header>

      <div className="gh-card mb-4 p-4">
        <form className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 sm:min-w-[260px]">
            <span className="gh-field-label">Search</span>
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Name, email, or phone"
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
        <div className="gh-card p-10 text-center text-sm text-[var(--color-text-muted)]">
          {q
            ? "No patients match that search."
            : "No patients yet — your scheduled appointments will surface here."}
        </div>
      ) : (
        <div className="gh-card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-background-soft)] text-left text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Patient</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
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
                  <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">{p.email}</td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                    {p.phone ?? "—"}
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
      )}
    </>
  );
}
