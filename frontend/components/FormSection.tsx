import type { ReactNode } from "react";
import { AdminCard, SectionHeader } from "@/components/portal-atoms";

/**
 * FormSection — DESIGN.md §5.11. L3 card + SectionHeader + a 2-col grid
 * (1-col below 900px). New primitive shared by all three portals.
 */
export function FormSection({
  title,
  description,
  right,
  children,
  className = "",
  titleAs,
}: {
  title: ReactNode;
  description?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Heading level for the section title (default "h3" via SectionHeader).
   *  Pass "h2" when this section renders directly under the page's h1 with
   *  nothing else at h2 level, to keep the heading outline unbroken. */
  titleAs?: "h2" | "h3" | "h4";
}) {
  return (
    <AdminCard padding={0} className={`gh-form-section ${className}`}>
      <SectionHeader title={title} description={description} right={right} as={titleAs} />
      <div className="gh-form-section__grid">{children}</div>
    </AdminCard>
  );
}
