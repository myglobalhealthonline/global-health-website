import Link from "next/link";
import { Calendar, Users, Stethoscope } from "lucide-react";
import { fetchDoctorMe } from "@/lib/api/doctor-api";

export const dynamic = "force-dynamic";

export default async function DoctorOverviewPage() {
  const result = await fetchDoctorMe();
  if (!result.ok) {
    return (
      <div className="gh-card p-6">
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
          {result.message}
        </p>
        {result.status === 403 ? (
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
            Your account isn&apos;t linked to a doctor profile yet. Ask an
            admin to set it under <span className="font-mono">/admin/users</span>.
          </p>
        ) : null}
      </div>
    );
  }
  const { doctor, stats } = result.data;

  return (
    <>
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Welcome
        </p>
        <h2 className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
          {doctor.fullName}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          {doctor.title} · {doctor.country.name}
          {doctor.additionalCountries.length > 0
            ? " + " +
              doctor.additionalCountries.map((c) => c.country.name).join(", ")
            : ""}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          icon={<Calendar className="size-5" aria-hidden />}
          label="Today"
          value={String(stats.todayCount)}
          hint="Scheduled appointments"
        />
        <StatTile
          icon={<Calendar className="size-5" aria-hidden />}
          label="This week"
          value={String(stats.weekCount)}
          hint="Scheduled within 7 days"
        />
        <StatTile
          icon={<Stethoscope className="size-5" aria-hidden />}
          label="Open"
          value={String(stats.totalActive)}
          hint="Not cancelled or completed"
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/doctor/appointments"
          className="gh-card gh-card-interactive flex items-center gap-4 p-5"
        >
          <span className="gh-icon-circle">
            <Calendar className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold text-[var(--color-text-primary)]">
              My appointments
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Search + filter
            </p>
          </div>
        </Link>
        <Link
          href="/doctor/patients"
          className="gh-card gh-card-interactive flex items-center gap-4 p-5"
        >
          <span className="gh-icon-circle">
            <Users className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold text-[var(--color-text-primary)]">
              My patients
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Distinct patients you&apos;ve consulted
            </p>
          </div>
        </Link>
      </div>
    </>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="gh-card flex items-start gap-4 p-5">
      <span className="gh-icon-circle">{icon}</span>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          {label}
        </p>
        <p className="mt-1 text-3xl font-bold text-[var(--color-text-primary)]">
          {value}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">{hint}</p>
      </div>
    </div>
  );
}
