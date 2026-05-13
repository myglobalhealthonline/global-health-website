import { CTAFooter } from "@/components/layout/CTAFooter";
import FooterColumn from "@/components/ui/footer-column";
import type { SiteNavigationData } from "@/data/navigation";

export function SiteFooter({
  siteName,
  navigation,
  brandLogo,
  footerDecorImage,
}: {
  siteName: string;
  navigation: SiteNavigationData;
  brandLogo?: { src: string; alt: string };
  /** Optional editorial visual for the primary footer CTA strip (e.g. footer-cta asset). */
  footerDecorImage?: { src: string; alt: string };
}) {
  return (
    <footer className="mt-auto">
      <CTAFooter cta={navigation.footerCta} trustLine={navigation.trustLine} decorImage={footerDecorImage} />
      <FooterColumn siteName={siteName} navigation={navigation} brandLogo={brandLogo} />
    </footer>
  );
}
