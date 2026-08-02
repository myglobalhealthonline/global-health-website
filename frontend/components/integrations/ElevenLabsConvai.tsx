"use client";

import Script from "next/script";
import { useConsent } from "@/components/compliance/use-consent";

const CONVAI_AGENT_ID = "agent_3501kk8pxt0yetdss61p5qa7qs2e";
const CONVAI_EMBED_SRC = "https://unpkg.com/@elevenlabs/convai-widget-embed";

/**
 * ElevenLabs Conversational AI widget — the bottom-RIGHT floating launcher.
 *
 * Consent-gated on the `thirdParty` category, same as the Doctify review
 * widgets (components/compliance/cookie-consent.ts): the embed loads a
 * third-party script from unpkg which opens a live session to ElevenLabs and
 * captures microphone audio, so it must stay dark until the visitor opts in.
 * `useConsent()` re-reads on the same-tab change event, so accepting shows the
 * launcher immediately, and withdrawing removes it on the next navigation.
 *
 * Rendered from SiteChrome, so it never mounts on authenticated portal routes.
 * The custom element positions itself (fixed, bottom-right) from inside its own
 * shadow DOM — that's why there is no wrapper to style here; the WhatsApp FAB
 * is deliberately pinned bottom-LEFT so the two never collide.
 */
export function ElevenLabsConvai() {
  const { consent } = useConsent();

  if (consent?.thirdParty !== true) return null;

  return (
    <>
      <link rel="preconnect" href="https://unpkg.com" />
      <elevenlabs-convai agent-id={CONVAI_AGENT_ID} />
      <Script id="elevenlabs-convai-embed" src={CONVAI_EMBED_SRC} strategy="lazyOnload" async />
    </>
  );
}
