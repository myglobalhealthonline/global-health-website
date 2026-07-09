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
import { PortalTabs } from "@/components/PortalTabs";
import type {
  DoctorSelectableService,
  DoctorServiceAssignment,
} from "@/lib/api/doctor-api";

type Kind = DoctorSelectableService["kind"];
// Type-only import (erased at build time) — no runtime locale-loading code
// ships to the client bundle; the component only receives plain strings via props.
// ponytail: cs/de/ro doctor.json are partial locale stubs (missing many keys), so the
// exact per-locale union type doesn't structurally match; loosen to Record<string, string>
// here instead of touching load-locale.ts's locale-fallback merging (out of scope).
type ServicesStrings = { [key: string]: string };
type CommonStrings = { [key: string]: string };

function getKindMeta(strings: ServicesStrings): Record<Kind, { label: string; short: string; icon: ReactNode }> {
  return {
    GENERAL: {
      label: strings.kindGeneral,
      short: strings.kindGeneralShort,
      icon: <Stethoscope className="size-4" aria-hidden />,
    },
    SPECIALIST: {
      label: strings.kindSpecialist,
      short: strings.kindSpecialistShort,
      icon: <Activity className="size-4" aria-hidden />,
    },
    PRESCRIPTION: {
      label: strings.kindPrescription,
      short: strings.kindPrescriptionShort,
      icon: <FileText className="size-4" aria-hidden />,
    },
  };
}

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
  strings: ServicesStrings,
): { tone: StatusTone; label: string } | null {
  if (!assignment) return null;
  switch (assignment.status) {
    case "active":
      return { tone: "active", label: strings.statusActive };
    case "pending":
      return { tone: "pending", label: strings.statusAwaiting };
    case "rejected":
      return { tone: "inactive", label: strings.statusRejected };
    default:
      return { tone: "inactive", label: strings.statusDisabled };
  }
}

type Props = {
  approvalRequired: boolean;
  items: DoctorSelectableService[];
  strings: ServicesStrings;
  common: CommonStrings;
};

