import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { PatientUploadPageClient } from "./PatientUploadPageClient";

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
