import type { HTMLAttributes } from "react";

/**
 * JSX typing for `<elevenlabs-convai>`, the web component defined by the
 * ElevenLabs convai embed script (components/integrations/ElevenLabsConvai.tsx).
 *
 * Lives in its own ambient declaration file rather than beside the component:
 * augmenting React's JSX namespace needs a `namespace` block, which
 * `@typescript-eslint/no-namespace` rejects in normal source files.
 */
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "elevenlabs-convai": HTMLAttributes<HTMLElement> & { "agent-id": string };
    }
  }
}
