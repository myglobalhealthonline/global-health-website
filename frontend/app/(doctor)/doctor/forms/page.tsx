import { fetchDoctorFormTemplates } from "@/lib/api/doctor-api";
import { FormTemplatesClient } from "./_components/templates";

export const dynamic = "force-dynamic";

export default async function DoctorFormsPage() {
  const result = await fetchDoctorFormTemplates();

  return (
    <>
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Doctor
        </p>
        <h2 className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
          Forms
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Reusable intake / pre-consult / post-consult templates. Use them
          from the appointment workspace to log answers per patient.
        </p>
      </header>

      {!result.ok ? (
        <div className="gh-card p-6">
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {result.message}
          </p>
        </div>
      ) : (
        <FormTemplatesClient initial={result.data.items} />
      )}
    </>
  );
}
