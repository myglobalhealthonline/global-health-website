import { CalendarMonthSkeleton } from "@/components/portal-skeletons";

export default function DoctorCalendarLoading() {
  return (
    <div className="grid gap-4">
      <CalendarMonthSkeleton />
    </div>
  );
}
