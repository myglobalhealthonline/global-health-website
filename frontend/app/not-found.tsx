import Link from "next/link";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";

export default async function NotFound() {
  const locale = await getPageLocale();
  const { notFound } = getCommonLocale(locale);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{notFound.title}</h1>
      <p className="max-w-md text-sm text-[var(--color-text-muted)]">{notFound.body}</p>
      <Link href="/" className="gh-btn gh-btn-primary">
        {notFound.cta}
      </Link>
    </div>
  );
}
