import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft, Upload } from "lucide-react";
import { SetCrumbTitle } from "@/components/crumb-title";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  createMembershipEnrollment,
  fetchMembershipEnrollments,
  fetchMembershipPlan,
  reactivateMembershipEnrollment,
  removeMembershipEnrollment,
  sendMembershipInvite,
  suspendMembershipEnrollment,
} from "@/lib/admin/memberships-api";
import { parseMembershipEnrollmentForm } from "@/lib/admin/membership-form-parse";
import { displayNameFrom } from "@/lib/admin/display-name";
import { AdminCard, Btn, PageHeader, SectionHeader } from "../../../_components/atoms";
import { MembershipMemberTable } from "../../_components/membership-member-table";
import { MembershipEnrollmentFields } from "../../_components/membership-enrollment-form";

export const dynamic = "force-dynamic";

const STATUSES = ["ACTIVE", "PENDING", "SUSPENDED", "EXPIRED", "REMOVED"] as const;

type PageProps = {
  params: Promise<{ planId: string }>;
  searchParams?: Promise<{ error?: string; success?: string; status?: string; q?: string; page?: string }>;
};

export default async function AdminMembershipMembersPage({ params, searchParams }: PageProps) {
  const { planId } = await params;
  const sp = searchParams ? await searchParams : {};

  const planResult = await fetchMembershipPlan(planId);
  if (!planResult.ok) {
    if (planResult.status === 404) notFound();
    return (
      <>
        <PageHeader eyebrow="Memberships" title="Members" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load this programme: {planResult.message}
          </p>
        </AdminCard>
      </>
    );
  }
  const plan = planResult.data.plan;
  const planTitle = displayNameFrom(plan.name, plan.translations);

  const page = Number.parseInt(sp.page ?? "1", 10) || 1;
  const listResult = await fetchMembershipEnrollments({
    planId,
    status: sp.status,
    q: sp.q,
    page: String(page),
    pageSize: "25",
  });
  const list = listResult.ok
    ? listResult.data
    : { items: [], total: 0, page: 1, pageSize: 25 };

  const backTo = `/admin/memberships/${planId}/members`;
  const withParams = (extra: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries({ status: sp.status, q: sp.q, ...extra })) {
      if (value) qs.set(key, value);
    }
    const s = qs.toString();
    return s ? `${backTo}?${s}` : backTo;
  };

  async function addMemberAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const parsed = parseMembershipEnrollmentForm(formData);
    if (!parsed.ok) redirect(`${backTo}?error=${encodeURIComponent(parsed.error)}`);
    const result = await createMembershipEnrollment({ ...parsed.data, planId });
    if (!result.ok) redirect(`${backTo}?error=${encodeURIComponent(result.message)}`);
    revalidatePath(backTo);
    redirect(
      `${backTo}?success=${encodeURIComponent(
        result.data.enrollment.status === "ACTIVE"
          ? "Member enrolled and linked to their existing account"
          : "Member enrolled — their benefits start when they sign in with that email",
      )}`,
    );
  }

  /** One server action for every row menu item, as the corporate table does. */
  async function memberRowAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const id = String(formData.get("enrollmentId") ?? "");
    const action = String(formData.get("action") ?? "");
    if (!id) redirect(`${backTo}?error=${encodeURIComponent("Missing member")}`);

    const run = async () => {
      switch (action) {
        case "SUSPEND":
          return { result: await suspendMembershipEnrollment(id, null), message: "Membership suspended" };
        case "REACTIVATE":
          return { result: await reactivateMembershipEnrollment(id), message: "Membership reactivated" };
        case "REMOVE":
          return { result: await removeMembershipEnrollment(id), message: "Member removed" };
        case "INVITE": {
          const result = await sendMembershipInvite(id);
          return {
            result,
            message:
              result.ok && result.data.ok
                ? "Invite sent"
                : "Invite could not be sent — the attempt is logged",
          };
        }
        default:
          return null;
      }
    };
    const outcome = await run();
    if (!outcome) redirect(`${backTo}?error=${encodeURIComponent("Unknown action")}`);
    if (!outcome.result.ok) {
      redirect(`${backTo}?error=${encodeURIComponent(outcome.result.message)}`);
    }
    revalidatePath(backTo);
    redirect(`${backTo}?success=${encodeURIComponent(outcome.message)}`);
  }

  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <>
      <SetCrumbTitle segment={planId} label={planTitle} />
      <Link
        href={`/admin/memberships/${planId}`}
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to {planTitle}
      </Link>
      <PageHeader
        eyebrow="Membership members"
        title={planTitle}
        description={`${list.total} member${list.total === 1 ? "" : "s"} on this programme`}
        actions={
          <Btn
            href={`/admin/memberships/${planId}/import`}
            variant="soft"
            iconLeft={<Upload className="size-4" />}
          >
            Import CSV
          </Btn>
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
          <SectionHeader
            title="Members"
            description="A member's benefits only apply once they sign in with the enrolled email address — until then they sit as “awaiting sign-in”."
          />
          <div className="flex flex-col gap-4 p-6">
            <form method="GET" className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">Search</span>
                <input
                  name="q"
                  defaultValue={sp.q ?? ""}
                  className="gh-input min-w-[220px]"
                  placeholder="Name, email or membership ID"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">Status</span>
                <select name="status" defaultValue={sp.status ?? ""} className="gh-select">
                  <option value="">All</option>
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </label>
              <div className="ml-auto flex gap-2">
                {sp.q || sp.status ? (
                  <Btn href={backTo} variant="ghost" size="sm">
                    Clear
                  </Btn>
                ) : null}
                <Btn type="submit" variant="soft" size="sm">
                  Filter
                </Btn>
              </div>
            </form>

            {list.items.length > 0 ? (
              <MembershipMemberTable
                enrollments={list.items}
                planId={planId}
                rowAction={memberRowAction}
              />
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">
                {sp.q || sp.status
                  ? "No members match that filter."
                  : "No members yet. Add one below, or import a partner list."}
              </p>
            )}

            {totalPages > 1 ? (
              <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border)] pt-4">
                <span className="text-portal-compact text-[var(--color-text-muted)]">
                  Page {list.page} of {totalPages}
                </span>
                {list.page > 1 ? (
                  <Btn href={withParams({ page: String(list.page - 1) })} variant="ghost" size="sm">
                    Previous
                  </Btn>
                ) : null}
                {list.page < totalPages ? (
                  <Btn href={withParams({ page: String(list.page + 1) })} variant="soft" size="sm">
                    Next
                  </Btn>
                ) : null}
              </div>
            ) : null}
          </div>
        </AdminCard>

        <AdminCard padding={0}>
          <SectionHeader
            title="Add a member"
            description="For one-off additions. Use the CSV import for a partner list."
          />
          <form action={addMemberAction} className="flex flex-col gap-6 p-6">
            <MembershipEnrollmentFields levels={plan.levels} />
            <div className="flex justify-end border-t border-[var(--color-border)] pt-6">
              <button type="submit" className="gh-btn gh-btn-primary">
                Add member
              </button>
            </div>
          </form>
        </AdminCard>
      </div>
    </>
  );
}
