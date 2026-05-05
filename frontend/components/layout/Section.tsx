import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils/cn";

type SectionProps = ComponentPropsWithoutRef<"section">;

export function Section({ className, ...props }: SectionProps) {
  return (
    <section
      className={cn(
        "py-[var(--section-padding-y-xs)] sm:py-[var(--section-padding-y-sm)] lg:py-[var(--section-padding-y)]",
        className,
      )}
      {...props}
    />
  );
}
