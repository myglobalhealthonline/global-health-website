"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { AdminCountryFooterDto } from "@/lib/admin/admin-api";
import { AdminCard, Btn } from "../../_components/atoms";

/**
 * Per-country footer editor.
 *
 * State is fully client-controlled because the customColumns block has
 * arbitrary add/remove of nested rows that doesn't translate cleanly to
 * server-action FormData. On submit we serialise the whole config to a
 * single hidden `payload` JSON field and let the server action parse it,
 * mirroring how the page-content editor works.
 */
type Props = {
  initial: AdminCountryFooterDto | null;
  saveAction: (formData: FormData) => Promise<void>;
};

type LinkRow = { label: string; href: string; external?: boolean };
type ColumnRow = { title: string; links: LinkRow[] };

type FormState = {
  tagline: string;
  contactAddress: string;
  contactEmail: string;
  contactPhone: string;
  contactHours: string;
  instagramUrl: string;
  facebookUrl: string;
  linkedinUrl: string;
  twitterUrl: string;
  youtubeUrl: string;
  customColumns: ColumnRow[];
  copyrightLine: string;
  isActive: boolean;
};

function initialState(footer: AdminCountryFooterDto | null): FormState {
  return {
    tagline: footer?.tagline ?? "",
    contactAddress: footer?.contactAddress ?? "",
    contactEmail: footer?.contactEmail ?? "",
    contactPhone: footer?.contactPhone ?? "",
    contactHours: footer?.contactHours ?? "",
    instagramUrl: footer?.instagramUrl ?? "",
    facebookUrl: footer?.facebookUrl ?? "",
    linkedinUrl: footer?.linkedinUrl ?? "",
    twitterUrl: footer?.twitterUrl ?? "",
    youtubeUrl: footer?.youtubeUrl ?? "",
    customColumns: footer?.customColumns ?? [],
    copyrightLine: footer?.copyrightLine ?? "",
    isActive: footer?.isActive ?? true,
  };
}

