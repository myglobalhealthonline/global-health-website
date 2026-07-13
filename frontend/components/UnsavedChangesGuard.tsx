"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { PortalDialog } from "@/components/PortalDialog";
import { Btn } from "@/components/portal-atoms";
import { forceClearUnsavedChanges, isUnsavedChangesActive } from "@/lib/hooks/use-unsaved-changes";

export type UnsavedChangesGuardI18n = {
  title: string;
  body: string;
  keepEditing: string;
  discard: string;
};

const DEFAULT_I18N: UnsavedChangesGuardI18n = {
  title: "Unsaved changes",
  body: "You have unsaved changes on this page. If you leave now, they'll be lost.",
  keepEditing: "Keep editing",
  discard: "Discard changes",
};

/**
 * Mounted once in the account layout. Intercepts in-app anchor clicks
 * (App Router has no router-transition events to hook a guard into) while
 * any form has registered as dirty via `useUnsavedChanges`, and confirms
 * before letting the navigation proceed. Hard navigation (refresh/close/
 * external links) is separately covered by `useUnsavedChanges`'s own
 * `beforeunload` listener.
 */
export function UnsavedChangesGuard({ i18n = DEFAULT_I18N }: { i18n?: UnsavedChangesGuardI18n }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;
      const raw = anchor.getAttribute("href") ?? "";
      if (raw === "" || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin || url.pathname === pathname) return;
      if (!isUnsavedChangesActive()) return;
      e.preventDefault();
      setPendingHref(url.pathname + url.search + url.hash);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  const handleDiscard = useCallback(() => {
    if (!pendingHref) return;
    forceClearUnsavedChanges();
    const href = pendingHref;
    setPendingHref(null);
    router.push(href);
  }, [pendingHref, router]);

  return (
    <PortalDialog
      open={pendingHref !== null}
      onClose={() => setPendingHref(null)}
      title={i18n.title}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Btn variant="secondary" onClick={handleDiscard}>
            {i18n.discard}
          </Btn>
          <Btn variant="primary" onClick={() => setPendingHref(null)}>
            {i18n.keepEditing}
          </Btn>
        </div>
      }
    >
      <p className="text-sm" style={{ color: "var(--portal-text-2)" }}>
        {i18n.body}
      </p>
    </PortalDialog>
  );
}
