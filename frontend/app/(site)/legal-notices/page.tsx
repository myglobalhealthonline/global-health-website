import type { Metadata } from "next";
import { LegalPageTemplate } from "@/components/templates/LegalPageTemplate";
import { buildLegalCopy } from "@/lib/content/template-page-data";

export const metadata: Metadata = {
  title: "Legal Notices",
  description: "Legal notices page pending final legal approval.",
  robots: { index: false, follow: true },
};

export default function Page() {
  const copy = buildLegalCopy("Legal Notices");
  return <LegalPageTemplate title="Legal Notices" description={copy.description} sections={copy.sections} />;
}
