"use client";

import { createContext, useContext, useEffect } from "react";
import { TRAILING_CRUMB_KEY } from "@/lib/breadcrumb-utils";

/**
 * Lets a detail page name its own breadcrumb(s).
 *
 * `useBreadcrumbs` in AdminShell / PortalShell derives the trail from the
 * pathname alone, so a record route bottoms out at an opaque id ("Admin /
 * Portugal / Appointments / cmrtif3u…"). The record itself is only known to
 * the page, which renders far below the shell — so the page pushes human
 * labels up through this context and the shell substitutes them in.
 *
 * The value is a keyed setter: `(key, label)` where the key is a raw path
 * segment, or `TRAILING_CRUMB_KEY` for the page's own record crumb. It is
 * stable across renders, so providing it never re-renders the page tree.
 */
export type CrumbTitleSetter = (key: string, label: string | null) => void;

export const CrumbTitleContext = createContext<CrumbTitleSetter | null>(null);

/**
 * Drop into any admin detail page to replace an id crumb:
 *
 *   <SetCrumbTitle label={appointment.fullName} />
 *
 * Without `segment` it names the page's own (trailing) record crumb. On a
 * route with two dynamic segments, pass `segment` to name an ancestor id too:
 *
 *   <SetCrumbTitle segment={planId} label={plan.name} />
 *   <SetCrumbTitle label={memberName} />
 *
 * Clears itself on unmount so navigating back to a list route doesn't leave
 * the previous record's name stranded in the trail.
 */
export function SetCrumbTitle({ label, segment }: { label: string; segment?: string }) {
  const setLabel = useContext(CrumbTitleContext);
  const key = segment ?? TRAILING_CRUMB_KEY;

  useEffect(() => {
    if (!setLabel) return;
    setLabel(key, label);
    return () => setLabel(key, null);
  }, [setLabel, key, label]);

  return null;
}
