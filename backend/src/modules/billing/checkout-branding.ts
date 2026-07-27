import { prisma } from "../../db/prisma.js";

/**
 * Global Health branding for Stripe-hosted Checkout.
 *
 * Stripe Checkout is Stripe's own page — colours, logo, icon, fonts and corner
 * radius are NOT settable from the API. They come from
 * Dashboard → Settings → Branding (brand `#1D4B36`, accent `#B0F122`, GH icon +
 * logo) and apply per Stripe ACCOUNT, so each of the ie / pt / cz accounts
 * (see `lib/stripe/client.ts`) must be branded separately.
 *
 * What the API *can* control is what this module returns:
 *   - `locale`  — pin the page language to the market instead of letting Stripe
 *                 guess from the browser. Without this a Portuguese browser
 *                 renders an Irish (EUR/Ireland) checkout entirely in Portuguese.
 *   - `custom_text.submit` — a Global Health trust line above the pay button.
 *
 * Deliberately NOT set here (each changes behaviour, not just looks):
 *   - `submit_type` — defaults to `pay`, which is already what we want.
 *   - `consent_collection` / `terms_of_service_acceptance` — adds a required
 *     checkbox and costs conversion.
 *   - `phone_number_collection` — collects extra PII we don't need at pay time.
 */

/**
 * The subset of Stripe's `Checkout.SessionCreateParams.Locale` union we ship in.
 * Declared locally rather than pulled off the SDK namespace: stripe-node's
 * default export resolves to the CONSTRUCTOR interface, not the type namespace
 * (same quirk `lib/stripe/client.ts` works around with `InstanceType`). Every
 * value here is a valid Stripe locale, and the object below stays structurally
 * assignable to `SessionCreateParams` when spread into a create call.
 */
type StripeLocale = "en" | "pt" | "pt-BR" | "es" | "cs" | "ro" | "de";

interface CustomText {
  submit: { message: string };
}

export interface CheckoutBranding {
  locale: StripeLocale;
  custom_text: CustomText;
}

/** Which copy set to use — one-off payment vs recurring membership. */
export type CheckoutBrandingVariant = "payment" | "subscription";

/**
 * Direct country → Stripe locale map for every market we sell in. Checked
 * before the DB so the common path costs no query, and so Brazil resolves to
 * `pt-BR` (our `LocaleCode` enum only has a single `PT`, which would otherwise
 * render European Portuguese to Brazilian patients).
 */
const COUNTRY_LOCALE: Record<string, StripeLocale> = {
  pt: "pt",
  br: "pt-BR",
  es: "es",
  sp: "es",
  cz: "cs",
  ro: "ro",
  de: "de",
  at: "de",
  ie: "en",
  gb: "en",
  uk: "en",
  us: "en",
};

/** `LocaleCode` (Prisma enum) → Stripe locale, for countries not in the map above. */
const LOCALE_CODE_TO_STRIPE: Record<string, StripeLocale> = {
  EN: "en",
  PT: "pt",
  ES: "es",
  CS: "cs",
  RO: "ro",
  DE: "de",
};

/**
 * Resolve the Checkout page language for a country code.
 *
 * Static map first, then the country's admin-configured `defaultLocale`, then
 * `en`. Never throws — a language lookup must not be able to fail a payment.
 */
export async function checkoutLocaleForCountry(
  countryCode?: string | null,
): Promise<StripeLocale> {
  const code = countryCode?.trim().toLowerCase();
  if (!code) return "en";

  const direct = COUNTRY_LOCALE[code];
  if (direct) return direct;

  try {
    // Country codes are stored lowercase but an upper-cased value from a caller
    // must still match, hence the insensitive compare.
    const country = await prisma.country.findFirst({
      where: { code: { equals: code, mode: "insensitive" } },
      select: { defaultLocale: true },
    });
    if (country) return LOCALE_CODE_TO_STRIPE[country.defaultLocale] ?? "en";
  } catch {
    // DB unavailable — fall through to English rather than block checkout.
  }
  return "en";
}

