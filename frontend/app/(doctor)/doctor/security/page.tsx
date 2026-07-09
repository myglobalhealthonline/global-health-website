import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/portal-atoms";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { DoctorSecurityForm } from "./_components/security-form";

export const dynamic = "force-dynamic";

export default async function DoctorSecurityPage() {
  const locale = await getPageLocale();
  const { doctor: d } = loadLocaleBundle(locale);

  return (
    <>
      <PageHeader
        eyebrow={d.securityPage.eyebrow}
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-6 text-[var(--portal-primary)]" aria-hidden />
            {d.securityPage.title}
          </span>
        }
        description={d.securityPage.description}
      />

      <DoctorSecurityForm
        strings={d.securityPage}
        copyStrings={{ copy: d.shareButton.copy, copied: d.shareButton.copied }}
      />
    </>
  );
}
