import { Suspense } from "react";
import { cookies } from "next/headers";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { ResetPasswordClient } from "./_components/ResetPasswordClient";

// Server wrapper: resolve the locale from the gh_locale cookie here so the
// client no longer imports the all-locale bundle (P-001). Reading the cookie
// server-side also renders the correct language on first paint (no EN flash).
export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale({ cookieLocale: cookieStore.get("gh_locale")?.value ?? null });
  const { auth } = loadLocaleBundle(locale);
  return (
    <Suspense fallback={<div className="min-h-[100svh]" aria-busy="true" />}>
      <ResetPasswordClient t={auth.resetPassword} shell={auth.shell} />
    </Suspense>
  );
}
