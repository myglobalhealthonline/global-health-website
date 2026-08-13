import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { fetchCorporateEmployeeById } from "@/lib/corporate/corporate-api";
import {
  AdminCard,
  PageHeader,
  Pill,
  SectionHeader,
} from "@/components/portal-atoms";
import {
  formatDate,
  memberStatusLabel,
  memberStatusTone,
  requestStatusLabel,
  requestStatusTone,
  REQUEST_TYPE_LABELS,
} from "@/app/(portal)/(admin)/admin/corporate/_lib";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { SetCrumbTitle } from "@/components/crumb-title";

export const dynamic = "force-dynamic";

/** Onboarding milestones derived from the status machine — privacy-safe
 *  (booleans only, no appointment content). */
function milestones(
  status: string,
  preAssessment: { booked: boolean; completed: boolean },
  t: ReturnType<typeof loadLocaleBundle>["corporate"]["employees"]["detail"],
) {
  const reached = (targets: string[]) => targets.includes(status);
  return [
    {
      label: t.milestoneInviteAccepted,
      done: !["DRAFT", "INVITED", "INVITE_SENT", "INVITE_FAILED"].includes(status),
    },
    {
      label: t.milestoneProfileComplete,
      done:
        ["PROFILE_COMPLETE", "PREASSESSMENT_PENDING", "PREASSESSMENT_BOOKED"].includes(status) ||
        reached(["ACTIVE", "SUSPENDED"]),
    },
    { label: t.milestonePreassessmentBooked, done: preAssessment.booked || reached(["ACTIVE", "SUSPENDED"]) },
    { label: t.milestonePreassessmentCompleted, done: preAssessment.completed },
  ];
}

export default async function CorporateEmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, locale] = await Promise.all([fetchCorporateEmployeeById(id), getPortalLocale()]);
  const t = loadLocaleBundle(locale).corporate.employees.detail;
  if (!result.ok) {
    if (result.status === 404) notFound();
    return (
      <>
        <PageHeader eyebrow={t.eyebrow} title={t.loadErrorFallback} />
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">{result.message}</p>
        </AdminCard>
      </>
    );
  }
  const employee = result.data;
  const steps = milestones(employee.status, employee.preAssessment, t);

  return (
    <>
      <SetCrumbTitle label={`${employee.firstName} ${employee.lastName}`} />
      <PageHeader
        eyebrow={t.eyebrow}
        title={`${employee.firstName} ${employee.lastName}`}
        description={employee.email}
        actions={
          <Pill tone={memberStatusTone(employee.status)}>{memberStatusLabel(employee.status)}</Pill>
        }
      />

      <Link
        href="/corporate/employees"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-muted)] hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> {t.backToAll}
      </Link>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Onboarding timeline */}
        <AdminCard padding={0} className="overflow-hidden">
          <SectionHeader
            title={t.onboardingTitle}
            description={t.onboardingDescription}
          />
          <ul className="m-0 list-none divide-y divide-[var(--color-border)] p-0">
            {steps.map((step) => (
              <li key={step.label} className="flex items-center gap-3 px-5 py-3">
                {step.done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <Circle className="size-5 shrink-0 text-[var(--color-text-muted)]" aria-hidden />
                )}
                <span
                  className={`text-sm ${
                    step.done
                      ? "font-semibold text-[var(--color-text-primary)]"
                      : "text-[var(--color-text-muted)]"
                  }`}
                >
                  {step.label}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-[var(--color-border)] px-5 py-3 text-sm text-[var(--color-text-muted)]">
            {employee.preAssessment.scheduledAt ? (
              <>{t.preassessmentScheduled.replace("{date}", formatDate(employee.preAssessment.scheduledAt))}</>
            ) : null}
            {employee.beneficiaryCount === 1
              ? t.beneficiariesAddedBy.replace("{count}", String(employee.beneficiaryCount))
              : t.beneficiariesAddedByPlural.replace("{count}", String(employee.beneficiaryCount))}
          </div>
        </AdminCard>

        {/* Details */}
        <AdminCard padding={0} className="overflow-hidden">
          <SectionHeader title={t.detailsTitle} />
          <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-3 px-5 py-4 text-sm sm:grid-cols-2">
            {[
              [t.fieldPhone, employee.phone],
              [t.fieldDepartment, employee.department],
              [t.fieldJobTitle, employee.jobTitle],
              [t.fieldEmployeeCode, employee.employeeCode],
              [t.fieldCity, employee.city],
              [t.fieldAdded, formatDate(employee.createdAt)],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="gh-field-label">{label}</dt>
                <dd className="m-0 mt-0.5 text-[var(--color-text-primary)]">{value ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </AdminCard>

        {/* Invite history */}
        <AdminCard padding={0} className="overflow-hidden">
          <SectionHeader title={t.inviteHistoryTitle} />
          {employee.invites.length === 0 ? (
            <p className="px-5 py-4 text-sm text-[var(--color-text-muted)]">{t.noInvitesSent}</p>
          ) : (
            <ul className="m-0 list-none divide-y divide-[var(--color-border)] p-0">
              {employee.invites.map((invite, index) => (
                <li key={index} className="px-5 py-3 text-sm">
                  <p className="font-semibold text-[var(--color-text-primary)]">
                    {t.inviteSent.replace("{date}", formatDate(invite.createdAt))}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {invite.usedAt
                      ? t.inviteAccepted.replace("{date}", formatDate(invite.usedAt))
                      : [
                          invite.emailSentAt ? t.inviteEmailDelivered : t.inviteEmailPending,
                          invite.whatsappSentAt ? t.inviteWhatsappDelivered : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                    {invite.lastSendError ? ` · ${invite.lastSendError}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        {/* Request history */}
        <AdminCard padding={0} className="overflow-hidden">
          <SectionHeader title={t.requestsTitle} />
          {employee.requests.length === 0 ? (
            <p className="px-5 py-4 text-sm text-[var(--color-text-muted)]">
              {t.noRequestsForEmployee}
            </p>
          ) : (
            <ul className="m-0 list-none divide-y divide-[var(--color-border)] p-0">
              {employee.requests.map((request) => (
                <li key={request.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {REQUEST_TYPE_LABELS[request.type] ?? request.type}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {formatDate(request.createdAt)}
                    </p>
                  </div>
                  <Pill tone={requestStatusTone(request.status)}>
                    {requestStatusLabel(request.status)}
                  </Pill>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>
    </>
  );
}
