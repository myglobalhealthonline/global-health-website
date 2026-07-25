import { fetchLabRequisitions } from "@/lib/admin/admin-api";
import { AdminCard, PageHeader } from "../_components/atoms";
import { LabRequisitionsQueue } from "./_components/lab-requisitions-queue";

export const dynamic = "force-dynamic";

/**
 * Lab requisitions — the admin side of the Synlab CZ integration.
 *
 * A doctor's exams prescription lands here. Staff ring the patient to agree
 * which tests they actually want, take payment, then create the electronic
 * requisition in Synlab's WebLIMS through a pre-filled form.
 */
export default async function AdminLabRequisitionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; country?: string; q?: string }>;
}) {
  const params = await searchParams;
  const fetched = await fetchLabRequisitions({
    status: (params.status ?? "") as never,
    countryCode: params.country ?? "",
    q: params.q ?? "",
  });

  return (
    <>
      <PageHeader
        eyebrow="Commerce"
        title="Lab requisitions"
        description="Exams prescribed by doctors, ready to agree with the patient and book with the laboratory."
      />

      {!fetched.ok ? (
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {fetched.message}
          </p>
        </AdminCard>
      ) : (
        <AdminCard padding={0}>
          <LabRequisitionsQueue
            requisitions={fetched.data.requisitions}
            weblimsConfigured={fetched.data.weblimsConfigured}
          />
        </AdminCard>
      )}
    </>
  );
}
