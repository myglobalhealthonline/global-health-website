"use client";

import { Printer } from "lucide-react";
import { Btn } from "@/components/portal-atoms";

/**
 * "Printable" from §10, done the cheap way: the browser's own print dialog
 * plus a `@media print` block in portal.css that hides the portal chrome and
 * leaves the card. No PDF pipeline, no separate print route.
 */
export function MembershipPrintButton({ label }: { label: string }) {
  return (
    <Btn variant="secondary" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden />
      {label}
    </Btn>
  );
}
