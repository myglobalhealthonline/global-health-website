import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils/cn";

type SectionProps = ComponentPropsWithoutRef<"section">;

export function Section({ className, ...props }: SectionProps) {
  return (
    <section
      className={cn("py-16 sm:py-20 lg:py-[var(--section-padding-y)]", className)}
      {...props}
    />
  );
}
