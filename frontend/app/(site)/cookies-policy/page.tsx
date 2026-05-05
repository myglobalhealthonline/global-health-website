import type { Metadata } from "next";
import { LegalPageTemplate } from "@/components/templates/LegalPageTemplate";
import { buildLegalCopy } from "@/lib/content/template-page-data";

export const metadata: Metadata = {
  title: "Cookies Policy",
  description: "Legal/static template page.",
};

export default function Page() {
  const copy = buildLegalCopy("Cookies Policy");
  return <LegalPageTemplate title="Cookies Policy" description={copy.description} sections={copy.sections} />;
}
