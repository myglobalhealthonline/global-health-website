import type { Metadata } from "next";
import { BookingFormTemplate } from "@/components/templates/BookingFormTemplate";
import { getBookingPageData } from "@/lib/content/booking-page-data";

export const metadata: Metadata = {
  title: "Book Online",
  description: "Submit an online consultation request and our clinic team will follow up.",
};

export default function Page() {
  const data = getBookingPageData("en");
  return <BookingFormTemplate {...data} />;
}
