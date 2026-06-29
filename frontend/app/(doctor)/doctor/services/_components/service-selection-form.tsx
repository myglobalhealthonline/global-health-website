"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Check,
  Clock,
  FileText,
  Lock,
  Mail,
  Stethoscope,
} from "lucide-react";
import type { ReactNode } from "react";
import { Pill } from "@/components/portal-atoms";
import type {
  DoctorSelectableService,
  DoctorServiceAssignment,
} from "@/lib/api/doctor-api";

type Kind = DoctorSelectableService["kind"];

const KIND_META: Record<Kind, { label: string; short: string; icon: ReactNode }> = {
  GENERAL: {
    label: "GP consultations",
    short: "GP",
    icon: <Stethoscope className="size-4" aria-hidden />,
  },
  SPECIALIST: {
    label: "Specialist consultations",
    short: "Specialist",
    icon: <Activity className="size-4" aria-hidden />,
  },
  PRESCRIPTION: {
    label: "Prescriptions",
    short: "Prescriptions",
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

type StatusTone = "active" | "pending" | "inactive";
function statusPill(
  assignment: DoctorServiceAssignment | null,
): { tone: StatusTone; label: string } | null {
  if (!assignment) return null;
  switch (assignment.status) {
    case "active":
      return { tone: "active", label: "Active" };
    case "pending":
      return { tone: "pending", label: "Awaiting approval" };
    case "rejected":
      return { tone: "inactive", label: "Rejected" };
    default:
      return { tone: "inactive", label: "Disabled" };
  }
}

type Props = {
  approvalRequired: boolean;
  items: DoctorSelectableService[];
};

export function DoctorServiceSelectionForm({ approvalRequired, items }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { kind: "success" | "error"; text: string } | null
  >(null);

  const initialSelected = useMemo(
    () => new Set(items.filter((s) => s.assignment != null).map((s) => s.id)),
    [items],
  );
  const [selected, setSelected] = useState<Set<string>>(initialSelected);

  // Distinct countries this doctor can offer services in. A doctor listed
  // in 2+ countries sees services split by country (an outer tab bar) before
  // the per-kind tabs; a single-country doctor sees the flat kind view.
  const countries = useMemo(() => {
    const map = new Map<string, { id: string; name: string; code: string }>();
    for (const s of items) {
      if (!map.has(s.countryId)) {
        map.set(s.countryId, { id: s.countryId, name: s.countryName, code: s.countryCode });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);
  const multiCountry = countries.length > 1;
  const [activeCountryId, setActiveCountryId] = useState(countries[0]?.id ?? "");

  const scopedItems = useMemo(
    () => (multiCountry ? items.filter((s) => s.countryId === activeCountryId) : items),
    [items, multiCountry, activeCountryId],
  );

  const grouped = useMemo(
    () =>
      KIND_ORDER.map((kind) => ({
        kind,
        services: scopedItems.filter((s) => s.kind === kind),
      })).filter((g) => g.services.length > 0),
    [scopedItems],
  );

  const [activeTab, setActiveTab] = useState<Kind>(
    grouped[0]?.kind ?? "GENERAL",
  );

  const dirty = useMemo(() => {
    if (selected.size !== initialSelected.size) return true;
    for (const id of selected) if (!initialSelected.has(id)) return true;
    return false;
  }, [selected, initialSelected]);

  function toggle(service: DoctorSelectableService) {
    const isAdminLocked =
      service.assignment?.selectedBy === "admin" &&
      service.assignment.status === "active";
    if (isAdminLocked || pending) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(service.id)) next.delete(service.id);
      else next.add(service.id);
      return next;
    });
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/doctor/services", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ serviceIds: Array.from(selected) }),
        });
        const json = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !json.ok) {
          setMessage({
            kind: "error",
            text: json.message ?? "Could not save service selections",
          });
          return;
        }
        setMessage({
          kind: "success",
          text: approvalRequired
            ? "Request submitted. Your new services are awaiting admin approval — see the next steps below to get them approved faster."
            : "Selections saved. Your services are now available for booking.",
        });
        router.refresh();
      } catch {
        setMessage({ kind: "error", text: "Could not reach the server. Try again." });
      }
    });
  }

  const activeGroup = grouped.find((g) => g.kind === activeTab) ?? grouped[0];

  if (grouped.length === 0) {
    return (
      <div className="gh-card p-8 text-center">
        <Stethoscope
          className="mx-auto size-6 text-[var(--color-text-muted)]"
          aria-hidden
        />
        <p className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">
          No services available yet
        </p>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Once services are configured for your country, they will appear here
          for you to request.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {/* How it works */}
      <div className="rounded-[var(--radius-card-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-background-soft)] px-5 py-4">
        <p className="m-0 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
          Select the services you are qualified to provide and save your
          request.{" "}
          {approvalRequired ? (
            <>
              New selections are submitted to an administrator for approval —
              <span className="font-semibold text-[var(--color-text-primary)]">
                {" "}
                approved
              </span>{" "}
              services become bookable, others stay{" "}
              <span className="font-semibold text-[var(--color-text-primary)]">
                rejected
              </span>
              .
            </>
          ) : (
            "Your selections become available for booking immediately."
          )}{" "}
          Health tests are managed by admin and are not listed here.
        </p>
      </div>

      {message ? (
        <div
          className={`rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm ${
            message.kind === "success" ? "gh-status-success" : "gh-status-warning"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {/* Country tabs (only when the doctor practices in 2+ countries) */}
      {multiCountry ? (
        <div
          role="tablist"
          aria-label="Countries"
          className="flex flex-wrap gap-2"
        >
          {countries.map((country) => {
            const countrySelected = items.filter(
              (s) => s.countryId === country.id && selected.has(s.id),
            ).length;
            const isActive = country.id === activeCountryId;
            return (
              <button
                key={country.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => setActiveCountryId(country.id)}
                className={`inline-flex items-center gap-2 rounded-[var(--radius-card-sm)] border px-4 py-2 text-[13.5px] font-semibold transition-colors ${
                  isActive
                    ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/[0.06] text-[var(--color-brand-primary)]"
                    : "border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {country.name}
                <span className="text-[11px] font-bold uppercase tracking-[0.06em] opacity-70">
                  {country.code}
                </span>
                <span
                  className={`ml-0.5 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                    isActive
                      ? "bg-[var(--color-brand-primary)] text-white"
                      : "bg-[var(--color-border-subtle)] text-[var(--color-text-muted)]"
                  }`}
                >
                  {countrySelected}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Service categories"
        className="flex flex-wrap gap-2 rounded-[var(--radius-card-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-background-soft)] p-1.5"
      >
        {grouped.map(({ kind, services }) => {
          const meta = KIND_META[kind];
          const selectedCount = services.filter((s) => selected.has(s.id)).length;
          const isActive = kind === (activeGroup?.kind ?? activeTab);
          return (
            <button
              key={kind}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => setActiveTab(kind)}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-[calc(var(--radius-card-sm)-4px)] px-4 py-2.5 text-[13.5px] font-semibold transition-colors ${
                isActive
                  ? "bg-[var(--color-surface,white)] text-[var(--color-brand-primary)] shadow-sm"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {meta.icon}
              {meta.short}
              <span
                className={`ml-0.5 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                  isActive
                    ? "bg-[var(--color-brand-primary)] text-white"
                    : "bg-[var(--color-border-subtle)] text-[var(--color-text-muted)]"
                }`}
              >
                {selectedCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {activeGroup.services.map((service) => {
          const isAdminLocked =
            service.assignment?.selectedBy === "admin" &&
            service.assignment.status === "active";
          const checked = selected.has(service.id);
          const pill = statusPill(service.assignment);
          return (
            <button
              key={service.id}
              type="button"
              role="checkbox"
              aria-checked={checked}
              disabled={isAdminLocked || pending}
              onClick={() => toggle(service)}
              className={`group relative flex flex-col gap-3 rounded-[var(--radius-card-sm)] border p-4 text-left transition-all ${
                checked
                  ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/[0.04] shadow-sm"
                  : "border-[var(--color-border-subtle)] hover:border-[var(--color-brand-primary)]/40 hover:shadow-sm"
              } ${isAdminLocked ? "cursor-not-allowed opacity-90" : "cursor-pointer"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  aria-hidden
                  className={`grid size-5 shrink-0 place-items-center rounded-md border transition-colors ${
                    checked
                      ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white"
                      : "border-[var(--color-border)] bg-[var(--color-surface,white)]"
                  }`}
                >
                  {checked ? <Check className="size-3.5" strokeWidth={3} /> : null}
                </span>
                {pill ? (
                  <Pill tone={pill.tone} withDot>
                    {pill.label}
                  </Pill>
                ) : (
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                    Not requested
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <p className="m-0 text-[14.5px] font-semibold text-[var(--color-text-primary)]">
                  {service.name}
                </p>
                {service.summary ? (
                  <p className="mt-1 line-clamp-2 text-[13px] text-[var(--color-text-muted)]">
                    {service.summary}
                  </p>
                ) : null}
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--color-border-subtle)] pt-3 text-[12px] text-[var(--color-text-muted)]">
                {service.durationMinutes != null ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" aria-hidden />
                    {service.durationMinutes} min
                  </span>
                ) : null}
                <span className="font-mono font-semibold text-[var(--color-text-body)]">
                  {formatPrice(service.basePriceCents, service.currencyCode)}
                </span>
                {isAdminLocked ? (
                  <span className="ml-auto inline-flex items-center gap-1">
                    <Lock className="size-3" aria-hidden />
                    Admin-assigned
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* Next steps: contact admin + documents */}
      {approvalRequired ? (
        <div className="flex items-start gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-background-soft)] px-5 py-4">
          <Mail
            className="mt-0.5 size-4 shrink-0 text-[var(--color-brand-primary)]"
            aria-hidden
          />
          <div className="text-[13px] leading-relaxed text-[var(--color-text-muted)]">
            <p className="m-0 font-semibold text-[var(--color-text-primary)]">
              After you save: contact the admin team
            </p>
            <p className="mt-1">
              Email your supporting documents — qualifications, certifications,
              and registration proof — to the administrators so they can verify
              your eligibility and approve your requested services. Requests are
              not approved until documents are reviewed.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        {dirty ? (
          <span className="text-[12.5px] text-[var(--color-text-muted)]">
            Unsaved changes
          </span>
        ) : null}
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="gh-btn gh-btn-primary px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save & submit request"}
        </button>
      </div>
    </div>
  );
}
