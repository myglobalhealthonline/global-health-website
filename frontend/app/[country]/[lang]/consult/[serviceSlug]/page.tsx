import { permanentRedirect } from "next/navigation";

type Params = { country: string; lang: string; serviceSlug: string };

export default async function Page({ params }: { params: Promise<Params> }) {
  const { country, lang, serviceSlug } = await params;
  permanentRedirect(`/${country}/${lang}/services/${serviceSlug}`);
}
