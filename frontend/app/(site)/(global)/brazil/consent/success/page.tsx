import Link from "next/link";
import { GH2StatusPage } from "@/components/sections/GH2PagePrimitives";

export default function BrazilConsentSuccessPage() {
  return (
    <GH2StatusPage
      status="success"
      title="Pagamento recebido"
      body="Obrigado. O seu consentimento Brasil foi registado com sucesso."
    >
      <Link href="/" className="gh2-btn-lime">
        Voltar ao início
      </Link>
    </GH2StatusPage>
  );
}
