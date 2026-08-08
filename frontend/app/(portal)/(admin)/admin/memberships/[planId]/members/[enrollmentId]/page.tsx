import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft } from "lucide-react";
import { SetCrumbTitle } from "@/components/crumb-title";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  addMembershipDependent,
  adjustMembershipAllowance,
  fetchMemberUsageReport,
  fetchMembershipEnrollment,
  fetchMembershipPlan,
  reactivateMembershipEnrollment,
  removeMembershipEnrollment,
  resendMembershipCard,
  sendMembershipInvite,
  suspendMembershipEnrollment,
  updateMembershipEnrollment,
} from "@/lib/admin/memberships-api";
import {
  parseMembershipAllowanceAdjustForm,
  parseMembershipDependentForm,
  parseMembershipEnrollmentForm,
} from "@/lib/admin/membership-form-parse";
import { displayNameFrom } from "@/lib/admin/display-name";
import { AdminCard, Btn, PageHeader, Pill, SectionHeader } from "../../../../_components/atoms";
import { ConfirmDeleteButton } from "../../../../_components/confirm-delete-button";
import { MembershipEnrollmentFields } from "../../../_components/membership-enrollment-form";
import { MembershipAllowanceAdjust } from "../../../_components/membership-allowance-adjust";
import { MembershipTermDateGuard } from "../../../_components/membership-term-date-guard";
import { MemberUsageTable } from "../../../_components/membership-usage-report";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ planId: string; enrollmentId: string }>;
  searchParams?: Promise<{ error?: string; success?: string }>;
};

