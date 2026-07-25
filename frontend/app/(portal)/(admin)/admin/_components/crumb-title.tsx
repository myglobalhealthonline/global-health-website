"use client";

import { createContext, useContext, useEffect } from "react";

/**
 * Lets a detail page name its own breadcrumb.
 *
 * `useBreadcrumbs` in AdminShell derives the trail from the pathname alone,
 * so a record route bottoms out at an opaque id ("Admin / Portugal /
 * Appointments / cmrtif3u…"). The record itself is only known to the page,
 * which renders far below the shell — so the page pushes a human label up
 * through this context and the shell substitutes it for the last crumb.
 *
 * The context value is the setter itself (stable across renders), so
 * providing it never re-renders the page tree.
 */
export const CrumbTitleContext = createContext<
  ((label: string | null) => void) | null
>(null);

/**
 * Drop into any admin detail page to replace the trailing id crumb:
 *
 *   <SetCrumbTitle label={appointment.fullName} />
 *
 * Clears itself on unmount so navigating back to a list route doesn't leave
 * the previous record's name stranded in the trail.
 */
export function SetCrumbTitle({ label }: { label: string }) {
  const setLabel = useContext(CrumbTitleContext);

  useEffect(() => {
    if (!setLabel) return;
    setLabel(label);
    return () => setLabel(null);
  }, [setLabel, label]);

  return null;
}
