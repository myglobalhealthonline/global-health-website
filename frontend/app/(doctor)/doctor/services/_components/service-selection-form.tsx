"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DoctorSelectableService } from "@/lib/api/doctor-api";

const KIND_LABELS: Record<DoctorSelectableService["kind"], string> = {
  GENERAL: "GP consultations",
  SPECIALIST: "Specialist consultations",
  PRESCRIPTION: "Prescriptions",
};

function formatPrice(cents: number | null, currency: string | null): string {
  if (cents == null) return "—";
  const code = currency ?? "EUR";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: code,
  }).format(cents / 100);
}

function StatusBadge({
  assignment,
}: {
  assignment: DoctorSelectableService["assignment"];
}) {
  if (!assignment) return null;
  const tone =
    assignment.status === "active"
      ? "gh-status-success"
      : assignment.status === "pending"
        ? "gh-status-warning"
        : "gh-status-warning";
  const label =
    assignment.status === "active"
      ? assignment.selectedBy === "admin"
        ? "Active (admin-assigned)"
        : "Active"
      : assignment.status === "pending"
        ? "Awaiting admin approval"
        : assignment.status === "rejected"
          ? "Rejected"
          : "Disabled";
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone}`}
    >
      {label}
    </span>
  );
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
    () =>
      new Set(
        items
          .filter((s) => s.assignment != null)
          .map((s) => s.id),
      ),
    [items],
  );

  const [selected, setSelected] = useState<Set<string>>(initialSelected);

  const grouped = useMemo(() => {
    const groups: Record<DoctorSelectableService["kind"], DoctorSelectableService[]> = {
      GENERAL: [],
      SPECIALIST: [],
      PRESCRIPTION: [],
    };
    for (const item of items) {
      groups[item.kind].push(item);
    }
    return groups;
  }, [items]);

  function toggle(serviceId: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(serviceId);
      else next.delete(serviceId);
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
            ? "Selections saved. New services await admin approval before patients can book them."
            : "Selections saved. Your services are now available for booking.",
        });
        router.refresh();
      } catch {
        setMessage({
          kind: "error",
          text: "Could not reach the server. Try again.",
        });
      }
    });
  }

  return (
    <div className="grid gap-4">
      <div className="gh-card p-4 text-sm text-[var(--color-text-muted)]">
        {approvalRequired ? (
          <p>
            Select the GP, specialist, and prescription services you provide.
            New selections require admin approval before they appear in the
            patient booking flow.
          </p>
        ) : (
          <p>
            Select the GP, specialist, and prescription services you provide.
            Your selections become available for booking immediately.
          </p>
        )}
        <p className="mt-2">
          Health tests are managed by admin and are not listed here.
        </p>
      </div>

      {message ? (
        <p
          className={`rounded-md border px-4 py-3 text-sm ${
            message.kind === "success"
              ? "gh-status-success"
              : "gh-status-warning"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {(["GENERAL", "SPECIALIST", "PRESCRIPTION"] as const).map((kind) => {
        const sectionItems = grouped[kind];
        if (sectionItems.length === 0) return null;
        return (
          <section key={kind} className="gh-card p-6">
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              {KIND_LABELS[kind]}
            </h3>
            <ul className="mt-4 grid gap-3">
              {sectionItems.map((service) => {
                const isAdminLocked =
                  service.assignment?.selectedBy === "admin" &&
                  service.assignment.status === "active";
                const checked = selected.has(service.id);
                return (
                  <li
                    key={service.id}
                    className="rounded-[var(--radius-card-sm)] border border-[var(--color-border-subtle)] p-4"
                  >
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0 accent-[var(--color-brand-primary)]"
                        checked={checked}
                        disabled={isAdminLocked || pending}
                        onChange={(e) => toggle(service.id, e.target.checked)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                            {service.name}
                          </span>
                          <StatusBadge assignment={service.assignment} />
                        </span>
                        {service.summary ? (
                          <span className="mt-1 block text-[13px] text-[var(--color-text-muted)]">
                            {service.summary}
                          </span>
                        ) : null}
                        <span className="mt-2 flex flex-wrap gap-3 text-[12px] text-[var(--color-text-muted)]">
                          {service.durationMinutes != null ? (
                            <span>{service.durationMinutes} min</span>
                          ) : null}
                          <span>
                            {formatPrice(
                              service.basePriceCents,
                              service.currencyCode,
                            )}
                          </span>
                          {service.specialty ? (
                            <span>{service.specialty.name}</span>
                          ) : null}
                        </span>
                        {isAdminLocked ? (
                          <span className="mt-2 block text-[12px] text-[var(--color-text-muted)]">
                            Assigned by admin — contact support to remove.
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="gh-btn gh-btn-primary px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save services"}
        </button>
      </div>
    </div>
  );
}
