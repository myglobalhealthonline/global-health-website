import type { ReactNode } from "react";

type RegisteredBrandLockupProps = {
  children: ReactNode;
  className?: string;
  tone?: "dark" | "light";
};

/**
 * Adds the registered-mark symbol to the combined Global Health logo lockup.
 *
 * Keep the symbol decorative because the logo already supplies its accessible
 * name. The visually-hidden text communicates the registration status once.
 */
export function RegisteredBrandLockup({
  children,
  className = "",
  tone = "dark",
}: RegisteredBrandLockupProps) {
  const markColor = tone === "light" ? "text-white/90" : "text-[#0f4b38]";

  return (
    <span
      className={`relative inline-flex shrink-0 leading-none ${className}`.trim()}
      data-registered-brand
    >
      {children}
      <sup
        aria-hidden="true"
        className={`pointer-events-none absolute -right-3 top-[58%] -translate-y-1/2 select-none font-sans text-[10px] font-semibold leading-none ${markColor}`}
      >
        ®
      </sup>
      <span className="sr-only">Registered European Union trade mark</span>
    </span>
  );
}
