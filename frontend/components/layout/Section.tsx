import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils/cn";

type SectionProps = ComponentPropsWithoutRef<"section"> & {
  variant?: "default" | "white" | "soft" | "primary" | "dark";
};

export function Section({ className, variant = "default", ...props }: SectionProps) {
  return (
    <section
      className={cn(
        "py-12 sm:py-16 lg:py-24",
        variant === "white" && "gh-section-white",
        variant === "soft" && "gh-section-soft",
        variant === "primary" && "gh-section-primary",
        variant === "dark" && "gh-section-dark",
        className,
      )}
      {...props}
    />
  );
}
