import type { Metadata } from "next";
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { proxyClientIpHeaders } from "@/lib/server/proxy-client-ip";
import { supportedLocaleCodes, type LocaleCode } from "@/lib/i18n/types";

export const metadata: Metadata = {
  title: "Unsubscribe | Global Health",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const copy = {
  en: { title: "Unsubscribe", detail: "Stop marketing emails, including birthday offers and newsletters. Messages about your care will continue.", button: "Unsubscribe", success: "Your unsubscribe request has been processed. You will no longer receive marketing emails.", invalid: "This unsubscribe link is invalid. Please use the link in your email.", error: "We could not process your request. Please try again in a minute." },
  pt: { title: "Cancelar subscrição", detail: "Deixe de receber emails de marketing, incluindo ofertas de aniversário e newsletters. Continuará a receber mensagens sobre os seus cuidados de saúde.", button: "Cancelar subscrição", success: "O seu pedido foi processado. Deixará de receber emails de marketing.", invalid: "Este link é inválido. Utilize o link no seu email.", error: "Não foi possível processar o pedido. Tente novamente dentro de um minuto." },
  es: { title: "Cancelar suscripción", detail: "Deja de recibir correos de marketing, incluidas ofertas de cumpleaños y boletines. Seguirás recibiendo mensajes sobre tu atención médica.", button: "Cancelar suscripción", success: "Tu solicitud se ha procesado. Dejarás de recibir correos de marketing.", invalid: "Este enlace no es válido. Utiliza el enlace de tu correo.", error: "No hemos podido procesar tu solicitud. Inténtalo de nuevo dentro de un minuto." },
  cs: { title: "Odhlásit odběr", detail: "Přestaňte dostávat marketingové e-maily, včetně narozeninových nabídek a newsletterů. Zprávy týkající se vaší zdravotní péče budete dostávat i nadále.", button: "Odhlásit odběr", success: "Vaše žádost byla zpracována. Marketingové e-maily již nebudete dostávat.", invalid: "Tento odkaz je neplatný. Použijte odkaz ve svém e-mailu.", error: "Žádost se nepodařilo zpracovat. Zkuste to znovu za minutu." },
  ro: { title: "Dezabonare", detail: "Nu mai primi e-mailuri de marketing, inclusiv oferte aniversare și buletine informative. Vei primi în continuare mesaje despre îngrijirea ta medicală.", button: "Dezabonează-mă", success: "Cererea ta a fost procesată. Nu vei mai primi e-mailuri de marketing.", invalid: "Acest link nu este valid. Folosește linkul din e-mailul tău.", error: "Nu am putut procesa cererea. Încearcă din nou peste un minut." },
  de: { title: "Abmelden", detail: "Keine Marketing-E-Mails mehr erhalten, einschließlich Geburtstagsangeboten und Newslettern. Nachrichten zu Ihrer medizinischen Versorgung erhalten Sie weiterhin.", button: "Abmelden", success: "Ihre Anfrage wurde bearbeitet. Sie erhalten keine Marketing-E-Mails mehr.", invalid: "Dieser Link ist ungültig. Bitte verwenden Sie den Link in Ihrer E-Mail.", error: "Ihre Anfrage konnte nicht bearbeitet werden. Bitte versuchen Sie es in einer Minute erneut." },
} satisfies Record<LocaleCode, Record<string, string>>;

function locale(value: unknown): LocaleCode {
  return typeof value === "string" && supportedLocaleCodes.includes(value as LocaleCode) ? value as LocaleCode : "en";
}

async function unsubscribe(form: FormData) {
  "use server";
  const lang = locale(form.get("lang"));
  const token = form.get("token");
  let result = "invalid";
  if (typeof token === "string" && token.length > 0 && token.length <= 172) {
    result = "error";
    try {
      const origin = getBackendOrigin();
      if (origin) {
        const request = new NextRequest("https://localhost/unsubscribe", { headers: await headers() });
        const response = await fetch(`${origin}/api/marketing/unsubscribe`, {
          method: "POST", cache: "no-store", signal: AbortSignal.timeout(20_000),
          headers: { "content-type": "application/json", ...proxyClientIpHeaders(request) },
          body: JSON.stringify({ token }),
        });
        const body = await response.json();
        if (response.ok && body.ok && body.data?.unsubscribed === true) result = "success";
        else if (response.status === 400) result = "invalid";
      }
    } catch { /* Show a safe, localized retry message. */ }
  }
  const query = new URLSearchParams({ lang, result });
  if (result === "error" && typeof token === "string" && token.length <= 172) query.set("token", token);
  redirect(`/unsubscribe?${query}`);
}

export default async function UnsubscribePage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const lang = locale(query.lang);
  const text = copy[lang];
  const token = typeof query.token === "string" && query.token.length <= 172 ? query.token : "";
  const status = query.result === "success" ? "success" : query.result === "error" ? "error" : query.result === "invalid" || !token ? "invalid" : null;
  return (
    <main lang={lang} className="mx-auto max-w-xl px-6 py-16">
      <h1 className="mb-6 text-3xl font-semibold">{text.title}</h1>
      {status ? <p role={status === "success" ? "status" : "alert"}>{text[status]}</p> : <p>{text.detail}</p>}
      {token && status !== "success" && status !== "invalid" && (
        <form action={unsubscribe} className="mt-8">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="lang" value={lang} />
          <button type="submit" className="rounded border border-current px-6 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4">{text.button}</button>
        </form>
      )}
    </main>
  );
}
