import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  CalendarCheck2,
  CheckCircle2,
  Circle,
  UserPlus,
} from "lucide-react";
import {
  fetchMeCorporate,
  patchMeCorporateProfile,
  postMeCorporateBeneficiary,
  removeMeCorporateBeneficiary,
  resendMeCorporateBeneficiaryInvite,
} from "@/lib/corporate/corporate-api";
import {
  AdminCard,
  AdminEmptyState,
  Btn,
  PageHeader,
  Pill,
  SectionHeader,
} from "@/components/portal-atoms";
import {
  memberStatusLabel,
  memberStatusTone,
} from "@/app/(portal)/(admin)/admin/corporate/_lib";
import { CorporateBenefitCard } from "@/app/(portal)/(auth)/account/_components/CorporateBenefitCard";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ welcome?: string; success?: string; error?: string }>;
};

function back(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  redirect(`/account/corporate${qs ? `?${qs}` : ""}`);
}

async function addBeneficiaryAction(formData: FormData) {
  "use server";
  const read = (key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value || undefined;
  };
  const firstName = read("firstName");
  const lastName = read("lastName");
  const email = read("email");
  const relationship = read("relationship");
  if (!firstName || !lastName || !email || !relationship) {
    back({ error: "Name, email and relationship are required" });
  }
  const result = await postMeCorporateBeneficiary({
    firstName: firstName!,
    lastName: lastName!,
    email: email!,
    relationship: relationship!,
    phone: read("phone"),
    dateOfBirth: read("dateOfBirth"),
  });
  if (!result.ok) back({ error: result.message });
  revalidatePath("/account/corporate");
  back({ success: "Beneficiary added — invite sent" });
}

/** Self-service escape from PROFILE_INCOMPLETE. `/account/profile` writes the
 *  User row; membership completeness is computed from the membership row, so
 *  this is the only surface that can actually clear the status. */
async function saveCorporateProfileAction(formData: FormData) {
  "use server";
  const read = (key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value || undefined;
  };
  const result = await patchMeCorporateProfile({
    phone: read("phone"),
    dateOfBirth: read("dateOfBirth"),
    addressLine1: read("addressLine1"),
    city: read("city"),
    postalCode: read("postalCode"),
  });
  if (!result.ok) back({ error: result.message });
  revalidatePath("/account/corporate");
  back({ success: "profile" });
}

async function beneficiaryRowAction(formData: FormData) {
  "use server";
  const id = String(formData.get("beneficiaryId") ?? "");
  const action = String(formData.get("action") ?? "");
  if (!id) back({ error: "Invalid action" });
  if (action === "RESEND") {
    const result = await resendMeCorporateBeneficiaryInvite(id);
    if (!result.ok) back({ error: result.message });
    revalidatePath("/account/corporate");
    back({ success: "Invite resent" });
  }
  const result = await removeMeCorporateBeneficiary(id);
  if (!result.ok) back({ error: result.message });
  revalidatePath("/account/corporate");
  back({ success: "Beneficiary removed" });
}

/** `validUntil` arrives as "YYYY-MM-DD"; render it in the portal locale. Parsed
 *  as UTC so a negative-offset browser can't roll the date back a day. */
