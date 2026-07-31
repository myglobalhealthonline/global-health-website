import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * The calendar and availability pages merged into one schedule surface at
 * /doctor/availability. This route stays as a redirect rather than a 404:
 * doctors have it bookmarked, the dashboard and appointments page linked here
 * for months, and the e2e suite walks it.
 */
export default function DoctorCalendarRedirect() {
  redirect("/doctor/availability");
}
