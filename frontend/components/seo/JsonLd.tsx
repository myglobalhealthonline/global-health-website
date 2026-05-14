import { ldJson } from "@/lib/seo/structured-data";

type AnyLd = Record<string, unknown>;

/**
 * Renders one or more JSON-LD blocks. Server component — emits a single
 * `<script type="application/ld+json">` tag with combined payloads.
 */
export function JsonLd({ data }: { data: AnyLd | AnyLd[] }) {
  const payloads = Array.isArray(data) ? data : [data];
  return (
    <script
      type="application/ld+json"
      // Output is JSON, already escaped via `ldJson`.
      dangerouslySetInnerHTML={{ __html: ldJson(...payloads) }}
    />
  );
}