export function FooterEditor({ initial, saveAction }: Props) {
  const [state, setState] = useState<FormState>(() => initialState(initial));
  const [pending, startTransition] = useTransition();

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function addColumn() {
    if (state.customColumns.length >= 6) return;
    setState((prev) => ({
      ...prev,
      customColumns: [
        ...prev.customColumns,
        { title: "", links: [{ label: "", href: "" }] },
      ],
    }));
  }

  function removeColumn(idx: number) {
    setState((prev) => ({
      ...prev,
      customColumns: prev.customColumns.filter((_, i) => i !== idx),
    }));
  }

  function updateColumnTitle(idx: number, title: string) {
    setState((prev) => ({
      ...prev,
      customColumns: prev.customColumns.map((c, i) =>
        i === idx ? { ...c, title } : c,
      ),
    }));
  }

  function addLink(colIdx: number) {
    setState((prev) => ({
      ...prev,
      customColumns: prev.customColumns.map((c, i) =>
        i === colIdx
          ? c.links.length >= 10
            ? c
            : { ...c, links: [...c.links, { label: "", href: "" }] }
          : c,
      ),
    }));
  }

  function removeLink(colIdx: number, linkIdx: number) {
    setState((prev) => ({
      ...prev,
      customColumns: prev.customColumns.map((c, i) =>
        i === colIdx
          ? { ...c, links: c.links.filter((_, j) => j !== linkIdx) }
          : c,
      ),
    }));
  }

  function updateLink(
    colIdx: number,
    linkIdx: number,
    patch: Partial<LinkRow>,
  ) {
    setState((prev) => ({
      ...prev,
      customColumns: prev.customColumns.map((c, i) =>
        i === colIdx
          ? {
              ...c,
              links: c.links.map((l, j) =>
                j === linkIdx ? { ...l, ...patch } : l,
              ),
            }
          : c,
      ),
    }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Strip empty strings to null so the backend's optionalText
    // transformer doesn't store `""`. Custom columns with no title or
    // no non-empty links are dropped — they'd render as broken stubs.
    const norm = (v: string) => (v.trim() === "" ? null : v.trim());
    const cleanedColumns = state.customColumns
      .map((c) => ({
        title: c.title.trim(),
        links: c.links
          .filter((l) => l.label.trim() && l.href.trim())
          .map((l) => ({
            label: l.label.trim(),
            href: l.href.trim(),
            ...(l.external ? { external: true } : {}),
          })),
      }))
      .filter((c) => c.title && c.links.length > 0);

    const payload = {
      tagline: norm(state.tagline),
      contactAddress: norm(state.contactAddress),
      contactEmail: norm(state.contactEmail),
      contactPhone: norm(state.contactPhone),
      contactHours: norm(state.contactHours),
      instagramUrl: norm(state.instagramUrl),
      facebookUrl: norm(state.facebookUrl),
      linkedinUrl: norm(state.linkedinUrl),
      twitterUrl: norm(state.twitterUrl),
      youtubeUrl: norm(state.youtubeUrl),
      customColumns: cleanedColumns,
      copyrightLine: norm(state.copyrightLine),
      isActive: state.isActive,
    };

    const form = e.currentTarget;
    const hidden = form.querySelector<HTMLInputElement>("input[name=payload]");
    if (hidden) hidden.value = JSON.stringify(payload);

    startTransition(() => {
      const fd = new FormData(form);
      void saveAction(fd);
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <input type="hidden" name="payload" defaultValue="" />

      <AdminCard>
        <h2 className="text-base font-extrabold text-[var(--color-text-primary)]">
          Brand block
        </h2>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Tagline appears under the logo. Leave blank to use the global
          default ("Medicine anytime anywhere. Online medical consultations
          with locally-registered doctors across Europe.").
        </p>
        <label className="mt-4 block">
          <span className="text-xs font-semibold text-[var(--color-text-body)]">
            Tagline
          </span>
          <textarea
            value={state.tagline}
            onChange={(e) => update("tagline", e.target.value)}
            rows={2}
            maxLength={280}
            className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
          />
        </label>
      </AdminCard>

      <AdminCard>
        <h2 className="text-base font-extrabold text-[var(--color-text-primary)]">
          Contact block
        </h2>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Rendered under the brand block on the public footer. All fields
          optional — leave blank to hide.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-[var(--color-text-body)]">
              Address
            </span>
            <textarea
              value={state.contactAddress}
              onChange={(e) => update("contactAddress", e.target.value)}
              rows={2}
              maxLength={400}
              className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-[var(--color-text-body)]">
              Email
            </span>
            <input
              type="email"
              value={state.contactEmail}
              onChange={(e) => update("contactEmail", e.target.value)}
              maxLength={160}
              className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-[var(--color-text-body)]">
              Phone
            </span>
            <input
              type="tel"
              value={state.contactPhone}
              onChange={(e) => update("contactPhone", e.target.value)}
              maxLength={60}
              placeholder="+353 1 555 0123"
              className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-[var(--color-text-body)]">
              Hours
            </span>
            <input
              type="text"
              value={state.contactHours}
              onChange={(e) => update("contactHours", e.target.value)}
              maxLength={160}
              placeholder="Mon–Fri · 09:00–17:00 IST"
              className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
            />
          </label>
        </div>
      </AdminCard>

      <AdminCard>
        <h2 className="text-base font-extrabold text-[var(--color-text-primary)]">
          Social links
        </h2>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          https:// URLs only — rendered as icon row in the footer ribbon.
          Leave blank to hide an icon.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(
            [
              ["instagramUrl", "Instagram"],
              ["facebookUrl", "Facebook"],
              ["linkedinUrl", "LinkedIn"],
              ["twitterUrl", "X / Twitter"],
              ["youtubeUrl", "YouTube"],
            ] as Array<[keyof FormState, string]>
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-xs font-semibold text-[var(--color-text-body)]">
                {label}
              </span>
              <input
                type="url"
                value={String(state[key] ?? "")}
                onChange={(e) =>
                  update(key as keyof FormState, e.target.value as never)
                }
                maxLength={500}
                placeholder="https://..."
                className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
              />
            </label>
          ))}
        </div>
      </AdminCard>

      <AdminCard>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-extrabold text-[var(--color-text-primary)]">
              Custom columns
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Add up to 6 link columns rendered after the auto-derived Care
              + Clinics columns. Each column needs a title and at least one
              link. Href accepts https://, mailto:, tel:, or a / path.
            </p>
          </div>
          <Btn
            type="button"
            onClick={addColumn}
            variant="secondary"
            size="sm"
            iconLeft={<Plus className="size-3.5" aria-hidden />}
          >
            Add column
          </Btn>
        </div>

        <div className="mt-4 grid gap-4">
          {state.customColumns.length === 0 ? (
            <p className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-6 text-center text-xs text-[var(--color-text-muted)]">
              No custom columns yet.
            </p>
          ) : (
            state.customColumns.map((col, ci) => (
              <div
                key={ci}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4"
              >
                <div className="flex items-end gap-3">
                  <label className="block flex-1">
                    <span className="text-xs font-semibold text-[var(--color-text-body)]">
                      Column title
                    </span>
                    <input
                      type="text"
                      value={col.title}
                      onChange={(e) => updateColumnTitle(ci, e.target.value)}
                      maxLength={60}
                      className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeColumn(ci)}
                    className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-red-300 hover:text-red-700"
                    aria-label="Remove column"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>

                <div className="mt-3 grid gap-2">
                  {col.links.map((link, li) => (
                    <div
                      key={li}
                      className="flex flex-wrap items-end gap-2 rounded-md bg-[var(--color-background-page)] p-2"
                    >
                      <label className="block flex-1 min-w-[120px]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                          Label
                        </span>
                        <input
                          type="text"
                          value={link.label}
                          onChange={(e) =>
                            updateLink(ci, li, { label: e.target.value })
                          }
                          maxLength={80}
                          className="mt-0.5 block w-full rounded border border-[var(--color-border)] bg-[var(--color-background-page)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
                        />
                      </label>
                      <label className="block flex-[2] min-w-[160px]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                          Href
                        </span>
                        <input
                          type="text"
                          value={link.href}
                          onChange={(e) =>
                            updateLink(ci, li, { href: e.target.value })
                          }
                          maxLength={500}
                          placeholder="/about or https://..."
                          className="mt-0.5 block w-full rounded border border-[var(--color-border)] bg-[var(--color-background-page)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
                        />
                      </label>
                      <label className="flex shrink-0 items-center gap-1.5 pt-3">
                        <input
                          type="checkbox"
                          checked={link.external ?? false}
                          onChange={(e) =>
                            updateLink(ci, li, { external: e.target.checked })
                          }
                          className="size-3.5"
                        />
                        <span className="text-[11px] text-[var(--color-text-muted)]">
                          New tab
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeLink(ci, li)}
                        className="inline-flex size-8 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-red-700"
                        aria-label="Remove link"
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  ))}
                  <Btn
                    type="button"
                    onClick={() => addLink(ci)}
                    variant="ghost"
                    size="sm"
                    iconLeft={<Plus className="size-3" aria-hidden />}
                  >
                    Add link
                  </Btn>
                </div>
              </div>
            ))
          )}
        </div>
      </AdminCard>

      <AdminCard>
        <h2 className="text-base font-extrabold text-[var(--color-text-primary)]">
          Bottom bar
        </h2>
        <div className="mt-4 grid gap-4">
          <label className="block">
            <span className="text-xs font-semibold text-[var(--color-text-body)]">
              Copyright line override
            </span>
            <input
              type="text"
              value={state.copyrightLine}
              onChange={(e) => update("copyrightLine", e.target.value)}
              maxLength={160}
              placeholder="© Global Health Romania SRL"
              className="mt-1 block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
            />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Replaces the default "© {`{year}`} Global Health" prefix.
              The "Medicine anytime anywhere" tagline stays unchanged.
            </p>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.isActive}
              onChange={(e) => update("isActive", e.target.checked)}
              className="size-4"
            />
            <span className="text-[var(--color-text-body)]">
              Active — render this footer on the public site
            </span>
          </label>
        </div>
      </AdminCard>

      <div className="flex justify-end">
        <Btn type="submit" variant="primary" size="md" disabled={pending}>
          {pending ? "Saving…" : "Save footer"}
        </Btn>
      </div>
    </form>
  );
}
