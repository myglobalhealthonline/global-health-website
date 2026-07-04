import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils/cn";

type SectionProps = ComponentPropsWithoutRef<"section"> & {
  variant?: "default" | "white" | "soft" | "primary" | "dark";
  pattern?: "none" | "soft" | "dark" | "panel";
};

export function Section({ className, variant = "default", pattern = "none", ...props }: SectionProps) {
  return (
    <section
      className={cn(
        // Token-driven public section rhythm (see .gh-section-sm) instead
        // of hardcoded py-* steps that drifted from --space-section.
        "gh-section-sm",
        variant === "white" && "gh-section-white",
        variant === "soft" && "gh-section-soft",
        variant === "primary" && "gh-section-primary",
        variant === "dark" && "gh-section-dark",
        pattern === "soft" && "gh-medical-pattern gh-medical-pattern-soft",
        pattern === "dark" && "gh-medical-pattern gh-medical-pattern-dark",
        pattern === "panel" && "gh-medical-pattern gh-medical-pattern-panel",
        className,
      )}
      {...props}
    />
  );
}
