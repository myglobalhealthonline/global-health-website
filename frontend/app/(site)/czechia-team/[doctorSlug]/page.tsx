import { buildDoctorProfileMetadata, renderDoctorProfilePage } from "@/lib/content/doctor-profile-page";

type Params = { doctorSlug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  return buildDoctorProfileMetadata(params);
}

export default async function DoctorPage({ params }: { params: Promise<Params> }) {
  return renderDoctorProfilePage(params);
}
