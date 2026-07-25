/**
 * Re-export shim — the skeleton kit lives at `components/portal-skeletons.tsx`
 * (DESIGN.md §5.16) so Doctor/Patient can import it too. This file exists
 * only so existing Admin `loading.tsx` imports keep working unchanged.
 */
export {
  PageHeaderSkeleton,
  SummaryStripSkeleton,
  FilterBarSkeleton,
  TableSkeleton,
  FormSkeleton,
  ListPageSkeleton,
  CommandBandSkeleton,
  StatGridSkeleton,
  CalendarMonthSkeleton,
  ChatThreadSkeleton,
  DashboardSkeleton,
} from "@/components/portal-skeletons";
