"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Pill, Toggle, type PillTone } from "../../_components/atoms";
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
      <Link href={editHref} className="inline-flex items-center gap-2 hover:underline">
        <Pill tone="neutral" withDot>
          Not configured
        </Pill>
      </Link>
    );
  }

  const active = isActive ?? true;
  const published = status === "PUBLISHED";
  const tone: PillTone = !active ? "inactive" : published ? "published" : "draft";
  const label = !active ? "Disabled" : published ? "Published" : "Draft";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Pill tone={tone} withDot>
          {label}
        </Pill>
        {enabledSectionCount > 0 ? (
          <span className="text-portal-thead text-[var(--color-text-muted)]">
            {enabledSectionCount} section{enabledSectionCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <form action={setFlagsAction} className="inline-flex items-center gap-1.5">
          <input type="hidden" name="countryId" value={countryId} />
          <input type="hidden" name="countryCode" value={countryCode} />
          <input type="hidden" name="pageKey" value={pageKey} />
          <input type="hidden" name="field" value="status" />
          <input type="hidden" name="nextValue" value={published ? "DRAFT" : "PUBLISHED"} />
          <ToggleSubmit
            on={published}
            ariaLabel={`${published ? "Unpublish" : "Publish"} ${pageLabel} for ${countryName}`}
          />
          <span className="text-portal-thead text-[var(--color-text-muted)]">Published</span>
        </form>
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
          <span className="text-portal-thead text-[var(--color-text-muted)]">Active</span>
        </form>
        <Link
          href={editHref}
          className="text-portal-thead font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:underline"
        >
          Edit
        </Link>
      </div>
    </div>
  );
}