function formatCardDate(isoDate: string, locale: string) {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function AccountCorporatePage({ searchParams }: PageProps) {
  const [sp, result, locale, user] = await Promise.all([
    searchParams ? searchParams : Promise.resolve({} as NonNullable<Awaited<PageProps["searchParams"]>>),
    fetchMeCorporate(),
    getPortalLocale(),
    // Request-cached — the portal layout already resolved the session user.
    getServerAuthUser(),
  ]);
  const account = loadLocaleBundle(locale).account;
  const t = account.corporate;
  // Card field labels are shared with the private-membership card.
  const tMembership = account.membership;

  if (!result.ok) {
    return (
      <>
        <PageHeader eyebrow={t.eyebrow} title={t.title} />
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">{result.message}</p>
        </AdminCard>
      </>
    );
  }
  const membership = result.data;
  if (!membership) {
    return (
      <>
        <PageHeader eyebrow={t.eyebrow} title={t.title} />
        <AdminEmptyState
          as="h2"
          icon={<BadgeCheck className="size-8" aria-hidden />}
          title={t.noMembershipTitle}
          description={t.noMembershipBody}
        />
      </>
    );
  }

  const isEmployee = membership.memberType === "EMPLOYEE";
  const onboarding = membership.onboarding;
  const showChecklist =
    isEmployee && onboarding && !["ACTIVE", "SUSPENDED", "REMOVED"].includes(membership.status);
  const card = membership.card;
  const beneficiaries = (membership.beneficiaries ?? []).filter((b) => b.status !== "REMOVED");
  const maxBeneficiaries = membership.maxBeneficiaries ?? 5;
  const openRequests = membership.openRequests ?? [];

  // Employees compute completeness from the membership row; a beneficiary is
  // simply left in PROFILE_INCOMPLETE until theirs is filled in.
  const needsProfile = isEmployee
    ? Boolean(onboarding && !onboarding.profileComplete)
    : membership.status === "PROFILE_INCOMPLETE";
  const profile = membership.profile;

  const checklist = onboarding
    ? [
        { label: t.stepAccount, done: true },
        // Anchors at the form below — /account/profile writes the User row,
        // which never clears this step.
        { label: t.stepProfile, done: onboarding.profileComplete, href: "#corporate-profile", cta: t.completeProfile },
        {
          label: t.stepBook,
          done: onboarding.preAssessment.booked,
          href: onboarding.profileComplete ? onboarding.preAssessment.bookPath : null,
          cta: t.bookNow,
        },
        { label: t.stepDone, done: onboarding.preAssessment.completed },
      ]
    : [];

  return (
    <>
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={`${membership.companyName} · ${membership.planName}${
          isEmployee ? "" : ` · ${t.beneficiary}`
        }`}
        actions={
          <Pill tone={memberStatusTone(membership.status)}>
            {memberStatusLabel(membership.status)}
          </Pill>
        }
      />

      {/* 20-003: inactive-plan notice is the most actionable state, so it
          renders first; error/success/welcome follow in priority order. */}
      {!membership.companyLive ? (
        <p className="gh-status-warning mb-4 rounded-md border px-4 py-3 text-sm">
          {t.inactiveNotice}
        </p>
      ) : null}
      {sp.error ? (
        <p className="gh-status-warning mb-4 rounded-md border px-4 py-3 text-sm">{sp.error}</p>
      ) : null}
      {sp.success ? (
        <p className="gh-status-success mb-4 rounded-md border px-4 py-3 text-sm">
          {sp.success === "profile" ? t.profileSaved : sp.success}
        </p>
      ) : null}
      {sp.welcome ? (
        <p className="gh-status-success mb-4 rounded-md border px-4 py-3 text-sm">
          {t.welcome.replace("{company}", membership.companyName)}
          {showChecklist ? t.welcomeFinish : "."}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Onboarding checklist */}
        {showChecklist ? (
          <AdminCard padding={0} className="overflow-hidden lg:col-span-2">
            <SectionHeader as="h2" title={t.checklistTitle} description={t.checklistDesc} />
            <ul className="m-0 list-none divide-y divide-[var(--color-border)] p-0">
              {checklist.map((step) => (
                <li key={step.label} className="flex items-center gap-3 px-5 py-3.5">
                  {step.done ? (
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-hidden />
                  ) : (
                    <Circle className="size-5 shrink-0 text-[var(--color-text-muted)]" aria-hidden />
                  )}
                  <span
                    className={`flex-1 text-sm ${
                      step.done
                        ? "font-semibold text-[var(--color-text-primary)]"
                        : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    {step.label}
                  </span>
                  {!step.done && step.href && step.cta ? (
                    <Btn href={step.href} variant="primary" size="sm" iconLeft={<CalendarCheck2 className="size-3.5" aria-hidden />}>
                      {step.cta}
                    </Btn>
                  ) : null}
                </li>
              ))}
            </ul>
          </AdminCard>
        ) : null}

        {/* Membership profile — only while it is blocking the member. */}
        {needsProfile ? (
          <div id="corporate-profile" className="lg:col-span-2">
          <AdminCard padding={0} className="overflow-hidden">
            <SectionHeader as="h2" title={t.profileTitle} description={t.profileDesc} />
            <form
              action={saveCorporateProfileAction}
              className="grid grid-cols-1 gap-3 border-t border-[var(--color-border)] px-5 py-4 sm:grid-cols-3"
            >
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">{t.dateOfBirth} *</span>
                <input
                  name="dateOfBirth"
                  type="date"
                  required
                  defaultValue={profile?.dateOfBirth ?? ""}
                  className="gh-input"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">{t.phoneWhatsApp} *</span>
                <input
                  name="phone"
                  required
                  maxLength={40}
                  defaultValue={profile?.phone ?? ""}
                  className="gh-input"
                />
              </label>
              {isEmployee ? (
                <label className="flex flex-col gap-1">
                  <span className="gh-field-label">{t.profileAddress} *</span>
                  <input
                    name="addressLine1"
                    required
                    maxLength={240}
                    defaultValue={profile?.addressLine1 ?? ""}
                    className="gh-input"
                  />
                </label>
              ) : null}
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">{t.profileCity}</span>
                <input
                  name="city"
                  maxLength={120}
                  defaultValue={profile?.city ?? ""}
                  className="gh-input"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">{t.profilePostalCode}</span>
                <input
                  name="postalCode"
                  maxLength={24}
                  defaultValue={profile?.postalCode ?? ""}
                  className="gh-input"
                />
              </label>
              <div className="flex justify-end sm:col-span-3">
                <Btn type="submit" variant="primary" size="sm">
                  {t.profileSave}
                </Btn>
              </div>
            </form>
          </AdminCard>
          </div>
        ) : null}

        {/* Digital benefit card — full width: the card face is 1.5:1, and the
            member number is long enough that a half column squeezes it. */}
        <AdminCard padding={0} className="overflow-hidden lg:col-span-2">
          <SectionHeader as="h2" title={t.cardTitle} description={t.cardDesc} />
          <div className="p-5">
            {card ? (
              <CorporateBenefitCard
                planName={membership.planName}
                planSuffix={t.cardPlanSuffix}
                cardholderName={user?.fullName ?? ""}
                memberTypeLabel={
                  card.memberType === "EMPLOYEE" ? t.employeeMember : t.beneficiaryMember
                }
                cardNumber={card.cardNumber}
                validThrough={formatCardDate(card.validUntil, locale)}
                status={card.status}
                labels={{
                  subtitle: t.cardSubtitle,
                  cardholder: tMembership.cardCardholder,
                  memberId: tMembership.cardMemberId,
                  validThrough: tMembership.cardValidThrough,
                }}
              />
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">{t.cardPending}</p>
            )}
            {card ? (
              <p className="mt-3 text-xs text-[var(--color-text-muted)]">
                {t.valid} {card.validFrom} → {card.validUntil} · {t.verifyAt}{" "}
                <span className="font-mono">/card-verify/{card.cardNumber}</span>
              </p>
            ) : null}
            {card && card.status !== "ACTIVE" ? (
              <p className="gh-status-warning mt-3 rounded-md border px-4 py-3 text-sm">
                {t.cardInactive}
              </p>
            ) : null}
          </div>
        </AdminCard>

        {/* Open requests */}
        <AdminCard padding={0} className="overflow-hidden">
          <SectionHeader as="h2" title={t.requestsTitle} description={t.requestsDesc} />
          {openRequests.length === 0 ? (
            <p className="px-5 py-4 text-sm text-[var(--color-text-muted)]">
              {t.requestsEmpty}
            </p>
          ) : (
            <ul className="m-0 list-none divide-y divide-[var(--color-border)] p-0">
              {openRequests.map((request) => (
                <li key={request.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {request.label}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {t.requested}{" "}
                      {new Date(request.createdAt).toLocaleDateString(locale, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  {request.status === "BOOKED" ? (
                    <Pill tone="info">{t.booked}</Pill>
                  ) : request.bookPath ? (
                    <Btn href={request.bookPath} variant="primary" size="sm">
                      {t.bookNow}
                    </Btn>
                  ) : (
                    <Pill tone="pending">{t.pending}</Pill>
                  )}
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        {/* Beneficiaries (employee only) */}
        {isEmployee ? (
          <AdminCard padding={0} className="overflow-hidden lg:col-span-2">
            <SectionHeader
              as="h2"
              title={t.beneficiariesTitle}
              description={t.beneficiariesUsage
                .replace("{used}", String(beneficiaries.length))
                .replace("{max}", String(maxBeneficiaries))}
            />
            {beneficiaries.length > 0 ? (
              <ul className="m-0 list-none divide-y divide-[var(--color-border)] border-t border-[var(--color-border)] p-0">
                {beneficiaries.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {b.firstName} {b.lastName}
                        <span className="ml-2 text-xs font-normal text-[var(--color-text-muted)]">
                          {b.relationship}
                        </span>
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">{b.email}</p>
                    </div>
                    <Pill tone={memberStatusTone(b.status)}>{memberStatusLabel(b.status)}</Pill>
                    <div className="flex items-center gap-1.5">
                      {["INVITED", "INVITE_SENT", "INVITE_FAILED"].includes(b.status) ? (
                        <form action={beneficiaryRowAction}>
                          <input type="hidden" name="beneficiaryId" value={b.id} />
                          <input type="hidden" name="action" value="RESEND" />
                          <Btn
                            type="submit"
                            variant="ghost"
                            size="sm"
                            aria-label={`${t.resendInvite} ${b.firstName} ${b.lastName}`}
                          >
                            {t.resendInvite}
                          </Btn>
                        </form>
                      ) : null}
                      <form action={beneficiaryRowAction}>
                        <input type="hidden" name="beneficiaryId" value={b.id} />
                        <input type="hidden" name="action" value="REMOVE" />
                        <Btn
                          type="submit"
                          variant="danger"
                          size="sm"
                          aria-label={`${t.remove} ${b.firstName} ${b.lastName}`}
                        >
                          {t.remove}
                        </Btn>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}

            {beneficiaries.length < maxBeneficiaries ? (
              <details className="border-t border-[var(--color-border)]">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 text-sm font-bold text-[var(--color-text-primary)] [&::-webkit-details-marker]:hidden">
                  <UserPlus className="size-4" aria-hidden /> {t.addBeneficiary}
                </summary>
                <form
                  action={addBeneficiaryAction}
                  className="grid grid-cols-1 gap-3 border-t border-[var(--color-border)] px-5 py-4 sm:grid-cols-3"
                >
                  <label className="flex flex-col gap-1">
                    <span className="gh-field-label">{t.firstName} *</span>
                    <input name="firstName" required maxLength={120} className="gh-input" />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="gh-field-label">{t.lastName} *</span>
                    <input name="lastName" required maxLength={120} className="gh-input" />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="gh-field-label">{t.email} *</span>
                    <input name="email" type="email" required maxLength={320} className="gh-input" />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="gh-field-label">{t.relationship} *</span>
                    <select name="relationship" required defaultValue="" className="gh-select">
                      <option value="" disabled>
                        {t.select}
                      </option>
                      <option value="Spouse">{t.spouse}</option>
                      <option value="Child">{t.child}</option>
                      <option value="Parent">{t.parent}</option>
                      <option value="Other">{t.other}</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="gh-field-label">{t.phoneWhatsApp}</span>
                    <input name="phone" maxLength={40} className="gh-input" />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="gh-field-label">{t.dateOfBirth}</span>
                    <input name="dateOfBirth" type="date" className="gh-input" />
                  </label>
                  <div className="flex justify-end sm:col-span-3">
                    <Btn type="submit" variant="primary" size="sm">
                      {t.addAndInvite}
                    </Btn>
                  </div>
                </form>
              </details>
            ) : (
              <p className="border-t border-[var(--color-border)] px-5 py-3.5 text-sm text-[var(--color-text-muted)]">
                {t.maxReached.replace("{max}", String(maxBeneficiaries))}
              </p>
            )}
          </AdminCard>
        ) : null}
      </div>

      {isEmployee ? (
        <p className="mt-4 text-xs text-[var(--color-text-muted)]">{t.privacyNote}</p>
      ) : null}
    </>
  );
}
