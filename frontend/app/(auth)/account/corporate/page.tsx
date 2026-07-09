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
} from "@/app/(admin)/admin/corporate/_lib";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
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

const CARD_STATUS_STYLE: Record<string, string> = {
  ACTIVE: "text-lime-300",
  SUSPENDED: "text-amber-300",
  EXPIRED: "text-rose-300",
};

export default async function AccountCorporatePage({ searchParams }: PageProps) {
  const [sp, result, locale] = await Promise.all([
    searchParams ? searchParams : Promise.resolve({} as NonNullable<Awaited<PageProps["searchParams"]>>),
    fetchMeCorporate(),
    getPageLocale(),
  ]);
  const t = loadLocaleBundle(locale).account.corporate;

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

  const checklist = onboarding
    ? [
        { label: t.stepAccount, done: true },
        { label: t.stepProfile, done: onboarding.profileComplete, href: "/account/profile", cta: t.completeProfile },
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

      {sp.welcome ? (
        <p className="gh-status-success mb-4 rounded-md border px-4 py-3 text-sm">
          {t.welcome.replace("{company}", membership.companyName)}
          {showChecklist ? t.welcomeFinish : "."}
        </p>
      ) : null}
      {sp.error ? (
        <p className="gh-status-warning mb-4 rounded-md border px-4 py-3 text-sm">{sp.error}</p>
      ) : null}
      {sp.success ? (
        <p className="gh-status-success mb-4 rounded-md border px-4 py-3 text-sm">{sp.success}</p>
      ) : null}
      {!membership.companyLive ? (
        <p className="gh-status-warning mb-4 rounded-md border px-4 py-3 text-sm">
          {t.inactiveNotice}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Onboarding checklist */}
        {showChecklist ? (
          <AdminCard padding={0} className="overflow-hidden lg:col-span-2">
            <SectionHeader title={t.checklistTitle} description={t.checklistDesc} />
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

        {/* Digital benefit card */}
        <AdminCard padding={0} className="overflow-hidden">
          <SectionHeader title={t.cardTitle} description={t.cardDesc} />
          <div className="border-t border-[var(--color-border)] p-5">
            {card ? (
              <div
                className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg ${
                  card.status !== "ACTIVE" ? "opacity-75 grayscale-[35%]" : ""
                }`}
                style={{
                  background:
                    "linear-gradient(135deg, #101713 0%, #16241c 55%, #0d3a28 100%)",
                }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full opacity-20"
                  style={{ background: "radial-gradient(circle, #b0f122 0%, transparent 70%)" }}
                />
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lime-200/80">
                    Global Health · {membership.planName}
                  </p>
                  <span
                    className={`text-[11px] font-bold uppercase tracking-[0.12em] ${
                      CARD_STATUS_STYLE[card.status] ?? "text-white/70"
                    }`}
                  >
                    {card.status}
                  </span>
                </div>
                <p className="mt-6 text-lg font-bold tracking-tight">{membership.companyName}</p>
                <p className="text-sm text-white/70">
                  {card.memberType === "EMPLOYEE" ? t.employeeMember : t.beneficiaryMember}
                </p>
                <p className="mt-5 font-mono text-xl tracking-[0.14em]">{card.cardNumber}</p>
                <div className="mt-4 flex items-end justify-between gap-3 text-[11px] text-white/60">
                  <span>
                    {t.valid} {card.validFrom} → {card.validUntil}
                  </span>
                  <span className="text-right">
                    {t.verifyAt}
                    <br />
                    <span className="font-mono text-white/80">/card-verify/{card.cardNumber}</span>
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">{t.cardPending}</p>
            )}
            {card && card.status !== "ACTIVE" ? (
              <p className="gh-status-warning mt-3 rounded-md border px-4 py-3 text-sm">
                {t.cardInactive}
              </p>
            ) : null}
          </div>
        </AdminCard>

        {/* Open requests */}
        <AdminCard padding={0} className="overflow-hidden">
          <SectionHeader title={t.requestsTitle} description={t.requestsDesc} />
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
                          <Btn type="submit" variant="ghost" size="sm">
                            {t.resendInvite}
                          </Btn>
                        </form>
                      ) : null}
                      <form action={beneficiaryRowAction}>
                        <input type="hidden" name="beneficiaryId" value={b.id} />
                        <input type="hidden" name="action" value="REMOVE" />
                        <Btn type="submit" variant="danger" size="sm">
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
                  <div className="sm:col-span-3">
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