const PAYMENT_MESSAGE: Record<StripeLocale, string> = {
  en: "Secure payment processed by Stripe. Global Health never sees or stores your card details. Your confirmation is emailed to you as soon as the payment succeeds.",
  pt: "Pagamento seguro processado pela Stripe. A Global Health nunca vê nem guarda os dados do seu cartão. Receberá a confirmação por e-mail assim que o pagamento for concluído.",
  "pt-BR":
    "Pagamento seguro processado pela Stripe. A Global Health nunca vê nem armazena os dados do seu cartão. Você receberá a confirmação por e-mail assim que o pagamento for concluído.",
  es: "Pago seguro procesado por Stripe. Global Health nunca ve ni almacena los datos de tu tarjeta. Recibirás la confirmación por correo electrónico en cuanto se complete el pago.",
  cs: "Bezpečná platba zpracovaná společností Stripe. Global Health nikdy nevidí ani neukládá údaje o vaší kartě. Potvrzení vám pošleme e-mailem ihned po dokončení platby.",
  ro: "Plată securizată procesată de Stripe. Global Health nu vede și nu stochează datele cardului dumneavoastră. Veți primi confirmarea pe e-mail imediat ce plata este finalizată.",
  de: "Sichere Zahlung, abgewickelt von Stripe. Global Health sieht und speichert Ihre Kartendaten zu keinem Zeitpunkt. Sie erhalten die Bestätigung per E-Mail, sobald die Zahlung abgeschlossen ist.",
};

const SUBSCRIPTION_MESSAGE: Record<StripeLocale, string> = {
  en: "Your Global Health membership renews monthly and can be cancelled any time from your account. Payments are processed securely by Stripe — we never see or store your card details.",
  pt: "A sua adesão Global Health renova-se mensalmente e pode ser cancelada a qualquer momento na sua conta. Os pagamentos são processados em segurança pela Stripe — nunca vemos nem guardamos os dados do seu cartão.",
  "pt-BR":
    "Sua assinatura Global Health é renovada mensalmente e pode ser cancelada a qualquer momento na sua conta. Os pagamentos são processados com segurança pela Stripe — nunca vemos nem armazenamos os dados do seu cartão.",
  es: "Tu membresía de Global Health se renueva mensualmente y puedes cancelarla en cualquier momento desde tu cuenta. Los pagos se procesan de forma segura con Stripe: nunca vemos ni almacenamos los datos de tu tarjeta.",
  cs: "Vaše členství Global Health se obnovuje každý měsíc a můžete je kdykoli zrušit ve svém účtu. Platby bezpečně zpracovává Stripe — údaje o vaší kartě nikdy nevidíme ani neukládáme.",
  ro: "Abonamentul dumneavoastră Global Health se reînnoiește lunar și poate fi anulat oricând din contul dumneavoastră. Plățile sunt procesate în siguranță de Stripe — nu vedem și nu stocăm datele cardului dumneavoastră.",
  de: "Ihre Global Health Mitgliedschaft verlängert sich monatlich und kann jederzeit in Ihrem Konto gekündigt werden. Zahlungen werden sicher über Stripe abgewickelt — wir sehen und speichern Ihre Kartendaten zu keinem Zeitpunkt.",
};

/**
 * Trust line rendered directly above the Checkout pay button, in the same
 * language the page is pinned to. Stripe does NOT translate `custom_text`, so
 * the copy is keyed off the resolved locale rather than written once in English.
 */
export function checkoutCustomText(
  locale: StripeLocale,
  variant: CheckoutBrandingVariant = "payment",
): CustomText {
  const table = variant === "subscription" ? SUBSCRIPTION_MESSAGE : PAYMENT_MESSAGE;
  return { submit: { message: table[locale] ?? table.en } };
}

/**
 * Everything the API lets us brand on a Checkout Session, ready to spread into
 * `stripe.checkout.sessions.create({ ... })`.
 */
export async function checkoutBranding(
  countryCode?: string | null,
  variant: CheckoutBrandingVariant = "payment",
): Promise<CheckoutBranding> {
  const locale = await checkoutLocaleForCountry(countryCode);
  return { locale, custom_text: checkoutCustomText(locale, variant) };
}
