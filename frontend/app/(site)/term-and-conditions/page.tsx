import type { Metadata } from "next";
import { LegalPageTemplate } from "@/components/templates/LegalPageTemplate";
import { buildLegalCopy } from "@/lib/content/template-page-data";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "Terms and conditions page pending final legal approval.",
  robots: { index: false, follow: true },
};

export default function Page() {
  const copy = buildLegalCopy("Terms and Conditions");
  return <LegalPageTemplate title="Terms and Conditions" description={copy.description} sections={copy.sections} />;
}
