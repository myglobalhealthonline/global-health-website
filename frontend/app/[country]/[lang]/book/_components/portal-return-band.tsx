"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const STORAGE_KEY = "gh-booking-from-portal";

/**
 * Slim return band shown above the wizard only when the patient arrived
 * from the portal (04-001/04-002). `fromPortalParam` is true on step 1
 * (`?from=portal`, set by every "Book consultation" CTA in `/account` via
 * `resolveBookConsultationHref`). Steps 2-4 lose that query param —
 * `buildBookHref`, the wizard's own step-link builder, doesn't forward
 * unknown params — so this persists the flag to `sessionStorage` on first
 * mount and reads it back on later steps. Client-side (not a server-read
 * cookie) deliberately: this route is statically-optimized per
 * country/lang and a server-side per-request cookie read proved unreliable
 * against that cache in testing. Public/anonymous visitors always get
 * `fromPortalParam=false` and never touch sessionStorage.
 */
export function PortalReturnBand({
  fromPortalParam,
  backLabel,
  badgeLabel,
}: {
  fromPortalParam: boolean;
  backLabel: string;
  badgeLabel: string;
}) {
  const [show, setShow] = useState(fromPortalParam);

  useEffect(() => {
    if (fromPortalParam) {
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // Private browsing / storage blocked — the band just won't survive
        // to later steps; step 1 already showed it via the prop above.
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser-only sessionStorage, must run post-mount for SSR-safety
      setShow(true);
      return;
    }
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") setShow(true);
    } catch {
      /* noop */
    }
  }, [fromPortalParam]);

  if (!show) return null;

  return (
    <div className="gh-portal-return-band">
      <div className="mx-auto flex max-w-[var(--container-width)] items-center gap-3 px-5 md:px-10">
        <Link href="/account" className="gh-portal-return-band__link">
          <ArrowLeft className="size-3.5" aria-hidden />
          {backLabel}
        </Link>
        <span className="gh-portal-return-band__badge">{badgeLabel}</span>
      </div>
    </div>
  );
}
