import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft } from "lucide-react";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { postAdminCoupon } from "@/lib/admin/admin-api";
import { parseCouponBodyFromForm } from "@/lib/admin/coupon-form-parse";
import { AdminCard, Btn, PageHeader } from "../../_components/atoms";
import { CouponFields } from "../_components/coupon-fields";

export const dynamic = "force-dynamic";

export default async function AdminNewCouponPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};

  async function createAction(formData: FormData) {
    "use server";
    // ADMIN, not SUPER_ADMIN: this must match the backend gate, which is
    // `verifyGlobalAdminAccess` — every global admin, LOCAL_ADMIN denied. A
    // stricter check here only produced an /unauthorized redirect for people
    // the API would have accepted.
    await requireAdminAction();

    const parsed = parseCouponBodyFromForm(formData);
    if (!parsed.ok) {
      redirect(`/admin/coupons/new?error=${encodeURIComponent(parsed.error)}`);
    }
    const result = await postAdminCoupon(parsed.data);
    if (!result.ok) {
      redirect(`/admin/coupons/new?error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath("/admin/coupons");
    const sent = result.data.email;
    const note = sent
      ? ` — ${sent.sent} email${sent.sent === 1 ? "" : "s"} sent${sent.failed > 0 ? `, ${sent.failed} failed` : ""}`
      : "";
    redirect(
      `/admin/coupons/${result.data.id}?success=${encodeURIComponent(`Coupon ${result.data.code} created${note}`)}`,
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Commerce"
        title="New coupon"
        description="A percentage discount code, applied to the booking price at checkout or on a manual booking."
        actions={
          <Btn href="/admin/coupons" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
            Cancel
          </Btn>
        }
      />

      {sp.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.error}
        </p>
      ) : null}

      <AdminCard>
        <form action={createAction} className="grid gap-6">
          <CouponFields />
          <div className="flex justify-end gap-2">
            <Btn href="/admin/coupons" variant="ghost">
              Cancel
            </Btn>
            <button className="gh-btn gh-btn-primary" type="submit">
              Create coupon
            </button>
          </div>
        </form>
      </AdminCard>
    </>
  );
}
