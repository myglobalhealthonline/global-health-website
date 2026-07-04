"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

/**
 * Mobile-only sticky total bar for cart + checkout (spec §13). Reuses the
 * already-computed total from the caller — no recalculation here. Hides
 * itself once the real summary block (passed via `watchTargetId`) is in
 * view, so the patient never sees the total twice at once.
 */
export function MobileOrderTotalBar({
  totalLabel,
  formattedTotal,
  actionLabel,
  onAction,
  href,
  pending,
  watchTargetId,
}: {
  totalLabel: string;
  formattedTotal: string;
  actionLabel: string;
  /** Click handler — used on cart (router.push) and checkout (form.requestSubmit()). */
  onAction?: () => void;
  /** Alternative to onAction when the primary action is a plain navigation. */
  href?: string;
  pending?: boolean;
  /** DOM id of the real order-summary block; the bar hides while it's visible. */
  watchTargetId: string;
}) {
  const [hidden, setHidden] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = document.getElementById(watchTargetId);
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHidden(entry.isIntersecting),
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [watchTargetId]);

  return (
    <div
      ref={barRef}
      className={`gh2-glass-deep fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 px-5 py-3 md:hidden ${
        hidden ? "pointer-events-none opacity-0" : "opacity-100"
      } transition-opacity duration-150 motion-reduce:transition-none`}
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      aria-hidden={hidden}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/60">{totalLabel}</p>
        <p className="text-lg font-extrabold tabular-nums leading-tight text-white">{formattedTotal}</p>
      </div>
      {href ? (
        <a href={href} className="gh2-btn-lime shrink-0 justify-center">
          {actionLabel}
          <ArrowRight className="size-4" aria-hidden />
        </a>
      ) : (
        <button
          type="button"
          onClick={onAction}
          disabled={pending}
          className="gh2-btn-lime shrink-0 justify-center disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {actionLabel}
        </button>
      )}
    </div>
  );
}
