"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { AdminServiceLinkDto, AdminServiceLinkType } from "@/lib/admin/admin-api";

type SaveAction = (formData: FormData) => void | Promise<void>;

type Row = {
  type: AdminServiceLinkType;
  targetServiceId: string;
  targetHref: string;
  priority: number;
  anchorSlot: string;
  heading: string;
  body: string;
  ctaLabel: string;
};

const TYPES: { value: AdminServiceLinkType; label: string }[] = [
  { value: "UPGRADE", label: "Upgrade → specialist" },
  { value: "ENTRY", label: "Entry → GP" },
  { value: "REFERRAL", label: "Referral / investigations" },
  { value: "COMPLEMENTARY", label: "Complementary" },
];

function rowFrom(link: AdminServiceLinkDto, defaultLocale: string): Row {
  const tr =
    link.translations.find((t) => t.locale.toUpperCase() === defaultLocale.toUpperCase()) ??
    link.translations[0] ??
    null;
  return {
    type: link.type,
    targetServiceId: link.targetServiceId ?? "",
    targetHref: link.targetHref ?? "",
    priority: link.priority,
    anchorSlot: link.anchorSlot ?? "",
    heading: tr?.heading ?? "",
    body: tr?.body ?? "",
    ctaLabel: tr?.ctaLabel ?? "",
  };
}

/**
 * Edit the contextual internal-link callouts for a service. Heading/CTA are
 * authored in the country's default locale (other locales fall back to it).
 * Place `{{link:<slot>}}` in the service body to position a box inline; links
 * without a matched slot render in a strip after the body. Max 4 show.
 */
export function ServiceLinksPanel({
  defaultLocale,
  services,
  initial,
  action,
}: {
  defaultLocale: string;
  services: { id: string; name: string; slug: string }[];
  initial: AdminServiceLinkDto[];
  action: SaveAction;
}) {
  const [rows, setRows] = useState<Row[]>(() => initial.map((l) => rowFrom(l, defaultLocale)));

  function update(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function add() {
    setRows((prev) => [
      ...prev,
      {
        type: "UPGRADE",
        targetServiceId: "",
        targetHref: "",
        priority: prev.length,
        anchorSlot: "",
        heading: "",
        body: "",
        ctaLabel: "",
      },
    ]);
  }
  function remove(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  const payload = useMemo(
    () =>
      JSON.stringify({
        links: rows
          .filter((r) => r.heading.trim() && r.ctaLabel.trim() && (r.targetServiceId || r.targetHref.trim()))
          .map((r) => ({
            type: r.type,
            targetServiceId: r.targetServiceId || null,
            targetHref: r.targetServiceId ? null : r.targetHref.trim() || null,
            priority: r.priority,
            isActive: true,
            anchorSlot: r.anchorSlot.trim() || null,
            translations: [
              {
                locale: defaultLocale.toUpperCase(),
                heading: r.heading.trim(),
                body: r.body.trim() || null,
                ctaLabel: r.ctaLabel.trim(),
              },
            ],
          })),
      }),
    [rows, defaultLocale],
  );

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="payload" value={payload} />
      <p className="text-[12px] text-[var(--color-text-muted)]">
        Internal-link callouts for this page. Anchor text must be descriptive (the
        service name) — generic phrases like “click here” are rejected. Use{" "}
        <code>{"{{link:<slot>}}"}</code> in the body to place a box inline.
      </p>

      {rows.map((r, i) => (
        <div
          key={i}
          className="grid gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-background-soft)] p-3"
        >
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_90px_120px]">
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Type</span>
              <select
                className="gh-input"
                value={r.type}
                onChange={(e) => update(i, { type: e.target.value as AdminServiceLinkType })}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Target service</span>
              <select
                className="gh-input"
                value={r.targetServiceId}
                onChange={(e) => update(i, { targetServiceId: e.target.value })}
              >
                <option value="">— external href —</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Priority</span>
              <input
                type="number"
                min={0}
                max={1000}
                className="gh-input"
                value={r.priority}
                onChange={(e) => update(i, { priority: Number(e.target.value) || 0 })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Slot (optional)</span>
              <input
                className="gh-input"
                value={r.anchorSlot}
                placeholder="upgrade-psych"
                onChange={(e) => update(i, { anchorSlot: e.target.value })}
              />
            </label>
          </div>
          {!r.targetServiceId ? (
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">External href</span>
              <input
                className="gh-input"
                value={r.targetHref}
                placeholder="/ireland/en/health/hypertension"
                onChange={(e) => update(i, { targetHref: e.target.value })}
              />
            </label>
          ) : null}
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Heading ({defaultLocale.toUpperCase()})</span>
            <input
              className="gh-input"
              maxLength={200}
              value={r.heading}
              onChange={(e) => update(i, { heading: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Body (optional)</span>
            <textarea
              className="gh-input resize-y"
              rows={2}
              maxLength={600}
              value={r.body}
              onChange={(e) => update(i, { body: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">CTA anchor text</span>
            <input
              className="gh-input"
              maxLength={120}
              value={r.ctaLabel}
              placeholder="See a Cardiology Specialist"
              onChange={(e) => update(i, { ctaLabel: e.target.value })}
            />
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => remove(i)}
              className="gh-btn inline-flex items-center gap-1.5 text-[var(--color-danger,#b91c1c)]"
            >
              <Trash2 className="size-3.5" aria-hidden /> Remove
            </button>
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <button type="button" onClick={add} className="gh-btn inline-flex items-center gap-1.5">
          <Plus className="size-3.5" aria-hidden /> Add link
        </button>
        <button type="submit" className="gh-btn gh-btn-primary">
          Save links
        </button>
      </div>
    </form>
  );
}
