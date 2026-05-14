import Link from "next/link";
import {
  CalendarClock,
  Globe2,
  Stethoscope,
  UserRound,
  Tags,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

const cards = [
  {
    href: "/admin/appointments",
    title: "Appointments",
    description: "Review booking requests and update statuses",
    icon: CalendarClock,
  },
  {
    href: "/admin/countries",
    title: "Countries",
    description: "Manage country sites, hero copy, currency, and contact",
    icon: Globe2,
  },
  {
    href: "/admin/categories",
    title: "Categories",
    description: "Global category pool with per-country enablement",
    icon: Tags,
  },
  {
    href: "/admin/doctors",
    title: "Doctors",
    description: "Public profiles assigned to one or more countries",
    icon: UserRound,
  },
  {
    href: "/admin/services",
    title: "Services",
    description: "Consultations, prescriptions, and health tests per country",
    icon: Stethoscope,
  },
] as const;

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      {/* Dashboard hero */}
      <section className="rounded-[var(--radius-card)] bg-[var(--color-brand-primary)] p-7 text-white sm:p-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="gh-heading-eyebrow text-white/80">Admin workspace</p>
            <h1 className="mt-3 text-[var(--text-h1)] font-extrabold leading-[1.08] tracking-tight">
              Manage your clinic platform
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-white/85">
              Update website content, review booking requests, and manage public-facing information across all country clinics.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium">
            <ShieldCheck className="size-4" aria-hidden />
            Admin session
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
            <AlertCircle className="size-5 shrink-0 text-white/80" aria-hidden />
            <p className="text-sm text-white/85">Doctors are public profiles only. Doctor portal is separate.</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
            <AlertCircle className="size-5 shrink-0 text-white/80" aria-hidden />
            <p className="text-sm text-white/85">Payments are not enabled yet.</p>
          </div>
        </div>
      </section>

      {/* Dashboard cards */}
      <section>
        <h2 className="gh-h3 mb-4 text-[var(--color-text-primary)]">Workspace sections</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="gh-card gh-card-interactive group flex flex-col p-6"
              >
                <div className="mb-4 inline-flex">
                  <span className="gh-icon-circle gh-icon-circle-lg">
                    <Icon className="size-6" aria-hidden />
                  </span>
                </div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">{card.title}</h3>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
                  {card.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--color-brand-primary)]">
                  Open section
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Scope note */}
      <section className="rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-panel)] px-5 py-4">
        <p className="text-sm text-[var(--color-text-muted)]">
          <strong className="text-[var(--color-text-primary)]">Admin scope:</strong> website content + booking operations.
          Payments and doctor portal are intentionally excluded from this interface.
        </p>
      </section>
    </div>
  );
}
