import Link from "next/link";
import { fetchDoctorMe, fetchDoctorProfileChangeRequests } from "@/lib/api/doctor-api";
import { PageHeader } from "@/components/portal-atoms";
import { ProfileSections, type ProfileStrings } from "./_components/profile-sections";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

export default async function DoctorProfilePage() {
  const locale = await getPageLocale();
  const { doctor: d } = loadLocaleBundle(locale);
  const [result, changeRequestsResult] = await Promise.all([
    fetchDoctorMe(),
    fetchDoctorProfileChangeRequests(),
  ]);
  if (!result.ok) {
    return (
      <div className="gh-card p-6">
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
          {result.message}
        </p>
        <Link href="/doctor/profile" className="gh-btn gh-btn-soft text-sm mt-3 inline-flex">
          {d.common.tryAgain}
        </Link>
      </div>
    );
  }
  const { doctor } = result.data;
  // A failed change-request fetch degrades to "no pending requests": the
  // fields render editable and a stale submit is rejected by the backend's
  // pending-uniqueness check, which is a better failure than blocking the
  // whole profile page over a secondary read.
  const changeRequests = changeRequestsResult.ok ? changeRequestsResult.data.items : [];

  return (
    <>
      <PageHeader className="mb-6" eyebrow={d.profile.eyebrow} title={d.profile.title} description={d.profile.editDescription} />
      {/* ponytail: cast — cs/ro/de doctor.json still lag en's profile keys (separate backfill task); drop cast once locales match */}
      <ProfileSections
        doctor={doctor}
        changeRequests={changeRequests}
        strings={d.profile as ProfileStrings}
      />
    </>
  );
}
