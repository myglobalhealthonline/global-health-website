import type { Metadata } from "next";
import { BookingFormTemplate } from "@/components/templates/BookingFormTemplate";
import { getBookingPageData } from "@/lib/content/booking-page-data";
import { getServerAuthUser } from "@/lib/api/server-auth";

export const metadata: Metadata = {
  title: "Book Online",
  description: "Submit an online consultation request and our clinic team will follow up.",
};

export default async function Page() {
  const data = getBookingPageData("en");
  const authUser = await getServerAuthUser();
  const signedInPatient =
    authUser && (authUser.role === "PATIENT" || authUser.role === "ADMIN")
      ? {
          fullName: authUser.fullName,
          email: authUser.email,
          phone: authUser.phone,
        }
      : null;
  return <BookingFormTemplate {...data} signedInPatient={signedInPatient} />;
}
