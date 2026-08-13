import { WHATSAPP_E164, WHATSAPP_NUMBER_DISPLAY } from "@/lib/constants";

/**
 * Bottom-LEFT floating WhatsApp button.
 *
 * Left, because the ElevenLabs convai launcher
 * (components/integrations/ElevenLabsConvai.tsx) owns the bottom-right corner
 * and positions itself from inside its own shadow DOM — there is no way to
 * move it, so this one gets out of its way instead.
 *
 * A plain `<a href="https://wa.me/…">`: no third-party script, no cookie, no
 * network request until the visitor clicks, so unlike the convai widget it
 * needs no consent gate. `wa.me` opens the native app on mobile and WhatsApp
 * Web on desktop for the number below.
 *
 * Mobile bottom offset stays under the consent bar's own 6rem so the two never
 * overlap while the banner is open.
 */
export function WhatsAppFab({ label = "Chat with us on WhatsApp" }: { label?: string }) {
  if (!WHATSAPP_E164) return null;

  return (
    <a
      href={`https://wa.me/${WHATSAPP_E164}`}
      target="_blank"
      rel="noopener noreferrer"
      className="gh-whatsapp-fab"
      aria-label={`${label} — ${WHATSAPP_NUMBER_DISPLAY}`}
      title={label}
    >
      {/* Official WhatsApp glyph, inlined — no remote asset, no layout shift. */}
      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.347-.347.52-.52.174-.174.232-.298.347-.497.115-.198.058-.372-.017-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.487-.669-.497-.173-.008-.371-.01-.57-.01-.198 0-.52.075-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M20.52 3.449A11.9 11.9 0 0 0 12.05 0C5.495 0 .16 5.334.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.304-1.654a11.88 11.88 0 0 0 5.741 1.463h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.423-8.467zM12.05 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 0 1-1.512-5.26c.002-5.45 4.437-9.884 9.889-9.884a9.82 9.82 0 0 1 6.988 2.898 9.83 9.83 0 0 1 2.892 6.994c-.003 5.45-4.438 9.884-9.884 9.884z" />
      </svg>
    </a>
  );
}
