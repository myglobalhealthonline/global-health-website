import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "backend";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { DoctorForm } from "../_components/doctor-form";
import { deleteDoctorAction, updateDoctorAction } from "../actions";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditDoctorPage({ params }: PageProps) {
  await requireAdminUser();
  const { id } = await params;

  const [doctor, countries] = await Promise.all([
    prisma.doctor.findUnique({
      where: { id },
      include: { countryLinks: true },
    }),
    prisma.country.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, code: true, name: true },
    }),
  ]);
  if (!doctor) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/doctors"
        className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-brand-primary)] hover:underline"
      >
        <ChevronLeft className="size-3.5" aria-hidden /> Back to doctors
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="gh-eyebrow">Edit doctor</p>
          <h1 className="gh-h2 mt-2">{doctor.name}</h1>
        </div>
        <form action={deleteDoctorAction}>
          <input type="hidden" name="id" value={doctor.id} />
          <button type="submit" className="gh-btn gh-btn-danger text-sm">
            Deactivate
          </button>
        </form>
      </header>

      <DoctorForm
        countries={countries}
        action={updateDoctorAction}
        submitLabel="Save changes"
        initial={{
          id: doctor.id,
          slug: doctor.slug,
          name: doctor.name,
          title: doctor.title,
          bio: doctor.bio,
          imageUrl: doctor.imageUrl ?? "",
          registrationNumber: doctor.registrationNumber ?? "",
          yearsExperience: doctor.yearsExperience !== null ? String(doctor.yearsExperience) : "",
          languages: doctor.languages.join(", "),
          active: doctor.active,
          countries: doctor.countryLinks.map((l) => ({
            countryId: l.countryId,
            sortOrder: l.sortOrder,
            active: l.active,
          })),
        }}
      />
    </div>
  );
}
