import { Globe, Phone, UserPen } from "lucide-react";

export type BookingSource = "WEBSITE" | "MANUAL" | "AI_CALL" | string;

const CONFIG: Record<string, { label: string; Icon: typeof Globe }> = {
  WEBSITE: { label: "Booked via website", Icon: Globe },
  MANUAL: { label: "Booked manually by admin", Icon: UserPen },
  AI_CALL: { label: "Booked via AI call", Icon: Phone },
};

/** Small provenance icon for the orders table / dashboard activity feed —
 *  website (globe), admin manual entry (hand with pen), AI phone agent
 *  (phone). Falls back to the website icon for any unrecognized value. */
export function BookingSourceIcon({ source }: { source: BookingSource }) {
  const { label, Icon } = CONFIG[source] ?? CONFIG.WEBSITE;
  return (
    <span
      className="gh-booking-source-icon inline-flex items-center justify-center"
      title={label}
      aria-label={label}
    >
      <Icon className="size-3.5" aria-hidden />
    </span>
  );
}
