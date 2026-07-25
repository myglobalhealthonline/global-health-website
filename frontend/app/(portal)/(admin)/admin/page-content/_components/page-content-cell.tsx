"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Pencil } from "lucide-react";
import { Toggle } from "../../_components/atoms";
import type { AdminPageContentKey, AdminPageContentStatus } from "@/lib/admin/admin-api";

/** Toggle atom wrapped so it dims/locks while its parent <form>'s server
 *  action is in flight — `useFormStatus` only works in a descendant of the
 *  <form>, hence the extra client component instead of inlining. */
function ToggleSubmit({ on, ariaLabel }: { on: boolean; ariaLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <span style={{ opacity: pending ? 0.5 : 1, pointerEvents: pending ? "none" : undefined }}>
      <Toggle on={on} ariaLabel={ariaLabel} />
    </span>
  );
}

export function PageContentCell({
  countryId,
  countryCode,
  countryName,
  pageKey,
  pageLabel,
  editHref,
  configured,
  status,
  isActive,
  enabledSectionCount,
  setFlagsAction,
}: {
  countryId: string;
  countryCode: string;
  countryName: string;
  pageKey: AdminPageContentKey;
  pageLabel: string;
  editHref: string;
  configured: boolean;
  status: AdminPageContentStatus | null;
  isActive: boolean | null;
  enabledSectionCount: number;
  setFlagsAction: (formData: FormData) => void;
}) {
  if (!configured) {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="text-portal-compact text-[var(--color-text-muted)]">Not configured</span>
        <Link
          href={editHref}
          className="text-portal-compact font-bold text-[var(--portal-primary)] hover:underline"
        >
          Set up
        </Link>
      </div>
    );
  }

  const active = isActive ?? true;
  const published = status === "PUBLISHED";

  return (
    <div className="flex flex-col gap-2">
      {/* Primary: the toggle IS the state — no redundant pill */}
      <form action={setFlagsAction} className="inline-flex items-center gap-2">
        <input type="hidden" name="countryId" value={countryId} />
        <input type="hidden" name="countryCode" value={countryCode} />
        <input type="hidden" name="pageKey" value={pageKey} />
        <input type="hidden" name="field" value="status" />
        <input type="hidden" name="nextValue" value={published ? "DRAFT" : "PUBLISHED"} />
        <ToggleSubmit
          on={published}
          ariaLabel={`${published ? "Unpublish" : "Publish"} ${pageLabel} for ${countryName}`}
        />
        <span
          className="text-portal-compact font-bold"
          style={{ color: published ? "var(--portal-success-text)" : "var(--portal-muted)" }}
        >
          {published ? "Published" : "Draft"}
        </span>
        {enabledSectionCount > 0 ? (
          <span className="text-portal-meta text-[var(--color-text-muted)]">
            · {enabledSectionCount} section{enabledSectionCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </form>

      {/* Secondary: quick-toggle active state, clearly separate from Edit */}
      <div className="inline-flex items-center gap-3">
        <form action={setFlagsAction} className="inline-flex items-center gap-1.5">
          <input type="hidden" name="countryId" value={countryId} />
          <input type="hidden" name="countryCode" value={countryCode} />
          <input type="hidden" name="pageKey" value={pageKey} />
          <input type="hidden" name="field" value="isActive" />
          <input type="hidden" name="nextValue" value={active ? "false" : "true"} />
          <ToggleSubmit
            on={active}
            ariaLabel={`${active ? "Deactivate" : "Activate"} ${pageLabel} for ${countryName}`}
          />
          <span className="text-portal-meta text-[var(--color-text-muted)]">
            {active ? "Active" : "Inactive"}
          </span>
        </form>
        <span aria-hidden className="h-3 w-px shrink-0" style={{ background: "var(--portal-line-strong)" }} />
        <Link
          href={editHref}
          className="inline-flex items-center gap-1 text-portal-meta font-bold hover:underline"
          style={{ color: "var(--portal-primary)" }}
        >
          <Pencil size={11} aria-hidden />
          Edit content
        </Link>
      </div>
    </div>
  );
}