export function DoctorServiceSelectionForm({ approvalRequired, items, strings, common }: Props) {
  const KIND_META = useMemo(() => getKindMeta(strings), [strings]);
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
            text: json.message ?? strings.saveFailed,
          });
          return;
        }
        setMessage({
          kind: "success",
          text: approvalRequired
            ? strings.submittedApprovalMsg
            : strings.submittedNoApprovalMsg,
        });
        router.refresh();
      } catch {
        setMessage({ kind: "error", text: strings.networkError });
      }
    });
  }

  const activeGroup = grouped.find((g) => g.kind === activeTab) ?? grouped[0];

  if (grouped.length === 0) {
    return (
      <div className="gh-card gh-doctor-empty-state p-8 text-center">
        <Stethoscope
          className="mx-auto size-6 text-[var(--portal-muted)]"
          aria-hidden
        />
        <p className="mt-3 text-sm font-semibold text-[var(--portal-text)]">
          {strings.emptyTitle}
        </p>
        <p className="mt-1 text-[13px] text-[var(--portal-muted)]">
          {strings.emptyDesc}
        </p>
      </div>
    );
  }

  return (
    <div className="gh-doctor-service-selection grid gap-5">
      {/* How it works */}
      <div className="gh-doctor-service-explainer rounded-[var(--radius-card-sm)] border border-[var(--portal-line-soft)] bg-[var(--portal-well)] px-5 py-4">
        <p className="m-0 text-[13px] leading-relaxed text-[var(--portal-muted)]">
          {strings.explainerIntro}{" "}
          {approvalRequired ? (
            <>
              {strings.explainerApprovalRequired}
              <span className="font-semibold text-[var(--portal-text)]">
                {" "}
                {strings.explainerApproved}
              </span>{" "}
              {strings.explainerBecomeBookable}{" "}
              <span className="font-semibold text-[var(--portal-text)]">
                {strings.explainerRejected}
              </span>
              .
            </>
          ) : (
            strings.explainerNoApproval
          )}{" "}
          {strings.explainerHealthTests}
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
        <PortalTabs
          ariaLabel={strings.countriesTabLabel}
          value={activeCountryId}
          onChange={setActiveCountryId}
          items={countries.map((country) => ({
            value: country.id,
            label: (
              <>
                {country.name}{" "}
                <span className="text-[11px] font-bold uppercase tracking-[0.06em] opacity-70">
                  {country.code}
                </span>
              </>
            ),
            badge: items.filter((s) => s.countryId === country.id && selected.has(s.id)).length,
          }))}
        />
      ) : null}

      {/* Tabs */}
      <PortalTabs
        ariaLabel={strings.categoriesTabLabel}
        value={activeGroup?.kind ?? activeTab}
        onChange={(v) => setActiveTab(v as Kind)}
        items={grouped.map(({ kind, services }) => ({
          value: kind,
          label: (
            <>
              {KIND_META[kind].icon}
              {KIND_META[kind].short}
            </>
          ),
          badge: services.filter((s) => selected.has(s.id)).length,
        }))}
      />

      {/* Cards */}
      <div className="gh-doctor-service-grid grid gap-3 sm:grid-cols-2">
        {activeGroup.services.map((service) => {
          const isAdminLocked =
            service.assignment?.selectedBy === "admin" &&
            service.assignment.status === "active";
          const checked = selected.has(service.id);
          const pill = statusPill(service.assignment, strings);
          return (
            <button
              key={service.id}
              type="button"
              role="checkbox"
              aria-checked={checked}
              disabled={isAdminLocked || pending}
              onClick={() => toggle(service)}
              className={`gh-doctor-service-card group relative flex flex-col gap-3 rounded-[var(--radius-card-sm)] border p-4 text-left transition-all ${
                checked
                  ? "border-[var(--portal-primary)] bg-[var(--portal-primary)]/[0.04] shadow-sm"
                  : "border-[var(--portal-line-soft)] hover:border-[var(--portal-primary)]/40 hover:shadow-sm"
              } ${isAdminLocked ? "cursor-not-allowed opacity-90" : "cursor-pointer"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  aria-hidden
                  className={`grid size-5 shrink-0 place-items-center rounded-md border transition-colors ${
                    checked
                      ? "border-[var(--portal-primary)] bg-[var(--portal-primary)] text-white"
                      : "border-[var(--portal-line)] bg-[var(--portal-surface,white)]"
                  }`}
                >
                  {checked ? <Check className="size-3.5" strokeWidth={3} /> : null}
                </span>
                {pill ? (
                  <Pill tone={pill.tone} withDot>
                    {pill.label}
                  </Pill>
                ) : (
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--portal-muted)]">
                    {strings.notRequested}
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <p className="m-0 text-[14.5px] font-semibold text-[var(--portal-text)]">
                  {service.name}
                </p>
                {service.summary ? (
                  <p className="mt-1 line-clamp-2 text-[13px] text-[var(--portal-muted)]">
                    {service.summary}
                  </p>
                ) : null}
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--portal-line-soft)] pt-3 text-[12px] text-[var(--portal-muted)]">
                {service.durationMinutes != null ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" aria-hidden />
                    {service.durationMinutes} min
                  </span>
                ) : null}
                <span className="font-mono font-semibold text-[var(--portal-text-2)]">
                  {formatPrice(service.basePriceCents, service.currencyCode)}
                </span>
                <span className="inline-flex items-center gap-1 font-mono font-semibold text-[var(--portal-primary)]">
                  {strings.yourFee}{" "}
                  {service.assignment?.doctorAmountCents == null
                    ? common.notSet
                    : formatPrice(
                        service.assignment.doctorAmountCents,
                        service.currencyCode,
                      )}
                </span>
                {isAdminLocked ? (
                  <span className="ml-auto inline-flex items-center gap-1">
                    <Lock className="size-3" aria-hidden />
                    {strings.adminAssigned}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* Next steps: contact admin + documents */}
      {approvalRequired ? (
        <div className="gh-doctor-service-next-step flex items-start gap-3 rounded-[var(--radius-card-sm)] border border-[var(--portal-line-soft)] bg-[var(--portal-well)] px-5 py-4">
          <Mail
            className="mt-0.5 size-4 shrink-0 text-[var(--portal-primary)]"
            aria-hidden
          />
          <div className="text-[13px] leading-relaxed text-[var(--portal-muted)]">
            <p className="m-0 font-semibold text-[var(--portal-text)]">
              {strings.nextStepsTitle}
            </p>
            <p className="mt-1">
              {strings.nextStepsDesc}
            </p>
          </div>
        </div>
      ) : null}

      <div className="gh-doctor-form-actions flex items-center justify-end gap-3">
        {dirty ? (
          <span className="text-[12.5px] text-[var(--portal-muted)]">
            {strings.unsavedChanges}
          </span>
        ) : null}
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="gh-btn gh-btn-primary px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          {pending ? strings.saving : strings.saveAndSubmit}
        </button>
      </div>
    </div>
  );
}
