/**
 * Shared portal atoms — re-exports the design-system primitives from
 * the admin component library so admin, doctor, and patient portals
 * use the same `PageHeader`, `AdminCard`, `StatCard`, `Btn`, etc.
 *
 * Path is intentionally indirect: the canonical definitions still live
 * under `app/(admin)/admin/_components/atoms.tsx` (where they've matured
 * via admin usage). This shim lets non-admin pages import without
 * reaching across route groups in their own code.
 */
export {
  PageHeader,
  Eyebrow,
  SectionHeader,
  AdminCard,
  AdminEmptyState,
  AdminSummaryStrip,
  StatCard,
  Pill,
  AdminTable,
  Thead,
  Th,
  Td,
  Tr,
  IconBtn,
  Toggle,
  Btn,
  CommandBand,
} from "@/app/(admin)/admin/_components/atoms";

export type {
  StatTone,
  PillTone,
  BtnVariant,
  BtnSize,
  CommandBandMetric,
} from "@/app/(admin)/admin/_components/atoms";
