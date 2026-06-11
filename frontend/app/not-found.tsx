import Link from "next/link";
import { GH2StatusPage } from "@/components/sections/GH2PagePrimitives";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";

export default async function NotFound() {
  const locale = await getPageLocale();
  const { notFound } = getCommonLocale(locale);

  return (
    <GH2StatusPage status="error" title={notFound.title} body={notFound.body}>
      <Link href="/" className="gh2-btn-lime">
        {notFound.cta}
      </Link>
    </GH2StatusPage>
  );
}
