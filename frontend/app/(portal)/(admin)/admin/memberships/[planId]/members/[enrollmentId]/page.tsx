import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft } from "lucide-react";
import { SetCrumbTitle } from "@/components/crumb-title";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  addMembershipDependent,
  fetchMembershipEnrollment,
  fetchMembershipPlan,
  reactivateMembershipEnrollment,
  removeMembershipEnrollment,
  sendMembershipInvite,
  suspendMembershipEnrollment,
  updateMembershipEnrollment,
} from "@/lib/admin/memberships-api";
import {
  parseMembershipDependentForm,
  parseMembershipEnrollmentForm,
} from "@/lib/admin/membership-form-parse";
import { AdminCard, Btn, PageHeader, Pill, SectionHeader } from "../../../../_components/atoms";
import { ConfirmDeleteButton } from "../../../../_components/confirm-delete-button";
import { MembershipEnrollmentFields } from "../../../_components/membership-enrollment-form";

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

  const [enrollmentResult, planResult] = await Promise.all([
    fetchMembershipEnrollment(enrollmentId),
    fetchMembershipPlan(planId),
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
  const canHaveDependents =
    enrollment.memberType === "PRIMARY" &&
    enrollment.level.familyEnabled &&
    enrollment.level.maxDependents > 0;
  const liveDependents = enrollment.dependents.filter((d) => d.status !== "REMOVED");

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
            : null;
    if (!outcome) redirect(`${backTo}?error=${encodeURIComponent("Unknown action")}`);
    if (!outcome.result.ok) redirect(`${backTo}?error=${encodeURIComponent(outcome.result.message)}`);
    revalidatePath(backTo);
    redirect(`${backTo}?success=${encodeURIComponent(outcome.message)}`);
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
        description={`${enrollment.membershipId} · ${enrollment.level.name}`}
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
            <div className="sm:col-span-2 flex flex-wrap justify-end gap-2 border-t border-[var(--color-border)] pt-4">
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

        <AdminCard padding={0}>
          <SectionHeader title="Member details" />
          <form action={saveMemberAction} className="flex flex-col gap-6 p-6">
            <MembershipEnrollmentFields levels={levels} enrollment={enrollment} />
            <div className="flex justify-end border-t border-[var(--color-border)] pt-6">
              <button type="submit" className="gh-btn gh-btn-primary">
                Save member
              </button>
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
