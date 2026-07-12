import { redirect } from "next/navigation";

/**
 * Calendar was merged into My bookings as a view toggle (IA-2, owner
 * approved) — this route now just preserves old bookmarks/links by
 * forwarding to the calendar tab.
 */
export default async function AccountCalendarPage() {
  redirect("/account/bookings?tab=calendar");
}
