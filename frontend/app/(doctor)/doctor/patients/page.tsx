import { fetchDoctorPatients } from "@/lib/api/doctor-api";

export const dynamic = "force-dynamic";

export default async function DoctorPatientsPage() {
  const result = await fetchDoctorPatients();

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

      {!result.ok ? (
        <div className="gh-card p-6">
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {result.message}
          </p>
        </div>
      ) : result.data.items.length === 0 ? (
        <div className="gh-card p-10 text-center text-sm text-[var(--color-text-muted)]">
          No patients yet — your scheduled appointments will surface here.
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
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {result.data.items.map((p) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
