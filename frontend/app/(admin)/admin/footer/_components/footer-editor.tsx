"use client";

import { useState, useTransition } from "react";
import type { AdminCountryFooterDto } from "@/lib/admin/admin-api";
import { AdminCard, Btn } from "../../_components/atoms";
import { PhoneField } from "@/components/forms/phone-field";

/**
 * Per-country footer editor. Contact block + social links + active flag
 * only â€” tagline / custom columns / copyright override were dropped
 * (2026-07-24, owner request): the public footer always uses the global
 * defaults for those. Submit serialises to a hidden `payload` JSON field
 * parsed by the server action, mirroring the page-content editor.
 */
type Props = {
  initial: AdminCountryFooterDto | null;
  saveAction: (formData: FormData) => Promise<void>;
};

type FormState = {
  contactAddress: string;
  contactEmail: string;
  contactPhone: string;
  contactHours: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  linkedinUrl: string;
  twitterUrl: string;
  youtubeUrl: string;
  isActive: boolean;
};

function initialState(footer: AdminCountryFooterDto | null): FormState {
  return {
    contactAddress: footer?.contactAddress ?? "",
    contactEmail: footer?.contactEmail ?? "",
    contactPhone: footer?.contactPhone ?? "",
    contactHours: footer?.contactHours ?? "",
    instagramUrl: footer?.instagramUrl ?? "",
    facebookUrl: footer?.facebookUrl ?? "",
    tiktokUrl: footer?.tiktokUrl ?? "",
    linkedinUrl: footer?.linkedinUrl ?? "",
    twitterUrl: footer?.twitterUrl ?? "",
    youtubeUrl: footer?.youtubeUrl ?? "",
    isActive: footer?.isActive ?? true,
  };
}

export function FooterEditor({ initial, saveAction }: Props) {
  const [state, setState] = useState<FormState>(() => initialState(initial));
  const [pending, startTransition] = useTransition();

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Strip empty strings to null so the backend's optionalText
    // transformer doesn't store `""`. tagline/customColumns/copyrightLine
    // are always cleared â€” those sections were removed from the editor.
    const norm = (v: string) => (v.trim() === "" ? null : v.trim());

    const payload = {
      tagline: null,
      contactAddress: norm(state.contactAddress),
      contactEmail: norm(state.contactEmail),
      contactPhone: norm(state.contactPhone),
      contactHours: norm(state.contactHours),
      instagramUrl: norm(state.instagramUrl),
      facebookUrl: norm(state.facebookUrl),
      tiktokUrl: norm(state.tiktokUrl),
      linkedinUrl: norm(state.linkedinUrl),
      twitterUrl: norm(state.twitterUrl),
      youtubeUrl: norm(state.youtubeUrl),
      customColumns: [],
      copyrightLine: null,
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
    <form onSubmit={onSubmit} className="gh-admin-footer-editor grid gap-5">
      <input type="hidden" name="payload" defaultValue="" />

      <AdminCard>
        <h2 className="text-base font-extrabold text-[var(--color-text-primary)]">
          Contact block
        </h2>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Rendered under the brand block on the public footer. All fields
          optional â€” leave blank to hide.
        </p>
        <div className="gh-admin-support-field-grid mt-4 grid gap-4 sm:grid-cols-2">
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
            <PhoneField
              defaultValue={state.contactPhone}
              onChange={(v) => update("contactPhone", v)}
              className="mt-1 flex gap-2"
              selectClassName="block rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
              inputClassName="block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/40"
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
              placeholder="Monâ€“Fri Â· 09:00â€“17:00 IST"
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
          https:// URLs only â€” rendered as icon row in the footer ribbon.
          Leave blank to hide an icon.
        </p>
        <div className="gh-admin-support-field-grid mt-4 grid gap-4 sm:grid-cols-2">
          {(
            [
              ["instagramUrl", "Instagram"],
              ["facebookUrl", "Facebook"],
              ["tiktokUrl", "TikTok"],
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
        <h2 className="text-base font-extrabold text-[var(--color-text-primary)]">
          Visibility
        </h2>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={state.isActive}
            onChange={(e) => update("isActive", e.target.checked)}
            className="size-4"
          />
          <span className="text-[var(--color-text-body)]">
            Active â€” render this footer on the public site
          </span>
        </label>
      </AdminCard>

      <div className="gh-admin-support-actions flex justify-end">
        <Btn type="submit" variant="primary" size="md" disabled={pending}>
          {pending ? "Savingâ€¦" : "Save footer"}
        </Btn>
      </div>
    </form>
  );
}
