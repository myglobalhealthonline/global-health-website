import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { MedicalFilesClient } from "./MedicalFilesClient";

export default async function MedicalFilesPage() {
  const locale = await getPortalLocale();
  const { account: a } = loadLocaleBundle(locale);

  return (
    <MedicalFilesClient
      eyebrow={a.medicalFiles.breadcrumb}
      title={a.medicalFiles.title}
      description={a.medicalFiles.subtitle}
      downloadAllLabel={a.medicalFiles.downloadAll}
      downloadingAllLabel={a.medicalFiles.downloadingAll}
      labels={a.medicalFiles}
    />
  );
}
