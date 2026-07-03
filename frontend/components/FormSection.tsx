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
}: {
  title: ReactNode;
  description?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AdminCard padding={0} className={`gh-form-section ${className}`}>
      <SectionHeader title={title} description={description} right={right} />
      <div className="gh-form-section__grid">{children}</div>
    </AdminCard>
  );
}
