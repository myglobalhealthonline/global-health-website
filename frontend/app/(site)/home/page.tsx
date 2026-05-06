import type { Metadata } from "next";
import { CountryHomeTemplate } from "@/components/templates/CountryHomeTemplate";
import { getPublicAssetsNormalized } from "@/lib/content/get-public-assets";
import { toCountryHomeTemplateProps } from "@/lib/content/home-page-presenters";
import { mergeIrelandHomePublicAssets } from "@/lib/content/merge-ireland-home-media";
import { getTemplatePageData } from "@/lib/content/template-page-data";

export const metadata: Metadata = {
  title: "Clinic Ireland | Global Health",
  description: "Ireland online medical clinic with GP and specialist consultation booking.",
};

export default async function Page() {
  const [data, assets] = await Promise.all([getTemplatePageData("/home", "ie"), getPublicAssetsNormalized()]);
  const countryHome = mergeIrelandHomePublicAssets(data.countryHome, assets);
  return <CountryHomeTemplate {...toCountryHomeTemplateProps({ ...data, countryHome })} />;
}
