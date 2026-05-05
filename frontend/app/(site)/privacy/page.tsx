import type { Metadata } from "next";
import { LegalPageTemplate } from "@/components/templates/LegalPageTemplate";
import { buildLegalCopy } from "@/lib/content/template-page-data";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Legal/static template page.",
};

export default function Page() {
  const copy = buildLegalCopy("Privacy Policy");
  return <LegalPageTemplate title="Privacy Policy" description={copy.description} sections={copy.sections} />;
}
