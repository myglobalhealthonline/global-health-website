import { cn } from "@/lib/utils/cn";

/**
 * Country flag atom. Replaces a 5-row `FLAG_CLASS` lookup that lived
 * inline in CountrySwitcher / MobileNav / DoctorWall / HomeHero — same
 * mapping repeated four times, drifting independently. The rendered
 * class is the ISO-3166 code consumed by
 * `flag-icons`.
 */

const ISO: Record<string, string> = {
  ie: "ie",
  pt: "pt",
  sp: "es",
  cz: "cz",
  rm: "ro",
  br: "br",
  mt: "mt",
};

type FlagProps = {
  /** Internal country code as used in routing / cart / doctor data. */
  code: string;
  /** Visual size — `sm` 16px, `md` 20px, `lg` 24px. Defaults to `md`. */
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function Flag({ code, size = "md", className }: FlagProps) {
  const iso = ISO[code.toLowerCase()] ?? code.toLowerCase();
  return (
    <span
      aria-hidden
      className={cn(
        "fi inline-block flex-shrink-0",
        `fi-${iso}`,
        size === "sm" && "text-[1rem] leading-none",
        size === "md" && "text-[1.25rem] leading-none",
        size === "lg" && "text-[1.5rem] leading-none",
        className,
      )}
    />
  );
}
