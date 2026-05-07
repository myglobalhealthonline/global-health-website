import { redirect } from "next/navigation";
import { buildDoctorProfileMetadata } from "@/lib/content/doctor-profile-page";

type Params = { doctorSlug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  return buildDoctorProfileMetadata(params);
}

export default async function DoctorPage({ params }: { params: Promise<Params> }) {
  const { doctorSlug } = await params;
  redirect(`/ireland-team/${doctorSlug}`);
}
