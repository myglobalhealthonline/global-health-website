import { fetchAdminPatients, fetchAdminPatientDuplicates, type AdminPatientSearchItem } from "@/lib/admin/admin-api";
import { AdminCard, AdminEmptyState, PageHeader } from "../../_components/atoms";
import { DuplicateGroupsTable, type DuplicateGroup } from "./_components/duplicate-groups-table";
import { Users2 } from "lucide-react";

export const dynamic = "force-dynamic";

// ponytail: the backend only exposes duplicate lookup per patient
// (GET /api/admin/patient-merge/duplicates/:patientId), not a global scan —
// so this page scans the most-recent page of patients and fans out one
// lookup per patient. Fine at the current patient volume; if the base grows
// past a few hundred, this needs a real backend "list duplicate groups"
// endpoint instead of N+1 requests.
const SCAN_LIMIT = 200;

export default async function AdminPatientDuplicatesPage() {
  const patientsResult = await fetchAdminPatients({ page: "1", pageSize: String(SCAN_LIMIT) });
  const patients: AdminPatientSearchItem[] = patientsResult?.ok ? patientsResult.data.items : [];

  const seenPairs = new Set<string>();
  const groups: DuplicateGroup[] = [];

  await Promise.all(
    patients.map(async (patient) => {
      const result = await fetchAdminPatientDuplicates(patient.id);
      if (!result.ok) return;
      for (const candidate of result.data.duplicates) {
        const pairKey = [patient.id, candidate.patientProfileId].sort().join(":");
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);
        groups.push({
          a: {
            patientProfileId: patient.id,
            fullName: patient.fullName,
            email: patient.email,
            globalHealthNumber: patient.globalHealthNumber,
          },
          b: {
            patientProfileId: candidate.patientProfileId,
            fullName: candidate.fullName,
            email: candidate.email,
            globalHealthNumber: candidate.globalHealthNumber,
          },
          matchReasons: candidate.matchReasons,
        });
      }
    }),
  );

  return (
    <>
      <PageHeader
        eyebrow="Patients"
        title="Duplicate patients"
        description="Records matched on the same email, phone, or name + date of birth. Review side by side before merging — this can't be undone."
      />

      <AdminCard padding={0} className="gh-admin-patients-list">
        {groups.length === 0 ? (
          <AdminEmptyState
            icon={<Users2 className="size-8" aria-hidden />}
            title="No duplicates found"
            description={`Scanned the ${patients.length} most recent patients — no matching email, phone, or name + date-of-birth pairs.`}
          />
        ) : (
          <DuplicateGroupsTable groups={groups} />
        )}
      </AdminCard>
    </>
  );
}
