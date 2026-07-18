import type { Metadata } from "next";
import { AccessRequestPageClient } from "./AccessRequestPageClient";

export const metadata: Metadata = { title: "Medical file access request" };

export default async function AccessRequestPage() {
  return <AccessRequestPageClient />;
}
