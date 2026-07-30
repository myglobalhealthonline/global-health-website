import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { DoctorSecurityForm } from "./_components/security-form";

export const dynamic = "force-dynamic";

export default async function DoctorSecurityPage() {
  const locale = await getPortalLocale();
  const { doctor: d } = loadLocaleBundle(locale);

  return (
    <DoctorSecurityForm
      strings={d.securityPage}
      copyStrings={{ copy: d.shareButton.copy, copied: d.shareButton.copied }}
    />
  );
}
