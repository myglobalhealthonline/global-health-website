"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { AdminServiceLinkDto, AdminServiceLinkType } from "@/lib/admin/admin-api";

type SaveAction = (formData: FormData) => void | Promise<void>;

/** Per-locale callout copy, keyed by uppercase locale code (EN, AR, …). */
type LocaleCopy = { heading: string; body: string; ctaLabel: string };

type Row = {
  type: AdminServiceLinkType;
  targetServiceId: string;
  targetHref: string;
  priority: number;
  anchorSlot: string;
  /** One entry per locale code; the default locale is always present. */
  copy: Record<string, LocaleCopy>;
};

/** Locale tab descriptor passed from the server (country's enabled locales). */
export type ServiceLinkLocale = { code: string; isDefault: boolean };

const TYPES: { value: AdminServiceLinkType; label: string }[] = [
  { value: "UPGRADE", label: "Upgrade → specialist" },
  { value: "ENTRY", label: "Entry → GP" },
  { value: "REFERRAL", label: "Referral / investigations" },
  { value: "COMPLEMENTARY", label: "Complementary" },
];

const emptyCopy = (): LocaleCopy => ({ heading: "", body: "", ctaLabel: "" });

function rowFrom(link: AdminServiceLinkDto, localeCodes: string[]): Row {
  const copy: Record<string, LocaleCopy> = {};
  for (const code of localeCodes) copy[code] = emptyCopy();
  for (const t of link.translations) {
    const code = t.locale.toUpperCase();
    // Keep any stored translation even if the locale was later disabled, so a
    // save doesn't silently drop it — it still renders a tab below.
    copy[code] = {
      heading: t.heading ?? "",
      body: t.body ?? "",
      ctaLabel: t.ctaLabel ?? "",
    };
  }
  return {
    type: link.type,
    targetServiceId: link.targetServiceId ?? "",
    targetHref: link.targetHref ?? "",
    priority: link.priority,
    anchorSlot: link.anchorSlot ?? "",
    copy,
  };
}

/**
 * Edit the contextual internal-link callouts for a service, per locale.
 *
 * Each callout carries one copy block per enabled locale (heading / body /
 * CTA). The default locale is required; other locales are optional and fall
 * back to the default on the public page when left blank. Place
 * `{{link:<slot>}}` in the service body to position a box inline; links
 * without a matched slot render in a strip after the body. Max 4 show.
 */
export function ServiceLinksPanel({
  defaultLocale,
  locales,
  services,
  initial,
  action,
}: {
  defaultLocale: string;
  locales: ServiceLinkLocale[];
  services: { id: string; name: string; slug: string }[];
  initial: AdminServiceLinkDto[];
  action: SaveAction;
}) {
  const def = defaultLocale.toUpperCase();
  // Tabs: country-enabled locales, default first. De-duped, default guaranteed.
  const localeCodes = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const l of [{ code: def }, ...locales]) {
      const code = l.code.toUpperCase();
      if (seen.has(code)) continue;
      seen.add(code);
      out.push(code);
    }
    return out;
  }, [def, locales]);

  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((l) => rowFrom(l, localeCodes)),
  );
  const [activeLocale, setActiveLocale] = useState(def);

  function update(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function updateCopy(i: number, locale: string, patch: Partial<LocaleCopy>) {
    setRows((prev) =>
      prev.map((r, idx) =>
        idx === i
          ? { ...r, copy: { ...r.copy, [locale]: { ...(r.copy[locale] ?? emptyCopy()), ...patch } } }
          : r,
      ),
    );
  }
  function add() {
    const copy: Record<string, LocaleCopy> = {};
    for (const code of localeCodes) copy[code] = emptyCopy();
    setRows((prev) => [
      ...prev,
      { type: "UPGRADE", targetServiceId: "", targetHref: "", priority: prev.length, anchorSlot: "", copy },
    ]);
  }
  function remove(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  const payload = useMemo(
    () =>
      JSON.stringify({
        links: rows
          // A row is saved only when it has a target and a complete default-locale
          // copy block (heading + CTA) — the public resolver falls back to it.
          .filter(
            (r) =>
              (r.targetServiceId || r.targetHref.trim()) &&
              r.copy[def]?.heading.trim() &&
              r.copy[def]?.ctaLabel.trim(),
          )
          .map((r) => ({
            type: r.type,
            targetServiceId: r.targetServiceId || null,
            targetHref: r.targetServiceId ? null : r.targetHref.trim() || null,
            priority: r.priority,
            isActive: true,
            anchorSlot: r.anchorSlot.trim() || null,
            // Emit every locale that has both heading + CTA filled. Locales left
            // blank are omitted so the page falls back to the default locale.
            translations: Object.entries(r.copy)
              .filter(([, v]) => v.heading.trim() && v.ctaLabel.trim())
              .map(([locale, v]) => ({
                locale,
                heading: v.heading.trim(),
                body: v.body.trim() || null,
                ctaLabel: v.ctaLabel.trim(),
              })),
          })),
      }),
    [rows, def],
  );

  return (
    <form action={action} className="gh-admin-service-links">
      <input type="hidden" name="payload" value={payload} />
      <p className="gh-admin-service-helper">
        Internal-link callouts for this page. Anchor text must be descriptive (the
        service name) — generic phrases like “click here” are rejected. Use{" "}
        <code>{"{{link:<slot>}}"}</code> in the body to place a box inline.
      </p>

      {/* Locale tabs — switch which language you are editing across all rows.
          Other locales are optional; blank ones fall back to {default}. */}
      {localeCodes.length > 1 ? (
        <div className="gh-admin-service-tablist">
          {localeCodes.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setActiveLocale(code)}
              className="gh-btn gh-admin-service-tab px-3 py-1 text-[12px] font-semibold"
              aria-pressed={activeLocale === code}
              style={
                activeLocale === code
                  ? { background: "var(--color-brand-primary)", color: "#fff" }
                  : undefined
              }
            >
              {code}
              {code === def ? " · default" : ""}
            </button>
          ))}
        </div>
      ) : null}

      {rows.map((r, i) => {
        const copy = r.copy[activeLocale] ?? emptyCopy();
        const isDefaultTab = activeLocale === def;
        return (
          <div
            key={i}
            className="gh-admin-service-link-card"
          >
            <div className="gh-admin-service-link-grid">
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
              <span className="gh-field-label">
                Heading ({activeLocale})
                {!isDefaultTab ? (
                  <span className="font-normal text-[var(--color-text-muted)]"> — optional, falls back to {def}</span>
                ) : null}
              </span>
              <input
                className="gh-input"
                maxLength={200}
                value={copy.heading}
                onChange={(e) => updateCopy(i, activeLocale, { heading: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Body ({activeLocale}, optional)</span>
              <textarea
                className="gh-input resize-y"
                rows={2}
                maxLength={600}
                value={copy.body}
                onChange={(e) => updateCopy(i, activeLocale, { body: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">CTA anchor text ({activeLocale})</span>
              <input
                className="gh-input"
                maxLength={120}
                value={copy.ctaLabel}
                placeholder="See a Cardiology Specialist"
                onChange={(e) => updateCopy(i, activeLocale, { ctaLabel: e.target.value })}
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
        );
      })}

      <div className="gh-admin-service-actions gh-admin-service-actions--split">
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
