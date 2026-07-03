import { CalendarMonthSkeleton } from "../_components/skeletons";

export default function AdminCalendarLoading() {
  return (
    <div className="gh-admin-calendar-ui grid gap-4">
      <CalendarMonthSkeleton />
    </div>
  );
}