function formatDay(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminMembershipMemberPage({ params, searchParams }: PageProps) {
  const { planId, enrollmentId } = await params;
  const sp = searchParams ? await searchParams : {};

  // The usage fetch is what writes the §32 audit row — deliberately on the
  // fetch and not on the render, because this page redirects to itself after
  // every save and a render-time audit would drown the real signal.
  const [enrollmentResult, planResult, usageResult] = await Promise.all([
    fetchMembershipEnrollment(enrollmentId),
    fetchMembershipPlan(planId),
    fetchMemberUsageReport(enrollmentId),
  ]);
  if (!enrollmentResult.ok) {
    if (enrollmentResult.status === 404) notFound();
    return (
      <>
        <PageHeader eyebrow="Memberships" title="Member" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load this member: {enrollmentResult.message}
          </p>
        </AdminCard>
      </>
    );
  }
  const enrollment = enrollmentResult.data.enrollment;
  const levels = planResult.ok ? planResult.data.plan.levels : [];
  const backTo = `/admin/memberships/${planId}/members/${enrollmentId}`;
  const listUrl = `/admin/memberships/${planId}/members`;
  const memberName = `${enrollment.firstName} ${enrollment.lastName}`;
  const planTitle = planResult.ok
    ? displayNameFrom(planResult.data.plan.name, planResult.data.plan.translations)
    : null;
  const canHaveDependents =
    enrollment.memberType === "PRIMARY" &&
    enrollment.level.familyEnabled &&
    enrollment.level.maxDependents > 0;
  const liveDependents = enrollment.dependents.filter((d) => d.status !== "REMOVED");
  // Only the DETAIL fetch carries these; the list endpoint deliberately does not.
  const allowances = enrollment.allowances ?? [];

  async function saveMemberAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const parsed = parseMembershipEnrollmentForm(formData);
    if (!parsed.ok) redirect(`${backTo}?error=${encodeURIComponent(parsed.error)}`);
    const result = await updateMembershipEnrollment(enrollmentId, parsed.data);
    if (!result.ok) redirect(`${backTo}?error=${encodeURIComponent(result.message)}`);
    revalidatePath(backTo);
    redirect(`${backTo}?success=${encodeURIComponent("Member saved")}`);
  }

  async function addDependentAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const parsed = parseMembershipDependentForm(formData);
    if (!parsed.ok) redirect(`${backTo}?error=${encodeURIComponent(parsed.error)}`);
    const result = await addMembershipDependent(enrollmentId, parsed.data);
    if (!result.ok) redirect(`${backTo}?error=${encodeURIComponent(result.message)}`);
    revalidatePath(backTo);
    redirect(`${backTo}?success=${encodeURIComponent("Dependent added")}`);
  }

  async function lifecycleAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const action = String(formData.get("action") ?? "");
    const outcome =
      action === "SUSPEND"
        ? { result: await suspendMembershipEnrollment(enrollmentId, null), message: "Membership suspended" }
        : action === "REACTIVATE"
          ? { result: await reactivateMembershipEnrollment(enrollmentId), message: "Membership reactivated" }
          : action === "INVITE"
            ? { result: await sendMembershipInvite(enrollmentId), message: "Invite sent" }
            : action === "RESEND_CARD"
              ? {
                  // §26's resend. Always forces: `cardIssuedAt` blocks every
                  // ordinary send and a revive keeps it, so this is the only way
                  // to get a current card out after a level is recoloured or
                  // renamed. The date is NOT moved — it answers "does this
                  // person have a card", and the audit row is the per-send trail.
                  result: await resendMembershipCard(enrollmentId),
                  message: "Card sent",
                }
              : null;
    if (!outcome) redirect(`${backTo}?error=${encodeURIComponent("Unknown action")}`);
    if (!outcome.result.ok) redirect(`${backTo}?error=${encodeURIComponent(outcome.result.message)}`);
    revalidatePath(backTo);
    redirect(`${backTo}?success=${encodeURIComponent(outcome.message)}`);
  }

  async function adjustAllowanceAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const parsed = parseMembershipAllowanceAdjustForm(formData);
    if (!parsed.ok) redirect(`${backTo}?error=${encodeURIComponent(parsed.error)}`);
    const result = await adjustMembershipAllowance(enrollmentId, parsed.data);
    if (!result.ok) redirect(`${backTo}?error=${encodeURIComponent(result.message)}`);
    revalidatePath(backTo);
    // `appliedDelta` is reported back rather than assumed: the server clamps
    // into [0, allocated], so an admin asking for +5 on a counter with 3 used
    // gets 3 — and should be told that, not left to infer it.
    const { requestedDelta, appliedDelta, remaining, allocated } = result.data;
    const message =
      appliedDelta === requestedDelta
        ? `Allowance adjusted — ${remaining} of ${allocated} left`
        : `Adjusted by ${appliedDelta} of the ${requestedDelta} requested (clamped to the term) — ${remaining} of ${allocated} left`;
    redirect(`${backTo}?success=${encodeURIComponent(message)}`);
  }

  async function removeMemberAction() {
    "use server";
    await requireAdminAction();
    const result = await removeMembershipEnrollment(enrollmentId);
    if (!result.ok) redirect(`${backTo}?error=${encodeURIComponent(result.message)}`);
    revalidatePath(listUrl);
    redirect(`${listUrl}?success=${encodeURIComponent("Member removed")}`);
  }

  return (
    <>
      {planTitle ? <SetCrumbTitle segment={planId} label={planTitle} /> : null}
      <SetCrumbTitle label={memberName} />
      <Link
        href={listUrl}
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to members
      </Link>
      <PageHeader
        eyebrow="Membership member"
        title={memberName}
        // Both numbers, because a support call may quote either (§26).
        description={[
          enrollment.membershipId,
          enrollment.partnerReference ? `partner ref ${enrollment.partnerReference}` : null,
          enrollment.level.name,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <div className="flex items-center gap-2">
            {enrollment.memberType === "DEPENDENT" ? <Pill tone="info">Dependent</Pill> : null}
            <Pill tone={enrollment.status === "ACTIVE" ? "active" : "neutral"}>
              {enrollment.status.charAt(0) + enrollment.status.slice(1).toLowerCase()}
            </Pill>
          </div>
        }
      />

      {sp.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.error}
        </p>
      ) : null}
      {sp.success ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.success}
        </p>
      ) : null}

      <div className="flex flex-col gap-6">
        <AdminCard padding={0}>
          <SectionHeader title="Membership" />
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <div>
              <p className="gh-field-label">Term</p>
              <p className="text-sm">
                {formatDay(enrollment.startDate)} →{" "}
                {enrollment.endDate ? formatDay(enrollment.endDate) : "open-ended"}
              </p>
            </div>
            <div>
              <p className="gh-field-label">Account</p>
              {enrollment.user ? (
                <p className="text-sm">
                  Linked to {enrollment.user.email} on {formatDay(enrollment.linkedAt)}
                  {enrollment.claimedAt ? " (via the claim form)" : ""}
                </p>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">
                  Not linked yet — benefits start when they sign in with a verified account using{" "}
                  {enrollment.email}.
                </p>
              )}
            </div>
            <div>
              <p className="gh-field-label">Partner reference</p>
              <p className="text-sm">
                {enrollment.partnerReference ? (
                  <span className="font-mono">{enrollment.partnerReference}</span>
                ) : (
                  <span className="text-[var(--color-text-muted)]">
                    None — the partner supplied no number of their own
                  </span>
                )}
              </p>
            </div>
            <div>
              {/* Card state, and the resend beside it. A revive keeps
                  `cardIssuedAt` (§25), so without a resend a member whose level
                  was recoloured or renamed has no way to get a current card. */}
              <p className="gh-field-label">Card</p>
              {enrollment.cardIssuedAt ? (
                <p className="text-sm">Issued {formatDay(enrollment.cardIssuedAt)}</p>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">
                  Not issued yet — it goes out with the welcome email.
                </p>
              )}
            </div>
            <div className="sm:col-span-2 flex flex-wrap justify-end gap-2 border-t border-[var(--color-border)] pt-4">
              {enrollment.status !== "REMOVED" ? (
                <form action={lifecycleAction}>
                  <input type="hidden" name="action" value="RESEND_CARD" />
                  <Btn type="submit" variant="ghost" size="sm">
                    {enrollment.cardIssuedAt ? "Resend card" : "Send card now"}
                  </Btn>
                </form>
              ) : null}
              <form action={lifecycleAction}>
                <input type="hidden" name="action" value="INVITE" />
                <Btn type="submit" variant="ghost" size="sm">
                  Send invite email
                </Btn>
              </form>
              {enrollment.status === "SUSPENDED" ? (
                <form action={lifecycleAction}>
                  <input type="hidden" name="action" value="REACTIVATE" />
                  <Btn type="submit" variant="soft" size="sm">
                    Reactivate
                  </Btn>
                </form>
              ) : enrollment.status !== "REMOVED" ? (
                <form action={lifecycleAction}>
                  <input type="hidden" name="action" value="SUSPEND" />
                  <Btn type="submit" variant="soft" size="sm">
                    Suspend
                  </Btn>
                </form>
              ) : null}
            </div>
          </div>
        </AdminCard>

        {enrollment.memberType === "PRIMARY" ? (
          <AdminCard padding={0}>
            <SectionHeader
              title="Dependents"
              description={
                canHaveDependents
                  ? `This level covers up to ${enrollment.level.maxDependents} dependent(s). Each one links to its own account by its own email.`
                  : "This level does not include family cover, so dependents cannot be added."
              }
            />
            <div className="flex flex-col gap-4 p-6">
              {liveDependents.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {liveDependents.map((dependent) => (
                    <li
                      key={dependent.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] px-4 py-3"
                    >
                      <span className="flex flex-col">
                        <Link
                          href={`/admin/memberships/${planId}/members/${dependent.id}`}
                          className="font-semibold text-[var(--color-text-primary)] hover:underline"
                        >
                          {dependent.firstName} {dependent.lastName}
                        </Link>
                        <span className="text-portal-compact text-[var(--color-text-muted)]">
                          {dependent.membershipId} · {dependent.email}
                          {dependent.relationship ? ` · ${dependent.relationship}` : ""}
                        </span>
                      </span>
                      <Pill tone={dependent.status === "ACTIVE" ? "active" : "neutral"}>
                        {dependent.status.charAt(0) + dependent.status.slice(1).toLowerCase()}
                      </Pill>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">No dependents yet.</p>
              )}

              {canHaveDependents && liveDependents.length < enrollment.level.maxDependents ? (
                <form
                  action={addDependentAction}
                  className="flex flex-col gap-4 border-t border-[var(--color-border)] pt-4"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5">
                      <span className="gh-field-label">Email</span>
                      <input name="email" type="email" className="gh-input" required />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="gh-field-label">Relationship (optional)</span>
                      <input name="relationship" className="gh-input" maxLength={60} placeholder="Spouse" />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="gh-field-label">First name</span>
                      <input name="firstName" className="gh-input" required maxLength={100} />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="gh-field-label">Last name</span>
                      <input name="lastName" className="gh-input" required maxLength={100} />
                    </label>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    The membership ID, level and term are taken from {memberName}.
                  </p>
                  <div className="flex justify-end">
                    <button type="submit" className="gh-btn gh-btn-primary">
                      Add dependent
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          </AdminCard>
        ) : null}

        {allowances.length > 0 ? (
          <AdminCard padding={0}>
            <SectionHeader
              title="Allowance"
              description="Included consultations for this term. Adjusting is a super-admin action for goodwill and for correcting a bad import — it moves a counter by hand, outside every rule the plan configures, so the written reason is the whole trail."
            />
            <div className="flex flex-col gap-3 px-6 pt-6">
              {allowances.map((allowance) => {
                const usedPct =
                  allowance.allocated > 0
                    ? Math.min(100, Math.round((allowance.used / allowance.allocated) * 100))
                    : 0;
                return (
                  <div key={allowance.benefitId} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {allowance.target}
                      </span>
                      <span className="text-portal-compact text-[var(--color-text-muted)]">
                        {allowance.remaining} of {allowance.allocated} left
                      </span>
                    </div>
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-muted)]"
                      role="img"
                      aria-label={`${allowance.used} of ${allowance.allocated} used`}
                    >
                      <div
                        className="h-full rounded-full bg-[var(--color-accent)]"
                        style={{ width: `${usedPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <MembershipAllowanceAdjust allowances={allowances} action={adjustAllowanceAction} />
          </AdminCard>
        ) : null}

        <AdminCard padding={0}>
          <SectionHeader
            title="Usage"
            description="Booking metadata only — no clinical content. Goodwill overrides are listed with their reasons; they never consume an allowance unit."
            right={
              <Btn href={`/admin/memberships/${planId}/usage`} variant="ghost" size="sm">
                Plan usage report
              </Btn>
            }
          />
          {usageResult.ok ? (
            <>
              <div className="grid gap-4 p-6 sm:grid-cols-4">
                <div>
                  <p className="gh-field-label">Consultations</p>
                  <p className="text-sm">{usageResult.data.totals.consultations}</p>
                </div>
                <div>
                  <p className="gh-field-label">Allowance used</p>
                  <p className="text-sm">{usageResult.data.totals.allowanceUsed}</p>
                </div>
                <div>
                  <p className="gh-field-label">Discount given</p>
                  <p className="text-sm">
                    {(usageResult.data.totals.discountCents / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="gh-field-label">Overrides</p>
                  <p className="text-sm">{usageResult.data.totals.overrides}</p>
                </div>
              </div>
              <div className="border-t border-[var(--color-border)]">
                <MemberUsageTable rows={usageResult.data.rows} currency={null} />
              </div>
            </>
          ) : (
            <p className="p-6 text-sm text-[var(--color-text-muted)]">
              Could not load this member&apos;s bookings: {usageResult.message}
            </p>
          )}
        </AdminCard>

        <AdminCard padding={0}>
          <SectionHeader title="Member details" />
          <form action={saveMemberAction} className="flex flex-col gap-6 p-6">
            <MembershipEnrollmentFields levels={levels} enrollment={enrollment} />
            <div className="flex justify-end border-t border-[var(--color-border)] pt-6">
              {/* Re-dating a live term orphans its allowance counter — the
                  balance is keyed on termStart, so the next spend opens a fresh
                  one at full allocation. Silent today; named here. */}
              <MembershipTermDateGuard
                originalStartDate={enrollment.startDate.slice(0, 10)}
                peopleAffected={1 + liveDependents.length}
                unitsSpent={allowances.reduce((sum, row) => sum + row.used, 0)}
              >
                Save member
              </MembershipTermDateGuard>
            </div>
          </form>
        </AdminCard>

        {enrollment.status !== "REMOVED" ? (
          <AdminCard padding={0}>
            <SectionHeader
              title="Remove member"
              description="A removal is soft: the row and its history stay, benefits stop, and re-adding the same email revives this record."
            />
            <form action={removeMemberAction} className="flex justify-end p-6">
              <ConfirmDeleteButton
                message={`Remove ${memberName} from this programme? Their benefits stop immediately.`}
                className="gh-btn gh-btn-ghost text-[var(--color-status-error-text)]"
              >
                Remove member
              </ConfirmDeleteButton>
            </form>
          </AdminCard>
        ) : null}
      </div>
    </>
  );
}
