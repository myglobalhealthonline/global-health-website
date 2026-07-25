import type { Metadata } from "next";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { PatientUploadPageClient } from "./PatientUploadPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale(); const common = getCommonLocale(locale);
  return buildPublicMetadata({ path: "/patient-upload", title: common.flow.patientUploadTitle, description: common.flow.patientUploadSubtitle, locale, kind: "page", subtitle: common.flow.patientUploadStepUpload, noindex: true });
}

export default async function PatientUploadPage() {
  const locale = await getPageLocale();
  const common = getCommonLocale(locale);
  const { home } = loadLocaleBundle(locale);

  return (
    <PatientUploadPageClient
      flow={common.flow}
      uploadHeading={home.flow.patientUploadHeading}
    />
  );
}
