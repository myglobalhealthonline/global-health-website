import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "backend";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { DoctorForm } from "../_components/doctor-form";
import { createDoctorAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewDoctorPage() {
  await requireAdminUser();
  const countries = await prisma.country.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, code: true, name: true },
  });
  return (
    <div className="space-y-6">
      <Link
        href="/admin/doctors"
        className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-brand-primary)] hover:underline"
      >
        <ChevronLeft className="size-3.5" aria-hidden /> Back to doctors
      </Link>
      <header>
        <p className="gh-eyebrow">New doctor</p>
        <h1 className="gh-h2 mt-2">Add a doctor</h1>
      </header>
      <DoctorForm
        countries={countries}
        action={createDoctorAction}
        submitLabel="Create doctor"
        initial={{
          slug: "",
          name: "",
          title: "",
          bio: "",
          imageUrl: "",
          registrationNumber: "",
          yearsExperience: "",
          languages: "",
          active: true,
          countries: [],
        }}
      />
    </div>
  );
}
