import {
  Activity,
  CheckCircle2,
  Clock,
  FileText,
  Layers,
  Lock,
  Stethoscope,
} from "lucide-react";
import type { ReactNode } from "react";
import { Pill, StatCard } from "@/components/portal-atoms";
import type {
  DoctorSelectableService,
  DoctorServiceAssignment,
} from "@/lib/api/doctor-api";

type Kind = DoctorSelectableService["kind"];

const KIND_META: Record<
  Kind,
  { label: string; blurb: string; icon: ReactNode }
> = {
  GENERAL: {
    label: "GP consultations",
    blurb: "General practice appointments you are cleared to take.",
    icon: <Stethoscope className="size-4" aria-hidden />,
  },
  SPECIALIST: {
    label: "Specialist consultations",
    blurb: "Specialty services matched to your credentials.",
    icon: <Activity className="size-4" aria-hidden />,
  },
  PRESCRIPTION: {
    label: "Prescriptions",
    blurb: "Prescription services authorised for your account.",
    icon: <FileText className="size-4" aria-hidden />,
  },
};

const KIND_ORDER: Kind[] = ["GENERAL", "SPECIALIST", "PRESCRIPTION"];

function formatPrice(cents: number | null, currency: string | null): string {
  if (cents == null) return "—";
  const code = currency ?? "EUR";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${code}`;
  }
}

type StatusInfo = {
  tone: "active" | "pending" | "inactive" | "neutral";
  label: string;
  /** Whether the row should read as "you provide this". */
  assigned: boolean;
};

function statusInfo(assignment: DoctorServiceAssignment | null): StatusInfo {
  if (!assignment) {
    return { tone: "neutral", label: "Not assigned", assigned: false };
  }
  switch (assignment.status) {
    case "active":
      return {
        tone: "active",
        label:
          assignment.selectedBy === "admin" ? "Active" : "Active",
        assigned: true,
      };
    case "pending":
      return { tone: "pending", label: "Awaiting approval", assigned: false };
    case "rejected":
      return { tone: "inactive", label: "Rejected", assigned: false };
    default:
      return { tone: "inactive", label: "Disabled", assigned: false };
  }
}

type Props = {
  approvalRequired: boolean;
  items: DoctorSelectableService[];
};

export function DoctorServiceSelectionForm({ items }: Props) {
  const activeCount = items.filter(
    (s) => s.assignment?.status === "active",
  ).length;
  const pendingCount = items.filter(
    (s) => s.assignment?.status === "pending",
  ).length;

  const grouped = KIND_ORDER.map((kind) => ({
    kind,
    services: items.filter((s) => s.kind === kind),
  })).filter((g) => g.services.length > 0);

  return (
    <div className="grid gap-5">
      {/* Admin-managed notice */}
      <div className="flex items-start gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-background-soft)] px-4 py-3">
        <Lock
          className="mt-0.5 size-4 shrink-0 text-[var(--color-text-muted)]"
          aria-hidden
        />
        <p className="m-0 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
          Your service list is managed by an administrator. The services marked{" "}
          <span className="font-semibold text-[var(--color-text-primary)]">
            Active
          </span>{" "}
          below are the ones patients can book you for. Need a change? Contact
          your admin.
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Active services"
          value={activeCount}
          icon={<CheckCircle2 className="size-4" aria-hidden />}
          tone="brand"
          hint="Bookable by patients"
        />
        <StatCard
          label="Awaiting approval"
          value={pendingCount}
          icon={<Clock className="size-4" aria-hidden />}
          tone="neutral"
          hint="Pending admin review"
        />
        <StatCard
          label="In catalogue"
          value={items.length}
          icon={<Layers className="size-4" aria-hidden />}
          tone="neutral"
          hint="Total services offered"
        />
      </div>

      {grouped.length === 0 ? (
        <div className="gh-card p-8 text-center">
          <Stethoscope
            className="mx-auto size-6 text-[var(--color-text-muted)]"
            aria-hidden
          />
          <p className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">
            No services available yet
          </p>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Once an administrator assigns services to your account, they will
            appear here.
          </p>
        </div>
      ) : null}

      {grouped.map(({ kind, services }) => {
        const meta = KIND_META[kind];
        const activeInGroup = services.filter(
          (s) => s.assignment?.status === "active",
        ).length;
        return (
          <section key={kind} className="gh-card overflow-hidden p-0">
            <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-[var(--radius-card-sm)] bg-[var(--color-background-soft)] text-[var(--color-brand-primary)]">
                  {meta.icon}
                </span>
                <div>
                  <h3 className="m-0 text-[15px] font-extrabold text-[var(--color-text-primary)] [font-family:var(--font-display)]">
                    {meta.label}
                  </h3>
                  <p className="m-0 text-[12px] text-[var(--color-text-muted)]">
                    {meta.blurb}
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-[12px] font-semibold text-[var(--color-text-muted)]">
                {activeInGroup}/{services.length} active
              </span>
            </header>

            <ul className="m-0 list-none divide-y divide-[var(--color-border-subtle)] p-0">
              {services.map((service) => {
                const info = statusInfo(service.assignment);
                const adminAssigned =
                  service.assignment?.selectedBy === "admin" &&
                  service.assignment.status === "active";
                return (
                  <li
                    key={service.id}
                    className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                      info.assigned ? "" : "opacity-75"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${
                        info.assigned
                          ? "bg-[var(--color-brand-mint)]"
                          : "bg-[var(--color-border)]"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14.5px] font-semibold text-[var(--color-text-primary)]">
                          {service.name}
                        </span>
                        <Pill tone={info.tone} withDot>
                          {info.label}
                        </Pill>
                      </div>
                      {service.summary ? (
                        <p className="mt-1 line-clamp-2 text-[13px] text-[var(--color-text-muted)]">
                          {service.summary}
                        </p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[var(--color-text-muted)]">
                        {service.durationMinutes != null ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3.5" aria-hidden />
                            {service.durationMinutes} min
                          </span>
                        ) : null}
                        <span className="font-mono font-semibold text-[var(--color-text-body)]">
                          {formatPrice(
                            service.basePriceCents,
                            service.currencyCode,
                          )}
                        </span>
                        {adminAssigned ? (
                          <span className="inline-flex items-center gap-1">
                            <Lock className="size-3" aria-hidden />
                            Assigned by admin
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
