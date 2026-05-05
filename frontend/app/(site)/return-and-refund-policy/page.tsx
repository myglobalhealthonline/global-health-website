import type { Metadata } from "next";
import { LegalPageTemplate } from "@/components/templates/LegalPageTemplate";
import { buildLegalCopy } from "@/lib/content/template-page-data";

export const metadata: Metadata = {
  title: "Refund and Return Policy",
  description: "Legal/static template page.",
};

export default function Page() {
  const copy = buildLegalCopy("Refund and Return Policy");
  return <LegalPageTemplate title="Refund and Return Policy" description={copy.description} sections={copy.sections} />;
}
